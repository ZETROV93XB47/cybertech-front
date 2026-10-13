/**
 * Catalog facets: filter values, counts and bounds of a search.
 *
 * Primary source: `POST /product/search/facets` (disjunctive counts). When the endpoint is
 * missing (older backend), failing or off-contract, the values are derived from a scan of the
 * category (`POST /product/search`), without counts; when that fails too, the page gets an
 * `UNAVAILABLE` result and keeps working with the values already in the URL. Every call is
 * public and cached with the catalog tag, so an admin write revalidates it.
 *
 * @see specs/002-catalog-refresh/research.md R1
 * @see specs/002-catalog-refresh/contracts/bff-routes.md §3
 * @see ProductSearchController#getFacets (backend)
 */
import "server-only";

import { z } from "zod";

import { backendFetch, type NextFetchCache } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { BACKEND_PATHS } from "@/lib/constants/api";
import {
  FACET_FALLBACK_SCAN_SIZE,
  FACET_MAX_VALUES,
  FACETS_FALLBACK_REVALIDATE_SECONDS,
  PRODUCTS_CACHE_TAG,
  PRODUCTS_REVALIDATE_SECONDS,
} from "@/lib/constants/catalog";
import { HTTP_STATUS } from "@/lib/constants/http";
import { Brand } from "@/lib/enums/brand";
import { CategoryKey } from "@/lib/enums/category-key";
import { FacetSource } from "@/lib/enums/facet-source";
import { HttpMethod } from "@/lib/enums/http-method";
import { UI_LOCALE } from "@/lib/format";
import { createModuleLogger } from "@/lib/logger";
import {
  ProductFacetsResponseSchema,
  type FacetCount,
  type FacetData,
  type FacetRange,
  type ProductFacetsResponse,
} from "@/lib/schemas/facets";
import { pagedSchema } from "@/lib/schemas/paged";
import { ProductSchema, type Product } from "@/lib/schemas/product";
import {
  EMPTY_SEARCH_FILTERS,
  toProductSearchRequest,
  type ProductSearchRequest,
  type SearchFilters,
} from "@/lib/schemas/search";

/** Data-cache options of the facets endpoint (same lifetime as the search). */
const FACETS_CACHE: NextFetchCache = {
  revalidate: PRODUCTS_REVALIDATE_SECONDS,
  tags: [PRODUCTS_CACHE_TAG],
};

/** Data-cache options of the fallback scan, heavier and refreshed less often. */
const FALLBACK_CACHE: NextFetchCache = {
  revalidate: FACETS_FALLBACK_REVALIDATE_SECONDS,
  tags: [PRODUCTS_CACHE_TAG],
};

/** Page of the fallback scan; products are validated one by one by {@link toValidProducts}. */
const ScanPageSchema = pagedSchema(z.unknown());

/** Facet data when neither source answered. */
const UNAVAILABLE_FACETS: FacetData = {
  source: FacetSource.UNAVAILABLE,
  hasCounts: false,
  totalHits: null,
  brandCounts: null,
  values: {},
  ranges: {},
};

const BrandSchema = z.enum(Brand);

const log = createModuleLogger("catalog.facets");

/**
 * Whether the « endpoint missing » warning was already logged by this process: a backend
 * without the endpoint would otherwise log it on every catalog page.
 */
let hasWarnedMissingEndpoint = false;

/**
 * Builds the facets request body: the search body without pagination.
 *
 * @param filters - Validated filters.
 * @returns The body of `POST /product/search/facets`.
 */
function toFacetsRequest(filters: SearchFilters): ProductSearchRequest {
  const body = toProductSearchRequest(filters);
  delete body.page;
  delete body.size;
  return body;
}

/**
 * Maps the brand counts, skipping brands the front does not know.
 *
 * @param brands - Backend brand values.
 * @returns Counts by brand.
 */
function toBrandCounts(brands: ProductFacetsResponse["brands"]): Partial<Record<Brand, number>> {
  const counts: Partial<Record<Brand, number>> = {};
  for (const { value, count } of brands) {
    const brand = BrandSchema.safeParse(value);
    if (brand.success) {
      counts[brand.data] = count;
    } else {
      log.warn({ brand: value }, "Unknown brand in facets, ignored");
    }
  }
  return counts;
}

/**
 * Normalises the backend response.
 *
 * @param response - Validated facets.
 * @returns The facet data, with counts.
 */
function fromBackend(response: ProductFacetsResponse): FacetData {
  const values: Record<string, readonly FacetCount[]> = {};
  for (const [key, list] of Object.entries(response.attributes ?? {})) {
    values[key] = list.slice(0, FACET_MAX_VALUES);
  }
  return {
    source: FacetSource.BACKEND,
    hasCounts: true,
    totalHits: response.totalHits,
    brandCounts: toBrandCounts(response.brands),
    values,
    ranges: response.numericAttributes ?? {},
  };
}

/**
 * Keeps the scanned products that match the contract.
 *
 * @param items - Raw items of the scan page.
 * @returns The valid products; the others are counted in a warning.
 */
function toValidProducts(items: readonly unknown[]): Product[] {
  const products = items.flatMap((item) => {
    const parsed = ProductSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  if (products.length < items.length) {
    log.warn({ dropped: items.length - products.length }, "Fallback scan dropped invalid products");
  }
  return products;
}

/**
 * Derives distinct text values and numeric bounds from products.
 *
 * @param products - Products of one category.
 * @returns Values (sorted in French, capped) and bounds, by attribute key.
 */
function deriveFacets(products: readonly Product[]): Pick<FacetData, "values" | "ranges"> {
  const texts = new Map<string, Set<string>>();
  const ranges: Record<string, FacetRange> = {};
  for (const product of products) {
    for (const [key, raw] of Object.entries(product.attributes)) {
      if (typeof raw === "number") {
        const range = ranges[key];
        ranges[key] = {
          min: Math.min(range?.min ?? raw, raw),
          max: Math.max(range?.max ?? raw, raw),
        };
      } else if (typeof raw === "string" && raw.trim() !== "") {
        texts.set(key, (texts.get(key) ?? new Set<string>()).add(raw.trim()));
      }
    }
  }
  const values: Record<string, readonly FacetCount[]> = {};
  for (const [key, set] of texts) {
    values[key] = [...set]
      .sort((a, b) => a.localeCompare(b, UI_LOCALE))
      .slice(0, FACET_MAX_VALUES)
      .map((value) => ({ value, count: null }));
  }
  return { values, ranges };
}

/**
 * Derives the facets of a category from a scan of its products, without counts.
 *
 * @param category - Category to scan.
 * @returns Fallback facet data, or {@link UNAVAILABLE_FACETS} when the scan fails.
 */
export async function getFallbackFacets(category: CategoryKey): Promise<FacetData> {
  try {
    const page = await backendFetch(BACKEND_PATHS.productSearch, {
      schema: ScanPageSchema,
      method: HttpMethod.POST,
      body: { category, page: 0, size: FACET_FALLBACK_SCAN_SIZE },
      nextCache: FALLBACK_CACHE,
    });
    if (page.page.totalElements > FACET_FALLBACK_SCAN_SIZE) {
      log.warn(
        { category, totalElements: page.page.totalElements, scanned: FACET_FALLBACK_SCAN_SIZE },
        "Fallback scan truncated: some filter values may be missing",
      );
    }
    return {
      source: FacetSource.FALLBACK,
      hasCounts: false,
      totalHits: page.page.totalElements,
      brandCounts: null,
      ...deriveFacets(toValidProducts(page.content)),
    };
  } catch (error) {
    log.error(
      { category, errorCode: error instanceof ApiError ? error.backendCode : undefined },
      "Fallback facets unavailable",
    );
    return UNAVAILABLE_FACETS;
  }
}

/**
 * Logs why the facets endpoint was not used, once per process for a missing endpoint.
 *
 * @param error - Error thrown by the call.
 */
function logEndpointFailure(error: unknown): void {
  if (error instanceof ApiError && error.status === HTTP_STATUS.NOT_FOUND) {
    if (!hasWarnedMissingEndpoint) {
      hasWarnedMissingEndpoint = true;
      log.warn({}, "Facets endpoint missing, using fallback");
    }
    return;
  }
  log.error(
    {
      status: error instanceof ApiError ? error.status : undefined,
      errorCode: error instanceof ApiError ? error.backendCode : undefined,
    },
    "Facets endpoint failed, using fallback",
  );
}

/**
 * Loads the facets of a catalog search.
 *
 * Without a category the fallback is not attempted: only brand counts would be missing, and
 * there is no attribute filter to feed.
 *
 * @param filters - Validated filters of the page.
 * @returns The facet data; never throws.
 * @see specs/002-catalog-refresh/data-model.md §2
 */
export async function getFacets(filters: SearchFilters): Promise<FacetData> {
  const startedAt = performance.now();
  try {
    const response = await backendFetch(BACKEND_PATHS.productFacets, {
      schema: ProductFacetsResponseSchema,
      method: HttpMethod.POST,
      body: toFacetsRequest(filters),
      nextCache: FACETS_CACHE,
    });
    log.debug(
      { source: FacetSource.BACKEND, durationMs: Math.round(performance.now() - startedAt) },
      "Facets loaded",
    );
    return fromBackend(response);
  } catch (error) {
    logEndpointFailure(error);
    return filters.category ? getFallbackFacets(filters.category) : UNAVAILABLE_FACETS;
  }
}

/**
 * Reads the number of products of a facets answer.
 *
 * @param data - Facets of one category.
 * @returns `totalHits`, or `null` when the facets are unavailable.
 */
function toProductCount(data: FacetData): number | null {
  return data.source === FacetSource.UNAVAILABLE ? null : data.totalHits;
}

/**
 * Counts the products of every category, for the category tiles of the home page.
 *
 * One facets call per category (same cache as the catalog), read from `totalHits`: the backend
 * endpoint or the fallback scan, so the number is always a real catalog count (FR-029).
 *
 * @returns The number of products by category; `null` when the facets are unavailable.
 * @see specs/002-catalog-refresh/research.md R13
 */
export async function getCategoryCounts(): Promise<Record<CategoryKey, number | null>> {
  const [computers, monitors] = await Promise.all([
    getFacets({ ...EMPTY_SEARCH_FILTERS, category: CategoryKey.COMPUTER }),
    getFacets({ ...EMPTY_SEARCH_FILTERS, category: CategoryKey.MONITOR }),
  ]);
  return {
    [CategoryKey.COMPUTER]: toProductCount(computers),
    [CategoryKey.MONITOR]: toProductCount(monitors),
  };
}
