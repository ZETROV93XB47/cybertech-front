/**
 * Cart enums shared by the guest cart, the account cart and the merge.
 *
 * @see docs/guest-cart.md §6
 */

/** Where the data of a displayed cart comes from. */
export enum CartSource {
  /** Visitor cart, kept in the browser until it is merged at sign-in. */
  GUEST = "guest",
  /** Account cart; the backend is the source of truth. */
  ACCOUNT = "account",
}

/** State of one cart line after live price and stock checks. */
export enum CartLineStatus {
  /** Product exists and the requested quantity is available. */
  OK = "ok",
  /** Product exists but less stock is available than requested. */
  INSUFFICIENT_STOCK = "insufficient-stock",
  /** Product no longer exists (deleted between the add and the display). */
  UNAVAILABLE = "unavailable",
}

/** Why a guest line could not be merged into the account cart. */
export enum MergeDropReason {
  OUT_OF_STOCK = "out-of-stock",
  NOT_FOUND = "not-found",
}

/** Cart action kept aside to be replayed after a forced sign-in (research R14). */
export enum PendingActionType {
  /** Add a quantity to a line (additive). */
  ADD = "add",
  /** Set the absolute quantity of a line. */
  SET = "set",
  /** Remove a line. */
  REMOVE = "remove",
}
