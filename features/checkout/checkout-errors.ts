/**
 * French message of a checkout error, by front error code (contracts §1.1).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1.1
 */
import type { BffError } from "@/lib/api/bff-client";
import { assertNever } from "@/lib/assert-never";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { CHECKOUT_ERROR_MESSAGES } from "./messages";

/**
 * Message of an error of the quote or of the placement.
 *
 * Errors that send the customer elsewhere (`unauthenticated`, `empty-cart`,
 * `insufficient-stock`) still get a message, shown while the browser leaves.
 *
 * @param error - BFF error.
 * @returns The message.
 */
export function checkoutErrorMessage(error: BffError): string {
  switch (error.code) {
    case FrontErrorCode.EMPTY_CART:
      return CHECKOUT_ERROR_MESSAGES.emptyCart;
    case FrontErrorCode.INSUFFICIENT_STOCK:
      return CHECKOUT_ERROR_MESSAGES.insufficientStock;
    case FrontErrorCode.ACCOUNT_INACTIVE:
      return CHECKOUT_ERROR_MESSAGES.accountInactive;
    case FrontErrorCode.DISCOUNT_INVALID:
      return CHECKOUT_ERROR_MESSAGES.discountInvalid;
    case FrontErrorCode.RATE_LIMITED:
      return CHECKOUT_ERROR_MESSAGES.rateLimited(error.retryAfterSeconds);
    case FrontErrorCode.UNAVAILABLE:
      return CHECKOUT_ERROR_MESSAGES.unavailable;
    case FrontErrorCode.UNAUTHENTICATED:
      return CHECKOUT_ERROR_MESSAGES.sessionExpired;
    case FrontErrorCode.NOT_FOUND:
      return CHECKOUT_ERROR_MESSAGES.profileMissing;
    case FrontErrorCode.NO_SAVED_CARD:
      return CHECKOUT_ERROR_MESSAGES.noSavedCard;
    case FrontErrorCode.INVALID:
    case FrontErrorCode.FORBIDDEN:
    case FrontErrorCode.CONFLICT:
    case FrontErrorCode.ALREADY_EXISTS:
    case FrontErrorCode.UNKNOWN:
    case FrontErrorCode.PAYMENT_FAILED:
    case FrontErrorCode.PAYMENT_ALREADY_COMPLETED:
    case FrontErrorCode.ORDER_LOCKED:
    case FrontErrorCode.REFUND_FAILED:
    case FrontErrorCode.CARD_EXPIRED:
      return CHECKOUT_ERROR_MESSAGES.unknown;
    default:
      return assertNever(error.code);
  }
}
