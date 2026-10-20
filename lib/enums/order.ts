/**
 * Order enums: backend lifecycle and payment types, plus the front-only classifications used by
 * the order pages (outcome, status tone, effect of an edit).
 *
 * @see specs/003-account-orders/data-model.md §1 and §5
 * @see docs/backend/api-map.md §7, §D.8, §D.17
 */

/**
 * Lifecycle status of an order, exactly as the backend `OrderStatus` enum serialises it.
 *
 * Nominal path: `CREATED → AWAITING_PAYMENT → PAID → AWAITING_SHIPPING → SHIPPED → DELIVERED`;
 * `PAYMENT_FAILED`, `CANCELED`, `REFUNDED` and `RETURNED` are outcomes.
 *
 * @see OrderStatus.java (backend `entities/enums`)
 */
export enum OrderStatus {
  /** Order created from the cart, payment not started yet. */
  CREATED = "CREATED",
  /** Payment attempt in progress. */
  AWAITING_PAYMENT = "AWAITING_PAYMENT",
  /** Payment refused or failed; can be retried. */
  PAYMENT_FAILED = "PAYMENT_FAILED",
  /** Paid; still editable during the shipping grace period. */
  PAID = "PAID",
  /** Being prepared; editable but no longer cancellable. */
  AWAITING_SHIPPING = "AWAITING_SHIPPING",
  /** Handed to the carrier. */
  SHIPPED = "SHIPPED",
  /** Delivered to the customer. */
  DELIVERED = "DELIVERED",
  /** Sent back by the customer. */
  RETURNED = "RETURNED",
  /** Cancelled before shipping. */
  CANCELED = "CANCELED",
  /** Refunded. */
  REFUNDED = "REFUNDED",
}

/**
 * Payment method chosen for an order (`OrderPlacingRequestDto.paymentType`).
 *
 * Payment is simulated server-side: the value is recorded but does not change what is charged
 * (api-map §E 21).
 */
export enum PaymentType {
  MASTERCARD = "MASTERCARD",
  VISA = "VISA",
  APPLE_PAY = "APPLE_PAY",
  GOOGLE_PAY = "GOOGLE_PAY",
}

/** Final state of an order, shown apart from the nominal timeline (FR-024). */
export enum OrderOutcome {
  CANCELED = "canceled",
  REFUNDED = "refunded",
  RETURNED = "returned",
  PAYMENT_FAILED = "payment-failed",
}

/** Visual tone of a status badge, turned into theme tokens (never conveyed by colour alone). */
export enum StatusTone {
  /** Something is still going on. */
  PROGRESS = "progress",
  /** Reached a good state (paid, delivered). */
  SUCCESS = "success",
  /** Needs the customer's attention (payment failed). */
  WARNING = "warning",
  /** Closed without a positive outcome (cancelled, refunded, returned). */
  NEUTRAL = "neutral",
}

/**
 * Sub-resources of an order BFF route (`/api/orders/{uuid}/{action}`).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 */
export enum OrderRouteAction {
  /** `GET` — status of the order (polling). */
  STATUS = "status",
  /** `POST` — payment retry after a refusal. */
  RETRY_PAYMENT = "retry-payment",
  /** `POST` — cancellation. */
  CANCEL = "cancel",
}

/**
 * Effect of an order edit on what the customer pays, read from the backend amounts before and
 * after the edit, without computing any amount (FR-025).
 */
export enum OrderChangeKind {
  /** `refundedAmount` increased: part of the payment was refunded. */
  REFUNDED = "refunded",
  /** `totalAmount` increased: a complement was charged. */
  CHARGED = "charged",
  /** Neither changed. */
  UNCHANGED = "unchanged",
}

/** Display state of one step of the order timeline (FR-024). */
export enum TimelineStepState {
  /** Step reached and passed. */
  DONE = "done",
  /** Step the order is at now. */
  CURRENT = "current",
  /** Step not reached yet (or never reached, after an outcome). */
  UPCOMING = "upcoming",
}

/** Transitions of the order edit reducer (`features/orders/order-edit.ts`). */
export enum OrderEditActionType {
  SET_QUANTITY = "set-quantity",
  REMOVE_LINE = "remove-line",
  ADD_PRODUCT = "add-product",
  CHANGE_ADDRESS = "change-address",
  SELECT_SHIPPING = "select-shipping",
  SELECT_PAYMENT = "select-payment",
  /** Marks lines refused for lack of stock (added or increased lines). */
  FLAG_STOCK = "flag-stock",
  SET_ADDRESS_ERRORS = "set-address-errors",
  RESTORE_DRAFT = "restore-draft",
}

/** Why an order edit cannot be sent yet. */
export enum OrderEditIssue {
  /** An address field is empty or too long. */
  ADDRESS = "address",
  /** No payment method chosen (the backend does not return the previous one). */
  PAYMENT = "payment",
}

/** Outcome of a click on « Enregistrer les modifications » or « Oui, annuler ». */
export enum OrderActionOutcomeKind {
  /** The backend accepted the change. */
  DONE = "done",
  /** The backend (or the BFF) refused it; the form stays as it is. */
  FAILED = "failed",
  /** The session expired: the browser is on its way to the sign-in page. */
  REDIRECTED = "redirected",
  /** A previous click is still being processed. */
  IGNORED = "ignored",
}
