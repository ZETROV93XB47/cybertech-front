/**
 * What the payment follow-up of the confirmation page shows, from the polled status.
 *
 * `POST /order/place` never answers 402: the payment outcome is only visible in the status
 * (api-map §E 26).
 *
 * @see specs/003-account-orders/spec.md FR-013, FR-014
 * @see specs/003-account-orders/research.md R11
 */
import type { BffError } from "@/lib/api/bff-client";
import { assertNever } from "@/lib/assert-never";
import { PaymentTrackerState } from "@/lib/enums/checkout";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { OrderStatus } from "@/lib/enums/order";

/**
 * Tracker state of a known status.
 *
 * @param status - Order status.
 * @returns The state to show.
 */
function stateOfStatus(status: OrderStatus): PaymentTrackerState {
  switch (status) {
    case OrderStatus.CREATED:
    case OrderStatus.AWAITING_PAYMENT:
      return PaymentTrackerState.PENDING;
    case OrderStatus.PAID:
    case OrderStatus.AWAITING_SHIPPING:
    case OrderStatus.SHIPPED:
    case OrderStatus.DELIVERED:
      return PaymentTrackerState.PAID;
    case OrderStatus.PAYMENT_FAILED:
      return PaymentTrackerState.FAILED;
    case OrderStatus.RETURNED:
    case OrderStatus.CANCELED:
    case OrderStatus.REFUNDED:
      return PaymentTrackerState.UNKNOWN;
    default:
      return assertNever(status);
  }
}

/**
 * State of the payment follow-up.
 *
 * @param status - Latest status read, `undefined` before the first answer.
 * @param isTimedOut - Whether the polling time limit was reached.
 * @param error - Error that stopped the polling, if any.
 * @returns The state to show.
 */
export function paymentTrackerState(
  status: OrderStatus | undefined,
  isTimedOut: boolean,
  error: BffError | null,
): PaymentTrackerState {
  if (
    status !== undefined &&
    status !== OrderStatus.CREATED &&
    status !== OrderStatus.AWAITING_PAYMENT
  ) {
    return stateOfStatus(status);
  }
  if (isTimedOut) {
    return PaymentTrackerState.TIMED_OUT;
  }
  // A temporary outage is retried at the next poll; anything else stops the follow-up.
  if (error !== null && error.code !== FrontErrorCode.UNAVAILABLE) {
    return PaymentTrackerState.UNKNOWN;
  }
  return PaymentTrackerState.PENDING;
}
