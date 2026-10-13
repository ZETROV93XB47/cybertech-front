/**
 * Delivery block of the product page: the fees of each speed (backend) and its indicative delay
 * (front configuration), plus the express promise of the moment (« livré demain »).
 *
 * @see lib/constants/shipping.ts
 * @see docs/backend/api-map.md §7b
 */
import {
  DELIVERY_EVE_WEEKDAYS,
  EXPRESS_CUTOFF_HOUR,
  SHIPPING_DELAYS,
  SHOP_TIME_ZONE,
  type ShippingDelay,
} from "@/lib/constants/shipping";
import { ExpressPromise, ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import type { ShippingOption } from "@/lib/schemas/shipping";

/** Locale used only to read the weekday and hour of a date (never shown). */
const CLOCK_LOCALE = "en-US";

/** One delivery speed, ready to display. */
export interface DeliveryLine {
  readonly type: ShippingType;
  /** Lowest fee among the carriers; `null` when the fees could not be read. */
  readonly fromCost: number | null;
  /** `true` when every carrier charges the same fee (« 15,00 € » rather than « dès 15,00 € »). */
  readonly isSingleCost: boolean;
  /** Carriers offering this speed, in enum order; every carrier when the fees are unknown. */
  readonly providers: readonly ShippingProvider[];
  /** Indicative delay (front configuration). */
  readonly delay: ShippingDelay;
}

/**
 * Builds the line of one speed.
 *
 * @param type - Shipping speed.
 * @param options - Backend options, `null` when unavailable.
 * @returns The line.
 */
function toLine(type: ShippingType, options: readonly ShippingOption[] | null): DeliveryLine {
  const delay = SHIPPING_DELAYS[type];
  if (options === null) {
    return {
      type,
      fromCost: null,
      isSingleCost: false,
      providers: Object.values(ShippingProvider),
      delay,
    };
  }
  const matching = options.filter((option) => option.type === type);
  const costs = matching.map((option) => option.cost);
  const providers = Object.values(ShippingProvider).filter((provider) =>
    matching.some((option) => option.provider === provider),
  );
  return {
    type,
    fromCost: costs.length > 0 ? Math.min(...costs) : null,
    isSingleCost: new Set(costs).size === 1,
    providers,
    delay,
  };
}

/**
 * Lists the delivery speeds, standard first.
 *
 * @param options - Backend options, `null` when they could not be loaded.
 * @returns One line per speed the backend offers (both speeds, without fee, when unknown).
 */
export function buildDeliveryLines(
  options: readonly ShippingOption[] | null,
): readonly DeliveryLine[] {
  return Object.values(ShippingType)
    .map((type) => toLine(type, options))
    .filter((line) => options === null || line.providers.length > 0);
}

/**
 * Tells what an express order placed now can promise.
 *
 * @param now - Ordering time.
 * @returns `TOMORROW` from Monday to Thursday before {@link EXPRESS_CUTOFF_HOUR} (shop time),
 * `NEXT_BUSINESS_DAY` otherwise.
 */
export function expressPromise(now: Date): ExpressPromise {
  const parts = new Intl.DateTimeFormat(CLOCK_LOCALE, {
    timeZone: SHOP_TIME_ZONE,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return DELIVERY_EVE_WEEKDAYS.includes(weekday) && hour < EXPRESS_CUTOFF_HOUR
    ? ExpressPromise.TOMORROW
    : ExpressPromise.NEXT_BUSINESS_DAY;
}
