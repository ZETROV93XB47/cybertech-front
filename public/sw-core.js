// @ts-check
/**
 * Pure functions of the cybertech service worker (feature 005), loaded by `sw.js` with
 * `importScripts` and exposed on `self.ctPushCore`.
 *
 * Plain JavaScript served as is (no bundler, research R1): it cannot import the TypeScript
 * constants, so the shared values are repeated below and `tests/unit/push/sw-core.test.ts`
 * checks they match `lib/constants/push.ts` and `lib/enums/push.ts`. The tests load this very
 * file, so what is tested is what the browser runs.
 *
 * @see specs/005-web-push-notifications/research.md R1, R10
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §6
 */
"use strict";

/** Prefix of the notification tag, one per order (`PUSH_NOTIFICATION_TAG_PREFIX`). */
const ORDER_TAG_PREFIX = "order-";

/** Message posted to the pages when the browser renewed the subscription (`PushSwMessageType`). */
const SUBSCRIPTION_CHANGED_MESSAGE = "push-subscription-changed";

/** Colour icon of the notifications, served by the site (never an external URL). */
const NOTIFICATION_ICON_PATH = "/icons/notification-192.png";

/** Monochrome badge of the notifications (Android / ChromeOS status bar). */
const NOTIFICATION_BADGE_PATH = "/icons/notification-badge-96.png";

/** Order UUID sent by the backend (any version). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** First character of a site-relative path. */
const PATH_START = "/";

/** Starts of a path that a browser would read as another host (`//evil.test`, `/\evil.test`). */
const PROTOCOL_RELATIVE_STARTS = ["//", "/\\"];

/**
 * Message of a notification, as sent by the backend.
 *
 * @typedef {object} PushMessage
 * @property {string} title - Title of the notification.
 * @property {string} body - Generic text (never an amount).
 * @property {string} url - Site-relative path of the order page.
 * @property {string} orderUuid - Order UUID, used for the tag.
 */

/**
 * Whether a value is a non-empty string.
 *
 * @param {unknown} value - Value to check.
 * @returns {value is string} `true` for a non-empty string.
 */
function isFilledString(value) {
  return typeof value === "string" && value.length > 0;
}

/**
 * Reads the JSON message of a push event. An unreadable or incomplete message gives `null`, and
 * the worker then shows nothing.
 *
 * @param {string | null | undefined} text - Raw text of `event.data`.
 * @returns {PushMessage | null} The message, or `null`.
 */
function parsePushMessage(text) {
  if (!isFilledString(text)) {
    return null;
  }
  /** @type {unknown} */
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const { title, body, url, orderUuid } = /** @type {Record<string, unknown>} */ (data);
  const isValid =
    isFilledString(title) &&
    typeof body === "string" &&
    isFilledString(url) &&
    typeof orderUuid === "string" &&
    UUID_PATTERN.test(orderUuid);
  return isValid ? { title, body, url, orderUuid } : null;
}

/**
 * Checks the path a notification click may open: only a site-relative path that stays on the
 * site's origin. Any absolute URL, other host or other protocol is refused, so a notification can
 * never open another site (FR-014).
 *
 * @param {unknown} url - `url` of the notification data.
 * @param {string} origin - Origin of the service worker (`self.location.origin`).
 * @returns {string | null} The path (with query and hash) to open, or `null`.
 */
function safeNotificationPath(url, origin) {
  if (!isFilledString(url) || !url.startsWith(PATH_START)) {
    return null;
  }
  if (PROTOCOL_RELATIVE_STARTS.some((start) => url.startsWith(start))) {
    return null;
  }
  const resolved = new URL(url, origin);
  if (resolved.origin !== origin) {
    return null;
  }
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

/**
 * Tag of the notifications of one order: a new message of the same order replaces the previous
 * one instead of piling up.
 *
 * @param {string} orderUuid - Order UUID.
 * @returns {string} `order-{uuid}`.
 */
function notificationTag(orderUuid) {
  return `${ORDER_TAG_PREFIX}${orderUuid}`;
}

/**
 * Chooses the window of the site to bring to the front on a click.
 *
 * @template {{ url: string }} T
 * @param {readonly T[]} windows - Window clients (`clients.matchAll({ type: "window" })`).
 * @param {string} origin - Origin of the site.
 * @returns {T | null} The first window of the site, or `null` to open a new one.
 */
function pickClientToFocus(windows, origin) {
  return (
    windows.find((client) => URL.canParse(client.url) && new URL(client.url).origin === origin) ??
    null
  );
}

/**
 * Compares two keys byte by byte: the subscription's `applicationServerKey` and the decoded
 * public key of the backend (a changed key requires a new subscription, research R7).
 *
 * @param {ArrayBuffer | ArrayBufferView | null | undefined} left - First key.
 * @param {ArrayBuffer | ArrayBufferView | null | undefined} right - Second key.
 * @returns {boolean} `true` when both keys hold the same bytes.
 */
function sameKey(left, right) {
  if (!left || !right) {
    return false;
  }
  const a = ArrayBuffer.isView(left)
    ? new Uint8Array(left.buffer, left.byteOffset, left.byteLength)
    : new Uint8Array(left);
  const b = ArrayBuffer.isView(right)
    ? new Uint8Array(right.buffer, right.byteOffset, right.byteLength)
    : new Uint8Array(right);
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (self)).ctPushCore = Object.freeze({
  ORDER_TAG_PREFIX,
  SUBSCRIPTION_CHANGED_MESSAGE,
  NOTIFICATION_ICON_PATH,
  NOTIFICATION_BADGE_PATH,
  parsePushMessage,
  safeNotificationPath,
  notificationTag,
  pickClientToFocus,
  sameKey,
});
