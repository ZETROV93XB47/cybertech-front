/**
 * Error codes: those sent by the backend and those exposed by the BFF to the browser.
 *
 * The BFF branches on `errorCode`, never on the (English, changeable) backend message.
 *
 * @see specs/001-catalog-auth-cart/contracts/errors.md
 * @see docs/backend/api-map.md §0.1
 */

/** Backend `ErrorCodeType`: whether an error is technical or a business rule. */
export enum ErrorCodeType {
  TECHNICAL = "TECHNICAL",
  FUNCTIONAL = "FUNCTIONAL",
}

/**
 * Backend `ErrorCode` enum, serialised in `ErrorResponseDto.errorCode`.
 *
 * Must list exactly the values of the OpenAPI schema; the type-level test
 * `tests/unit/enums/error-code.test-d.ts` fails if the backend adds or removes one.
 */
export enum BackendErrorCode {
  APPLICATION_ERROR = "APPLICATION_ERROR",
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED",
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  CANNOT_CANCEL_ORDER = "CANNOT_CANCEL_ORDER",
  CANNOT_REMOVE_ITEM_FROM_EMPTY_CART = "CANNOT_REMOVE_ITEM_FROM_EMPTY_CART",
  PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND",
  ORDER_DOESNT_BELONGS_TO_USER = "ORDER_DOESNT_BELONGS_TO_USER",
  FAILED_UPDATING_ORDER = "FAILED_UPDATING_ORDER",
  CART_IS_EMPTY = "CART_IS_EMPTY",
  CART_NOT_FOUND = "CART_NOT_FOUND",
  CART_ITEM_NOT_FOUND = "CART_ITEM_NOT_FOUND",
  INVALID_REQUEST = "INVALID_REQUEST",
  MALFORMED_JSON = "MALFORMED_JSON",
  METHOD_ARGUMENT_TYPE_MISMATCH = "METHOD_ARGUMENT_TYPE_MISMATCH",
  ACCESS_DENIED = "ACCESS_DENIED",
  ORDER_ALREADY_SHIPPED = "ORDER_ALREADY_SHIPPED",
  ORDER_NOT_FOUND = "ORDER_NOT_FOUND",
  ORDER_NOT_FUNDED = "ORDER_NOT_FUNDED",
  ORDER_REFUND_FAILED = "ORDER_REFUND_FAILED",
  NO_PREVIOUS_PAYMENT_ATTEMPT_FOUND = "NO_PREVIOUS_PAYMENT_ATTEMPT_FOUND",
  PRODUCT_ALREADY_IN_WISHLIST = "PRODUCT_ALREADY_IN_WISHLIST",
  REVIEW_NOT_FOUND = "REVIEW_NOT_FOUND",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_NOT_ACTIVE = "USER_NOT_ACTIVE",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
  USER_NOT_AUTHOR_OF_REVIEW = "USER_NOT_AUTHOR_OF_REVIEW",
  WISHLIST_NOT_FOUND = "WISHLIST_NOT_FOUND",
  ACCESS_TOKEN_RETRIEVAL_FAILED = "ACCESS_TOKEN_RETRIEVAL_FAILED",
  BANK_CARD_EXPIRED = "BANK_CARD_EXPIRED",
  BANK_CARD_NOT_FOUND = "BANK_CARD_NOT_FOUND",
  COMMENT_POST_NOT_ALLOWED = "COMMENT_POST_NOT_ALLOWED",
  IDEMPOTENCY_KEY_GENERATION_FAILED = "IDEMPOTENCY_KEY_GENERATION_FAILED",
  NO_STRATEGY_FOUND = "NO_STRATEGY_FOUND",
  NOT_ENOUGH_STOCK = "NOT_ENOUGH_STOCK",
  ORDER_SUMMARY_REPORT_JOB_FAILED = "ORDER_SUMMARY_REPORT_JOB_FAILED",
  CONCURRENT_MODIFICATION = "CONCURRENT_MODIFICATION",
  PAYMENT_ALREADY_COMPLETED = "PAYMENT_ALREADY_COMPLETED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYMENT_NOT_FOUND = "PAYMENT_NOT_FOUND",
  PAYMENT_PROCESSING_ERROR = "PAYMENT_PROCESSING_ERROR",
  DISCOUNT_TYPE_NOT_ACTIVE = "DISCOUNT_TYPE_NOT_ACTIVE",
  UNAUTHORIZED_CART_ACCESS = "UNAUTHORIZED_CART_ACCESS",
  ORDER_NOT_REVIEWABLE = "ORDER_NOT_REVIEWABLE",
  MODERATION_UNAVAILABLE = "MODERATION_UNAVAILABLE",
  UNKNOWN_PRODUCT_CATEGORY = "UNKNOWN_PRODUCT_CATEGORY",
  INVALID_PRODUCT_CATEGORY_SCHEMA = "INVALID_PRODUCT_CATEGORY_SCHEMA",
  DISCOUNT_CAMPAIGN_MISSING_REQUIRED_FIELD = "DISCOUNT_CAMPAIGN_MISSING_REQUIRED_FIELD",
  DISCOUNT_CAMPAIGN_NOT_FOUND = "DISCOUNT_CAMPAIGN_NOT_FOUND",
  DISCOUNT_CAMPAIGN_ALREADY_EXISTS = "DISCOUNT_CAMPAIGN_ALREADY_EXISTS",
  BANK_CARD_ALREADY_EXISTS = "BANK_CARD_ALREADY_EXISTS",
  PUSH_SERVICE_NOT_CONFIGURED = "PUSH_SERVICE_NOT_CONFIGURED",
  PUSH_SUBSCRIPTION_CONFLICT = "PUSH_SUBSCRIPTION_CONFLICT",
  INVALID_PUSH_ENDPOINT = "INVALID_PUSH_ENDPOINT",
  PUSH_SUBSCRIPTION_NOT_FOUND = "PUSH_SUBSCRIPTION_NOT_FOUND",
  PUSH_SUBSCRIPTION_NOT_OWNED = "PUSH_SUBSCRIPTION_NOT_OWNED",
}

/**
 * Stable error code exposed by the BFF to the browser.
 *
 * Several backend codes collapse into one front code (e.g. every `*_NOT_FOUND` → `NOT_FOUND`);
 * the UI only needs to know what to show, not the backend detail.
 *
 * @see specs/001-catalog-auth-cart/contracts/errors.md
 */
export enum FrontErrorCode {
  INVALID = "invalid",
  UNAUTHENTICATED = "unauthenticated",
  FORBIDDEN = "forbidden",
  NOT_FOUND = "not-found",
  INSUFFICIENT_STOCK = "insufficient-stock",
  CONFLICT = "conflict",
  EMPTY_CART = "empty-cart",
  ALREADY_EXISTS = "already-exists",
  RATE_LIMITED = "rate-limited",
  UNAVAILABLE = "unavailable",
  UNKNOWN = "unknown",
  /** Discount key unknown, disabled or expired (`DISCOUNT_TYPE_NOT_ACTIVE`). */
  DISCOUNT_INVALID = "discount-invalid",
  /** Payment or complement refused (`PAYMENT_FAILED`, `FAILED_UPDATING_ORDER`). */
  PAYMENT_FAILED = "payment-failed",
  /** Retry asked on an order already paid (`PAYMENT_ALREADY_COMPLETED`). */
  PAYMENT_ALREADY_COMPLETED = "payment-already-completed",
  /** Order no longer editable or cancellable (shipped, being prepared, not funded). */
  ORDER_LOCKED = "order-locked",
  /** Cancellation accepted but the refund failed (`ORDER_REFUND_FAILED`). */
  REFUND_FAILED = "refund-failed",
  /** Account disabled (`USER_NOT_ACTIVE`). */
  ACCOUNT_INACTIVE = "account-inactive",
  /** Saved card expiry in the past (`BANK_CARD_EXPIRED`). */
  CARD_EXPIRED = "card-expired",
  /**
   * No saved card on the account (`BANK_CARD_NOT_FOUND`): the backend refuses to place an order
   * without one, and the « Ma carte » page shows its empty state.
   */
  NO_SAVED_CARD = "no-saved-card",
  /**
   * Review comment refused by the automatic moderation (`COMMENT_POST_NOT_ALLOWED`): the form
   * keeps the input and explains it kindly (feature 004, FR-017).
   */
  REVIEW_REJECTED = "review-rejected",
  /**
   * The comment moderation gave no verdict (`MODERATION_UNAVAILABLE`, 503): nothing is saved, the
   * same text can be sent again later (backend `b5811c5`, prompt §17).
   */
  MODERATION_UNAVAILABLE = "moderation-unavailable",
  /** Order not reviewable (`ORDER_NOT_REVIEWABLE`, 409): not paid, cancelled, refunded… */
  REVIEW_NOT_ALLOWED = "review-not-allowed",
}
