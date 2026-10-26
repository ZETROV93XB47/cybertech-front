/**
 * Browser push notification constants (feature 005).
 *
 * Some values are repeated at the top of `public/sw-core.js`, which is plain JavaScript served
 * as is and cannot import this module; `tests/unit/push/sw-core.test.ts` checks both copies are
 * equal.
 *
 * @see specs/005-web-push-notifications/data-model.md §5
 */

/**
 * Path of the service worker script, served from `public/`.
 *
 * @see specs/005-web-push-notifications/research.md R1
 */
export const SERVICE_WORKER_PATH = "/sw.js";

/** Path of the pure functions loaded by the service worker with `importScripts`. */
export const SERVICE_WORKER_CORE_PATH = "/sw-core.js";

/**
 * Scope of the service worker: the whole site (also sent as `Service-Worker-Allowed`).
 *
 * @see specs/005-web-push-notifications/research.md R13
 */
export const SERVICE_WORKER_SCOPE = "/";

/**
 * Maximum time the sign-out waits for the backend to delete the push subscription: the sign-out
 * is never delayed by more than that, even with the backend down (SC-007).
 *
 * @see specs/005-web-push-notifications/research.md R8
 */
export const PUSH_SIGN_OUT_TIMEOUT_MS = 2_000;

/**
 * Defensive bound of a push endpoint URL (FCM endpoints are about 200 characters).
 *
 * @see specs/005-web-push-notifications/research.md R12
 */
export const PUSH_ENDPOINT_MAX_LENGTH = 2_048;

/**
 * Defensive bound of a subscription key in base64url (`p256dh` is 87 characters, `auth` 22).
 *
 * @see specs/005-web-push-notifications/research.md R12
 */
export const PUSH_KEY_MAX_LENGTH = 256;

/**
 * Prefix of the notification tag: one tag per order, so that the shipping notification replaces
 * the payment one (copy in `public/sw-core.js`).
 *
 * @see specs/005-web-push-notifications/research.md R10
 */
export const PUSH_NOTIFICATION_TAG_PREFIX = "order-";

/**
 * Name of the hidden field of the sign-out form carrying the subscription UUID to delete.
 *
 * @see specs/005-web-push-notifications/research.md R8
 */
export const PUSH_SIGN_OUT_FIELD = "pushSubscriptionUuid";

/** What replaces the private part of a push endpoint in a log line (`maskPushEndpoint`). */
export const PUSH_ENDPOINT_LOG_PLACEHOLDER = "…";

/** `Notification.permission` once the customer allowed notifications for the site. */
export const NOTIFICATION_PERMISSION_GRANTED: NotificationPermission = "granted";

/** `Notification.permission` once notifications are blocked (prompt refused, or site settings). */
export const NOTIFICATION_PERMISSION_DENIED: NotificationPermission = "denied";

/** Event of `navigator.serviceWorker` carrying the messages posted by the service worker. */
export const SERVICE_WORKER_MESSAGE_EVENT = "message";
