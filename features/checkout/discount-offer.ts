/**
 * What a discount campaign offers, in words: its advantage (« −20 % », « −10,00 € », « 1 acheté
 * = 1 offert ») and its conditions (minimum order, cap, end date) when they exist (FR-017).
 *
 * Only describes the campaign: the discount actually granted always comes from the backend quote
 * (constitution V).
 *
 * @see specs/003-account-orders/spec.md US2-1, FR-017
 * @see specs/003-account-orders/data-model.md §2.7
 */
import { assertNever } from "@/lib/assert-never";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import { formatDay, formatPrice } from "@/lib/format";
import type { ActiveDiscount } from "@/lib/schemas/discount";

import { DISCOUNT_MESSAGES } from "./messages";

/** A campaign as shown in the discount block. */
export interface DiscountOffer {
  /** Campaign key, sent to the quote. */
  readonly key: string;
  /** Advantage in a few characters. */
  readonly advantage: string;
  /** Conditions, in display order; empty when the campaign has none. */
  readonly conditions: readonly string[];
}

/**
 * Advantage of a campaign.
 *
 * @param discount - Campaign.
 * @returns The advantage, or the key for a campaign without amount.
 */
function advantageOf(discount: ActiveDiscount): string {
  switch (discount.calculationType) {
    case DiscountCalculationType.PERCENTAGE:
      return DISCOUNT_MESSAGES.percentage(discount.percentage ?? 0);
    case DiscountCalculationType.FIXED_AMOUNT:
      return DISCOUNT_MESSAGES.fixed(formatPrice(discount.fixedAmount ?? 0));
    case DiscountCalculationType.BUY_ONE_GET_ONE_FREE:
      return DISCOUNT_MESSAGES.buyOneGetOne;
    case DiscountCalculationType.NONE:
      return discount.discountKey;
    default:
      return assertNever(discount.calculationType);
  }
}

/**
 * Conditions of a campaign: minimum order, cap and end date, when set.
 *
 * @param discount - Campaign.
 * @returns The conditions.
 */
function conditionsOf(discount: ActiveDiscount): string[] {
  const conditions: string[] = [];
  if (discount.minOrderAmount !== null) {
    conditions.push(DISCOUNT_MESSAGES.minOrder(formatPrice(discount.minOrderAmount)));
  }
  if (discount.maxDiscountAmount !== null) {
    conditions.push(DISCOUNT_MESSAGES.cap(formatPrice(discount.maxDiscountAmount)));
  }
  const endsOn = discount.endsAt === null ? null : formatDay(discount.endsAt);
  if (endsOn !== null) {
    conditions.push(DISCOUNT_MESSAGES.until(endsOn));
  }
  return conditions;
}

/**
 * Describes a campaign for the discount block.
 *
 * @param discount - Campaign, validated by `ActiveDiscountSchema`.
 * @returns Its key, advantage and conditions.
 */
export function describeDiscountOffer(discount: ActiveDiscount): DiscountOffer {
  return {
    key: discount.discountKey,
    advantage: advantageOf(discount),
    conditions: conditionsOf(discount),
  };
}
