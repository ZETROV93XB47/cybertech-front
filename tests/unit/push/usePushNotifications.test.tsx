/**
 * Notifications hook (feature 005, T014): initial state, activation sequence (permission first,
 * then service worker, key, subscription, BFF), refusals, failures and reclaim after a conflict.
 *
 * @see specs/005-web-push-notifications/research.md R4, R5
 */
import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePushNotifications } from "@/features/notifications/hooks/usePushNotifications";
import { PUSH_MESSAGES } from "@/features/notifications/messages";
import { resetPushStatus } from "@/features/notifications/push-store";
import { PushState } from "@/lib/enums/push";

import { installPushBrowser, OTHER_PUBLIC_KEY, PUBLIC_KEY } from "../../helpers/push-browser";
import { server } from "../../msw/server";

const UUID = "0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";

/** Bodies posted to the BFF. */
let posted: unknown[] = [];

/**
 * Mocks the BFF push routes.
 *
 * @param save - Answer of `POST /subscriptions`.
 */
function mockBff(
  save: () => Response = () => HttpResponse.json({ uuid: UUID }, { status: 201 }),
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
 * Answers a BFF error.
 *
 * @param code - Front error code.
 * @param status - HTTP status.
 * @returns The response factory.
 */
function bffError(code: string, status: number): () => Response {
  return () => HttpResponse.json({ error: { code, message: code } }, { status });
}

/**
 * Renders the hook.
 *
 * @returns The hook result.
 */
function renderPush(): ReturnType<
  typeof renderHook<ReturnType<typeof usePushNotifications>, unknown>
> {
  return renderHook(() => usePushNotifications());
}

beforeEach(() => {
  posted = [];
  resetPushStatus();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("initial state", () => {
  it("is unsupported without PushManager", () => {
    installPushBrowser({ withoutPush: true });
    expect(renderPush().result.current.status.state).toBe(PushState.UNSUPPORTED);
  });

  it("is denied when notifications are blocked, enabled with a record, idle otherwise", () => {
    installPushBrowser({ permission: "denied" });
    expect(renderPush().result.current.status.state).toBe(PushState.DENIED);
    resetPushStatus();
    installPushBrowser({ permission: "granted" });
    window.localStorage.setItem("ct_push_v1", JSON.stringify({ subscriptionUuid: UUID }));
    expect(renderPush().result.current.status.state).toBe(PushState.ENABLED);
    resetPushStatus();
    window.localStorage.clear();
    expect(renderPush().result.current.status.state).toBe(PushState.IDLE);
  });

  it("never asks the permission on mount", () => {
    const browser = installPushBrowser();
    renderPush();
    expect(browser.requestPermission).not.toHaveBeenCalled();
    expect(browser.register).not.toHaveBeenCalled();
  });
});

describe("enable", () => {
  it("asks the permission first, then subscribes with the key and saves the uuid", async () => {
    const browser = installPushBrowser();
    mockBff();
    const { result } = renderPush();
    await act(() => result.current.enable());
    expect(browser.requestPermission).toHaveBeenCalledOnce();
    expect(browser.requestPermission.mock.invocationCallOrder[0]).toBeLessThan(
      browser.register.mock.invocationCallOrder[0] ?? 0,
    );
    expect(browser.register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    const options = browser.subscribe.mock.calls[0]?.[0];
    expect(options?.userVisibleOnly).toBe(true);
    expect(Array.from(options?.applicationServerKey as Uint8Array)).toEqual([4, 1, 2, 3, 4]);
    expect(posted).toEqual([browser.created[0]?.toJSON()]);
    expect(JSON.parse(window.localStorage.getItem("ct_push_v1") ?? "{}")).toEqual({
      subscriptionUuid: UUID,
    });
    expect(result.current.status.state).toBe(PushState.ENABLED);
  });

  it("reuses a browser subscription made with the same key", async () => {
    const browser = installPushBrowser({ existingKey: PUBLIC_KEY });
    mockBff();
    const { result } = renderPush();
    await act(() => result.current.enable());
    expect(browser.subscribe).not.toHaveBeenCalled();
    expect(posted).toHaveLength(1);
  });

  it("replaces a browser subscription made with another key", async () => {
    const browser = installPushBrowser({ existingKey: OTHER_PUBLIC_KEY });
    const old = await browser.getSubscription();
    mockBff();
    const { result } = renderPush();
    await act(() => result.current.enable());
    expect(old?.unsubscribe).toHaveBeenCalledOnce();
    expect(browser.subscribe).toHaveBeenCalledOnce();
  });

  it("goes back to idle, silently, when the prompt is closed", async () => {
    const browser = installPushBrowser({ answer: "default" });
    const { result } = renderPush();
    await act(() => result.current.enable());
    expect(result.current.status).toEqual({ state: PushState.IDLE });
    expect(browser.register).not.toHaveBeenCalled();
  });

  it("is denied when the customer refuses", async () => {
    installPushBrowser({ answer: "denied" });
    const { result } = renderPush();
    await act(() => result.current.enable());
    expect(result.current.status.state).toBe(PushState.DENIED);
  });

  it.each([
    ["unavailable", 503, PushState.UNAVAILABLE],
    ["conflict", 409, PushState.CONFLICT],
    ["unknown", 500, PushState.ERROR],
  ])("drops the browser subscription when the BFF answers %s", async (code, status, state) => {
    const browser = installPushBrowser();
    mockBff(bffError(code, status));
    const { result } = renderPush();
    await act(() => result.current.enable());
    expect(result.current.status.state).toBe(state);
    expect(browser.created[0]?.unsubscribe).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem("ct_push_v1")).toBeNull();
  });

  it("tells an expired session apart", async () => {
    installPushBrowser();
    mockBff(bffError("unauthenticated", 401));
    const { result } = renderPush();
    await act(() => result.current.enable());
    expect(result.current.status).toEqual({
      state: PushState.ERROR,
      message: PUSH_MESSAGES.sessionExpired,
    });
  });
});

describe("reclaim", () => {
  it("subscribes again with a new endpoint after a conflict", async () => {
    const browser = installPushBrowser();
    mockBff(bffError("conflict", 409));
    const { result } = renderPush();
    await act(() => result.current.enable());
    expect(result.current.status.state).toBe(PushState.CONFLICT);
    mockBff();
    await act(() => result.current.reclaim());
    expect(browser.created).toHaveLength(2);
    expect(browser.created[1]?.endpoint).not.toBe(browser.created[0]?.endpoint);
    expect(result.current.status.state).toBe(PushState.ENABLED);
  });
});
