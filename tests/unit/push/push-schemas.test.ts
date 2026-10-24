// @vitest-environment node
/**
 * Push schemas (feature 005, T006): public key, browser subscription body, saved subscription,
 * UUID parameter, local record, and the conversion to the backend DTO.
 *
 * @see specs/005-web-push-notifications/data-model.md §2
 */
import { describe, expect, it } from "vitest";

import { PUSH_ENDPOINT_MAX_LENGTH, PUSH_KEY_MAX_LENGTH } from "@/lib/constants/push";
import {
  PushPublicKeySchema,
  PushRecordSchema,
  PushSubscriptionBodySchema,
  PushSubscriptionSavedSchema,
  PushSubscriptionUuidParamSchema,
  toBackendSubscription,
} from "@/lib/schemas/push";

const UUID = "0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";

/** A `PushSubscription.toJSON()` as Chrome gives it. */
const BODY = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc:def",
  expirationTime: null,
  keys: {
    p256dh:
      "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
    auth: "tBHItJI5svbpez7KI4CCXg",
  },
};

describe("PushPublicKeySchema", () => {
  it("accepts a base64url key", () => {
    expect(PushPublicKeySchema.parse({ publicKey: BODY.keys.p256dh }).publicKey).toBe(
      BODY.keys.p256dh,
    );
  });

  it.each(["", "abc+def", "abc/def=", undefined])("rejects %j", (publicKey) => {
    expect(PushPublicKeySchema.safeParse({ publicKey }).success).toBe(false);
  });
});

describe("PushSubscriptionBodySchema", () => {
  it("accepts a browser subscription, with or without expiration time", () => {
    expect(PushSubscriptionBodySchema.safeParse(BODY).success).toBe(true);
    expect(
      PushSubscriptionBodySchema.safeParse({ ...BODY, expirationTime: 1_700_000 }).success,
    ).toBe(true);
  });

  it.each([
    ["an http endpoint", { ...BODY, endpoint: "http://fcm.googleapis.com/fcm/send/abc" }],
    ["a non-URL endpoint", { ...BODY, endpoint: "not a url" }],
    [
      "a too long endpoint",
      { ...BODY, endpoint: `https://x.test/${"a".repeat(PUSH_ENDPOINT_MAX_LENGTH)}` },
    ],
    ["a negative expiration time", { ...BODY, expirationTime: -1 }],
    ["a missing key", { ...BODY, keys: { auth: BODY.keys.auth } }],
    ["an empty key", { ...BODY, keys: { ...BODY.keys, auth: "" } }],
    ["a non-base64url key", { ...BODY, keys: { ...BODY.keys, auth: "a+b/c=" } }],
    [
      "a too long key",
      { ...BODY, keys: { ...BODY.keys, p256dh: "a".repeat(PUSH_KEY_MAX_LENGTH + 1) } },
    ],
    ["an extra field", { ...BODY, userUuid: UUID }],
  ])("rejects %s", (_label, body) => {
    expect(PushSubscriptionBodySchema.safeParse(body).success).toBe(false);
  });
});

describe("toBackendSubscription", () => {
  it("drops a null expiration time", () => {
    const parsed = PushSubscriptionBodySchema.parse(BODY);
    expect(toBackendSubscription(parsed)).toEqual({ endpoint: BODY.endpoint, keys: BODY.keys });
  });

  it("keeps a numeric expiration time", () => {
    const parsed = PushSubscriptionBodySchema.parse({ ...BODY, expirationTime: 42 });
    expect(toBackendSubscription(parsed).expirationTime).toBe(42);
  });
});

describe("PushSubscriptionSavedSchema", () => {
  it("requires the uuid the OpenAPI marks optional", () => {
    expect(PushSubscriptionSavedSchema.parse({ uuid: UUID }).uuid).toBe(UUID);
    expect(PushSubscriptionSavedSchema.safeParse({}).success).toBe(false);
    expect(PushSubscriptionSavedSchema.safeParse({ uuid: "nope" }).success).toBe(false);
  });
});

describe("PushSubscriptionUuidParamSchema and PushRecordSchema", () => {
  it("accept a UUID only", () => {
    expect(PushSubscriptionUuidParamSchema.safeParse(UUID).success).toBe(true);
    expect(PushSubscriptionUuidParamSchema.safeParse("../etc").success).toBe(false);
    expect(PushRecordSchema.safeParse({ subscriptionUuid: UUID }).success).toBe(true);
    expect(PushRecordSchema.safeParse({ subscriptionUuid: "x" }).success).toBe(false);
  });
});
