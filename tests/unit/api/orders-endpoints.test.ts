// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import {
  cancelOrder,
  getMyOrders,
  getOrder,
  getOrderStatus,
  placeOrder,
  quoteOrder,
  retryPayment,
  updateOrder,
} from "@/lib/api/endpoints/orders";
import { ApiError } from "@/lib/api/errors";
import { NO_DISCOUNT_KEY } from "@/lib/constants/discount";
import { ORDERS_PAGE_SIZE, ORDERS_SORT } from "@/lib/constants/orders";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { OrderStatus, PaymentType } from "@/lib/enums/order";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";

import { API, errorBody } from "../../helpers/cart";
import { fakeUuids } from "../../helpers/products";
import { allLoggedText } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const TOKEN = "secret-access-token";
const ORDER_API = `${API}/management/order`;
const [ORDER_UUID = "", USER_UUID = "", ITEM_UUID = "", PRODUCT_A = "", PRODUCT_B = ""] =
  fakeUuids(5);
const ADDRESS = { street: "1 rue du Test", zipCode: "75001", city: "Paris", country: "France" };

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
  discountKey: NO_DISCOUNT_KEY,
  discountCalculationType: "NONE",
  discountAmount: 0,
  shippingType: "STANDARD",
  shippingProvider: "DHL",
  shippingCost: 15,
  shippingAddress: "1 rue du Test, 75001 Paris, France",
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

const PLACE_BODY = {
  paymentType: PaymentType.VISA,
  shippingType: ShippingType.EXPRESS,
  shippingProvider: ShippingProvider.FEDEX,
  address: ADDRESS,
  discountKey: NO_DISCOUNT_KEY,
};

/**
 * Answers every call of one route with the same error and counts the calls.
 *
 * @param method - MSW method helper.
 * @param url - Route.
 * @param code - Backend `errorCode`.
 * @param status - HTTP status.
 * @returns A counter of the calls received.
 */
function failWith(
  method: typeof http.get,
  url: string,
  code: string,
  status: number,
): { calls: number } {
  const counter = { calls: 0 };
  server.use(
    method(url, () => {
      counter.calls += 1;
      return HttpResponse.json(errorBody(code, status), { status });
    }),
  );
  return counter;
}

describe("quoteOrder", () => {
  it("posts the shipping choice and the key with the bearer token", async () => {
    let body: unknown;
    let authorization: string | null = null;
    server.use(
      http.post(`${ORDER_API}/quote`, async ({ request }) => {
        body = await request.json();
        authorization = request.headers.get("Authorization");
        return HttpResponse.json(QUOTE);
      }),
    );
    const quote = await quoteOrder(
      {
        shippingType: ShippingType.EXPRESS,
        shippingProvider: ShippingProvider.FEDEX,
        discountKey: "BLACK_FRIDAY",
      },
      TOKEN,
    );
    expect(quote.totalAmount).toBe(425);
    expect(body).toEqual({
      shippingType: "EXPRESS",
      shippingProvider: "FEDEX",
      discountKey: "BLACK_FRIDAY",
    });
    expect(authorization).toBe(`Bearer ${TOKEN}`);
    expect(allLoggedText()).not.toContain(TOKEN);
  });

  it("maps an inactive key to discount-invalid without retrying", async () => {
    const counter = failWith(http.post, `${ORDER_API}/quote`, "DISCOUNT_TYPE_NOT_ACTIVE", 400);
    await expect(
      quoteOrder(
        {
          shippingType: ShippingType.STANDARD,
          shippingProvider: ShippingProvider.DHL,
          discountKey: "NOPE",
        },
        TOKEN,
      ),
    ).rejects.toMatchObject({ frontCode: FrontErrorCode.DISCOUNT_INVALID });
    expect(counter.calls).toBe(1);
  });

  it("retries once when the backend is unavailable", async () => {
    const counter = failWith(http.post, `${ORDER_API}/quote`, "APPLICATION_ERROR", 500);
    await expect(
      quoteOrder(
        {
          shippingType: ShippingType.STANDARD,
          shippingProvider: ShippingProvider.DHL,
          discountKey: NO_DISCOUNT_KEY,
        },
        TOKEN,
      ),
    ).rejects.toMatchObject({ frontCode: FrontErrorCode.UNAVAILABLE });
    expect(counter.calls).toBe(2);
  });

  it("turns a response breaking the contract into unavailable", async () => {
    server.use(
      http.post(`${ORDER_API}/quote`, () => HttpResponse.json({ ...QUOTE, totalAmount: "free" })),
    );
    await expect(
      quoteOrder(
        {
          shippingType: ShippingType.STANDARD,
          shippingProvider: ShippingProvider.DHL,
          discountKey: NO_DISCOUNT_KEY,
        },
        TOKEN,
      ),
    ).rejects.toMatchObject({ frontCode: FrontErrorCode.UNAVAILABLE });
  });
});

describe("placeOrder", () => {
  it("flattens the address and never logs it", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORDER_API}/place`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(ORDER, { status: 201 });
      }),
    );
    const order = await placeOrder(PLACE_BODY, TOKEN);
    expect(order.status).toBe(OrderStatus.AWAITING_PAYMENT);
    expect(body).toEqual({
      paymentType: "VISA",
      shippingType: "EXPRESS",
      shippingProvider: "FEDEX",
      discountKey: NO_DISCOUNT_KEY,
      shippingStreet: "1 rue du Test",
      shippingCity: "Paris",
      shippingZipCode: "75001",
      shippingCountry: "France",
    });
    const logged = allLoggedText();
    expect(logged).not.toContain("rue du Test");
    expect(logged).not.toContain(ORDER_UUID);
  });

  it.each([
    ["NOT_ENOUGH_STOCK", 409, FrontErrorCode.INSUFFICIENT_STOCK],
    ["CART_IS_EMPTY", 409, FrontErrorCode.EMPTY_CART],
    ["USER_NOT_ACTIVE", 403, FrontErrorCode.ACCOUNT_INACTIVE],
    ["DISCOUNT_TYPE_NOT_ACTIVE", 400, FrontErrorCode.DISCOUNT_INVALID],
    ["APPLICATION_ERROR", 500, FrontErrorCode.UNAVAILABLE],
  ])("%s (%i) → %s, never retried", async (code, status, frontCode) => {
    const counter = failWith(http.post, `${ORDER_API}/place`, code, status);
    await expect(placeOrder(PLACE_BODY, TOKEN)).rejects.toMatchObject({ frontCode });
    expect(counter.calls).toBe(1);
  });
});

describe("getOrderStatus", () => {
  it("reads the status of the order", async () => {
    server.use(
      http.get(`${ORDER_API}/status/${ORDER_UUID}`, () =>
        HttpResponse.json({ uuid: ORDER_UUID, status: "PAID" }),
      ),
    );
    expect(await getOrderStatus(ORDER_UUID, TOKEN)).toEqual({
      uuid: ORDER_UUID,
      status: OrderStatus.PAID,
    });
  });

  it("relays another user's order as not found", async () => {
    failWith(http.get, `${ORDER_API}/status/${ORDER_UUID}`, "ORDER_DOESNT_BELONGS_TO_USER", 403);
    const error = await getOrderStatus(ORDER_UUID, TOKEN).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, frontCode: FrontErrorCode.NOT_FOUND });
  });
});

describe("retryPayment", () => {
  it.each([
    ["PAYMENT_ALREADY_COMPLETED", 409, FrontErrorCode.PAYMENT_ALREADY_COMPLETED],
    ["PAYMENT_FAILED", 402, FrontErrorCode.PAYMENT_FAILED],
    ["FAILED_UPDATING_ORDER", 422, FrontErrorCode.PAYMENT_FAILED],
    ["NO_PREVIOUS_PAYMENT_ATTEMPT_FOUND", 404, FrontErrorCode.NOT_FOUND],
    ["APPLICATION_ERROR", 500, FrontErrorCode.UNAVAILABLE],
  ])("%s (%i) → %s, never retried", async (code, status, frontCode) => {
    const counter = failWith(http.post, `${ORDER_API}/retry-payment/${ORDER_UUID}`, code, status);
    await expect(retryPayment(ORDER_UUID, TOKEN)).rejects.toMatchObject({ frontCode });
    expect(counter.calls).toBe(1);
  });

  it("returns the order after a successful retry", async () => {
    server.use(
      http.post(`${ORDER_API}/retry-payment/${ORDER_UUID}`, () =>
        HttpResponse.json({ ...ORDER, status: "PAID" }),
      ),
    );
    expect((await retryPayment(ORDER_UUID, TOKEN)).status).toBe(OrderStatus.PAID);
  });
});

describe("getMyOrders", () => {
  it("repeats the statuses and converts the page to a 0-based index", async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${ORDER_API}/mine`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({
          content: [ORDER],
          page: { size: ORDERS_PAGE_SIZE, number: 1, totalElements: 11, totalPages: 2 },
        });
      }),
    );
    const page = await getMyOrders(
      { statuses: [OrderStatus.PAID, OrderStatus.SHIPPED], page: 2 },
      TOKEN,
    );
    expect(page.content).toHaveLength(1);
    expect(url?.searchParams.getAll("status")).toEqual(["PAID", "SHIPPED"]);
    expect(url?.searchParams.get("page")).toBe("1");
    expect(url?.searchParams.get("size")).toBe(String(ORDERS_PAGE_SIZE));
    expect(url?.searchParams.get("sort")).toBe(ORDERS_SORT);
  });
});

describe("getOrder", () => {
  it("reads one order and accepts an old one without breakdown", async () => {
    server.use(
      http.get(`${ORDER_API}/get/${ORDER_UUID}`, () =>
        HttpResponse.json({
          ...ORDER,
          subtotalAmount: null,
          discountAmount: null,
          shippingCost: null,
          discountCalculationType: null,
        }),
      ),
    );
    expect((await getOrder(ORDER_UUID, TOKEN)).subtotalAmount).toBeNull();
  });

  it("maps a missing order to not-found", async () => {
    failWith(http.get, `${ORDER_API}/get/${ORDER_UUID}`, "ORDER_NOT_FOUND", 404);
    await expect(getOrder(ORDER_UUID, TOKEN)).rejects.toMatchObject({
      frontCode: FrontErrorCode.NOT_FOUND,
    });
  });
});

describe("updateOrder", () => {
  const UPDATE = {
    paymentType: PaymentType.MASTERCARD,
    shippingType: ShippingType.STANDARD,
    shippingProvider: ShippingProvider.DHL,
    address: ADDRESS,
    items: [
      { productUuid: PRODUCT_A, quantity: 1 },
      { productUuid: PRODUCT_B, quantity: 2 },
    ],
  };

  it("sends the uuid and the complete list of lines", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORDER_API}/update`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(ORDER);
      }),
    );
    await updateOrder(ORDER_UUID, UPDATE, TOKEN);
    expect(body).toEqual({
      uuid: ORDER_UUID,
      paymentType: "MASTERCARD",
      shippingType: "STANDARD",
      shippingProvider: "DHL",
      shippingStreet: "1 rue du Test",
      shippingCity: "Paris",
      shippingZipCode: "75001",
      shippingCountry: "France",
      itemUpdateRequestDtoList: [
        { productUuid: PRODUCT_A, quantity: 1 },
        { productUuid: PRODUCT_B, quantity: 2 },
      ],
    });
  });

  it.each([
    ["ORDER_ALREADY_SHIPPED", 409, FrontErrorCode.ORDER_LOCKED],
    ["ORDER_NOT_FUNDED", 409, FrontErrorCode.ORDER_LOCKED],
    ["NOT_ENOUGH_STOCK", 409, FrontErrorCode.INSUFFICIENT_STOCK],
    ["PAYMENT_FAILED", 402, FrontErrorCode.PAYMENT_FAILED],
    ["APPLICATION_ERROR", 500, FrontErrorCode.UNAVAILABLE],
  ])("%s (%i) → %s, never retried", async (code, status, frontCode) => {
    const counter = failWith(http.post, `${ORDER_API}/update`, code, status);
    await expect(updateOrder(ORDER_UUID, UPDATE, TOKEN)).rejects.toMatchObject({ frontCode });
    expect(counter.calls).toBe(1);
  });
});

describe("cancelOrder", () => {
  it("sends the order uuid", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORDER_API}/cancel`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...ORDER, status: "CANCELED" });
      }),
    );
    expect((await cancelOrder(ORDER_UUID, TOKEN)).status).toBe(OrderStatus.CANCELED);
    expect(body).toEqual({ orderUuid: ORDER_UUID });
  });

  it.each([
    ["CANNOT_CANCEL_ORDER", 409, FrontErrorCode.ORDER_LOCKED],
    ["ORDER_REFUND_FAILED", 409, FrontErrorCode.REFUND_FAILED],
    ["APPLICATION_ERROR", 500, FrontErrorCode.UNAVAILABLE],
  ])("%s (%i) → %s, never retried", async (code, status, frontCode) => {
    const counter = failWith(http.post, `${ORDER_API}/cancel`, code, status);
    await expect(cancelOrder(ORDER_UUID, TOKEN)).rejects.toMatchObject({ frontCode });
    expect(counter.calls).toBe(1);
  });
});
