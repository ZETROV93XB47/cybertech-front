/**
 * Keys of the (non-sensitive) data kept in the browser — single place where they are written.
 *
 * Each key carries a `_v1` suffix: changing the stored format later means bumping the suffix,
 * so old data is ignored instead of being read with the wrong shape.
 *
 * @see docs/guest-cart.md §2
 */

/** Every key the front writes to `localStorage` or `sessionStorage`. */
export enum StorageKey {
  /** `localStorage`: guest cart (product UUIDs and quantities only). */
  GUEST_CART = "ct_guest_cart_v1",
  /** `localStorage`: recently viewed product UUIDs. */
  RECENTLY_VIEWED = "ct_recent_v1",
  /** `sessionStorage`: cart action to replay after a forced sign-in. */
  PENDING_ACTION = "ct_pending_action_v1",
  /**
   * `sessionStorage`: product comparison selection (category and 1 to 3 product UUIDs), kept
   * for the tab only.
   *
   * @see specs/002-catalog-refresh/data-model.md §5
   */
  COMPARE = "ct_compare_v1",
}
