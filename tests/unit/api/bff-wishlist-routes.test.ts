// @vitest-environment node
/**
 * BFF routes of the wishlist (feature 003 US6, T090).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 */
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as removeRoute, PUT as addRoute } from "@/app/api/wishlist/[productUuid]/route";
import { GET as idsRoute } from "@/app/api/wishlist/ids/route";
import { ApiError } from "@/lib/api/errors";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { API, errorBody } from "../../helpers/cart";
import { backendPage, backendProduct, fakeUuids } from "../../helpers/products";
import { server } from "../../msw/server";

const guards = vi.hoisted(() => ({ getAccessTokenOrThrow: vi.fn() }));
vi.mock("@/lib/auth/guards", () => guards);

const WISHLIST_API = `${API}/wishlist`;
const [ENTRY_A = "", PRODUCT_A = ""] = fakeUuids(2);
const ENTRY = {
  uuid: ENTRY_A,
  product: backendProduct({ uuid: PRODUCT_A }),
  addedAt: "2026-10-14T10:00:00",
};

/**
 * Builds the request of a wishlist item route.
 *
 * @returns The request.
 */
function request(): Request {
  return new Request("http://localhost:3000/api/wishlist");
}

/**
 * Route context of a wishlist item.
 *
 * @param productUuid - Path segment.
 * @returns The context.
 */
function itemContext(productUuid: string): { params: Promise<{ productUuid: string }> } {
  return { params: Promise.resolve({ productUuid }) };
}

/**
 * Answers a backend error.
 *
 * @param code - Backend `errorCode`.
 * @param status - HTTP status.
 * @param headers - Extra headers.
 * @returns The response.
 */
function backendError(code: string, status: number, headers: Record<string, string> = {}) {
  return HttpResponse.json(errorBody(code, status), { status, headers });
}

/**
 * Reads the error of a BFF error response.
 *
 * @param response - BFF response.
 * @returns The `error` object of the body.
 */
async function errorOf(response: Response): Promise<{ code: string; retryAfterSeconds?: number }> {
  return ((await response.json()) as { error: { code: string; retryAfterSeconds?: number } }).error;
}

beforeEach(() => {
  guards.getAccessTokenOrThrow.mockResolvedValue("token");
});

describe("GET /api/wishlist/ids", () => {
  it("answers the product UUIDs, never cached", async () => {
    server.use(
      http.get(`${WISHLIST_API}/my-wishlist`, () => HttpResponse.json(backendPage([ENTRY]))),
    );
    const response = await idsRoute();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ productUuids: [PRODUCT_A] });
  });

  it("answers 401 without a session", async () => {
    guards.getAccessTokenOrThrow.mockRejectedValue(
      new ApiError({
        status: 401,
        frontCode: FrontErrorCode.UNAUTHENTICATED,
        message: "No session",
      }),
    );
    const response = await idsRoute();
    expect(response.status).toBe(401);
    expect((await errorOf(response)).code).toBe(FrontErrorCode.UNAUTHENTICATED);
  });

  it("answers 503 when the backend is down", async () => {
    server.use(http.get(`${WISHLIST_API}/my-wishlist`, () => HttpResponse.error()));
    const response = await idsRoute();
    expect(response.status).toBe(503);
  });
});

describe("PUT /api/wishlist/[productUuid]", () => {
  it("refuses an invalid UUID without calling the backend", async () => {
    let called = false;
    server.use(
      http.post(`${WISHLIST_API}/add/*`, () => {
        called = true;
        return HttpResponse.json(ENTRY);
      }),
    );
    const response = await addRoute(request(), itemContext("not-a-uuid"));
    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it("adds the product", async () => {
    server.use(
      http.post(`${WISHLIST_API}/add/${PRODUCT_A}`, () =>
        HttpResponse.json(ENTRY, { status: 201 }),
      ),
    );
    const response = await addRoute(request(), itemContext(PRODUCT_A));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ productUuid: PRODUCT_A, isInWishlist: true });
  });

  it("absorbs PRODUCT_ALREADY_IN_WISHLIST", async () => {
    server.use(
      http.post(`${WISHLIST_API}/add/${PRODUCT_A}`, () =>
        backendError("PRODUCT_ALREADY_IN_WISHLIST", 409),
      ),
    );
    const response = await addRoute(request(), itemContext(PRODUCT_A));
    expect(response.status).toBe(200);
  });

  it("relays an unknown product as not-found", async () => {
    server.use(
      http.post(`${WISHLIST_API}/add/${PRODUCT_A}`, () => backendError("PRODUCT_NOT_FOUND", 404)),
    );
    const response = await addRoute(request(), itemContext(PRODUCT_A));
    expect(response.status).toBe(404);
    expect((await errorOf(response)).code).toBe(FrontErrorCode.NOT_FOUND);
  });

  it("relays 429 with the delay", async () => {
    server.use(
      http.post(`${WISHLIST_API}/add/${PRODUCT_A}`, () =>
        backendError("TOO_MANY_REQUESTS", 429, { "Retry-After": "12" }),
      ),
    );
    const response = await addRoute(request(), itemContext(PRODUCT_A));
    expect(response.status).toBe(429);
    expect((await errorOf(response)).retryAfterSeconds).toBe(12);
  });
});

describe("DELETE /api/wishlist/[productUuid]", () => {
  it("removes the product", async () => {
    server.use(
      http.delete(
        `${WISHLIST_API}/remove/${PRODUCT_A}`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const response = await removeRoute(request(), itemContext(PRODUCT_A));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ productUuid: PRODUCT_A, isInWishlist: false });
  });

  it("absorbs a product already gone (404)", async () => {
    server.use(
      http.delete(`${WISHLIST_API}/remove/${PRODUCT_A}`, () =>
        backendError("WISHLIST_NOT_FOUND", 404),
      ),
    );
    const response = await removeRoute(request(), itemContext(PRODUCT_A));
    expect(response.status).toBe(200);
  });
});
