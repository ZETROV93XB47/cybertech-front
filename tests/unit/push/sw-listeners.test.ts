// @vitest-environment node
/**
 * Service-worker listeners (feature 005, T011, T036): the served `public/sw.js` (importing
 * `sw-core.js`) run in `node:vm` with fake registration and clients.
 *
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §6
 */
import { describe, expect, it } from "vitest";

import { fakeWindow, loadServiceWorker, ORIGIN } from "../../helpers/service-worker";

const ORDER = "0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";
const PATH = `/account/orders/${ORDER}`;

/**
 * Builds a push event carrying a text.
 *
 * @param text - Raw message.
 * @returns The event properties.
 */
function pushData(text: string | null): Record<string, unknown> {
  return { data: text === null ? null : { text: () => text } };
}

/**
 * Builds a notification click event.
 *
 * @param url - `url` of the notification data.
 * @returns The event properties and the close spy.
 */
function click(url: unknown): { init: Record<string, unknown>; closed: () => boolean } {
  let isClosed = false;
  return {
    init: {
      notification: {
        data: { url },
        close: () => {
          isClosed = true;
        },
      },
    },
    closed: () => isClosed,
  };
}

describe("install and activate", () => {
  it("skips waiting and claims the open pages", async () => {
    const worker = loadServiceWorker();
    await worker.dispatch("install");
    await worker.dispatch("activate");
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
    expect(worker.claim).toHaveBeenCalledOnce();
  });
});

describe("push", () => {
  it("shows the notification of a valid message, tagged by order", async () => {
    const worker = loadServiceWorker();
    const message = {
      title: "Paiement confirmé",
      body: "C'est payé.",
      url: PATH,
      orderUuid: ORDER,
    };
    await worker.dispatch("push", pushData(JSON.stringify(message)));
    expect(worker.showNotification).toHaveBeenCalledWith("Paiement confirmé", {
      body: "C'est payé.",
      icon: "/icons/notification-192.png",
      badge: "/icons/notification-badge-96.png",
      tag: `order-${ORDER}`,
      renotify: true,
      data: { url: PATH },
    });
  });

  it.each([
    ["no data", null],
    ["invalid JSON", "{nope"],
    ["an incomplete message", JSON.stringify({ title: "Paiement confirmé" })],
  ])("shows nothing for %s", async (_label, text) => {
    const worker = loadServiceWorker();
    await worker.dispatch("push", pushData(text));
    expect(worker.showNotification).not.toHaveBeenCalled();
  });
});

describe("notificationclick", () => {
  it("brings an open window of the site to the front and moves it to the order", async () => {
    const worker = loadServiceWorker();
    const other = fakeWindow("https://other.test/");
    const site = fakeWindow(`${ORIGIN}/products`);
    worker.windows = [other, site];
    const event = click(PATH);
    await worker.dispatch("notificationclick", event.init);
    expect(event.closed()).toBe(true);
    expect(site.focus).toHaveBeenCalledOnce();
    expect(site.navigate).toHaveBeenCalledWith(PATH);
    expect(other.focus).not.toHaveBeenCalled();
    expect(worker.openWindow).not.toHaveBeenCalled();
  });

  it("opens a new window when no window of the site is open", async () => {
    const worker = loadServiceWorker();
    await worker.dispatch("notificationclick", click(PATH).init);
    expect(worker.openWindow).toHaveBeenCalledWith(PATH);
  });

  it.each(["https://evil.test/", "//evil.test/x", "javascript:alert(1)", undefined])(
    "only closes the notification for %j",
    async (url) => {
      const worker = loadServiceWorker();
      const site = fakeWindow(`${ORIGIN}/`);
      worker.windows = [site];
      const event = click(url);
      await worker.dispatch("notificationclick", event.init);
      expect(event.closed()).toBe(true);
      expect(worker.openWindow).not.toHaveBeenCalled();
      expect(site.navigate).not.toHaveBeenCalled();
    },
  );
});

describe("pushsubscriptionchange", () => {
  const KEY = new Uint8Array([4, 1, 2, 3, 4]).buffer;

  it("subscribes again with the same key and tells every window", async () => {
    const worker = loadServiceWorker();
    const first = fakeWindow(`${ORIGIN}/`);
    const second = fakeWindow(`${ORIGIN}/account/profile`);
    worker.windows = [first, second];
    await worker.dispatch("pushsubscriptionchange", {
      oldSubscription: { options: { applicationServerKey: KEY } },
    });
    expect(worker.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: KEY,
    });
    for (const client of [first, second]) {
      expect(client.postMessage).toHaveBeenCalledWith({ type: "push-subscription-changed" });
    }
  });

  it("does nothing without the old key", async () => {
    const worker = loadServiceWorker();
    const page = fakeWindow(`${ORIGIN}/`);
    worker.windows = [page];
    await worker.dispatch("pushsubscriptionchange", { oldSubscription: null });
    expect(worker.subscribe).not.toHaveBeenCalled();
    expect(page.postMessage).not.toHaveBeenCalled();
  });

  it("tells nobody, without throwing, when subscribing fails", async () => {
    const worker = loadServiceWorker();
    worker.subscribe.mockRejectedValue(new Error("AbortError"));
    const page = fakeWindow(`${ORIGIN}/`);
    worker.windows = [page];
    await expect(
      worker.dispatch("pushsubscriptionchange", {
        oldSubscription: { options: { applicationServerKey: KEY } },
      }),
    ).resolves.toBeUndefined();
    expect(page.postMessage).not.toHaveBeenCalled();
  });
});
