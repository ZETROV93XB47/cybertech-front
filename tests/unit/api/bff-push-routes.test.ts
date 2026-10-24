// @vitest-environment node
/**
 * BFF routes of the browser notifications (feature 005, T012): public key and subscription save.
 *
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §1–2
 */
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as publicKeyRoute } from "@/app/api/notifications/push/public-key/route";
import { POST as saveRoute } from "@/app/api/notifications/push/subscriptions/route";
import { ApiError } from "@/lib/api/errors";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { API, errorBody } from "../../helpers/cart";
import { server } from "../../msw/server";

const guards = vi.hoisted(() => ({ getAccessTokenOrThrow: vi.fn() }));
vi.mock("@/lib/auth/guards", () => guards);

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
const SUBSCRIPTION = {
  endpoint: `https://fcm.googleapis.com/fcm/send/${SECRET_PATH}`,
  expirationTime: null,
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4p256dhKey", auth: "tBHItJI5svbpezAuthKey" },
};

/**
 * Builds the `POST` request of a subscription.
 *
 * @param body - JSON body.
 * @returns The request.
 */
function postRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/notifications/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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
 * Reads the front error code of a BFF error response.
 *
 * @param response - BFF response.
 * @returns The `error.code`.
 */
async function codeOf(response: Response): Promise<string> {
  return ((await response.json()) as { error: { code: string } }).error.code;
}

beforeEach(() => {
  logged.lines = [];
  guards.getAccessTokenOrThrow.mockReset();
  guards.getAccessTokenOrThrow.mockResolvedValue(TOKEN);
});

describe("GET /api/notifications/push/public-key", () => {
  it("answers the public key, never cached", async () => {
    server.use(
      http.get(`${PUSH_API}/public-key`, () => HttpResponse.json({ publicKey: "BKey_-" })),
    );
    const response = await publicKeyRoute();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ publicKey: "BKey_-" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("answers 503 unavailable when the backend has no VAPID keys", async () => {
    server.use(
      http.get(`${PUSH_API}/public-key`, () => backendError("PUSH_SERVICE_NOT_CONFIGURED", 503)),
    );
    const response = await publicKeyRoute();
    expect(response.status).toBe(503);
    expect(await codeOf(response)).toBe(FrontErrorCode.UNAVAILABLE);
  });
});

describe("POST /api/notifications/push/subscriptions", () => {
  it("saves the subscription with the user's token and answers 201 { uuid }", async () => {
    let authorization: string | null = null;
    server.use(
      http.post(`${PUSH_API}/subscriptions`, ({ request }) => {
        authorization = request.headers.get("Authorization");
        return HttpResponse.json({ uuid: UUID }, { status: 201 });
      }),
    );
    const response = await saveRoute(postRequest(SUBSCRIPTION));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ uuid: UUID });
    expect(authorization).toBe(`Bearer ${TOKEN}`);
  });

  it.each([
    ["an http endpoint", { ...SUBSCRIPTION, endpoint: "http://fcm.googleapis.com/x" }],
    ["an extra field", { ...SUBSCRIPTION, userUuid: UUID }],
    ["missing keys", { endpoint: SUBSCRIPTION.endpoint, expirationTime: null }],
  ])("answers 400 invalid for %s, without calling the backend", async (_label, body) => {
    const backend = vi.fn(() => HttpResponse.json({ uuid: UUID }, { status: 201 }));
    server.use(http.post(`${PUSH_API}/subscriptions`, backend));
    const response = await saveRoute(postRequest(body));
    expect(response.status).toBe(400);
    expect(await codeOf(response)).toBe(FrontErrorCode.INVALID);
    expect(backend).not.toHaveBeenCalled();
  });

  it("answers 401 unauthenticated without a session", async () => {
    guards.getAccessTokenOrThrow.mockRejectedValue(
      new ApiError({
        status: 401,
        frontCode: FrontErrorCode.UNAUTHENTICATED,
        message: "no session",
      }),
    );
    const response = await saveRoute(postRequest(SUBSCRIPTION));
    expect(response.status).toBe(401);
    expect(await codeOf(response)).toBe(FrontErrorCode.UNAUTHENTICATED);
  });

  it.each([
    ["PUSH_SUBSCRIPTION_CONFLICT", 409, FrontErrorCode.CONFLICT],
    ["PUSH_SERVICE_NOT_CONFIGURED", 503, FrontErrorCode.UNAVAILABLE],
  ])("maps %s to %s", async (code, status, frontCode) => {
    server.use(http.post(`${PUSH_API}/subscriptions`, () => backendError(code, status)));
    const response = await saveRoute(postRequest(SUBSCRIPTION));
    expect(response.status).toBe(status);
    expect(await codeOf(response)).toBe(frontCode);
  });

  it("never logs the endpoint path nor the keys", async () => {
    server.use(
      http.post(`${PUSH_API}/subscriptions`, () =>
        HttpResponse.json({ uuid: UUID }, { status: 201 }),
      ),
    );
    await saveRoute(postRequest(SUBSCRIPTION));
    server.use(
      http.post(`${PUSH_API}/subscriptions`, () => backendError("PUSH_SUBSCRIPTION_CONFLICT", 409)),
    );
    await saveRoute(postRequest(SUBSCRIPTION));
    const text = JSON.stringify(logged.lines);
    expect(text).not.toContain(SECRET_PATH);
    expect(text).not.toContain(SUBSCRIPTION.keys.p256dh);
    expect(text).not.toContain(SUBSCRIPTION.keys.auth);
  });
});
