/**
 * Sort orders of the catalog results (« Trier par »).
 *
 * The values are the ones written in the URL (`?sort=price-asc`). The backend sort is requested
 * in `docs/backend/backend-prompts-lot2.md` §16; until it ships, the selector stays hidden
 * (`PRODUCT_SORT_AVAILABLE`).
 *
 * @see docs/backend/backend-prompts-lot2.md §16
 */

/** Order of the catalog results. */
export enum ProductSort {
  /** Search relevance: the backend order, the default (never written in the URL). */
  RELEVANCE = "relevance",
  /** Product name, A to Z. */
  NAME_ASC = "name-asc",
  /** Cheapest first. */
  PRICE_ASC = "price-asc",
  /** Most expensive first. */
  PRICE_DESC = "price-desc",
  /** Best rated first; products without review last. */
  RATING_DESC = "rating-desc",
}

/** Value of `ProductSearchRequestDto.sort` asked to the backend (§16). */
export enum BackendProductSort {
  RELEVANCE = "RELEVANCE",
  NAME_ASC = "NAME_ASC",
  PRICE_ASC = "PRICE_ASC",
  PRICE_DESC = "PRICE_DESC",
  RATING_DESC = "RATING_DESC",
}
