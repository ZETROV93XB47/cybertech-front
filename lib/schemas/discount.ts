/**
 * Active discount campaigns (`DiscountContext`), shown on the home page.
 *
 * Amounts are `BigDecimal` on the backend (JSON numbers); dates are `LocalDateTime` without a
 * time zone (`2026-11-27T00:00:00`), kept as strings and read as UTC when displayed.
 *
 * @see specs/001-catalog-auth-cart/data-model.md §1 ActiveDiscount
 * @see docs/backend/api-map.md §5, D.15
 */
import { z } from "zod";

import { assertNever } from "@/lib/assert-never";
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
