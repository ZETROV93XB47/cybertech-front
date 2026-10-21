/**
 * Query parameter names of the product list URL (FR-004).
 *
 * @see specs/001-catalog-auth-cart/data-model.md §2 SearchFilters
 */

/** Fixed query parameters of `/products`. */
export enum SearchParam {
  /** Keyword (`keyword` on the backend). */
  KEYWORD = "q",
  /** Category key. */
  CATEGORY = "category",
  /** Brand, repeated once per selected brand. */
  BRAND = "brand",
  /** Minimum price in euros. */
  PRICE_MIN = "min",
  /** Maximum price in euros. */
  PRICE_MAX = "max",
  /** One-based page number. */
  PAGE = "page",
  /** Order of the results (`ProductSort`), absent for the relevance. */
  SORT = "sort",
  /** Selected photo on the product page (zero-based), so the gallery works without JavaScript. */
  PHOTO = "photo",
}

/** Prefixes of the category-specific query parameters. */
export enum SearchParamPrefix {
  /** `a.<key>=<value>`, repeated: attribute values (`attributes[key]`). */
  ATTRIBUTE = "a.",
  /** `r.<key>=<min>-<max>`: numeric range (`numericRanges[key]`). */
  RANGE = "r.",
}

/** Suffixes of the two inputs of a range facet in the no-JavaScript form (`r.<key>.min`). */
export enum RangeBound {
  MIN = "min",
  MAX = "max",
}
