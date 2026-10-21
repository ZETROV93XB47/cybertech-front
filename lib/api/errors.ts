/**
 * Backend error model of the BFF: parsing of `ErrorResponseDto` and mapping to the stable
 * front error codes.
 *
 * Routing is done on `errorCode`, never on the backend message (English, may change).
 *
 * @see specs/001-catalog-auth-cart/contracts/errors.md
 * @see docs/backend/api-map.md §0.1
 */
import { HTTP_STATUS, SERVER_ERROR_MIN_STATUS } from "@/lib/constants/http";
import { RETRY_AFTER_HEADER } from "@/lib/constants/api";
import { BackendErrorCode, FrontErrorCode } from "@/lib/enums/error-code";
import { ApiErrorBodySchema, type FieldError, type StockShortage } from "@/lib/schemas/error";

/** Radix used to parse the `Retry-After` header. */
const DECIMAL_RADIX = 10;

/** Message used when the backend could not be reached or answered something unreadable. */
const UNAVAILABLE_MESSAGE = "Backend unavailable or returned an unreadable response";

/** Fields of an {@link ApiError}. */
export interface ApiErrorInit {
  /** HTTP status received (or 503 when the backend could not be reached). */
  readonly status: number;
  /** Stable code exposed to the browser. */
  readonly frontCode: FrontErrorCode;
  /** Technical message in English, for logs only. */
  readonly message: string;
  /** Backend code, when the backend sent a known one. */
  readonly backendCode?: BackendErrorCode | undefined;
  /** Per-field validation errors (`INVALID_REQUEST`). */
  readonly fieldErrors?: readonly FieldError[] | undefined;
  /** Seconds to wait before retrying (`TOO_MANY_REQUESTS`). */
  readonly retryAfterSeconds?: number | undefined;
  /** Backend `X-Request-Id`, to correlate logs. */
  readonly requestId?: string | undefined;
  /** Short lines of a `NOT_ENOUGH_STOCK` (`details.items`), when the backend sent them. */
  readonly stockShortages?: readonly StockShortage[] | undefined;
}

/**
 * Error thrown by every BFF call to the backend.
 *
 * Carries both the raw backend information (status, code, request id) for logs and the stable
 * {@link FrontErrorCode} the UI branches on.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly frontCode: FrontErrorCode;
  public readonly backendCode: BackendErrorCode | undefined;
  public readonly fieldErrors: readonly FieldError[] | undefined;
  public readonly retryAfterSeconds: number | undefined;
  public readonly requestId: string | undefined;
  public readonly stockShortages: readonly StockShortage[] | undefined;

  /**
   * @param init - Error details.
   */
  public constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.frontCode = init.frontCode;
    this.backendCode = init.backendCode;
    this.fieldErrors = init.fieldErrors;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.requestId = init.requestId;
    this.stockShortages = init.stockShortages;
  }
}

/**
 * Front code of every backend code.
 *
 * A `Record` over the enum makes the mapping exhaustive at compile time: a new backend code
 * (after `npm run gen:api` and the enum update) does not compile until it is classified here.
 * Codes outside lot 1 that `contracts/errors.md` does not list map to `UNKNOWN`.
 */
const FRONT_CODE_BY_BACKEND_CODE = {
  [BackendErrorCode.INVALID_REQUEST]: FrontErrorCode.INVALID,
  [BackendErrorCode.MALFORMED_JSON]: FrontErrorCode.INVALID,
  [BackendErrorCode.METHOD_ARGUMENT_TYPE_MISMATCH]: FrontErrorCode.INVALID,
  [BackendErrorCode.AUTHENTICATION_REQUIRED]: FrontErrorCode.UNAUTHENTICATED,
  [BackendErrorCode.ACCESS_DENIED]: FrontErrorCode.FORBIDDEN,
  [BackendErrorCode.RESOURCE_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.ACCOUNT_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.PRODUCT_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.CART_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.CART_ITEM_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.USER_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.ORDER_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.REVIEW_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.WISHLIST_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.PAYMENT_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.DISCOUNT_CAMPAIGN_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.NO_PREVIOUS_PAYMENT_ATTEMPT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.NOT_ENOUGH_STOCK]: FrontErrorCode.INSUFFICIENT_STOCK,
  [BackendErrorCode.CONCURRENT_MODIFICATION]: FrontErrorCode.CONFLICT,
  [BackendErrorCode.CART_IS_EMPTY]: FrontErrorCode.EMPTY_CART,
  [BackendErrorCode.CANNOT_REMOVE_ITEM_FROM_EMPTY_CART]: FrontErrorCode.EMPTY_CART,
  [BackendErrorCode.USER_ALREADY_EXISTS]: FrontErrorCode.ALREADY_EXISTS,
  [BackendErrorCode.TOO_MANY_REQUESTS]: FrontErrorCode.RATE_LIMITED,
  [BackendErrorCode.APPLICATION_ERROR]: FrontErrorCode.UNAVAILABLE,
  [BackendErrorCode.ACCESS_TOKEN_RETRIEVAL_FAILED]: FrontErrorCode.UNAVAILABLE,
  [BackendErrorCode.IDEMPOTENCY_KEY_GENERATION_FAILED]: FrontErrorCode.UNAVAILABLE,
  [BackendErrorCode.NO_STRATEGY_FOUND]: FrontErrorCode.UNAVAILABLE,
  [BackendErrorCode.PAYMENT_PROCESSING_ERROR]: FrontErrorCode.UNAVAILABLE,
  [BackendErrorCode.ORDER_SUMMARY_REPORT_JOB_FAILED]: FrontErrorCode.UNAVAILABLE,
  // An order of another user is presented as missing, without revealing that it exists.
  [BackendErrorCode.ORDER_DOESNT_BELONGS_TO_USER]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.CANNOT_CANCEL_ORDER]: FrontErrorCode.ORDER_LOCKED,
  [BackendErrorCode.ORDER_ALREADY_SHIPPED]: FrontErrorCode.ORDER_LOCKED,
  [BackendErrorCode.ORDER_NOT_FUNDED]: FrontErrorCode.ORDER_LOCKED,
  [BackendErrorCode.ORDER_REFUND_FAILED]: FrontErrorCode.REFUND_FAILED,
  [BackendErrorCode.FAILED_UPDATING_ORDER]: FrontErrorCode.PAYMENT_FAILED,
  [BackendErrorCode.PAYMENT_FAILED]: FrontErrorCode.PAYMENT_FAILED,
  [BackendErrorCode.PAYMENT_ALREADY_COMPLETED]: FrontErrorCode.PAYMENT_ALREADY_COMPLETED,
  [BackendErrorCode.DISCOUNT_TYPE_NOT_ACTIVE]: FrontErrorCode.DISCOUNT_INVALID,
  [BackendErrorCode.USER_NOT_ACTIVE]: FrontErrorCode.ACCOUNT_INACTIVE,
  [BackendErrorCode.BANK_CARD_EXPIRED]: FrontErrorCode.CARD_EXPIRED,
  // `POST /order/place` needs a saved card (`validateUserBeforeProcessingPayment`).
  [BackendErrorCode.BANK_CARD_NOT_FOUND]: FrontErrorCode.NO_SAVED_CARD,
  [BackendErrorCode.PRODUCT_ALREADY_IN_WISHLIST]: FrontErrorCode.ALREADY_EXISTS,
  [BackendErrorCode.USER_NOT_AUTHOR_OF_REVIEW]: FrontErrorCode.FORBIDDEN,
  // Moderation refusal of a review comment (feature 004, FR-017).
  [BackendErrorCode.COMMENT_POST_NOT_ALLOWED]: FrontErrorCode.REVIEW_REJECTED,
  [BackendErrorCode.UNAUTHORIZED_CART_ACCESS]: FrontErrorCode.UNKNOWN,
  // 409 on the backend side: branch on the code, never on the status.
  [BackendErrorCode.ORDER_NOT_REVIEWABLE]: FrontErrorCode.REVIEW_NOT_ALLOWED,
  [BackendErrorCode.UNKNOWN_PRODUCT_CATEGORY]: FrontErrorCode.UNKNOWN,
  [BackendErrorCode.INVALID_PRODUCT_CATEGORY_SCHEMA]: FrontErrorCode.UNKNOWN,
  [BackendErrorCode.DISCOUNT_CAMPAIGN_MISSING_REQUIRED_FIELD]: FrontErrorCode.UNKNOWN,
  [BackendErrorCode.DISCOUNT_CAMPAIGN_ALREADY_EXISTS]: FrontErrorCode.UNKNOWN,
  // One card per account: replacing goes through `PUT /bank-card/replace`.
  [BackendErrorCode.BANK_CARD_ALREADY_EXISTS]: FrontErrorCode.CONFLICT,
  // Web push is not used by the front yet.
  [BackendErrorCode.PUSH_SERVICE_NOT_CONFIGURED]: FrontErrorCode.UNAVAILABLE,
  [BackendErrorCode.PUSH_SUBSCRIPTION_CONFLICT]: FrontErrorCode.CONFLICT,
  [BackendErrorCode.INVALID_PUSH_ENDPOINT]: FrontErrorCode.INVALID,
  [BackendErrorCode.PUSH_SUBSCRIPTION_NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [BackendErrorCode.PUSH_SUBSCRIPTION_NOT_OWNED]: FrontErrorCode.FORBIDDEN,
} as const satisfies Record<BackendErrorCode, FrontErrorCode>;

/** Front code used when the body has no known `errorCode`: routed by HTTP status. */
const FRONT_CODE_BY_STATUS: Readonly<Record<number, FrontErrorCode>> = {
  [HTTP_STATUS.BAD_REQUEST]: FrontErrorCode.INVALID,
  [HTTP_STATUS.UNAUTHORIZED]: FrontErrorCode.UNAUTHENTICATED,
  [HTTP_STATUS.FORBIDDEN]: FrontErrorCode.FORBIDDEN,
  [HTTP_STATUS.NOT_FOUND]: FrontErrorCode.NOT_FOUND,
  [HTTP_STATUS.CONFLICT]: FrontErrorCode.CONFLICT,
  [HTTP_STATUS.TOO_MANY_REQUESTS]: FrontErrorCode.RATE_LIMITED,
};

/**
 * HTTP status relayed to the browser instead of the backend one, for the few codes whose status
 * would leak information: a `403` on another user's order would reveal that the order exists.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1.1
 */
const RELAYED_STATUS_BY_BACKEND_CODE: Readonly<Partial<Record<BackendErrorCode, number>>> = {
  [BackendErrorCode.ORDER_DOESNT_BELONGS_TO_USER]: HTTP_STATUS.NOT_FOUND,
};

/**
 * Maps a backend error to the front code the UI branches on.
 *
 * @param backendCode - `errorCode` of the body, `undefined` when absent or unknown.
 * @param status - HTTP status, used when there is no known code.
 * @returns The stable front code.
 */
export function toFrontErrorCode(
  backendCode: BackendErrorCode | undefined,
  status: number,
): FrontErrorCode {
  if (backendCode !== undefined) {
    return FRONT_CODE_BY_BACKEND_CODE[backendCode];
  }
  if (status >= SERVER_ERROR_MIN_STATUS) {
    return FrontErrorCode.UNAVAILABLE;
  }
  return FRONT_CODE_BY_STATUS[status] ?? FrontErrorCode.UNKNOWN;
}

/**
 * Reads the `Retry-After` header as a number of seconds.
 *
 * @param response - Backend response.
 * @returns The delay in seconds, or `undefined` when absent or not a number of seconds.
 */
function readRetryAfterSeconds(response: Response): number | undefined {
  const raw = response.headers.get(RETRY_AFTER_HEADER);
  if (raw === null) {
    return undefined;
  }
  const seconds = Number.parseInt(raw, DECIMAL_RADIX);
  return Number.isNaN(seconds) ? undefined : seconds;
}

/**
 * Parses a JSON string without throwing.
 *
 * @param text - Raw body.
 * @returns The parsed value, or `undefined` when the body is not JSON.
 */
function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Builds the {@link ApiError} of a non-2xx backend response.
 *
 * A body that is not a valid `ErrorResponseDto` (HTML error page, proxy error…) becomes an
 * `UNAVAILABLE` error: from the user's point of view the shop cannot answer.
 *
 * @param response - Non-2xx backend response (body not consumed yet).
 * @param requestId - Backend `X-Request-Id`, if any.
 * @returns The error to throw.
 */
export async function parseErrorResponse(
  response: Response,
  requestId?: string,
): Promise<ApiError> {
  const body = ApiErrorBodySchema.safeParse(safeJsonParse(await response.text()));
  if (!body.success) {
    return new ApiError({
      status: response.status,
      frontCode: FrontErrorCode.UNAVAILABLE,
      message: UNAVAILABLE_MESSAGE,
      requestId,
    });
  }
  const relayedStatus =
    body.data.errorCode === undefined
      ? undefined
      : RELAYED_STATUS_BY_BACKEND_CODE[body.data.errorCode];
  return new ApiError({
    status: relayedStatus ?? response.status,
    frontCode: toFrontErrorCode(body.data.errorCode, response.status),
    message: body.data.message,
    backendCode: body.data.errorCode,
    fieldErrors: body.data.fieldErrors,
    retryAfterSeconds: readRetryAfterSeconds(response),
    requestId,
    stockShortages: body.data.details?.items,
  });
}

/**
 * Builds the error used when the backend could not be reached at all (timeout, network).
 *
 * @param cause - Underlying error, kept for logs.
 * @returns An `UNAVAILABLE` error with status 503.
 */
export function unavailableError(cause: unknown): ApiError {
  const reason = cause instanceof Error ? cause.name : "UnknownError";
  return new ApiError({
    status: HTTP_STATUS.SERVICE_UNAVAILABLE,
    frontCode: FrontErrorCode.UNAVAILABLE,
    message: `${UNAVAILABLE_MESSAGE} (${reason})`,
  });
}
