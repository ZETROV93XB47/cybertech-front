/**
 * Backend API constants: paths, headers, timeouts.
 *
 * Mirrors `CyberTechAppConstants.java` on the backend side so that every URL used by the BFF is
 * declared once. Source of truth for paths and behaviours: `docs/backend/api-map.md`.
 */

/**
 * Prefix of every business endpoint of the Spring backend.
 *
 * @see docs/backend/api-map.md §0 (Préfixe)
 */
export const API_BASE_PATH = "/api/v1/services";

/**
 * Header carrying the API version; the backend versions both the path (`/v1`) and this header.
 *
 * @see docs/backend/api-map.md §0 (Versioning)
 */
export const API_VERSION_HEADER = "X-API-VERSION";

/**
 * Correlation id returned by the backend `LoggingFilter`; logged with every BFF call so a front
 * log line can be matched with the backend log line.
 */
export const REQUEST_ID_HEADER = "X-Request-Id";

/** Standard header giving the number of seconds to wait after a 429 response. */
export const RETRY_AFTER_HEADER = "Retry-After";

/** Standard header used to forward the browser IP to the backend rate limiter. */
export const FORWARDED_FOR_HEADER = "X-Forwarded-For";

/**
 * Maximum time the BFF waits for the backend before treating it as unavailable.
 *
 * Matches the « backend indisponible ou lent (> 8 s) » edge case of the spec.
 */
export const BACKEND_TIMEOUT_MS = 8_000;

/**
 * Number of automatic retries for a write that failed with a retryable error
 * (`CONCURRENT_MODIFICATION`, 5xx). One retry, then the error is shown to the user.
 *
 * @see contracts/errors.md
 */
export const BACKEND_MAX_RETRIES = 1;

/** MIME type of every JSON body exchanged with the backend. */
export const JSON_CONTENT_TYPE = "application/json";

/**
 * Backend endpoint paths used by the front (lot 1), relative to the backend base URL.
 *
 * Grouped in one frozen object so a path is never typed twice.
 *
 * @see docs/backend/api-map.md §2–§6
 */
export const BACKEND_PATHS = {
  /**
   * `GET` — public shipping options (carrier, type, fee), optional `provider` query param.
   *
   * @see docs/backend/api-map.md §7b
   */
  shippingOptions: `${API_BASE_PATH}/shipping/options`,
  /** `GET` — public product detail. Append the product UUID. */
  productByUuid: `${API_BASE_PATH}/product/get`,
  /** `POST` — public Elasticsearch search, pagination in the body. */
  productSearch: `${API_BASE_PATH}/product/search`,
  /**
   * `POST` — public catalog facets: values and disjunctive counts per brand and text attribute,
   * bounds per numeric attribute. Same body as `productSearch` (`page` and `size` ignored).
   *
   * @see specs/002-catalog-refresh/contracts/bff-routes.md §3
   */
  productFacets: `${API_BASE_PATH}/product/search/facets`,
  /** `GET` — public best sellers, paginated with query params. */
  bestSellers: `${API_BASE_PATH}/product/best-sellers`,
  /** `GET` — public live stock, `uuids` query param (1 to 50), never cached. */
  productAvailability: `${API_BASE_PATH}/product/availability`,
  /** `GET` — public category JSON schema. Append the category key. */
  categorySchema: `${API_BASE_PATH}/product-category-schemas`,
  /**
   * `GET` — public list of the active categories, `[{ categoryKey, label }]` sorted by key
   * (backend `28a15ae`).
   */
  categoriesActive: `${API_BASE_PATH}/product-category-schemas`,
  /** `GET` — public active discount campaigns. */
  activeDiscounts: `${API_BASE_PATH}/discounts/active`,
  /** `POST` — public registration (rate limited per IP). */
  userRegister: `${API_BASE_PATH}/user/register`,
  /** `GET` — profile of the authenticated caller. */
  userMe: `${API_BASE_PATH}/user/me`,
  /** `GET` — cart of the authenticated caller. */
  cartGet: `${API_BASE_PATH}/cart/get`,
  /** `POST` — additive add to cart (creates the cart on first add). */
  cartAdd: `${API_BASE_PATH}/cart/add`,
  /** `PATCH` — full replacement of the cart lines. Append the cart UUID. */
  cartUpdate: `${API_BASE_PATH}/cart/update`,
  /** `PATCH` — removes one line. Append the product UUID. */
  cartRemove: `${API_BASE_PATH}/cart/remove`,
  /** `DELETE` — empties the cart. */
  cartClear: `${API_BASE_PATH}/cart/clear`,
  /**
   * `POST` — prices the caller's server cart for a shipping choice and a discount key, without
   * creating anything (USER, 60 req/min).
   *
   * @see docs/backend/api-map.md §7, §D.27
   */
  orderQuote: `${API_BASE_PATH}/management/order/quote`,
  /**
   * `POST` — turns the server cart into an order, empties the cart and starts the server-side
   * payment (USER, 30 req/min, never 402, no idempotency key).
   *
   * @see docs/backend/api-map.md §7, §D.8
   */
  orderPlace: `${API_BASE_PATH}/management/order/place`,
  /** `POST` — edits an order not shipped yet; full list of lines (§D.9). */
  orderUpdate: `${API_BASE_PATH}/management/order/update`,
  /** `POST` — cancels an order (`{ orderUuid }`, §D.9b). */
  orderCancel: `${API_BASE_PATH}/management/order/cancel`,
  /** `GET` — paginated orders of the caller, `status` (repeated), `page`, `size`, `sort`. */
  orderMine: `${API_BASE_PATH}/management/order/mine`,
  /** `GET` — one order of the caller. Append the order UUID. */
  orderGet: `${API_BASE_PATH}/management/order/get`,
  /** `GET` — status of one order of the caller, for polling. Append the order UUID. */
  orderStatus: `${API_BASE_PATH}/management/order/status`,
  /** `POST` — retries the payment of an order after `PAYMENT_FAILED`. Append the order UUID. */
  orderRetryPayment: `${API_BASE_PATH}/management/order/retry-payment`,
  /** `GET` — saved card of the caller, masked (404 when none). */
  bankCardGet: `${API_BASE_PATH}/bank-card/get`,
  /** `POST` — saves a card for the caller (`201`; `409 BANK_CARD_ALREADY_EXISTS` when one is saved). */
  bankCardAdd: `${API_BASE_PATH}/bank-card/add`,
  /** `PUT` — replaces (or adds) the caller's card in one transaction; a failure keeps the old card. */
  bankCardReplace: `${API_BASE_PATH}/bank-card/replace`,
  /** `PUT` — holder name and expiry of the saved card. */
  bankCardUpdate: `${API_BASE_PATH}/bank-card/update`,
  /** `DELETE` — deletes the saved card. */
  bankCardDelete: `${API_BASE_PATH}/bank-card/delete`,
  /** `POST` — adds a product to the caller's wishlist (`201`, `409` when already in). Append the product UUID. */
  wishlistAdd: `${API_BASE_PATH}/wishlist/add`,
  /** `DELETE` — removes a product from the caller's wishlist (`204`, `404` when absent). Append the product UUID. */
  wishlistRemove: `${API_BASE_PATH}/wishlist/remove`,
  /** `GET` — paginated wishlist of the caller (`page`, `size`, `sort`). */
  wishlistMine: `${API_BASE_PATH}/wishlist/my-wishlist`,
  /** `POST` — publishes a review of a bought product (USER; `201`, `403 COMMENT_POST_NOT_ALLOWED`, `409 ORDER_NOT_REVIEWABLE`). */
  reviewCreate: `${API_BASE_PATH}/review/create`,
  /** `PATCH` — edits a review of the caller (USER; `200`, `403 USER_NOT_AUTHOR_OF_REVIEW`, `404`). Append the review UUID. */
  reviewUpdate: `${API_BASE_PATH}/review/update`,
  /** `DELETE` — deletes a review of the caller (USER; `204`, `403`, `404`). Append the review UUID. */
  reviewDelete: `${API_BASE_PATH}/review/delete`,
  /** `GET` — products the caller can still review, one per order line (USER). */
  reviewReviewable: `${API_BASE_PATH}/review/reviewable`,
  /** `GET` — paginated reviews of the caller (USER; `page`, `size`, `sort`; backend `bddcafd`). */
  reviewMine: `${API_BASE_PATH}/review/mine`,
  /** `GET` — public reviews of a product with average and distribution (`page`). Append the product UUID. */
  reviewProduct: `${API_BASE_PATH}/review/product`,
} as const;

/** Query parameter names used by backend endpoints. */
export const BACKEND_QUERY_PARAMS = {
  /** Comma-separated product UUIDs of `GET /product/availability`. */
  uuids: "uuids",
  /** Zero-based page index (Spring pageable). */
  page: "page",
  /** Page size (Spring pageable). */
  size: "size",
  /** Sort of a Spring pageable (`property,direction`). */
  sort: "sort",
  /** Order status filter of `GET /management/order/mine`, repeated for several statuses. */
  status: "status",
} as const;

/** Header set by some local proxies with the browser IP, used when `X-Forwarded-For` is absent. */
export const REAL_IP_HEADER = "X-Real-IP";

/** Separator of the IP list in `X-Forwarded-For` (the first entry is the browser). */
export const FORWARDED_FOR_SEPARATOR = ",";
