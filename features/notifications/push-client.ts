/**
 * Browser side of the push subscription (feature 005): registers the service worker, subscribes
 * the browser with the backend key, and talks to the BFF. No React here: the hook and
 * `PushSync` compose these steps.
 *
 * The browser never calls the backend (constitution III): the key and the subscription go
 * through `/api/notifications/push/*`.
 *
 * @see specs/005-web-push-notifications/research.md R2, R4
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §1–3
 */
import { z } from "zod";

import { bffGet, bffSend } from "@/lib/api/bff-client";
import { SERVICE_WORKER_PATH, SERVICE_WORKER_SCOPE } from "@/lib/constants/push";
import { BFF_ROUTES, pushSubscriptionRoute } from "@/lib/constants/routes";
import { HttpMethod } from "@/lib/enums/http-method";
import { PushPublicKeySchema, PushSubscriptionSavedSchema } from "@/lib/schemas/push";

/** Padding character of standard base64. */
const BASE64_PADDING = "=";

/** Length of a base64 block: the decoded string must be padded to a multiple of it. */
const BASE64_BLOCK_LENGTH = 4;

/**
 * Decodes a base64url string (the VAPID public key) into bytes, as `pushManager.subscribe`
 * expects for `applicationServerKey`.
 *
 * @param value - Base64url string, without padding.
 * @returns The decoded bytes.
 */
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padding = BASE64_PADDING.repeat(
    (BASE64_BLOCK_LENGTH - (value.length % BASE64_BLOCK_LENGTH)) % BASE64_BLOCK_LENGTH,
  );
  const binary = atob(`${value}${padding}`.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/**
 * Registers the service worker (or gets the existing registration) and waits until it is active.
 *
 * @returns The active registration.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: SERVICE_WORKER_SCOPE });
  return navigator.serviceWorker.ready;
}

/**
 * Reads the backend public key through the BFF.
 *
 * @returns The key, base64url.
 * @throws {BffError} `unavailable` when the backend has no VAPID key pair.
 */
export async function fetchPublicKey(): Promise<string> {
  const { publicKey } = await bffGet(
    BFF_ROUTES.pushPublicKey,
    new URLSearchParams(),
    PushPublicKeySchema,
  );
  return publicKey;
}

/**
 * Subscribes the browser to its push service with the backend key. The permission must already
 * be granted: this never prompts.
 *
 * @param registration - Active service worker registration.
 * @param publicKey - Backend public key, base64url.
 * @returns The browser subscription.
 */
export function subscribeBrowser(
  registration: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> {
  return registration.pushManager.subscribe({
    // Every push shows a notification: browsers refuse silent pushes anyway.
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(publicKey),
  });
}

/**
 * Sends the browser subscription to the BFF, for the signed-in account.
 *
 * @param subscription - Browser subscription.
 * @returns The UUID of the saved subscription.
 * @throws {BffError} `invalid`, `unauthenticated`, `conflict` or `unavailable`.
 */
export async function sendSubscription(subscription: PushSubscription): Promise<string> {
  const saved = await bffSend(
    BFF_ROUTES.pushSubscriptions,
    HttpMethod.POST,
    PushSubscriptionSavedSchema,
    subscription.toJSON(),
  );
  return saved.uuid;
}

/**
 * Deletes a subscription of the account through the BFF. A subscription already gone counts as
 * deleted (`204`).
 *
 * @param uuid - UUID of the subscription, from the local record.
 * @throws {BffError} `unauthenticated`, `forbidden` or `unavailable`.
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §3
 */
export async function removeSubscription(uuid: string): Promise<void> {
  await bffSend(pushSubscriptionRoute(uuid), HttpMethod.DELETE, z.undefined());
}

/**
 * Drops the browser subscription of this site, if any, ignoring every failure (no service
 * worker, push service unreachable): the backend already forgot it, and an orphan subscription
 * only expires on the push service side.
 */
export async function unsubscribeBrowser(): Promise<void> {
  try {
    const registration = await registerServiceWorker();
    await unsubscribeQuietly(await registration.pushManager.getSubscription());
  } catch {
    // Nothing else to do: see above.
  }
}

/**
 * Unsubscribes the browser, ignoring a failure (the subscription then expires on the push
 * service side, and the backend drops it at its next send).
 *
 * @param subscription - Browser subscription, if any.
 */
export async function unsubscribeQuietly(subscription: PushSubscription | null): Promise<void> {
  try {
    await subscription?.unsubscribe();
  } catch {
    // Nothing else to do: see above.
  }
}

/**
 * Whether a browser subscription was made with the backend key: a changed key requires a new
 * subscription (research R7).
 *
 * @param subscription - Browser subscription.
 * @param publicKey - Backend public key, base64url.
 * @returns `true` when the keys hold the same bytes.
 */
export function hasSameKey(subscription: PushSubscription, publicKey: string): boolean {
  const used = subscription.options.applicationServerKey;
  if (used === null) {
    return false;
  }
  const left = new Uint8Array(used);
  const right = base64UrlToBytes(publicKey);
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

/**
 * Returns a browser subscription made with the backend key: the existing one when it matches,
 * else a new one (the old one is dropped first). Never prompts: the permission is granted.
 *
 * @param registration - Active service worker registration.
 * @param publicKey - Backend public key, base64url.
 * @param isFresh - Forces a new subscription (new endpoint), e.g. to reclaim a browser linked to
 *   another account.
 * @returns The subscription to send to the BFF.
 */
export async function ensureSubscription(
  registration: ServiceWorkerRegistration,
  publicKey: string,
  isFresh: boolean,
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription();
  if (existing !== null && !isFresh && hasSameKey(existing, publicKey)) {
    return existing;
  }
  await unsubscribeQuietly(existing);
  return subscribeBrowser(registration, publicKey);
}
