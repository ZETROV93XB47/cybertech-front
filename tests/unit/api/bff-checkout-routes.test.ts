// @vitest-environment node
/**
 * BFF routes of the checkout and of the payment follow-up (feature 003, T018).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 */
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as placeRoute } from "@/app/api/checkout/place/route";
import { POST as quoteRoute } from "@/app/api/checkout/quote/route";
import { POST as retryRoute } from "@/app/api/orders/[uuid]/retry-payment/route";
import { GET as statusRoute } from "@/app/api/orders/[uuid]/status/route";
import { ApiError } from "@/lib/api/errors";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { API, errorBody } from "../../helpers/cart";
import { fakeUuids } from "../../helpers/products";
import { allLoggedText } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const guards = vi.hoisted(() => ({ getAccessTokenOrThrow: vi.fn() }));
vi.mock("@/lib/auth/guards", () => guards);

const ORDER_API = `${API}/management/order`;
const [ORDER_UUID = "", USER_UUID = "", ITEM_UUID = "", PRODUCT_A = ""] = fakeUuids(4);
const STREET = "12 rue Secrète";
const ADDRESS = { street: STREET, zipCode: "75001", city: "Paris", country: "France" };

const QUOTE = {
  subtotalAmount: 500,
  discountKey: "BLACK_FRIDAY",
  discountCalculationType: "PERCENTAGE",
  discountAmount: 100,
  discountApplied: true,
  minOrderAmount: null,
  shippingCost: 25,
  totalAmount: 425,
  currency: "EUR",
};

const ORDER = {
  uuid: ORDER_UUID,
  userUuid: USER_UUID,
  orderDate: "2026-10-14",
  createdAt: "2026-10-14T10:15:30",
  status: "AWAITING_PAYMENT",
  totalAmount: 515,
  refundedAmount: 0,
  currency: "EUR",
  subtotalAmount: 500,
  discountKey: "NO_DISCOUNT",
  discountCalculationType: "NONE",
  discountAmount: 0,
  shippingType: "EXPRESS",
  shippingProvider: "FEDEX",
  shippingCost: 25,
  shippingAddress: `${STREET}, 75001 Paris, France`,
  orderItems: [
    {
      orderItemUuid: ITEM_UUID,
      productUuid: PRODUCT_A,
      productName: "Portable",
      quantity: 2,
      unitPrice: 250,
      lineItemTotalPrice: 500,
    },
  ],
};

const PLACE_BODY = {
  paymentType: "VISA",
  shippingType: "EXPRESS",
  shippingProvider: "FEDEX",
  address: ADDRESS,
};

/**
 * Builds a JSON request.
 *
 * @param body - JSON body.
 * @returns The request.
 */
function post(body: unknown): Request {
  return new Request("http://localhost:3000/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Route context of an order route.
 *
 * @param uuid - Path segment.
 * @returns The context.
 */
function orderContext(uuid: string): { params: Promise<{ uuid: string }> } {
  return { params: Promise.resolve({ uuid }) };
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

beforeEach(() => {
  guards.getAccessTokenOrThrow.mockResolvedValue("token");
});

describe("POST /api/checkout/quote", () => {
  it("answers the displayed quote, never cached", async () => {
    let sent: unknown;
    server.use(
      http.post(`${ORDER_API}/quote`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(QUOTE);
      }),
    );
    const response = await quoteRoute(
      post({ shippingType: "EXPRESS", shippingProvider: "FEDEX", discountKey: "black_friday" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(sent).toEqual({
      shippingType: "EXPRESS",
      shippingProvider: "FEDEX",
      discountKey: "BLACK_FRIDAY",
    });
    expect(await response.json()).toEqual({
      subtotal: 500,
      discount: 100,
      shippingCost: 25,
      total: 425,
      currency: "EUR",
      discountKey: "BLACK_FRIDAY",
      isDiscountApplied: true,
      missingAmount: null,
    });
  });

  it("sends NO_DISCOUNT when no key is given", async () => {
    let sent: unknown;
    server.use(
      http.post(`${ORDER_API}/quote`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ ...QUOTE, discountKey: "NO_DISCOUNT", discountApplied: false });
      }),
    );
    await quoteRoute(post({ shippingType: "STANDARD", shippingProvider: "DHL" }));
    expect(sent).toMatchObject({ discountKey: "NO_DISCOUNT" });
  });

  it("refuses an invalid body without calling the backend", async () => {
    const backend = vi.fn();
    server.use(http.post(`${ORDER_API}/quote`, backend));
    const response = await quoteRoute(post({ shippingType: "PICKUP", shippingProvider: "DHL" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid" } });
    expect(backend).not.toHaveBeenCalled();
  });

  it.each([
    ["DISCOUNT_TYPE_NOT_ACTIVE", 400, "discount-invalid"],
    ["CART_IS_EMPTY", 409, "empty-cart"],
  ])("maps %s to %s", async (code, status, frontCode) => {
    server.use(http.post(`${ORDER_API}/quote`, () => backendError(code, status)));
    const response = await quoteRoute(post({ shippingType: "STANDARD", shippingProvider: "DHL" }));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code: frontCode } });
  });

  it("relays a 429 with its delay", async () => {
    server.use(
      http.post(`${ORDER_API}/quote`, () =>
        backendError("TOO_MANY_REQUESTS", 429, { "Retry-After": "12" }),
      ),
    );
    const response = await quoteRoute(post({ shippingType: "STANDARD", shippingProvider: "DHL" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({
      error: { code: "rate-limited", retryAfterSeconds: 12 },
    });
  });

  it("answers 503 when the backend is down", async () => {
    server.use(http.post(`${ORDER_API}/quote`, () => HttpResponse.error()));
    const response = await quoteRoute(post({ shippingType: "STANDARD", shippingProvider: "DHL" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "unavailable" } });
  });

  it("answers 401 without a session", async () => {
    guards.getAccessTokenOrThrow.mockRejectedValue(
      new ApiError({ status: 401, frontCode: FrontErrorCode.UNAUTHENTICATED, message: "No" }),
    );
    const response = await quoteRoute(post({ shippingType: "STANDARD", shippingProvider: "DHL" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "unauthenticated" } });
  });
});

describe("POST /api/checkout/place", () => {
  it("answers 201 with the order UUID and status, without logging the address", async () => {
    let sent: Record<string, unknown> = {};
    server.use(
      http.post(`${ORDER_API}/place`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(ORDER, { status: 201 });
      }),
    );
    const response = await placeRoute(post(PLACE_BODY));
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ orderUuid: ORDER_UUID, status: "AWAITING_PAYMENT" });
    expect(sent).toMatchObject({ shippingStreet: STREET, discountKey: "NO_DISCOUNT" });
    expect(allLoggedText()).not.toContain(STREET);
  });

  it("refuses an empty address field without calling the backend", async () => {
    const backend = vi.fn();
    server.use(http.post(`${ORDER_API}/place`, backend));
    const response = await placeRoute(post({ ...PLACE_BODY, address: { ...ADDRESS, city: " " } }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid" } });
    expect(backend).not.toHaveBeenCalled();
  });

  it.each([
    ["NOT_ENOUGH_STOCK", 409, "insufficient-stock"],
    ["CART_IS_EMPTY", 409, "empty-cart"],
    ["USER_NOT_ACTIVE", 403, "account-inactive"],
    ["DISCOUNT_TYPE_NOT_ACTIVE", 400, "discount-invalid"],
  ])("maps %s to %s", async (code, status, frontCode) => {
    server.use(http.post(`${ORDER_API}/place`, () => backendError(code, status)));
    const response = await placeRoute(post({ ...PLACE_BODY, discountKey: "BLACK_FRIDAY" }));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code: frontCode } });
  });

  it("is never replayed on a backend failure", async () => {
    const backend = vi.fn(() => HttpResponse.error());
    server.use(http.post(`${ORDER_API}/place`, backend));
    const response = await placeRoute(post(PLACE_BODY));
    expect(response.status).toBe(503);
    expect(backend).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/orders/[uuid]/status", () => {
  it("answers the status", async () => {
    server.use(
      http.get(`${ORDER_API}/status/${ORDER_UUID}`, () =>
        HttpResponse.json({ uuid: ORDER_UUID, status: "PAID" }),
      ),
    );
    const response = await statusRoute(new Request("http://localhost"), orderContext(ORDER_UUID));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ uuid: ORDER_UUID, status: "PAID" });
  });

  it("refuses an invalid UUID without calling the backend", async () => {
    const response = await statusRoute(new Request("http://localhost"), orderContext("42"));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid" } });
  });

  it("presents another user's order as missing", async () => {
    server.use(
      http.get(`${ORDER_API}/status/${ORDER_UUID}`, () =>
        backendError("ORDER_DOESNT_BELONGS_TO_USER", 403),
      ),
    );
    const response = await statusRoute(new Request("http://localhost"), orderContext(ORDER_UUID));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "not-found" } });
  });
});

describe("POST /api/orders/[uuid]/retry-payment", () => {
  it("answers the new status", async () => {
    server.use(
      http.post(`${ORDER_API}/retry-payment/${ORDER_UUID}`, () =>
        HttpResponse.json({ ...ORDER, status: "PAID" }),
      ),
    );
    const response = await retryRoute(new Request("http://localhost"), orderContext(ORDER_UUID));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ uuid: ORDER_UUID, status: "PAID" });
  });

  it.each([
    ["PAYMENT_ALREADY_COMPLETED", 409, "payment-already-completed"],
    ["PAYMENT_FAILED", 402, "payment-failed"],
    ["FAILED_UPDATING_ORDER", 422, "payment-failed"],
    ["NO_PREVIOUS_PAYMENT_ATTEMPT_FOUND", 404, "not-found"],
  ])("maps %s to %s", async (code, status, frontCode) => {
    server.use(
      http.post(`${ORDER_API}/retry-payment/${ORDER_UUID}`, () => backendError(code, status)),
    );
    const response = await retryRoute(new Request("http://localhost"), orderContext(ORDER_UUID));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code: frontCode } });
  });
});
