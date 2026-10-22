/**
 * French messages of a failed card request, shared by the Server Actions (backend `ApiError`)
 * and the « Ajouter une carte » form (`BffError`): both carry a front error code. The backend
 * messages are English and never shown.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2, §2 bis
 */
import { assertNever } from "@/lib/assert-never";
import { BankCardField } from "@/lib/enums/bank-card";
import { FrontErrorCode } from "@/lib/enums/error-code";

import type { CardFailure } from "./card-state";
import { CARD_MESSAGES } from "./messages";

const ERRORS = CARD_MESSAGES.errors;

/**
 * Failure of a rate-limited request.
 *
 * @param seconds - Delay from `Retry-After`, if known.
 * @returns The message and the delay.
 */
function rateLimited(seconds: number | undefined): CardFailure {
  return seconds === undefined
    ? { formError: ERRORS.rateLimitedUnknown }
    : { formError: ERRORS.rateLimited(seconds), retryAfterSeconds: seconds };
}

/**
 * Builds what a card form shows after a refused or failed request.
 *
 * @param code - Front error code of the failure.
 * @param retryAfterSeconds - Delay sent with a `rate-limited` error.
 * @returns The form error, and the field error when one field is to blame.
 */
export function cardFailure(code: FrontErrorCode, retryAfterSeconds?: number): CardFailure {
  switch (code) {
    case FrontErrorCode.INVALID:
      return { formError: ERRORS.form };
    case FrontErrorCode.CARD_EXPIRED:
      return {
        formError: ERRORS.form,
        fieldErrors: { [BankCardField.EXPIRY_MONTH]: ERRORS.expiryPast },
      };
    case FrontErrorCode.UNAUTHENTICATED:
      return { formError: ERRORS.sessionExpired, needsSignIn: true };
    case FrontErrorCode.NO_SAVED_CARD:
    case FrontErrorCode.NOT_FOUND:
      return { formError: ERRORS.noCard };
    case FrontErrorCode.CONFLICT:
    case FrontErrorCode.ALREADY_EXISTS:
      return { formError: ERRORS.alreadyHasCard };
    case FrontErrorCode.RATE_LIMITED:
      return rateLimited(retryAfterSeconds);
    case FrontErrorCode.UNAVAILABLE:
      return { formError: ERRORS.unavailable };
    case FrontErrorCode.FORBIDDEN:
    case FrontErrorCode.INSUFFICIENT_STOCK:
    case FrontErrorCode.EMPTY_CART:
    case FrontErrorCode.UNKNOWN:
    case FrontErrorCode.REVIEW_REJECTED:
    case FrontErrorCode.MODERATION_UNAVAILABLE:
    case FrontErrorCode.REVIEW_NOT_ALLOWED:
    case FrontErrorCode.DISCOUNT_INVALID:
    case FrontErrorCode.PAYMENT_FAILED:
    case FrontErrorCode.PAYMENT_ALREADY_COMPLETED:
    case FrontErrorCode.ORDER_LOCKED:
    case FrontErrorCode.REFUND_FAILED:
    case FrontErrorCode.ACCOUNT_INACTIVE:
      return { formError: ERRORS.unknown };
    default:
      return assertNever(code);
  }
}
