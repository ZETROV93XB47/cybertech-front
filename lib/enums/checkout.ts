/**
 * Checkout enums: steps of the single-page checkout, kinds of shipping choices and modes of the
 * discount block.
 *
 * @see specs/003-account-orders/data-model.md §1
 * @see specs/003-account-orders/research.md R3, R5, R8
 */

/** Step of the single-page checkout, unfolded one after the other (clarification Q1). */
export enum CheckoutStep {
  ADDRESS = "address",
  SHIPPING = "shipping",
  PAYMENT = "payment",
}

/** Kind of an entry of the shipping step. */
export enum ShippingChoiceKind {
  /** A (type, carrier) pair returned by the backend, with its real price. */
  CARRIER = "carrier",
  /** Store pickup, displayed greyed out « Bientôt disponible » only (clarification Q2). */
  PICKUP_PLACEHOLDER = "pickup-placeholder",
}

/** Where the delivery delay of a shipping choice comes from. */
export enum DelaySource {
  /** Fixed delay sent by the backend (configuration, no business-day computation). */
  BACKEND = "backend",
  /** Front estimate (`SHIPPING_DELAYS`), labelled as such. */
  ESTIMATE = "estimate",
}

/** Where the discount block is shown, which decides the amounts it displays (clarification Q3). */
export enum DiscountBlockMode {
  /** Cart page: subtotal and discount only, shipping and total come at the next step. */
  CART = "cart",
  /** Checkout summary: full breakdown. */
  CHECKOUT = "checkout",
}

/**
 * Outcome of a click on « Valider la commande ».
 *
 * @see specs/003-account-orders/research.md R9, R10
 */
export enum PlaceOutcomeKind {
  /** Order created; the browser is on its way to the confirmation page. */
  PLACED = "placed",
  /** The final quote differs from the displayed total: nothing placed, a new click is needed. */
  TOTAL_CHANGED = "total-changed",
  /** The discount expired meanwhile: nothing placed, the key must be cleared and re-quoted. */
  DISCOUNT_INVALID = "discount-invalid",
  /** Sent elsewhere (sign-in page, or cart with an issue); nothing placed. */
  REDIRECTED = "redirected",
  /** Click ignored: a placement is already in progress. */
  IGNORED = "ignored",
  /** Refused or failed for another reason, shown in the summary. */
  FAILED = "failed",
}

/** Outcome of « Relancer le paiement ». */
export enum RetryPaymentOutcomeKind {
  /** Retry accepted: the status is polled again. */
  RESTARTED = "restarted",
  /** The order was already paid (`payment-already-completed`): shown as paid. */
  ALREADY_PAID = "already-paid",
  /** Retry refused or failed. */
  FAILED = "failed",
}

/** What the payment follow-up of the confirmation page shows. */
export enum PaymentTrackerState {
  /** Payment attempt still running. */
  PENDING = "pending",
  /** Payment accepted (`PAID` or any later status of the nominal path). */
  PAID = "paid",
  /** Payment refused: a retry is offered. */
  FAILED = "failed",
  /** Still running after the polling time limit. */
  TIMED_OUT = "timed-out",
  /** Status unreadable, or the order left the nominal path (cancelled, refunded…). */
  UNKNOWN = "unknown",
}
