/**
 * Shipping enums of the backend.
 *
 * @see docs/backend/api-map.md §7b, §D.28
 * @see ShippingType, ShippingProvider (backend `entities/enums`)
 */

/** Delivery speed. */
export enum ShippingType {
  STANDARD = "STANDARD",
  EXPRESS = "EXPRESS",
}

/** Carrier. */
export enum ShippingProvider {
  DHL = "DHL",
  FEDEX = "FEDEX",
}

/** Delivery promise shown for express shipping, depending on the ordering time. */
export enum ExpressPromise {
  /** Ordered on a weekday before the cutoff: delivered the next day. */
  TOMORROW = "tomorrow",
  /** Any other time: delivered within one business day after dispatch. */
  NEXT_BUSINESS_DAY = "next_business_day",
}
