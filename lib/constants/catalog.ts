/**
 * Catalog constants: page sizes, search limits, price bounds, cache durations.
 *
 * @see docs/backend/api-map.md §3–§5
 */

/** Number of products per page on the product list. */
export const SEARCH_PAGE_SIZE = 24;

/**
 * Whether the backend sorts the search results (`ProductSearchRequestDto.sort`).
 *
 * `false` until the backend ships the sort requested in `docs/backend/backend-prompts-lot2.md`
 * §16: the « Trier par » selector stays hidden and no sort is sent, because sorting only the
 * 24 products of the page shown would mislead. Switch to `true` with that delivery.
 */
// Widened to `boolean`: the flag is meant to flip, its uses are not dead code.
export const PRODUCT_SORT_AVAILABLE = false as boolean;

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

/**
 * Data-cache lifetime of active discount campaigns.
 *
 * The backend does not notify the front when a campaign is enabled or disabled, so this is the
 * longest a change takes to show on the home page and the promotions pages; same freshness as the
 * products.
 */
export const DISCOUNTS_REVALIDATE_SECONDS = 60;

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

/** Number of key specs shown as chips under the product name. */
export const PRODUCT_HIGHLIGHTS_COUNT = 4;

/** Number of similar products shown at the bottom of a product page. */
export const SIMILAR_PRODUCTS_COUNT = 3;

/**
 * Products fetched to pick the similar ones: more than shown, since the current product and
 * duplicated models are skipped.
 */
export const SIMILAR_PRODUCTS_FETCH_SIZE = 8;

/**
 * Category attributes never offered as filters, though still shown on the product page and in
 * the comparator.
 *
 * `connectivity` holds 90 distinct composite sentences on the 531 computers of 2026-10-13
 * (« Wi-Fi 6E, Bluetooth 5.3, 1 X HDMI 2.1 Femelle, Oui, Non »); the backend can only match a
 * whole sentence, which is useless as a filter. Decision of 2026-10-13, no backend change.
 *
 * @see specs/002-catalog-refresh/spec.md Edge Cases, FR-001
 * @see specs/002-catalog-refresh/research.md R2
 */
export const FILTER_EXCLUDED_ATTRIBUTES: readonly string[] = ["connectivity"];

/**
 * Values of a text filter shown before the « Voir tout » disclosure.
 *
 * @see specs/002-catalog-refresh/research.md R4
 */
export const FACET_VISIBLE_VALUES = 6;

/**
 * Most values one facet lists, aligned with the backend `FACET_MAX_VALUES`
 * (`CyberTechAppConstants`, `POST /product/search/facets`). The fallback scan applies the same cap.
 *
 * @see specs/002-catalog-refresh/data-model.md §1
 */
export const FACET_MAX_VALUES = 50;

/**
 * Products read by the facets fallback (`POST /product/search` on the category) when the facets
 * endpoint is missing or failing. Above the 531 computers of 2026-10-13; a larger catalog is
 * logged as a warning.
 *
 * @see specs/002-catalog-refresh/research.md R1
 */
export const FACET_FALLBACK_SCAN_SIZE = 1_000;

/**
 * Data-cache lifetime of the facets fallback scan: longer than the regular catalog cache since
 * the scan is heavy and the values it derives change rarely.
 */
export const FACETS_FALLBACK_REVALIDATE_SECONDS = 300;

/**
 * Product photos shown on each category tile of the home page: real catalog photos, so the
 * tiles are not text only.
 */
export const CATEGORY_TILE_PHOTOS = 3;

/** Products fetched to pick the tile photos: more than shown, since models repeat. */
export const CATEGORY_TILE_FETCH_SIZE = 12;
