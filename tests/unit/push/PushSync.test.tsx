/**
 * Push subscription sync (feature 005, T035): guards, resend of the current subscription, silent
 * re-subscription (no subscription, changed key), conflict, renewal reported by the service worker
 * and silent failures.
 *
 * @see specs/005-web-push-notifications/research.md R7, R9
 */
import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PushSync } from "@/features/notifications/components/PushSync";
import { resetPushStatus } from "@/features/notifications/push-store";

import {
  installPushBrowser,
  OTHER_PUBLIC_KEY,
  PUBLIC_KEY,
  type PushBrowserOptions,
} from "../../helpers/push-browser";
import { server } from "../../msw/server";

const session = vi.hoisted(() => ({ status: "authenticated" }));
vi.mock("next-auth/react", () => ({ useSession: () => session }));

const OLD_UUID = "0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";
const NEW_UUID = "0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6c";

/** Bodies posted to the BFF. */
let posted: unknown[] = [];

/**
 * Mocks the BFF push routes.
 *
 * @param save - Answer of `POST /subscriptions`.
 */
function mockBff(
  save: () => Response = () => HttpResponse.json({ uuid: NEW_UUID }, { status: 201 }),
): void {
  server.use(
    http.get("*/api/notifications/push/public-key", () =>
      HttpResponse.json({ publicKey: PUBLIC_KEY }),
    ),
    http.post("*/api/notifications/push/subscriptions", async ({ request }) => {
      posted.push(await request.json());
      return save();
    }),
  );
}

/**
 * Installs a browser where notifications were turned on: permission granted and a record.
 *
 * @param options - Overrides of the fake browser.
 * @returns The fake browser.
 */
function enabledBrowser(options: PushBrowserOptions = {}): ReturnType<typeof installPushBrowser> {
  const browser = installPushBrowser({
    permission: "granted",
    existingKey: PUBLIC_KEY,
    ...options,
  });
  window.localStorage.setItem("ct_push_v1", JSON.stringify({ subscriptionUuid: OLD_UUID }));
  return browser;
}

/**
 * Reads the stored subscription UUID.
 *
 * @returns The UUID, or `null`.
 */
function storedUuid(): string | null {
  const raw = window.localStorage.getItem("ct_push_v1");
  return raw === null ? null : (JSON.parse(raw) as { subscriptionUuid: string }).subscriptionUuid;
}

beforeEach(() => {
  posted = [];
  session.status = "authenticated";
  resetPushStatus();
  window.localStorage.clear();
  window.sessionStorage.clear();
  mockBff();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("guards", () => {
  it.each<[string, () => ReturnType<typeof installPushBrowser>]>([
    [
      "signed out",
      () => {
        session.status = "unauthenticated";
        return enabledBrowser();
      },
    ],
    ["unsupported", () => enabledBrowser({ withoutPush: true })],
    ["permission not granted", () => enabledBrowser({ permission: "default" })],
    [
      "no record",
      () => {
        const browser = enabledBrowser();
        window.localStorage.clear();
        return browser;
      },
    ],
    [
      "already synced in this tab",
      () => {
        window.sessionStorage.setItem("ct_push_sync_v1", "1");
        return enabledBrowser();
      },
    ],
  ])("sends nothing when %s", async (_label, arrange) => {
    const browser = arrange();
    render(<PushSync />);
    await Promise.resolve();
    expect(browser.register).not.toHaveBeenCalled();
    expect(posted).toEqual([]);
  });
});

describe("sync", () => {
  it("resends the subscription made with the same key and stores the new uuid", async () => {
    const browser = enabledBrowser();
    const current = await browser.getSubscription();
    render(<PushSync />);
    await waitFor(() => {
      expect(storedUuid()).toBe(NEW_UUID);
    });
    expect(posted).toEqual([current?.toJSON()]);
    expect(browser.subscribe).not.toHaveBeenCalled();
    expect(browser.requestPermission).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("ct_push_sync_v1")).toBe("1");
  });

  it("subscribes silently when the browser has no subscription any more", async () => {
    const browser = enabledBrowser({ existingKey: null });
    render(<PushSync />);
    await waitFor(() => {
      expect(posted).toHaveLength(1);
    });
    expect(browser.subscribe).toHaveBeenCalledOnce();
    expect(browser.requestPermission).not.toHaveBeenCalled();
  });

  it("renews a subscription made with another key", async () => {
    const browser = enabledBrowser({ existingKey: OTHER_PUBLIC_KEY });
    const old = await browser.getSubscription();
    render(<PushSync />);
    await waitFor(() => {
      expect(posted).toHaveLength(1);
    });
    expect(old?.unsubscribe).toHaveBeenCalledOnce();
    expect(browser.subscribe).toHaveBeenCalledOnce();
  });

  it("forgets the record when the browser now belongs to another account", async () => {
    enabledBrowser();
    mockBff(() =>
      HttpResponse.json({ error: { code: "conflict", message: "conflict" } }, { status: 409 }),
    );
    render(<PushSync />);
    await waitFor(() => {
      expect(window.localStorage.getItem("ct_push_v1")).toBeNull();
    });
  });

  it("stays silent and keeps the record when the backend is down", async () => {
    enabledBrowser();
    mockBff(() =>
      HttpResponse.json({ error: { code: "unavailable", message: "down" } }, { status: 503 }),
    );
    render(<PushSync />);
    await waitFor(() => {
      expect(posted).toHaveLength(1);
    });
    expect(storedUuid()).toBe(OLD_UUID);
    expect(window.sessionStorage.getItem("ct_push_sync_v1")).toBeNull();
  });

  it("syncs again when the service worker reports a renewed subscription", async () => {
    const browser = enabledBrowser();
    render(<PushSync />);
    await waitFor(() => {
      expect(posted).toHaveLength(1);
    });
    for (const listener of browser.messageListeners) {
      listener(new MessageEvent("message", { data: { type: "push-subscription-changed" } }));
    }
    await waitFor(() => {
      expect(posted).toHaveLength(2);
    });
    for (const listener of browser.messageListeners) {
      listener(new MessageEvent("message", { data: { type: "something-else" } }));
    }
    await Promise.resolve();
    expect(posted).toHaveLength(2);
  });
});
