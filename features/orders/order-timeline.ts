/**
 * Timeline of an order: where its status sits on the nominal path, and the outcome shown apart
 * when the order left that path (cancelled, refunded, returned, payment refused).
 *
 * The backend keeps only the current status, not its history: for an outcome, the steps marked
 * as done are the last ones that status implies for sure (a returned order was delivered, a
 * refunded one was paid…), never a guess.
 *
 * A paid order is already being prepared for the customer: « Payée » is shown done and
 * « En préparation » current, even though the backend keeps `PAID` (and the order editable)
 * until its shipping grace period ends.
 *
 * @see specs/003-account-orders/spec.md FR-024
 * @see specs/003-account-orders/data-model.md §5
 */
import { assertNever } from "@/lib/assert-never";
import { ORDER_TIMELINE_STEPS } from "@/lib/constants/orders";
import { OrderOutcome, OrderStatus, TimelineStepState } from "@/lib/enums/order";

/** One step of the nominal path, with its display state. */
export interface TimelineStep {
  readonly status: OrderStatus;
  readonly state: TimelineStepState;
}

/** Timeline of an order. */
export interface OrderTimeline {
  readonly steps: readonly TimelineStep[];
  /** Outcome shown after the steps, `null` while the order follows the nominal path. */
  readonly outcome: OrderOutcome | null;
}

/** Where a status places the order: the last step reached, and an outcome if any. */
interface TimelinePosition {
  /** Last nominal step known to be reached. */
  readonly reached: OrderStatus;
  /** Whether that step is the current one (`false` once an outcome closed the order). */
  readonly isCurrent: boolean;
  readonly outcome: OrderOutcome | null;
}

/**
 * Position of a status on the timeline.
 *
 * @param status - Order status.
 * @returns The last step reached and the outcome.
 */
function positionOf(status: OrderStatus): TimelinePosition {
  switch (status) {
    case OrderStatus.PAID:
      return { reached: OrderStatus.AWAITING_SHIPPING, isCurrent: true, outcome: null };
    case OrderStatus.CREATED:
    case OrderStatus.AWAITING_PAYMENT:
    case OrderStatus.AWAITING_SHIPPING:
    case OrderStatus.SHIPPED:
    case OrderStatus.DELIVERED:
      return { reached: status, isCurrent: true, outcome: null };
    case OrderStatus.PAYMENT_FAILED:
      return {
        reached: OrderStatus.AWAITING_PAYMENT,
        isCurrent: false,
        outcome: OrderOutcome.PAYMENT_FAILED,
      };
    case OrderStatus.CANCELED:
      return { reached: OrderStatus.CREATED, isCurrent: false, outcome: OrderOutcome.CANCELED };
    case OrderStatus.REFUNDED:
      return { reached: OrderStatus.PAID, isCurrent: false, outcome: OrderOutcome.REFUNDED };
    case OrderStatus.RETURNED:
      return { reached: OrderStatus.DELIVERED, isCurrent: false, outcome: OrderOutcome.RETURNED };
    default:
      return assertNever(status);
  }
}

/**
 * State of the step at `index` given the index of the last step reached.
 *
 * @param index - Index of the step.
 * @param reachedIndex - Index of the last step reached.
 * @param isCurrent - Whether the reached step is the current one.
 * @returns The display state.
 */
function stepState(index: number, reachedIndex: number, isCurrent: boolean): TimelineStepState {
  if (index < reachedIndex) {
    return TimelineStepState.DONE;
  }
  if (index === reachedIndex) {
    return isCurrent ? TimelineStepState.CURRENT : TimelineStepState.DONE;
  }
  return TimelineStepState.UPCOMING;
}

/**
 * Builds the timeline of an order.
 *
 * @param status - Order status.
 * @returns The nominal steps with their state, and the outcome.
 */
export function buildOrderTimeline(status: OrderStatus): OrderTimeline {
  const { reached, isCurrent, outcome } = positionOf(status);
  const reachedIndex = ORDER_TIMELINE_STEPS.indexOf(reached);
  return {
    steps: ORDER_TIMELINE_STEPS.map((step, index) => ({
      status: step,
      state: stepState(index, reachedIndex, isCurrent),
    })),
    outcome,
  };
}
