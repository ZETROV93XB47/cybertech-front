/**
 * Availability shown to the user, derived from the live stock.
 *
 * @see data-model.md §1 ProductAvailability
 */

/** Displayed availability of a product. */
export enum AvailabilityLevel {
  /** More than `LOW_STOCK_THRESHOLD` units available: « En stock ». */
  IN = "in",
  /** Between 1 and `LOW_STOCK_THRESHOLD` units: « Plus que N ». */
  LOW = "low",
  /** No unit available: « Rupture »; adding to the cart is disabled. */
  OUT = "out",
}
