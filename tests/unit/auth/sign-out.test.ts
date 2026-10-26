// @vitest-environment node
/**
 * Sign-out Server Action (feature 005, T037): the push subscription of the browser is deleted
 * with the session token, within the short timeout, BEFORE the session closes; any failure is
 * logged and never holds up the sign-out.
 *
 * @see specs/005-web-push-notifications/research.md R8
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §4
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signOutEverywhere } from "@/features/auth/actions";
import { ApiError } from "@/lib/api/errors";
import { PUSH_SIGN_OUT_TIMEOUT_MS } from "@/lib/constants/push";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { allLoggedText, testLogger } from "../../helpers/test-logger";

const calls = vi.hoisted(() => ({ order: [] as string[] }));
const auth = vi.hoisted(() => ({
  signOut: vi.fn(),
  readSessionToken: vi.fn(),
  getAccessTokenOrThrow: vi.fn(),
  deletePushSubscription: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/navigation", () => ({ redirect: auth.redirect }));
vi.mock("@/lib/auth/config", () => ({ signIn: vi.fn(), signOut: auth.signOut, auth: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({
  readSessionToken: auth.readSessionToken,
  getAccessTokenOrThrow: auth.getAccessTokenOrThrow,
}));
vi.mock("@/lib/api/endpoints/push", () => ({
  deletePushSubscription: auth.deletePushSubscription,
}));

const UUID = "0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";
const TOKEN = "fresh-access-token";

/**
 * Builds the sign-out form.
 *
 * @param uuid - Value of the push field, or `undefined` to leave it out.
 * @returns The form data.
 */
function form(uuid?: string): FormData {
  const data = new FormData();
  if (uuid !== undefined) {
    data.set("pushSubscriptionUuid", uuid);
  }
  return data;
}

beforeEach(() => {
  calls.order = [];
  auth.readSessionToken.mockReset().mockResolvedValue({ sub: UUID, idToken: "id-token" });
  auth.getAccessTokenOrThrow.mockReset().mockResolvedValue(TOKEN);
  auth.deletePushSubscription.mockReset().mockImplementation(() => {
    calls.order.push("delete");
    return Promise.resolve();
  });
  auth.signOut.mockReset().mockImplementation(() => {
    calls.order.push("signOut");
    return Promise.resolve();
  });
  auth.redirect.mockReset();
  testLogger.warn.mockClear();
});

describe("signOutEverywhere", () => {
  it("deletes the push subscription with a fresh token before closing the session", async () => {
    await signOutEverywhere(form(UUID));
    expect(auth.deletePushSubscription).toHaveBeenCalledWith(UUID, TOKEN, {
      timeoutMs: PUSH_SIGN_OUT_TIMEOUT_MS,
    });
    expect(calls.order).toEqual(["delete", "signOut"]);
    expect(auth.redirect).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "the backend is down",
      new ApiError({ status: 503, frontCode: FrontErrorCode.UNAVAILABLE, message: "down" }),
    ],
    ["the call times out", new DOMException("timeout", "TimeoutError")],
  ])("still signs out when %s, with a masked warning", async (_label, error) => {
    auth.deletePushSubscription.mockRejectedValue(error);
    await signOutEverywhere(form(UUID));
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(auth.redirect).toHaveBeenCalledOnce();
    expect(testLogger.warn).toHaveBeenCalled();
    expect(allLoggedText()).not.toContain(UUID);
    expect(allLoggedText()).not.toContain(TOKEN);
  });

  it("still signs out when the token cannot be renewed", async () => {
    auth.getAccessTokenOrThrow.mockRejectedValue(
      new ApiError({ status: 401, frontCode: FrontErrorCode.UNAUTHENTICATED, message: "expired" }),
    );
    await signOutEverywhere(form(UUID));
    expect(auth.deletePushSubscription).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it.each([
    ["no field", undefined],
    ["an empty field", ""],
    ["a value that is not a UUID", "../user/me"],
  ])("deletes nothing with %s", async (_label, uuid) => {
    await signOutEverywhere(form(uuid));
    expect(auth.deletePushSubscription).not.toHaveBeenCalled();
    expect(auth.getAccessTokenOrThrow).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it("deletes nothing without a session", async () => {
    auth.readSessionToken.mockResolvedValue(null);
    await signOutEverywhere(form(UUID));
    expect(auth.deletePushSubscription).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});
