/**
 * Search filters of the product list and their conversion to `ProductSearchRequestDto`.
 *
 * The URL is the source of truth of the filters (FR-004): `features/catalog/search-params.ts`
 * parses it into {@link SearchFilters}, the BFF turns them into the backend request here.
 *
 * @see specs/001-catalog-auth-cart/data-model.md §2 SearchFilters
 * @see docs/backend/api-map.md D.10
 */
import { z } from "zod";

import type { components } from "@/lib/api/schema";
import {
  PRICE_MAX_EUR,
  PRICE_MIN_EUR,
  SEARCH_KEYWORD_MAX_LENGTH,
  SEARCH_PAGE_SIZE,
} from "@/lib/constants/catalog";
import { Brand } from "@/lib/enums/brand";
import { CategoryKey } from "@/lib/enums/category-key";
import { BackendProductSort, ProductSort } from "@/lib/enums/product-sort";
import { assertNever } from "@/lib/assert-never";

/** Bounds of a numeric attribute filter; each bound is optional. */
export const NumericRangeSchema = z.object({
  min: z.number().nonnegative().exactOptional(),
  max: z.number().nonnegative().exactOptional(),
});

/** Bounds of a numeric attribute filter. */
export type NumericRange = z.infer<typeof NumericRangeSchema>;

/** Filters of the product list, already validated and normalised. `page` is zero-based. */
export const SearchFiltersSchema = z.object({
  keyword: z.string().trim().min(1).max(SEARCH_KEYWORD_MAX_LENGTH).optional(),
  category: z.enum(CategoryKey).optional(),
  brands: z.array(z.enum(Brand)),
  priceMin: z.int().min(PRICE_MIN_EUR).max(PRICE_MAX_EUR).optional(),
  priceMax: z.int().positive().max(PRICE_MAX_EUR).optional(),
  attributes: z.record(z.string(), z.array(z.string().min(1))),
  numericRanges: z.record(z.string(), NumericRangeSchema),
  page: z.int().nonnegative(),
  /** Order of the results; absent for the relevance (the default). Not a filter. */
  sort: z
    .enum(ProductSort)
    .refine((sort) => sort !== ProductSort.RELEVANCE)
    .optional(),
});

/** Filters of the product list. */
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/** Body of `POST /product/search`, as generated from the backend OpenAPI. */
export type ProductSearchRequest = components["schemas"]["ProductSearchRequestDto"];

/** Filters with nothing selected: the whole catalog, first page. */
export const EMPTY_SEARCH_FILTERS: SearchFilters = {
  brands: [],
  attributes: {},
  numericRanges: {},
  page: 0,
};

/**
 * Tells whether the filters restrict the catalog (keyword, category, brand, price or attribute).
 *
 * @param filters - Validated filters.
 * @returns `true` when at least one filter is set; the page number does not count.
 */
export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.keyword !== undefined ||
    filters.category !== undefined ||
    filters.brands.length > 0 ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    Object.keys(filters.attributes).length > 0 ||
    Object.keys(filters.numericRanges).length > 0
  );
}

/**
 * Builds the backend search request.
 *
 * Empty collections are left out rather than sent empty, and category attributes are only sent
 * with a category (the backend ignores them otherwise, `ProductSearchServiceImp`).
 *
 * @param filters - Validated filters.
 * @param size - Page size; {@link SEARCH_PAGE_SIZE} for the product list.
 * @returns The `ProductSearchRequestDto` body.
 * @see ProductSearchServiceImp#search (backend)
 */
export function toProductSearchRequest(
  filters: SearchFilters,
  size: number = SEARCH_PAGE_SIZE,
): ProductSearchRequest {
  const request: ProductSearchRequest = { page: filters.page, size };
  if (filters.keyword !== undefined) {
    request.keyword = filters.keyword;
  }
  if (filters.priceMin !== undefined) {
    request.priceMin = filters.priceMin;
  }
  if (filters.priceMax !== undefined) {
    request.priceMax = filters.priceMax;
  }
  if (filters.brands.length > 0) {
    request.brands = [...filters.brands];
  }
  if (filters.category === undefined) {
    return request;
  }
  request.category = filters.category;
  if (Object.keys(filters.attributes).length > 0) {
    request.attributes = filters.attributes;
  }
  if (Object.keys(filters.numericRanges).length > 0) {
    request.numericRanges = filters.numericRanges;
  }
  return request;
}

/**
 * Body of `POST /product/search` with the sort requested in backend prompt §16, not yet in the
 * generated OpenAPI types (regenerate with `npm run gen:api` once it ships).
 */
export type ProductSearchBody = ProductSearchRequest & { sort?: BackendProductSort };

/**
 * Backend value of an order of the results.
 *
 * @param sort - Order chosen in « Trier par ».
 * @returns The `ProductSearchRequestDto.sort` value.
 * @see docs/backend/backend-prompts-lot2.md §16
 */
export function toBackendSort(sort: ProductSort): BackendProductSort {
  switch (sort) {
    case ProductSort.RELEVANCE:
      return BackendProductSort.RELEVANCE;
    case ProductSort.NAME_ASC:
      return BackendProductSort.NAME_ASC;
    case ProductSort.PRICE_ASC:
      return BackendProductSort.PRICE_ASC;
    case ProductSort.PRICE_DESC:
      return BackendProductSort.PRICE_DESC;
    case ProductSort.RATING_DESC:
      return BackendProductSort.RATING_DESC;
    default:
      return assertNever(sort);
  }
}

/**
 * Body of the product search, with the order of the results when the backend sorts them. The
 * facets keep {@link toProductSearchRequest}: the order changes neither the counts nor their
 * cache entry.
 *
 * @param filters - Valid filters, with their optional order.
 * @param size - Page size.
 * @param sortAvailable - Whether the backend sorts (`PRODUCT_SORT_AVAILABLE`).
 * @returns The request body.
 */
export function toProductSearchBody(
  filters: SearchFilters,
  size: number,
  sortAvailable: boolean,
): ProductSearchBody {
  const request: ProductSearchBody = toProductSearchRequest(filters, size);
  if (sortAvailable && filters.sort !== undefined) {
    request.sort = toBackendSort(filters.sort);
  }
  return request;
}
