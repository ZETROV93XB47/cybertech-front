/**
 * What the review forms say when the backend refuses a review, branching on the front error
 * code (itself mapped from the backend `errorCode`, never from the HTTP status).
 *
 * @see specs/004-catalog-promos-reviews/contracts/bff-routes.md §2.1
 */
import { ApiError } from "@/lib/api/errors";
import { assertNever } from "@/lib/assert-never";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { REVIEW_FORM_MESSAGES } from "./messages";
import type { ReviewFailure } from "./review-state";

const ERRORS = REVIEW_FORM_MESSAGES.errors;

/**
 * Rate-limit message, with the delay when the backend gave one.
 *
 * @param seconds - `Retry-After`, if any.
 * @returns The failure.
 */
function rateLimited(seconds: number | undefined): ReviewFailure {
  return seconds === undefined
    ? { formError: ERRORS.rateLimitedUnknown }
    : { formError: ERRORS.rateLimited(seconds), retryAfterSeconds: seconds };
}

/**
 * Failure of a review request for a front error code.
 *
 * @param code - Front error code.
 * @param retryAfterSeconds - `Retry-After` of a rate limit.
 * @returns What the form shows.
 */
export function reviewFailure(code: FrontErrorCode, retryAfterSeconds?: number): ReviewFailure {
  switch (code) {
    case FrontErrorCode.INVALID:
      return { formError: ERRORS.form };
    case FrontErrorCode.REVIEW_REJECTED:
      return { formError: ERRORS.rejected };
    case FrontErrorCode.REVIEW_NOT_ALLOWED:
      return { formError: ERRORS.notAllowed, isStale: true };
    case FrontErrorCode.NOT_FOUND:
      return { formError: ERRORS.notFound, isStale: true };
    case FrontErrorCode.FORBIDDEN:
      return { formError: ERRORS.forbidden, isStale: true };
    case FrontErrorCode.UNAUTHENTICATED:
      return { formError: ERRORS.sessionExpired, needsSignIn: true };
    case FrontErrorCode.RATE_LIMITED:
      return rateLimited(retryAfterSeconds);
    case FrontErrorCode.UNAVAILABLE:
      return { formError: ERRORS.unavailable };
    case FrontErrorCode.CONFLICT:
    case FrontErrorCode.ALREADY_EXISTS:
    case FrontErrorCode.INSUFFICIENT_STOCK:
    case FrontErrorCode.EMPTY_CART:
    case FrontErrorCode.UNKNOWN:
    case FrontErrorCode.DISCOUNT_INVALID:
    case FrontErrorCode.PAYMENT_FAILED:
    case FrontErrorCode.PAYMENT_ALREADY_COMPLETED:
    case FrontErrorCode.ORDER_LOCKED:
    case FrontErrorCode.REFUND_FAILED:
    case FrontErrorCode.ACCOUNT_INACTIVE:
    case FrontErrorCode.CARD_EXPIRED:
    case FrontErrorCode.NO_SAVED_CARD:
      return { formError: ERRORS.unknown };
    default:
      return assertNever(code);
  }
}

/**
 * Failure of a review request from anything thrown while reading the token or calling the
 * backend.
 *
 * @param error - Thrown value.
 * @returns What the form shows.
 */
export function toReviewFailure(error: unknown): ReviewFailure {
  return error instanceof ApiError
    ? reviewFailure(error.frontCode, error.retryAfterSeconds)
    : reviewFailure(FrontErrorCode.UNKNOWN);
}
