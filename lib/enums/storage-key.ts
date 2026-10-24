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
  /**
   * `sessionStorage`: key of the discount campaign chosen on the cart or the checkout.
   *
   * @see specs/003-account-orders/research.md R7
   */
  DISCOUNT = "ct_discount_v1",
  /**
   * `sessionStorage`: checkout draft (step, shipping and payment choices), never the address.
   *
   * @see specs/003-account-orders/research.md R9
   */
  CHECKOUT = "ct_checkout_v1",
  /**
   * `sessionStorage`: product a visitor wanted to add to the wishlist, added once after the
   * sign-in.
   *
   * @see specs/003-account-orders/research.md R22
   */
  WISHLIST_PENDING = "ct_wishlist_pending_v1",
  /**
   * `sessionStorage`: changes of an order edit kept across a forced re-login (lines, shipping,
   * payment; never the address), restored once and never saved automatically.
   *
   * @see specs/003-account-orders/tasks.md T053
   */
  ORDER_EDIT = "ct_order_edit_v1",
  /**
   * `localStorage`: UUID of the push subscription of this browser (`{ subscriptionUuid }` only,
   * never the endpoint nor the keys). Its presence proves a customer turned notifications on
   * here; the sign-out removes it.
   *
   * @see specs/005-web-push-notifications/research.md R6
   */
  PUSH = "ct_push_v1",
  /**
   * `sessionStorage`: the push subscription was already sent to the backend for this tab.
   *
   * @see specs/005-web-push-notifications/research.md R7
   */
  PUSH_SYNC = "ct_push_sync_v1",
}
