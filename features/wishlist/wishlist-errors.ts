/**
 * French message of a refused wishlist change, by front error code.
 *
 * @see specs/003-account-orders/spec.md US6 scenario 3
 */
import { assertNever } from "@/lib/assert-never";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { WISHLIST_MESSAGES } from "./messages";

/**
 * Message of a wishlist change that failed (the heart is back to its previous state).
 *
 * @param code - Front error code of the BFF answer.
 * @returns The message.
 */
export function wishlistErrorMessage(code: FrontErrorCode): string {
  switch (code) {
    case FrontErrorCode.UNAVAILABLE:
      return WISHLIST_MESSAGES.unavailable;
    case FrontErrorCode.RATE_LIMITED:
      return WISHLIST_MESSAGES.rateLimited;
    case FrontErrorCode.NOT_FOUND:
      return WISHLIST_MESSAGES.productGone;
    case FrontErrorCode.UNAUTHENTICATED:
      return WISHLIST_MESSAGES.signInToAdd;
    case FrontErrorCode.INVALID:
    case FrontErrorCode.FORBIDDEN:
    case FrontErrorCode.INSUFFICIENT_STOCK:
    case FrontErrorCode.CONFLICT:
    case FrontErrorCode.EMPTY_CART:
    case FrontErrorCode.ALREADY_EXISTS:
    case FrontErrorCode.UNKNOWN:
    case FrontErrorCode.DISCOUNT_INVALID:
    case FrontErrorCode.PAYMENT_FAILED:
    case FrontErrorCode.PAYMENT_ALREADY_COMPLETED:
    case FrontErrorCode.ORDER_LOCKED:
    case FrontErrorCode.REFUND_FAILED:
    case FrontErrorCode.ACCOUNT_INACTIVE:
    case FrontErrorCode.CARD_EXPIRED:
    case FrontErrorCode.NO_SAVED_CARD:
      return WISHLIST_MESSAGES.failed;
    default:
      return assertNever(code);
  }
}
