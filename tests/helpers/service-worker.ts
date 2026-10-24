/**
 * Loads the served service-worker files (`public/sw-core.js`, `public/sw.js`) in a `node:vm`
 * context with a fake `self`, so that the unit tests run exactly what the browser runs
 * (feature 005, research R1).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";

import { vi, type Mock } from "vitest";

/** Origin of the fake worker. */
export const ORIGIN = "http://localhost:3000";

/** Directory of the served files. */
const PUBLIC_DIR = join(process.cwd(), "public");

/** Message read by the pure functions. */
export interface PushMessage {
  readonly title: string;
  readonly body: string;
  readonly url: string;
  readonly orderUuid: string;
}

/** API exposed by `sw-core.js` on `self.ctPushCore`. */
export interface SwCore {
  readonly ORDER_TAG_PREFIX: string;
  readonly SUBSCRIPTION_CHANGED_MESSAGE: string;
  readonly NOTIFICATION_ICON_PATH: string;
  readonly NOTIFICATION_BADGE_PATH: string;
  parsePushMessage(text: unknown): PushMessage | null;
  safeNotificationPath(url: unknown, origin: string): string | null;
  notificationTag(orderUuid: string): string;
  pickClientToFocus<T extends { url: string }>(windows: readonly T[], origin: string): T | null;
  sameKey(left: unknown, right: unknown): boolean;
}

/** A fake window client of the worker. */
export interface FakeWindowClient {
  readonly url: string;
  readonly focus: Mock;
  readonly navigate: Mock;
  readonly postMessage: Mock;
}

/** The fake worker and the spies the tests read. */
export interface FakeWorker {
  readonly self: Record<string, unknown>;
  readonly showNotification: Mock;
  readonly skipWaiting: Mock;
  readonly claim: Mock;
  readonly openWindow: Mock;
  readonly subscribe: Mock;
  /** Window clients answered by `clients.matchAll`. */
  windows: FakeWindowClient[];
  /**
   * Dispatches an event to the worker listeners and waits for its `waitUntil` promises.
   *
   * @param type - Event type (`push`, `notificationclick`…).
   * @param init - Extra event properties.
   */
  dispatch(type: string, init?: Record<string, unknown>): Promise<void>;
}

/**
 * Reads a served file.
 *
 * @param name - File name in `public/`.
 * @returns Its source.
 */
function readPublic(name: string): string {
  return readFileSync(join(PUBLIC_DIR, name), "utf8");
}

/**
 * Builds a fake window client.
 *
 * @param url - URL of the window.
 * @returns The client with its spies.
 */
export function fakeWindow(url: string): FakeWindowClient {
  const client: FakeWindowClient = {
    url,
    focus: vi.fn(() => Promise.resolve(client)),
    navigate: vi.fn(() => Promise.resolve(client)),
    postMessage: vi.fn(),
  };
  return client;
}

/**
 * Loads `sw-core.js` alone.
 *
 * @returns The functions it exposes.
 */
export function loadSwCore(): SwCore {
  const self: Record<string, unknown> = {};
  runInContext(readPublic("sw-core.js"), createContext({ self, URL }), { filename: "sw-core.js" });
  return self.ctPushCore as SwCore;
}

/**
 * Loads `sw.js` (which imports `sw-core.js`) with fake registration and clients.
 *
 * @returns The fake worker.
 */
export function loadServiceWorker(): FakeWorker {
  const listeners = new Map<string, ((event: Record<string, unknown>) => void)[]>();
  const worker: Omit<FakeWorker, "self" | "dispatch"> = {
    showNotification: vi.fn(() => Promise.resolve()),
    skipWaiting: vi.fn(() => Promise.resolve()),
    claim: vi.fn(() => Promise.resolve()),
    openWindow: vi.fn(() => Promise.resolve(null)),
    subscribe: vi.fn(() => Promise.resolve({})),
    windows: [],
  };
  const self: Record<string, unknown> = {
    location: { origin: ORIGIN },
    registration: {
      showNotification: worker.showNotification,
      pushManager: { subscribe: worker.subscribe },
    },
    clients: {
      claim: worker.claim,
      openWindow: worker.openWindow,
      matchAll: vi.fn(() => Promise.resolve(fake.windows)),
    },
    skipWaiting: worker.skipWaiting,
    addEventListener: (type: string, listener: (event: Record<string, unknown>) => void): void => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
  };
  const context = createContext({
    self,
    URL,
    importScripts: (...paths: string[]): void => {
      for (const path of paths) {
        runInContext(readPublic(path.replace(/^\//, "")), context, { filename: path });
      }
    },
  });
  const fake: FakeWorker = {
    ...worker,
    self,
    async dispatch(type, init = {}) {
      const pending: Promise<unknown>[] = [];
      const event = {
        ...init,
        waitUntil: (promise: Promise<unknown>): void => void pending.push(promise),
      };
      for (const listener of listeners.get(type) ?? []) {
        listener(event);
      }
      await Promise.all(pending);
    },
  };
  runInContext(readPublic("sw.js"), context, { filename: "sw.js" });
  return fake;
}
