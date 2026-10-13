/**
 * Delivery information shown on the product page.
 *
 * Fees come from the backend (`GET /shipping/options`); the backend knows no delivery delay, so
 * the delays below are indicative values of the front, always labelled as such on the page
 * (user decision of 2026-10-13). Store pickup is not offered: the backend has no such option.
 *
 * @see docs/backend/api-map.md §7b
 */
import { ShippingType } from "@/lib/enums/shipping";

/** Data-cache lifetime of the shipping options (the backend allows 10 minutes). */
export const SHIPPING_OPTIONS_REVALIDATE_SECONDS = 600;

/** Indicative delivery delay of one shipping type, in business days after the order. */
export interface ShippingDelay {
  readonly minBusinessDays: number;
  readonly maxBusinessDays: number;
}

/** Indicative delays by shipping type (front configuration, not a backend value). */
export const SHIPPING_DELAYS: Readonly<Record<ShippingType, ShippingDelay>> = {
  [ShippingType.STANDARD]: { minBusinessDays: 3, maxBusinessDays: 5 },
  [ShippingType.EXPRESS]: { minBusinessDays: 1, maxBusinessDays: 1 },
};

/** Hour (shop time) before which an express order placed on a delivery eve arrives tomorrow. */
export const EXPRESS_CUTOFF_HOUR = 15;

/** Time zone of the shop, used to compare the ordering time with the cutoff. */
export const SHOP_TIME_ZONE = "Europe/Paris";

/**
 * Days whose next day is a delivery day (Monday to Thursday): no delivery on weekends, and a
 * Friday order arrives on Monday.
 */
export const DELIVERY_EVE_WEEKDAYS: readonly string[] = ["Mon", "Tue", "Wed", "Thu"];
