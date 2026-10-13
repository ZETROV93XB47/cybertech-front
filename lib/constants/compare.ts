/**
 * Product comparator constants.
 *
 * @see specs/002-catalog-refresh/spec.md FR-013 to FR-021
 */

/**
 * Most products in one comparison.
 *
 * @see specs/002-catalog-refresh/spec.md FR-014
 */
export const COMPARE_MAX_PRODUCTS = 3;

/**
 * Products needed before the « Comparer » button appears in the comparison bar.
 *
 * @see specs/002-catalog-refresh/spec.md FR-015
 */
export const COMPARE_MIN_PRODUCTS = 2;

/**
 * Time a loaded comparison view stays fresh in the client cache: matches the catalog data cache
 * (`PRODUCTS_REVALIDATE_SECONDS`), so reopening the modal right away does not refetch.
 */
export const COMPARE_QUERY_STALE_TIME_MS = 60_000;

/**
 * Seconds the browser may keep a `GET /api/compare` answer: same as the catalog data cache it is
 * built from, private because the route is called by one visitor's tab.
 *
 * @see specs/002-catalog-refresh/contracts/bff-routes.md §1
 */
export const COMPARE_RESPONSE_MAX_AGE_SECONDS = 60;

/** `Cache-Control` header of `GET /api/compare`. */
export const COMPARE_RESPONSE_CACHE_CONTROL = `private, max-age=${COMPARE_RESPONSE_MAX_AGE_SECONDS}`;
