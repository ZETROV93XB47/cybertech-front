/**
 * Shipping option of the backend (`ShippingOptionResponseDto`).
 *
 * @see docs/backend/api-map.md §D.28
 */
import { z } from "zod";

import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";

/** Length of an ISO 4217 currency code (`EUR`). */
const CURRENCY_CODE_LENGTH = 3;

/** Delivery delay in days: a whole, non-negative number. */
const DeliveryDaysSchema = z.number().int().nonnegative();

/**
 * `ShippingOptionResponseDto`: the fee charged for one carrier and speed.
 *
 * `minDeliveryDays` / `maxDeliveryDays` anticipate the backend request of
 * `docs/backend/backend-prompts-lot2.md` §9 (fixed delays from configuration, no business-day
 * computation); they are optional so the current backend, which does not send them, still
 * parses. Their final names are confirmed by `npm run gen:api` once the backend ships them.
 *
 * @see specs/003-account-orders/research.md R8
 */
export const ShippingOptionSchema = z
  .object({
    provider: z.enum(ShippingProvider),
    type: z.enum(ShippingType),
    cost: z.number().nonnegative(),
    currency: z.string().length(CURRENCY_CODE_LENGTH),
    minDeliveryDays: DeliveryDaysSchema.optional(),
    maxDeliveryDays: DeliveryDaysSchema.optional(),
  })
  .refine(
    ({ minDeliveryDays, maxDeliveryDays }) =>
      minDeliveryDays === undefined ||
      maxDeliveryDays === undefined ||
      maxDeliveryDays >= minDeliveryDays,
    { message: "maxDeliveryDays must not be below minDeliveryDays", path: ["maxDeliveryDays"] },
  );

/** One shipping option. */
export type ShippingOption = z.infer<typeof ShippingOptionSchema>;
