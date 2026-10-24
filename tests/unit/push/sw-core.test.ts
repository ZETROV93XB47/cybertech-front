// @vitest-environment node
/**
 * Service-worker pure functions (feature 005, T010), tested on the served `public/sw-core.js`
 * loaded in a `node:vm` context with a fake `self`.
 *
 * @see specs/005-web-push-notifications/research.md R1, R10
 */
import { describe, expect, it } from "vitest";

import { PUSH_NOTIFICATION_TAG_PREFIX } from "@/lib/constants/push";
import { PushSwMessageType } from "@/lib/enums/push";

import { loadSwCore, ORIGIN } from "../../helpers/service-worker";

const core = loadSwCore();
const ORDER = "0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";
const MESSAGE = {
  title: "Paiement confirmé",
  body: "Ta commande est payée.",
  url: `/account/orders/${ORDER}`,
  orderUuid: ORDER,
};

describe("constants shared with the TypeScript code", () => {
  it("match lib/constants/push.ts and lib/enums/push.ts", () => {
    expect(core.ORDER_TAG_PREFIX).toBe(PUSH_NOTIFICATION_TAG_PREFIX);
    expect(core.SUBSCRIPTION_CHANGED_MESSAGE).toBe(PushSwMessageType.SUBSCRIPTION_CHANGED);
  });
});

describe("parsePushMessage", () => {
  it("reads a valid message and ignores extra fields", () => {
    expect(core.parsePushMessage(JSON.stringify({ ...MESSAGE, price: 999 }))).toEqual(MESSAGE);
  });

  it("accepts an empty body", () => {
    expect(core.parsePushMessage(JSON.stringify({ ...MESSAGE, body: "" }))).toEqual({
      ...MESSAGE,
      body: "",
    });
  });

  it.each([
    ["no data", undefined],
    ["empty text", ""],
    ["invalid JSON", "{nope"],
    ["a JSON string", JSON.stringify("hello")],
    ["null", "null"],
    ["no title", JSON.stringify({ ...MESSAGE, title: "" })],
    ["no url", JSON.stringify({ ...MESSAGE, url: undefined })],
    ["a numeric body", JSON.stringify({ ...MESSAGE, body: 3 })],
    ["a non-UUID order", JSON.stringify({ ...MESSAGE, orderUuid: "42" })],
  ])("returns null for %s", (_label, text) => {
    expect(core.parsePushMessage(text)).toBeNull();
  });
});

describe("safeNotificationPath", () => {
  it("keeps a site-relative path with its query and hash", () => {
    expect(core.safeNotificationPath(`/account/orders/${ORDER}?from=push#top`, ORIGIN)).toBe(
      `/account/orders/${ORDER}?from=push#top`,
    );
  });

  it.each([
    "https://evil.test/account/orders",
    `${ORIGIN}/account/orders`,
    "//evil.test/x",
    "/\\evil.test/x",
    "javascript:alert(1)",
    "account/orders",
    "",
    undefined,
    42,
  ])("refuses %j", (url) => {
    expect(core.safeNotificationPath(url, ORIGIN)).toBeNull();
  });
});

describe("notificationTag", () => {
  it("prefixes the order UUID", () => {
    expect(core.notificationTag(ORDER)).toBe(`order-${ORDER}`);
  });
});

describe("pickClientToFocus", () => {
  it("returns the first window of the site", () => {
    const windows = [
      { url: "https://other.test/" },
      { url: `${ORIGIN}/products` },
      { url: `${ORIGIN}/` },
    ];
    expect(core.pickClientToFocus(windows, ORIGIN)).toBe(windows[1]);
  });

  it("returns null without a window of the site", () => {
    expect(
      core.pickClientToFocus([{ url: "https://other.test/" }, { url: "about:blank" }], ORIGIN),
    ).toBeNull();
    expect(core.pickClientToFocus([], ORIGIN)).toBeNull();
  });
});

describe("sameKey", () => {
  const bytes = new Uint8Array([4, 1, 2, 3]);

  it("compares an ArrayBuffer and a Uint8Array byte by byte", () => {
    expect(core.sameKey(bytes.buffer, new Uint8Array([4, 1, 2, 3]))).toBe(true);
    expect(core.sameKey(bytes.buffer, new Uint8Array([4, 1, 2, 9]))).toBe(false);
  });

  it("refuses different lengths and missing keys", () => {
    expect(core.sameKey(bytes, new Uint8Array([4, 1, 2]))).toBe(false);
    expect(core.sameKey(null, bytes)).toBe(false);
    expect(core.sameKey(bytes, undefined)).toBe(false);
  });
});
