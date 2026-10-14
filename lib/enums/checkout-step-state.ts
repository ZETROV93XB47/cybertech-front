/**
 * Display state of a step of the single-page checkout.
 *
 * @see specs/003-account-orders/research.md R3
 */

/** Where a step stands in the checkout. */
export enum CheckoutStepState {
  /** Validated: folded into an editable summary. */
  DONE = "done",
  /** Open: its form is shown. */
  CURRENT = "current",
  /** Not reached yet: title only. */
  UPCOMING = "upcoming",
}

/** Field of the shipping address form. */
export enum AddressField {
  STREET = "street",
  ZIP_CODE = "zipCode",
  CITY = "city",
  COUNTRY = "country",
}

/** Transitions of the checkout reducer (`features/checkout/checkout-state.ts`). */
export enum CheckoutActionType {
  CHANGE_ADDRESS = "change-address",
  SUBMIT_ADDRESS = "submit-address",
  SELECT_SHIPPING = "select-shipping",
  SUBMIT_SHIPPING = "submit-shipping",
  SELECT_PAYMENT = "select-payment",
  SUBMIT_PAYMENT = "submit-payment",
  REOPEN = "reopen",
  /** Restores the choices of a draft kept across a forced re-login. */
  RESTORE_DRAFT = "restore-draft",
}
