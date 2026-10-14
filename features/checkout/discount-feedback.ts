/**
 * French text of the discount block feedback (FR-018, FR-020).
 *
 * @see specs/003-account-orders/spec.md US2-4, US2-6
 */
import { assertNever } from "@/lib/assert-never";
import { DiscountFeedbackKind } from "@/lib/enums/checkout";

import type { DiscountFeedback } from "./discount-selection";
import { DISCOUNT_MESSAGES } from "./messages";

/**
 * Text of a feedback.
 *
 * @param feedback - Feedback of the last choice.
 * @returns The text to show and announce.
 */
export function discountFeedbackText(feedback: DiscountFeedback): string {
  switch (feedback.kind) {
    case DiscountFeedbackKind.APPLIED:
      return DISCOUNT_MESSAGES.appliedAnnounce(feedback.key);
    case DiscountFeedbackKind.REMOVED:
      return DISCOUNT_MESSAGES.removedAnnounce;
    case DiscountFeedbackKind.MALFORMED:
      return DISCOUNT_MESSAGES.keyMalformed;
    case DiscountFeedbackKind.REFUSED:
      return DISCOUNT_MESSAGES.refused(feedback.key);
    case DiscountFeedbackKind.EXPIRED:
      return DISCOUNT_MESSAGES.expired(feedback.key);
    default:
      return assertNever(feedback.kind);
  }
}

/**
 * Whether a feedback is an error about the typed key (shown under the field).
 *
 * @param feedback - Feedback, if any.
 * @returns `true` for a malformed or refused key.
 */
export function isKeyError(feedback: DiscountFeedback | null): boolean {
  return (
    feedback?.kind === DiscountFeedbackKind.MALFORMED ||
    feedback?.kind === DiscountFeedbackKind.REFUSED
  );
}
