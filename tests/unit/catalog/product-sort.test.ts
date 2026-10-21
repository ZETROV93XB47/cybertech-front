/**
 * « Trier par » of the catalog: the order in the URL and in the search body (backend prompt §16).
 */
import { describe, expect, it } from "vitest";

import { buildSearchUrl, parseSearchParams } from "@/features/catalog/search-params";
import { CategoryKey } from "@/lib/enums/category-key";
import { BackendProductSort, ProductSort } from "@/lib/enums/product-sort";
import {
  EMPTY_SEARCH_FILTERS,
  hasActiveFilters,
  toBackendSort,
  toProductSearchBody,
  toProductSearchRequest,
  type SearchFilters,
} from "@/lib/schemas/search";

/** Page size of the tests. */
const SIZE = 24;

describe("sort in the catalog URL", () => {
  it.each([
    ProductSort.NAME_ASC,
    ProductSort.PRICE_ASC,
    ProductSort.PRICE_DESC,
    ProductSort.RATING_DESC,
  ])("reads and writes %s", (sort) => {
    const filters = parseSearchParams(new URLSearchParams({ category: "SMARTPHONE", sort }));
    expect(filters.sort).toBe(sort);
    expect(buildSearchUrl(filters)).toBe(`/products?category=SMARTPHONE&sort=${sort}`);
  });

  it.each(["relevance", "cheapest", ""])("treats %j as the relevance (not in the URL)", (sort) => {
    const filters = parseSearchParams(new URLSearchParams({ sort }));
    expect(filters.sort).toBeUndefined();
    expect(buildSearchUrl(filters)).toBe("/products");
  });

  it("keeps the order on the next pages", () => {
    const url = buildSearchUrl({ ...EMPTY_SEARCH_FILTERS, sort: ProductSort.PRICE_ASC, page: 1 });
    expect(url).toBe("/products?sort=price-asc&page=2");
  });

  it("is not a filter", () => {
    expect(hasActiveFilters({ ...EMPTY_SEARCH_FILTERS, sort: ProductSort.NAME_ASC })).toBe(false);
  });
});

describe("sort in the search body", () => {
  const filters: SearchFilters = {
    ...EMPTY_SEARCH_FILTERS,
    category: CategoryKey.SMARTPHONE,
    sort: ProductSort.PRICE_DESC,
  };

  it("sends the backend value once the backend sorts", () => {
    expect(toProductSearchBody(filters, SIZE, true)).toEqual({
      ...toProductSearchRequest(filters, SIZE),
      sort: BackendProductSort.PRICE_DESC,
    });
  });

  it("sends nothing while the backend cannot sort", () => {
    expect(toProductSearchBody(filters, SIZE, false)).not.toHaveProperty("sort");
  });

  it("sends nothing for the relevance", () => {
    expect(toProductSearchBody(EMPTY_SEARCH_FILTERS, SIZE, true)).not.toHaveProperty("sort");
  });

  it("never puts the order in the facets body", () => {
    expect(toProductSearchRequest(filters, SIZE)).not.toHaveProperty("sort");
  });

  it.each(Object.values(ProductSort))("maps %s to a backend value", (sort) => {
    expect(Object.values(BackendProductSort)).toContain(toBackendSort(sort));
  });
});
