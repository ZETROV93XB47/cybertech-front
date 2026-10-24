/**
 * Fake browser push APIs for the unit tests of feature 005: `Notification`, the service worker
 * container and `PushManager`, with spies, so that the hook and `PushSync` run without a real
 * browser.
 */
import { vi, type Mock } from "vitest";

import { installMatchMedia } from "./match-media";

/** Public key answered by the fake BFF (base64url). */
export const PUBLIC_KEY = "BAECAwQ";

/** Another key, as after a VAPID key rotation. */
export const OTHER_PUBLIC_KEY = "BAkICAk";

/** Endpoint of the fake subscriptions; its path stands for the device secret. */
export const FAKE_ENDPOINT = "https://fcm.googleapis.com/fcm/send/device-secret";

/** Options of {@link installPushBrowser}. */
export interface PushBrowserOptions {
  /** `Notification.permission` before any request. */
  readonly permission?: NotificationPermission;
  /** Answer of `Notification.requestPermission()`. */
  readonly answer?: NotificationPermission;
  /** Key of a subscription the browser already has, or `null` for none. */
  readonly existingKey?: string | null;
  /** Without `PushManager` (unsupported browser). */
  readonly withoutPush?: boolean;
}

/** A fake subscription and its spies. */
export interface FakeSubscription {
  readonly endpoint: string;
  readonly options: { readonly applicationServerKey: ArrayBuffer };
  readonly unsubscribe: Mock<() => Promise<boolean>>;
  toJSON(): Record<string, unknown>;
}

/** Spies of the fake browser. */
export interface FakePushBrowser {
  readonly requestPermission: Mock<() => Promise<NotificationPermission>>;
  readonly register: Mock;
  readonly subscribe: Mock<(options: PushSubscriptionOptionsInit) => Promise<FakeSubscription>>;
  readonly getSubscription: Mock<() => Promise<FakeSubscription | null>>;
  /** Subscriptions created by `subscribe`, in order. */
  readonly created: FakeSubscription[];
  /** Listeners of `navigator.serviceWorker` `message` events. */
  readonly messageListeners: ((event: MessageEvent) => void)[];
}

/**
 * Decodes base64url into bytes (test copy, kept independent from the code under test).
 *
 * @param value - Base64url string.
 * @returns The bytes, as an `ArrayBuffer`.
 */
function keyBytes(value: string): ArrayBuffer {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)).buffer;
}

/**
 * Builds a fake subscription made with a key.
 *
 * @param key - Base64url key of the subscription.
 * @param endpoint - Endpoint of the subscription.
 * @returns The fake subscription.
 */
export function fakeSubscription(key: string, endpoint = FAKE_ENDPOINT): FakeSubscription {
  return {
    endpoint,
    options: { applicationServerKey: keyBytes(key) },
    unsubscribe: vi.fn(() => Promise.resolve(true)),
    toJSON: () => ({
      endpoint,
      expirationTime: null,
      keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4", auth: "tBHItJI5svbpez7K" },
    }),
  };
}

/**
 * Installs the fake push APIs on `window` and `navigator`.
 *
 * @param options - Permission, answer, existing subscription and support.
 * @returns The spies.
 */
export function installPushBrowser(options: PushBrowserOptions = {}): FakePushBrowser {
  installMatchMedia(false);
  let current: FakeSubscription | null = options.existingKey
    ? fakeSubscription(options.existingKey)
    : null;
  const created: FakeSubscription[] = [];
  const messageListeners: ((event: MessageEvent) => void)[] = [];
  const subscribe = vi.fn((init: PushSubscriptionOptionsInit) => {
    const key = init.applicationServerKey as Uint8Array;
    const encoded = btoa(String.fromCharCode(...key))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    current = fakeSubscription(encoded, `${FAKE_ENDPOINT}-${created.length + 1}`);
    const made = current;
    made.unsubscribe.mockImplementation(() => {
      if (current === made) {
        current = null;
      }
      return Promise.resolve(true);
    });
    created.push(made);
    return Promise.resolve(made);
  });
  const getSubscription = vi.fn(() => Promise.resolve(current));
  const registration = { pushManager: { subscribe, getSubscription } };
  const register = vi.fn(() => Promise.resolve(registration));
  const permissionState = { value: options.permission ?? "default" };
  const requestPermission = vi.fn(() => {
    permissionState.value = options.answer ?? "granted";
    return Promise.resolve(permissionState.value);
  });
  vi.stubGlobal("Notification", {
    get permission() {
      return permissionState.value;
    },
    requestPermission,
  });
  if (options.withoutPush) {
    Reflect.deleteProperty(window, "PushManager");
  } else {
    // Only its presence is read (`"PushManager" in window`).
    vi.stubGlobal("PushManager", vi.fn());
  }
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register,
      ready: Promise.resolve(registration),
      addEventListener: (_type: string, listener: (event: MessageEvent) => void) => {
        messageListeners.push(listener);
      },
      removeEventListener: (_type: string, listener: (event: MessageEvent) => void) => {
        messageListeners.splice(messageListeners.indexOf(listener), 1);
      },
    },
  });
  return { requestPermission, register, subscribe, getSubscription, created, messageListeners };
}
