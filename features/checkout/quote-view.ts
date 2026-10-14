/**
 * Displayed quote: the amounts of the backend quote, ready for the checkout summary and the
 * discount block, plus the informative amount still missing to reach a campaign minimum.
 *
 * Built on the server by `POST /api/checkout/quote` and validated again in the browser.
 *
 * @see specs/003-account-orders/data-model.md §4.1
 * @see specs/003-account-orders/research.md R4, R6
 */
import { z } from "zod";

import { roundToCents } from "@/features/cart/cart-view";
import { NO_DISCOUNT_KEY } from "@/lib/constants/discount";
import type { OrderQuoteResponse } from "@/lib/schemas/order";

/** Quote as sent to the browser. Every amount is copied from the backend, never recomputed. */
export const QuoteViewSchema = z.object({
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  shippingCost: z.number().nonnegative(),
  total: z.number().nonnegative(),
  currency: z.string().min(1),
  /** Campaign key priced, `null` for `NO_DISCOUNT`. */
  discountKey: z.string().min(1).nullable(),
  /** `false` when the campaign minimum is not reached (the backend dropped the discount). */
  isDiscountApplied: z.boolean(),
  /** Amount still missing to reach the campaign minimum, `null` when nothing is missing. */
  missingAmount: z.number().positive().nullable(),
});

/** Displayed quote. */
export type QuoteView = z.infer<typeof QuoteViewSchema>;

/**
 * Amount still missing to reach the minimum of the requested campaign.
 *
 * Informative only: it is the difference of two backend values, never charged nor sent back
 * (constitution V).
 *
 * @param quote - Backend quote.
 * @returns The missing amount, or `null` when the discount applies, has no minimum, or none
 *   was asked.
 * @see specs/003-account-orders/spec.md FR-019
 */
export function missingAmountForDiscount(quote: OrderQuoteResponse): number | null {
  if (quote.discountApplied || quote.discountKey === NO_DISCOUNT_KEY) {
    return null;
  }
  if (quote.minOrderAmount === null) {
    return null;
  }
  const missing = roundToCents(quote.minOrderAmount - quote.subtotalAmount);
  return missing > 0 ? missing : null;
}

/**
 * Turns a backend quote into the displayed quote.
 *
 * @param quote - Backend quote, validated by `OrderQuoteResponseSchema`.
 * @returns The displayed quote.
 */
export function toQuoteView(quote: OrderQuoteResponse): QuoteView {
  return {
    subtotal: quote.subtotalAmount,
    discount: quote.discountAmount,
    shippingCost: quote.shippingCost,
    total: quote.totalAmount,
    currency: quote.currency,
    discountKey: quote.discountKey === NO_DISCOUNT_KEY ? null : quote.discountKey,
    isDiscountApplied: quote.discountApplied,
    missingAmount: missingAmountForDiscount(quote),
  };
}
