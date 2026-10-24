/**
 * Closed sets of the browser push notifications (feature 005).
 *
 * @see specs/005-web-push-notifications/data-model.md §1
 */

/**
 * What the browser can do with push notifications.
 *
 * @see specs/005-web-push-notifications/research.md R3
 */
export enum PushSupport {
  /** Service worker, `PushManager` and `Notification` are available in a secure context. */
  SUPPORTED = "supported",
  /** iPhone / iPad outside of a home-screen app: push only works once the site is installed. */
  INSTALL_REQUIRED = "install-required",
  /** No push in this browser (or insecure context): the feature is hidden. */
  UNSUPPORTED = "unsupported",
}

/**
 * State of the notifications shown to the customer on this browser (FR-005).
 *
 * @see specs/005-web-push-notifications/data-model.md §1 (transitions)
 */
export enum PushState {
  /** The browser cannot receive notifications: nothing is shown. */
  UNSUPPORTED = "unsupported",
  /** iPhone / iPad: short explanation about installing the site. */
  INSTALL_REQUIRED = "install-required",
  /** Can be turned on: the « Activer les notifications » button is offered. */
  IDLE = "idle",
  /** Permission request, subscription or backend call in progress. */
  PENDING = "pending",
  /** This browser is subscribed for the signed-in account. */
  ENABLED = "enabled",
  /** The customer blocked notifications: how to allow them again, never asked again. */
  DENIED = "denied",
  /** The backend push service is not available (503): nothing changed. */
  UNAVAILABLE = "unavailable",
  /** The browser is already linked to another account (409): offer to enable it here. */
  CONFLICT = "conflict",
  /** Unexpected failure (or expired session): the customer can try again. */
  ERROR = "error",
}

/**
 * Messages posted by the service worker to the open pages.
 *
 * @see specs/005-web-push-notifications/research.md R9
 */
export enum PushSwMessageType {
  /** The browser renewed the subscription: the pages must send it to the BFF. */
  SUBSCRIPTION_CHANGED = "push-subscription-changed",
}
