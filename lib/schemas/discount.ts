/**
 * Active discount campaigns (`DiscountContext`), shown on the home page, and the discount key
 * typed by the user on the cart or the checkout (feature 003).
 *
 * Amounts are `BigDecimal` on the backend (JSON numbers); dates are `LocalDateTime` without a
 * time zone (`2026-11-27T00:00:00`), kept as strings and read as UTC when displayed.
 *
 * @see specs/001-catalog-auth-cart/data-model.md §1 ActiveDiscount
 * @see docs/backend/api-map.md §5, D.15
 */
import { z } from "zod";

import { assertNever } from "@/lib/assert-never";
import { DISCOUNT_KEY_MAX_LENGTH, DISCOUNT_KEY_PATTERN } from "@/lib/constants/discount";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";

/** `DiscountContext`. */
export const ActiveDiscountSchema = z.object({
  discountKey: z.string().min(1),
  calculationType: z.enum(DiscountCalculationType),
  percentage: z.number().nullable(),
  fixedAmount: z.number().nullable(),
  minOrderAmount: z.number().nullable(),
  maxDiscountAmount: z.number().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
});

/** An active discount campaign. */
export type ActiveDiscount = z.infer<typeof ActiveDiscountSchema>;

/**
 * Discount key typed by the user or read back from the browser storage: trimmed, upper-cased,
 * letters, digits and underscores only. The backend stays the only judge of its validity
 * (`DISCOUNT_TYPE_NOT_ACTIVE`).
 *
 * @see specs/003-account-orders/data-model.md §3
 */
export const DiscountKeySchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(DISCOUNT_KEY_MAX_LENGTH)
  .regex(DISCOUNT_KEY_PATTERN);

/** A well-formed discount key. */
export type DiscountKey = z.infer<typeof DiscountKeySchema>;

/**
 * Tells whether a campaign is worth showing: the backend also returns a `NONE` campaign
 * (`NO_DISCOUNT`) and campaigns could lack their amount.
 *
 * @param discount - Validated campaign.
 * @returns `true` when the campaign gives an actual reduction.
 */
export function isDisplayableDiscount(discount: ActiveDiscount): boolean {
  switch (discount.calculationType) {
    case DiscountCalculationType.PERCENTAGE:
      return discount.percentage !== null && discount.percentage > 0;
    case DiscountCalculationType.FIXED_AMOUNT:
      return discount.fixedAmount !== null && discount.fixedAmount > 0;
    case DiscountCalculationType.BUY_ONE_GET_ONE_FREE:
      return true;
    case DiscountCalculationType.NONE:
      return false;
    default:
      return assertNever(discount.calculationType);
  }
}
