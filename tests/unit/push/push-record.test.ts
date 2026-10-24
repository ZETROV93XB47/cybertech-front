/**
 * Local memory of the push subscription and key decoding (feature 005, T013).
 *
 * @see specs/005-web-push-notifications/research.md R6
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { base64UrlToBytes } from "@/features/notifications/push-client";
import {
  clearPushRecord,
  clearSyncedThisTab,
  hasSyncedThisTab,
  markSyncedThisTab,
  readPushRecord,
  writePushRecord,
} from "@/features/notifications/push-record";

const UUID = "0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("push record", () => {
  it("writes, reads and clears the subscription UUID only", () => {
    writePushRecord(UUID);
    expect(window.localStorage.getItem("ct_push_v1")).toBe(
      JSON.stringify({ subscriptionUuid: UUID }),
    );
    expect(readPushRecord()).toEqual({ subscriptionUuid: UUID });
    clearPushRecord();
    expect(readPushRecord()).toBeNull();
  });

  it.each([
    "not json",
    JSON.stringify({ subscriptionUuid: "x" }),
    JSON.stringify({ endpoint: "https://x" }),
  ])("drops a tampered value %j", (raw) => {
    window.localStorage.setItem("ct_push_v1", raw);
    expect(readPushRecord()).toBeNull();
    expect(window.localStorage.getItem("ct_push_v1")).toBeNull();
  });

  it("treats a blocked storage as empty", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => {
      writePushRecord(UUID);
    }).not.toThrow();
    expect(readPushRecord()).toBeNull();
    expect(hasSyncedThisTab()).toBe(false);
  });

  it("marks the tab as synced in the session storage", () => {
    expect(hasSyncedThisTab()).toBe(false);
    markSyncedThisTab();
    expect(window.sessionStorage.getItem("ct_push_sync_v1")).toBe("1");
    expect(hasSyncedThisTab()).toBe(true);
    clearSyncedThisTab();
    expect(hasSyncedThisTab()).toBe(false);
  });
});

describe("base64UrlToBytes", () => {
  it.each([
    ["AQID", [1, 2, 3]],
    ["AQI", [1, 2]],
    ["-_8", [251, 255]],
  ])("decodes %s", (value, bytes) => {
    expect(Array.from(base64UrlToBytes(value))).toEqual(bytes);
  });
});
