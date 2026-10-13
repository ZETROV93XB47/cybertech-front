/**
 * How a discount campaign computes its reduction.
 *
 * @see docs/backend/api-map.md D.15
 */

/** Backend `DiscountContext.calculationType`. */
export enum DiscountCalculationType {
  NONE = "NONE",
  PERCENTAGE = "PERCENTAGE",
  FIXED_AMOUNT = "FIXED_AMOUNT",
  BUY_ONE_GET_ONE_FREE = "BUY_ONE_GET_ONE_FREE",
}
