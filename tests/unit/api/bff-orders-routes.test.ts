// @vitest-environment node
/**
 * BFF routes of the order edit and cancellation (feature 003, T043).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1, §1.1
 */
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as cancelRoute } from "@/app/api/orders/[uuid]/cancel/route";
import { POST as updateRoute } from "@/app/api/orders/[uuid]/route";

import { API, errorBody } from "../../helpers/cart";
import { allLoggedText, testLogger } from "../../helpers/test-logger";
import { server } from "../../msw/server";
import { FLAT_ADDRESS, ORDER_UUID, PRODUCT_A, RECENT_ORDER } from "../orders/fixtures";

const guards = vi.hoisted(() => ({ getAccessTokenOrThrow: vi.fn() }));
vi.mock("@/lib/auth/guards", () => guards);

const ORDER_API = `${API}/management/order`;
const STREET = "12 rue de la Paix";

const UPDATE_BODY = {
  paymentType: "VISA",
  shippingType: "STANDARD",
  shippingProvider: "DHL",
  address: { street: STREET, zipCode: "75002", city: "Paris", country: "France" },
  items: [{ productUuid: PRODUCT_A, quantity: 1 }],
};

/**
 * Builds a JSON request.
 *
 * @param body - JSON body.
 * @returns The request.
 */
function post(body?: unknown): Request {
  return new Request("http://localhost:3000/api/orders", {
    method: "POST",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/**
 * Route context of an order route.
 *
 * @param uuid - Path segment.
 * @returns The context.
 */
function context(uuid: string): { params: Promise<{ uuid: string }> } {
  return { params: Promise.resolve({ uuid }) };
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

beforeEach(() => {
  guards.getAccessTokenOrThrow.mockResolvedValue("token");
});

describe("POST /api/orders/[uuid]", () => {
  it("sends the complete lines with the flattened address and answers the new amounts", async () => {
    let sent: unknown;
    server.use(
      http.post(`${ORDER_API}/update`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ ...RECENT_ORDER, totalAmount: 225, refundedAmount: 200 });
      }),
    );
    const response = await updateRoute(post(UPDATE_BODY), context(ORDER_UUID));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      uuid: ORDER_UUID,
      status: RECENT_ORDER.status,
      total: 225,
      refunded: 200,
    });
    expect(sent).toMatchObject({
      uuid: ORDER_UUID,
      shippingStreet: STREET,
      itemUpdateRequestDtoList: [{ productUuid: PRODUCT_A, quantity: 1 }],
    });
    expect(sent).not.toHaveProperty("discountKey");
    expect(allLoggedText()).not.toContain(STREET);
    expect(allLoggedText()).not.toContain(FLAT_ADDRESS);
    expect(allLoggedText()).not.toContain(ORDER_UUID);
  });

  it.each([
    ["an invalid UUID", "nope", UPDATE_BODY],
    ["no line", ORDER_UUID, { ...UPDATE_BODY, items: [] }],
    [
      "a duplicate line",
      ORDER_UUID,
      { ...UPDATE_BODY, items: [...UPDATE_BODY.items, ...UPDATE_BODY.items] },
    ],
    ["no payment", ORDER_UUID, { ...UPDATE_BODY, paymentType: undefined }],
  ])("refuses %s without calling the backend", async (_case, uuid, body) => {
    const backend = vi.fn();
    server.use(http.post(`${ORDER_API}/update`, backend));
    const response = await updateRoute(post(body), context(uuid));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid" } });
    expect(backend).not.toHaveBeenCalled();
  });

  it.each([
    ["ORDER_ALREADY_SHIPPED", 409, 409, "order-locked"],
    ["ORDER_NOT_FUNDED", 409, 409, "order-locked"],
    ["NOT_ENOUGH_STOCK", 409, 409, "insufficient-stock"],
    ["PAYMENT_FAILED", 402, 402, "payment-failed"],
    ["ORDER_DOESNT_BELONGS_TO_USER", 403, 404, "not-found"],
  ])("maps %s to %s", async (code, backendStatus, status, frontCode) => {
    server.use(http.post(`${ORDER_API}/update`, () => backendError(code, backendStatus)));
    const response = await updateRoute(post(UPDATE_BODY), context(ORDER_UUID));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code: frontCode } });
  });

  it("never retries an edit", async () => {
    const backend = vi.fn(() => HttpResponse.error());
    server.use(http.post(`${ORDER_API}/update`, backend));
    const response = await updateRoute(post(UPDATE_BODY), context(ORDER_UUID));
    expect(response.status).toBe(503);
    expect(backend).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/orders/[uuid]/cancel", () => {
  it("cancels and logs the masked order UUID", async () => {
    let sent: unknown;
    server.use(
      http.post(`${ORDER_API}/cancel`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ ...RECENT_ORDER, status: "CANCELED", refundedAmount: 425 });
      }),
    );
    const response = await cancelRoute(post(), context(ORDER_UUID));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      uuid: ORDER_UUID,
      status: "CANCELED",
      total: 425,
      refunded: 425,
    });
    expect(sent).toEqual({ orderUuid: ORDER_UUID });
    expect(testLogger.info).toHaveBeenCalled();
    expect(allLoggedText()).not.toContain(ORDER_UUID);
  });

  it.each([
    ["CANNOT_CANCEL_ORDER", 409, 409, "order-locked"],
    ["ORDER_REFUND_FAILED", 409, 409, "refund-failed"],
    ["ORDER_NOT_FOUND", 404, 404, "not-found"],
    ["ORDER_DOESNT_BELONGS_TO_USER", 403, 404, "not-found"],
  ])("maps %s to %s", async (code, backendStatus, status, frontCode) => {
    server.use(http.post(`${ORDER_API}/cancel`, () => backendError(code, backendStatus)));
    const response = await cancelRoute(post(), context(ORDER_UUID));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code: frontCode } });
  });

  it("refuses an invalid UUID without calling the backend", async () => {
    const backend = vi.fn();
    server.use(http.post(`${ORDER_API}/cancel`, backend));
    const response = await cancelRoute(post(), context("nope"));
    expect(response.status).toBe(400);
    expect(backend).not.toHaveBeenCalled();
  });
});
