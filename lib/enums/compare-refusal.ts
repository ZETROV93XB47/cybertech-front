/**
 * Reasons why a product cannot join the comparison.
 *
 * @see specs/002-catalog-refresh/data-model.md §5
 */

/** Why adding a product to the comparison is refused. */
export enum CompareRefusal {
  /** The comparison already holds `COMPARE_MAX_PRODUCTS` products. */
  FULL = "full",
  /** The product belongs to another category than the comparison. */
  OTHER_CATEGORY = "other_category",
}
