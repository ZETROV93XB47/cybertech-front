// @vitest-environment node
/**
 * Push endpoints (feature 005, T008): public key, save and delete, error codes, and logs that
 * never carry the endpoint nor the browser keys.
 *
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §5
 */
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deletePushSubscription,
  getPushPublicKey,
  savePushSubscription,
} from "@/lib/api/endpoints/push";
import { ApiError } from "@/lib/api/errors";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { PushSubscriptionBodySchema } from "@/lib/schemas/push";

import { API, errorBody } from "../../helpers/cart";
import { server } from "../../msw/server";

const logged = vi.hoisted(() => ({ lines: [] as unknown[] }));

vi.mock("@/lib/logger", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/logger")>();
  const record =
    (level: string) =>
    (...args: unknown[]): void => {
      logged.lines.push([level, ...args]);
    };
  const recorder = {
    debug: record("debug"),
    info: record("info"),
    warn: record("warn"),
    error: record("error"),
  };
  return { ...original, createModuleLogger: () => recorder };
});

const TOKEN = "secret-access-token";
const UUID = "0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";
const PUSH_API = `${API}/notifications/push`;
const SECRET_PATH = "dQw4w9WgXcQ-device-secret";
const BODY = PushSubscriptionBodySchema.parse({
  endpoint: `https://fcm.googleapis.com/fcm/send/${SECRET_PATH}`,
  expirationTime: null,
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4p256dhKey", auth: "tBHItJI5svbpezAuthKey" },
});

/**
 * Answers a backend error.
 *
 * @param code - Backend `errorCode`.
 * @param status - HTTP status.
 * @returns The response.
 */
function backendError(code: string, status: number): Response {
  return HttpResponse.json(errorBody(code, status), { status });
}

/**
 * Expects an `ApiError` with a front code.
 *
 * @param call - Promise expected to reject.
 * @param code - Expected front code.
 */
async function expectFrontCode(call: Promise<unknown>, code: FrontErrorCode): Promise<void> {
  const error: unknown = await call.catch((cause: unknown) => cause);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).frontCode).toBe(code);
}

beforeEach(() => {
  logged.lines = [];
});

describe("getPushPublicKey", () => {
  it("returns the key, without token", async () => {
    let authorization: string | null = "unset";
    server.use(
      http.get(`${PUSH_API}/public-key`, ({ request }) => {
        authorization = request.headers.get("Authorization");
        return HttpResponse.json({ publicKey: "BPublicKey_-" });
      }),
    );
    await expect(getPushPublicKey()).resolves.toBe("BPublicKey_-");
    expect(authorization).toBeNull();
  });

  it("maps 503 PUSH_SERVICE_NOT_CONFIGURED to unavailable", async () => {
    server.use(
      http.get(`${PUSH_API}/public-key`, () => backendError("PUSH_SERVICE_NOT_CONFIGURED", 503)),
    );
    await expectFrontCode(getPushPublicKey(), FrontErrorCode.UNAVAILABLE);
  });
});

describe("savePushSubscription", () => {
  it("posts the subscription without a null expiration time and returns the uuid", async () => {
    let sent: unknown;
    let authorization: string | null = null;
    server.use(
      http.post(`${PUSH_API}/subscriptions`, async ({ request }) => {
        sent = await request.json();
        authorization = request.headers.get("Authorization");
        return HttpResponse.json({ uuid: UUID }, { status: 201 });
      }),
    );
    await expect(savePushSubscription(BODY, TOKEN)).resolves.toEqual({ uuid: UUID });
    expect(sent).toEqual({ endpoint: BODY.endpoint, keys: BODY.keys });
    expect(authorization).toBe(`Bearer ${TOKEN}`);
  });

  it.each([
    ["INVALID_PUSH_ENDPOINT", 400, FrontErrorCode.INVALID],
    ["PUSH_SUBSCRIPTION_CONFLICT", 409, FrontErrorCode.CONFLICT],
    ["PUSH_SERVICE_NOT_CONFIGURED", 503, FrontErrorCode.UNAVAILABLE],
  ])("maps %s to its front code", async (code, status, frontCode) => {
    server.use(http.post(`${PUSH_API}/subscriptions`, () => backendError(code, status)));
    await expectFrontCode(savePushSubscription(BODY, TOKEN), frontCode);
  });

  it("never logs the endpoint path nor the keys", async () => {
    server.use(
      http.post(`${PUSH_API}/subscriptions`, () =>
        HttpResponse.json({ uuid: UUID }, { status: 201 }),
      ),
    );
    await savePushSubscription(BODY, TOKEN);
    server.use(
      http.post(`${PUSH_API}/subscriptions`, () => backendError("PUSH_SUBSCRIPTION_CONFLICT", 409)),
    );
    await savePushSubscription(BODY, TOKEN).catch(() => undefined);
    const text = JSON.stringify(logged.lines);
    expect(text).toContain("fcm.googleapis.com/…");
    expect(text).not.toContain(SECRET_PATH);
    expect(text).not.toContain(BODY.keys.p256dh);
    expect(text).not.toContain(BODY.keys.auth);
    expect(text).not.toContain(TOKEN);
  });
});

describe("deletePushSubscription", () => {
  it("deletes the subscription", async () => {
    let method = "";
    server.use(
      http.delete(`${PUSH_API}/subscriptions/${UUID}`, ({ request }) => {
        method = request.method;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await expect(deletePushSubscription(UUID, TOKEN)).resolves.toBeUndefined();
    expect(method).toBe("DELETE");
  });

  it("counts 404 PUSH_SUBSCRIPTION_NOT_FOUND as deleted", async () => {
    server.use(
      http.delete(`${PUSH_API}/subscriptions/${UUID}`, () =>
        backendError("PUSH_SUBSCRIPTION_NOT_FOUND", 404),
      ),
    );
    await expect(deletePushSubscription(UUID, TOKEN)).resolves.toBeUndefined();
  });

  it("maps 403 PUSH_SUBSCRIPTION_NOT_OWNED to forbidden", async () => {
    server.use(
      http.delete(`${PUSH_API}/subscriptions/${UUID}`, () =>
        backendError("PUSH_SUBSCRIPTION_NOT_OWNED", 403),
      ),
    );
    await expectFrontCode(deletePushSubscription(UUID, TOKEN), FrontErrorCode.FORBIDDEN);
  });
});
