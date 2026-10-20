// @vitest-environment node
/**
 * `POST /api/bank-card` (feature 003 US5, T084): strict body, existing-card refusal (backend
 * `409 BANK_CARD_ALREADY_EXISTS`), replacement through `PUT /bank-card/replace` (`cardKept` when
 * it fails), masked answer, and no card data in any log or response.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2 bis
 */
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/bank-card/route";

import { API, errorBody } from "../../helpers/cart";
import { allLoggedText } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const guards = vi.hoisted(() => ({ getAccessTokenOrThrow: vi.fn() }));
vi.mock("@/lib/auth/guards", () => guards);

const TOKEN = "secret-access-token";
const NUMBER = "1111111111111111";
const HOLDER = "Camille Testeur";
const EXPIRY = "12/2030";

const BODY = {
  cardHolderName: HOLDER,
  cardNumber: "1111 1111 1111 1111",
  expiryDate: EXPIRY,
  cardType: "OTHER",
};

const SAVED = {
  uuid: "01a13475-0000-7000-8000-0000000000c1",
  cardHolderName: HOLDER,
  maskedNumber: "**** **** **** 1111",
  expiryDate: EXPIRY,
  cardType: "OTHER",
  userUuid: "01a13475-0000-7000-8000-000000000002",
};

/** Backend calls recorded by {@link mockBackend}. */
interface Calls {
  readonly adds: unknown[];
  readonly replaces: unknown[];
}

/**
 * Answer of a mocked card write.
 *
 * @param status - HTTP status to answer (`successStatus` means success).
 * @param successStatus - Status of a successful write.
 * @param code - Backend error code of a failure.
 * @returns The saved card or the error body.
 */
function answer(status: number, successStatus: number, code: string): Response {
  return status === successStatus
    ? HttpResponse.json(SAVED, { status })
    : HttpResponse.json(errorBody(code, status), { status });
}

/**
 * Mocks the card endpoints as the backend behaves since `ea5f708`: a second add is a 409, the
 * replacement is atomic.
 *
 * @param options - Whether a card exists and how `add` and `replace` answer.
 * @returns The recorded calls.
 */
function mockBackend(options: {
  hasCard: boolean;
  addStatus?: number;
  addCode?: string;
  replaceStatus?: number;
}): Calls {
  const calls: Calls = { adds: [], replaces: [] };
  const { hasCard, addStatus = 201, addCode = "INVALID_REQUEST", replaceStatus = 200 } = options;
  server.use(
    http.post(`${API}/bank-card/add`, async ({ request }) => {
      calls.adds.push(await request.json());
      if (hasCard) {
        return answer(409, 201, "BANK_CARD_ALREADY_EXISTS");
      }
      return answer(addStatus, 201, addCode);
    }),
    http.put(`${API}/bank-card/replace`, async ({ request }) => {
      calls.replaces.push(await request.json());
      return answer(replaceStatus, 200, "INVALID_REQUEST");
    }),
  );
  return calls;
}

/**
 * Builds the request.
 *
 * @param body - JSON body.
 * @returns The request.
 */
function post(body: unknown): Request {
  return new Request("http://localhost:3000/api/bank-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Asserts that no log line carries card data.
 */
function expectNoCardDataLogged(): void {
  const logs = allLoggedText();
  for (const secret of [NUMBER, "1111 1111", HOLDER, EXPIRY, TOKEN]) {
    expect(logs).not.toContain(secret);
  }
}

beforeEach(() => {
  guards.getAccessTokenOrThrow.mockResolvedValue(TOKEN);
});

afterEach(() => {
  expectNoCardDataLogged();
});

describe("POST /api/bank-card", () => {
  it.each([
    ["an unknown field", { ...BODY, cvc: "123" }],
    ["a 12-digit number", { ...BODY, cardNumber: "1111 1111 1111" }],
    ["letters in the number", { ...BODY, cardNumber: "1111 abcd 1111 1111" }],
    ["a past expiry", { ...BODY, expiryDate: "01/2020" }],
  ])("refuses %s with 400 invalid, without any backend call", async (_label, body) => {
    const calls = mockBackend({ hasCard: false });
    const response = await POST(post(body));
    expect(response.status).toBe(400);
    const text = await response.text();
    expect((JSON.parse(text) as { error: { code: string } }).error.code).toBe("invalid");
    expect(text).not.toMatch(/1111/);
    expect(calls.adds).toHaveLength(0);
  });

  it("adds the card without spaces and answers the masked card only", async () => {
    const calls = mockBackend({ hasCard: false });
    const response = await POST(post(BODY));
    expect(response.status).toBe(201);
    expect(calls.adds[0]).toEqual({ ...BODY, cardNumber: NUMBER });
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({
      maskedNumber: "**** **** **** 1111",
      expiryDate: EXPIRY,
      cardType: "OTHER",
    });
    expect(text).not.toContain(NUMBER);
    expect(text).not.toContain(HOLDER);
  });

  it("relays the backend refusal of a second card without replace (409 conflict)", async () => {
    const calls = mockBackend({ hasCard: true });
    const response = await POST(post(BODY));
    expect(response.status).toBe(409);
    const { error } = (await response.json()) as { error: { code: string; cardKept?: boolean } };
    expect(error.code).toBe("conflict");
    expect(error.cardKept).toBeUndefined();
    expect(calls.replaces).toHaveLength(0);
  });

  it("replaces through PUT /bank-card/replace, without add nor replace flag", async () => {
    const calls = mockBackend({ hasCard: true });
    const response = await POST(post({ ...BODY, replace: true }));
    expect(response.status).toBe(201);
    expect(calls.adds).toHaveLength(0);
    expect(calls.replaces[0]).toEqual({ ...BODY, cardNumber: NUMBER });
    expect(await response.text()).not.toContain(NUMBER);
  });

  it("says cardKept when the replacement fails", async () => {
    mockBackend({ hasCard: true, replaceStatus: 400 });
    const response = await POST(post({ ...BODY, replace: true }));
    expect(response.status).toBe(400);
    const { error } = (await response.json()) as { error: { code: string; cardKept?: boolean } };
    expect(error).toMatchObject({ code: "invalid", cardKept: true });
  });

  it("maps a backend 400 to invalid and a past expiry refused by the backend to card-expired", async () => {
    mockBackend({ hasCard: false, addStatus: 400 });
    const invalid = await POST(post(BODY));
    expect(((await invalid.json()) as { error: { code: string } }).error.code).toBe("invalid");
    mockBackend({ hasCard: false, addStatus: 400, addCode: "BANK_CARD_EXPIRED" });
    const expired = await POST(post(BODY));
    expect(((await expired.json()) as { error: { code: string } }).error.code).toBe("card-expired");
  });

  it("answers 401 unauthenticated without a session", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    const { FrontErrorCode } = await import("@/lib/enums/error-code");
    guards.getAccessTokenOrThrow.mockRejectedValue(
      new ApiError({
        status: 401,
        frontCode: FrontErrorCode.UNAUTHENTICATED,
        message: "no session",
      }),
    );
    const response = await POST(post(BODY));
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
