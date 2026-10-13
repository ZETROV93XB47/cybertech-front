/**
 * Shipping option of the backend (`ShippingOptionResponseDto`).
 *
 * @see docs/backend/api-map.md §D.28
 */
import { z } from "zod";

import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";

/** Length of an ISO 4217 currency code (`EUR`). */
const CURRENCY_CODE_LENGTH = 3;

/** `ShippingOptionResponseDto`: the fee charged for one carrier and speed. */
export const ShippingOptionSchema = z.object({
  provider: z.enum(ShippingProvider),
  type: z.enum(ShippingType),
  cost: z.number().nonnegative(),
  currency: z.string().length(CURRENCY_CODE_LENGTH),
});

/** One shipping option. */
export type ShippingOption = z.infer<typeof ShippingOptionSchema>;
