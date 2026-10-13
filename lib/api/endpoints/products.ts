/**
 * Product endpoints of the backend: best sellers, search, detail and live availability.
 *
 * Catalog reads are public (no `Authorization`) and go through the Next.js data cache for
 * {@link PRODUCTS_REVALIDATE_SECONDS}; availability is never cached (FR-007). Products of a list
 * are validated one by one: a product that breaks the contract is dropped and logged instead of
 * failing the whole page.
 *
 * @see docs/backend/api-map.md §3
 * @see ProductSearchController (backend)
 */
import "server-only";

import { z } from "zod";

import { backendFetch, type NextFetchCache } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { BACKEND_PATHS, BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import { AVAILABILITY_MAX_UUIDS_PER_REQUEST } from "@/lib/constants/cart";
import {
  BEST_SELLERS_SIZE,
  PRODUCTS_CACHE_TAG,
  PRODUCTS_REVALIDATE_SECONDS,
  SEARCH_PAGE_SIZE,
} from "@/lib/constants/catalog";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { maskUuid } from "@/lib/log-safety";
import { createModuleLogger } from "@/lib/logger";
import { pagedSchema, type Paged } from "@/lib/schemas/paged";
import {
  ProductAvailabilitySchema,
  ProductSchema,
  toProductCard,
  type Product,
  type ProductAvailability,
  type ProductCard,
} from "@/lib/schemas/product";
import { toProductSearchRequest, type SearchFilters } from "@/lib/schemas/search";
import { UUID_LIST_SEPARATOR } from "@/lib/schemas/uuid-list";

/** Data-cache options shared by every catalog read. */
const CATALOG_CACHE: NextFetchCache = {
  revalidate: PRODUCTS_REVALIDATE_SECONDS,
  tags: [PRODUCTS_CACHE_TAG],
};

/** A page whose items are checked one by one by {@link toValidCards}. */
const LoosePageSchema = pagedSchema(z.unknown());

const log = createModuleLogger("catalog.search");

/**
 * Keeps the products that match the contract, as cards.
 *
 * @param items - Raw items of a backend page.
 * @param source - Name of the call, for the log line.
 * @returns The valid products as cards.
 */
function toValidCards(items: readonly unknown[], source: string): ProductCard[] {
  const cards: ProductCard[] = [];
  for (const item of items) {
    const parsed = ProductSchema.safeParse(item);
    if (parsed.success) {
      cards.push(toProductCard(parsed.data));
      continue;
    }
    const uuid =
      typeof item === "object" && item !== null && "uuid" in item ? String(item.uuid) : "";
    log.warn(
      { source, productUuid: maskUuid(uuid), issues: parsed.error.issues.length },
      "Product dropped: response does not match the contract",
    );
  }
  return cards;
}

/**
 * Loads the best sellers shown on the home page.
 *
 * @returns Up to {@link BEST_SELLERS_SIZE} product cards.
 * @throws {ApiError} When the backend is unavailable.
 */
export async function getBestSellers(): Promise<ProductCard[]> {
  const page = await backendFetch(BACKEND_PATHS.bestSellers, {
    schema: LoosePageSchema,
    query: {
      [BACKEND_QUERY_PARAMS.page]: "0",
      [BACKEND_QUERY_PARAMS.size]: String(BEST_SELLERS_SIZE),
    },
    nextCache: CATALOG_CACHE,
  });
  return toValidCards(page.content, "best-sellers");
}

/**
 * Searches the catalog (typo-tolerant keyword, filters, pagination).
 *
 * The raw keyword is never logged: it is free text typed by the visitor.
 *
 * @param filters - Validated filters (zero-based page).
 * @param size - Page size: {@link SEARCH_PAGE_SIZE} for the list, smaller for the palette.
 * @returns A page of product cards.
 * @throws {ApiError} When the backend rejects the request or is unavailable.
 * @see ProductSearchServiceImp#search (backend)
 */
export async function searchProducts(
  filters: SearchFilters,
  size: number = SEARCH_PAGE_SIZE,
): Promise<Paged<ProductCard>> {
  log.debug(
    {
      hasKeyword: filters.keyword !== undefined,
      category: filters.category,
      brandCount: filters.brands.length,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      attributeKeys:
        Object.keys(filters.attributes).length + Object.keys(filters.numericRanges).length,
      page: filters.page,
      size,
    },
    "Searching products",
  );
  const page = await backendFetch(BACKEND_PATHS.productSearch, {
    schema: LoosePageSchema,
    method: HttpMethod.POST,
    body: toProductSearchRequest(filters, size),
    nextCache: CATALOG_CACHE,
  });
  return { content: toValidCards(page.content, "search"), page: page.page };
}

/**
 * Loads one product.
 *
 * @param uuid - Product UUID, as found in the URL (not trusted).
 * @returns The product, or `null` when the UUID is malformed or the product does not exist.
 * @throws {ApiError} When the backend is unavailable or answers an unexpected error.
 */
export async function getProductByUuid(uuid: string): Promise<Product | null> {
  if (!z.uuid().safeParse(uuid).success) {
    return null;
  }
  try {
    return await backendFetch(`${BACKEND_PATHS.productByUuid}/${uuid}`, {
      schema: ProductSchema,
      nextCache: CATALOG_CACHE,
    });
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.NOT_FOUND) {
      return null;
    }
    throw error;
  }
}

/**
 * Loads several products in parallel (recently viewed, guest cart preview).
 *
 * @param uuids - Product UUIDs.
 * @returns The cards of the products that exist, in input order; unknown ones are omitted.
 * @throws {ApiError} When the backend is unavailable.
 */
export async function getProductsByUuids(uuids: readonly string[]): Promise<ProductCard[]> {
  const products = await Promise.all(uuids.map((uuid) => getProductByUuid(uuid)));
  return products.filter((product) => product !== null).map(toProductCard);
}

/**
 * Splits a list into chunks.
 *
 * @param items - Items to split.
 * @param size - Maximum chunk size.
 * @returns The chunks, in order.
 */
function chunk<TItem>(items: readonly TItem[], size: number): TItem[][] {
  const chunks: TItem[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

/**
 * Reads the live stock of products. Never cached (FR-007).
 *
 * @param uuids - Product UUIDs; split into calls of {@link AVAILABILITY_MAX_UUIDS_PER_REQUEST}.
 * @returns The stock of the known products; unknown UUIDs are absent.
 * @throws {ApiError} When the backend is unavailable.
 */
export async function getAvailability(uuids: readonly string[]): Promise<ProductAvailability[]> {
  const distinct = [...new Set(uuids)];
  const pages = await Promise.all(
    chunk(distinct, AVAILABILITY_MAX_UUIDS_PER_REQUEST).map((part) =>
      backendFetch(BACKEND_PATHS.productAvailability, {
        schema: z.array(ProductAvailabilitySchema),
        query: { [BACKEND_QUERY_PARAMS.uuids]: part.join(UUID_LIST_SEPARATOR) },
      }),
    ),
  );
  return pages.flat();
}
