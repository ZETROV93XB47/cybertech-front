/**
 * French message of an error of the order actions (edit, cancellation), by front error code.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1.1
 */
import type { BffError } from "@/lib/api/bff-client";
import { assertNever } from "@/lib/assert-never";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { CANCEL_ORDER_MESSAGES, ORDER_ERROR_MESSAGES } from "./messages";

/**
 * Message of an error of the order edit.
 *
 * @param error - BFF error.
 * @returns The message.
 */
export function orderErrorMessage(error: BffError): string {
  switch (error.code) {
    case FrontErrorCode.ORDER_LOCKED:
      return ORDER_ERROR_MESSAGES.locked;
    case FrontErrorCode.INSUFFICIENT_STOCK:
      return ORDER_ERROR_MESSAGES.insufficientStock;
    case FrontErrorCode.PAYMENT_FAILED:
      return ORDER_ERROR_MESSAGES.paymentFailed;
    case FrontErrorCode.NOT_FOUND:
      return ORDER_ERROR_MESSAGES.notFound;
    case FrontErrorCode.RATE_LIMITED:
      return ORDER_ERROR_MESSAGES.rateLimited(error.retryAfterSeconds);
    case FrontErrorCode.UNAVAILABLE:
      return ORDER_ERROR_MESSAGES.unavailable;
    case FrontErrorCode.INVALID:
      return ORDER_ERROR_MESSAGES.invalid;
    case FrontErrorCode.NO_SAVED_CARD:
      return ORDER_ERROR_MESSAGES.noSavedCard;
    case FrontErrorCode.REFUND_FAILED:
      return CANCEL_ORDER_MESSAGES.refundFailed;
    case FrontErrorCode.UNAUTHENTICATED:
    case FrontErrorCode.FORBIDDEN:
    case FrontErrorCode.CONFLICT:
    case FrontErrorCode.ALREADY_EXISTS:
    case FrontErrorCode.EMPTY_CART:
    case FrontErrorCode.DISCOUNT_INVALID:
    case FrontErrorCode.PAYMENT_ALREADY_COMPLETED:
    case FrontErrorCode.ACCOUNT_INACTIVE:
    case FrontErrorCode.CARD_EXPIRED:
    case FrontErrorCode.UNKNOWN:
      return ORDER_ERROR_MESSAGES.unknown;
    default:
      return assertNever(error.code);
  }
}

/**
 * Message of an error of the cancellation: a locked order cannot be cancelled any more.
 *
 * @param error - BFF error.
 * @returns The message.
 */
export function cancelErrorMessage(error: BffError): string {
  return error.code === FrontErrorCode.ORDER_LOCKED
    ? CANCEL_ORDER_MESSAGES.locked
    : orderErrorMessage(error);
}
