// @ts-check
/**
 * Service worker of cybertech (feature 005): shows the push notifications sent by the backend
 * (payment confirmed, order shipped), opens the order page when one is clicked, and subscribes
 * again when the browser renews the subscription.
 *
 * Plain JavaScript served from `public/` with `Cache-Control: no-cache` and
 * `Service-Worker-Allowed: /` (`next.config.ts`), registered by the pages only when the customer
 * turns notifications on (research R2). No cache, no fetch handler: the site works the same with
 * or without it. The pure logic lives in `sw-core.js` and is tested on the served file.
 *
 * @see specs/005-web-push-notifications/research.md R1, R9, R10
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §6
 */
"use strict";

/** Pure functions of the worker, served next to it. */
const CORE_SCRIPT_PATH = "/sw-core.js";

importScripts(CORE_SCRIPT_PATH);

/** Shape of `self` used here (the service worker global scope). */
const worker = /** @type {any} */ (self);

/** Functions loaded from `sw-core.js`. */
const core = worker.ctPushCore;

/** Type of the window clients the click looks for. */
const WINDOW_CLIENT_TYPE = "window";

/**
 * Shows the notification of a push message; an unreadable message shows nothing.
 *
 * @param {{ data?: { text(): string } | null }} event - Push event.
 * @returns {Promise<void>} Resolved once the notification is shown.
 */
async function showPushNotification(event) {
  const message = core.parsePushMessage(event.data?.text());
  if (message === null) {
    return;
  }
  await worker.registration.showNotification(message.title, {
    body: message.body,
    icon: core.NOTIFICATION_ICON_PATH,
    badge: core.NOTIFICATION_BADGE_PATH,
    tag: core.notificationTag(message.orderUuid),
    // The shipping message replaces the payment one (same tag) and must still be signalled.
    renotify: true,
    data: { url: message.url },
  });
}

/**
 * Opens the page of a clicked notification: brings a window of the site to the front and moves
 * it to the page, or opens a new window. A path that is not on the site opens nothing.
 *
 * @param {{ notification: { close(): void, data?: { url?: unknown } } }} event - Click event.
 * @returns {Promise<void>} Resolved once the page is shown.
 */
async function openClickedNotification(event) {
  event.notification.close();
  const origin = worker.location.origin;
  const path = core.safeNotificationPath(event.notification.data?.url, origin);
  if (path === null) {
    return;
  }
  const windows = await worker.clients.matchAll({
    type: WINDOW_CLIENT_TYPE,
    includeUncontrolled: true,
  });
  const target = core.pickClientToFocus(windows, origin);
  if (target === null) {
    await worker.clients.openWindow(path);
    return;
  }
  await target.focus();
  await target.navigate(path);
}

/**
 * Subscribes again after the browser renewed or dropped the subscription, with the same backend
 * key, then tells the open pages: the page of a signed-in customer sends the new subscription to
 * the backend (the worker has no session). Without a key or on failure, nothing happens: the sync
 * at the next session start catches up.
 *
 * @param {{ oldSubscription?: { options?: { applicationServerKey?: ArrayBuffer | null } } | null }} event
 *   Subscription change event.
 * @returns {Promise<void>} Resolved once the pages are told, or at once.
 */
async function renewSubscription(event) {
  const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
  if (!applicationServerKey) {
    return;
  }
  try {
    // Every push shows a notification: browsers refuse silent pushes anyway.
    await worker.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch {
    return;
  }
  const windows = await worker.clients.matchAll({
    type: WINDOW_CLIENT_TYPE,
    includeUncontrolled: true,
  });
  for (const client of windows) {
    client.postMessage({ type: core.SUBSCRIPTION_CHANGED_MESSAGE });
  }
}

worker.addEventListener("install", () => {
  // A new version replaces the old one at once: there is no cache to keep consistent.
  void worker.skipWaiting();
});

worker.addEventListener(
  "activate",
  (/** @type {{ waitUntil(p: Promise<unknown>): void }} */ event) => {
    event.waitUntil(worker.clients.claim());
  },
);

worker.addEventListener("push", (/** @type {any} */ event) => {
  event.waitUntil(showPushNotification(event));
});

worker.addEventListener("notificationclick", (/** @type {any} */ event) => {
  event.waitUntil(openClickedNotification(event));
});

worker.addEventListener("pushsubscriptionchange", (/** @type {any} */ event) => {
  event.waitUntil(renewSubscription(event));
});
