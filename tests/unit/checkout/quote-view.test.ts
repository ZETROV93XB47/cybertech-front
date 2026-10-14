// @vitest-environment node
/**
 * Displayed quote (feature 003, T015).
 */
import { describe, expect, it } from "vitest";

import { missingAmountForDiscount, toQuoteView } from "@/features/checkout/quote-view";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import type { OrderQuoteResponse } from "@/lib/schemas/order";

/** Quote of a 500 € cart with BLACK_FRIDAY applied and standard shipping. */
const APPLIED: OrderQuoteResponse = {
  subtotalAmount: 500,
  discountKey: "BLACK_FRIDAY",
  discountCalculationType: DiscountCalculationType.PERCENTAGE,
  discountAmount: 100,
  discountApplied: true,
  minOrderAmount: 200,
  shippingCost: 15,
  totalAmount: 415,
  currency: "EUR",
};

describe("toQuoteView", () => {
  it("copies the backend amounts without recomputing them", () => {
    // A total that does not match the invariant proves nothing is recomputed.
    const view = toQuoteView({ ...APPLIED, totalAmount: 999.99 });
    expect(view).toEqual({
      subtotal: 500,
      discount: 100,
      shippingCost: 15,
      total: 999.99,
      currency: "EUR",
      discountKey: "BLACK_FRIDAY",
      isDiscountApplied: true,
      missingAmount: null,
    });
  });

  it("hides the NO_DISCOUNT key", () => {
    const view = toQuoteView({
      ...APPLIED,
      discountKey: "NO_DISCOUNT",
      discountCalculationType: DiscountCalculationType.NONE,
      discountAmount: 0,
      discountApplied: false,
      minOrderAmount: null,
    });
    expect(view.discountKey).toBeNull();
    expect(view.missingAmount).toBeNull();
  });
});

describe("missingAmountForDiscount", () => {
  it("is null when the discount applies", () => {
    expect(missingAmountForDiscount(APPLIED)).toBeNull();
  });

  it("gives the amount missing to the minimum, to the cent", () => {
    expect(
      missingAmountForDiscount({
        ...APPLIED,
        subtotalAmount: 167.9,
        discountAmount: 0,
        discountApplied: false,
      }),
    ).toBe(32.1);
  });

  it("is null without a minimum", () => {
    expect(
      missingAmountForDiscount({
        ...APPLIED,
        discountApplied: false,
        discountAmount: 0,
        minOrderAmount: null,
      }),
    ).toBeNull();
  });

  it("is null for NO_DISCOUNT even with a minimum", () => {
    expect(
      missingAmountForDiscount({
        ...APPLIED,
        discountKey: "NO_DISCOUNT",
        discountApplied: false,
        discountAmount: 0,
      }),
    ).toBeNull();
  });
});
