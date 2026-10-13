/**
 * Catalog constants: page sizes, search limits, price bounds, cache durations.
 *
 * @see docs/backend/api-map.md §3–§5
 */

/** Number of products per page on the product list. */
export const SEARCH_PAGE_SIZE = 24;

/** Number of best sellers shown on the home page. */
export const BEST_SELLERS_SIZE = 8;

/** Number of results shown in the ⌘K command palette. */
export const COMMAND_PALETTE_RESULT_SIZE = 6;

/** Delay after the last keystroke before the command palette searches. */
export const COMMAND_PALETTE_DEBOUNCE_MS = 200;

/** Maximum keyword length accepted from the URL or the command palette. */
export const SEARCH_KEYWORD_MAX_LENGTH = 100;

/**
 * Lowest `priceMin` accepted by the backend (`@Min(100)` on `ProductSearchRequestDto`).
 * A lower minimum is simply not sent.
 *
 * @see docs/backend/api-map.md D.10
 */
export const PRICE_MIN_EUR = 100;

/**
 * Highest `priceMax` accepted by the backend (`@Max(1000000)`).
 *
 * @see docs/backend/api-map.md D.10
 */
export const PRICE_MAX_EUR = 1_000_000;

/**
 * Stock at or below which a product shows « Plus que N » instead of « En stock ».
 * Product decision recorded in the spec assumptions.
 */
export const LOW_STOCK_THRESHOLD = 5;

/** Maximum number of recently viewed products kept in the browser. */
export const RECENTLY_VIEWED_MAX = 8;

/** Data-cache lifetime of product data (detail, search, best sellers). */
export const PRODUCTS_REVALIDATE_SECONDS = 60;

/** Data-cache lifetime of active discount campaigns. */
export const DISCOUNTS_REVALIDATE_SECONDS = 300;

/** Data-cache lifetime of category JSON schemas, which change only through admin actions. */
export const CATEGORY_SCHEMA_REVALIDATE_SECONDS = 3_600;

/** Cache tag shared by every product fetch, so all of them can be revalidated at once. */
export const PRODUCTS_CACHE_TAG = "products";

/** First page number shown in the URL (the backend is zero-based). */
export const FIRST_PAGE_NUMBER = 1;

/** Number of attribute values kept per filter key from the URL (defensive bound). */
export const SEARCH_ATTRIBUTE_MAX_VALUES = 20;

/**
 * Accepted shape of a category attribute key in the URL: a JSON-schema property name made of
 * letters, digits and underscores. Anything else is ignored.
 */
export const ATTRIBUTE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/** Separator between the bounds of a range in the URL (`r.ram=8-32`). */
export const RANGE_SEPARATOR = "-";

/** First hour (inclusive, local time) greeted with « Bonjour ». */
export const MORNING_START_HOUR = 5;

/** First hour (inclusive, local time) greeted with « Bonsoir ». */
export const EVENING_START_HOUR = 18;

/** Number of page links shown on each side of the current page in the pagination. */
export const PAGINATION_SIBLING_COUNT = 2;

/** Maximum length of a product page meta description (search engines cut longer ones). */
export const META_DESCRIPTION_MAX_LENGTH = 160;
