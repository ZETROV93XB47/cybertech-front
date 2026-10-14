import { describe, expect, it } from "vitest";

import { NO_DISCOUNT_KEY } from "@/lib/constants/discount";
import { ORDER_MAX_LINES } from "@/lib/constants/orders";
import { OrderStatus, PaymentType } from "@/lib/enums/order";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import {
  OrderPlaceBodySchema,
  OrderQuoteBodySchema,
  OrderQuoteResponseSchema,
  OrderResponseSchema,
  OrdersListParamsSchema,
  OrderStatusSchema,
  OrderUpdateBodySchema,
} from "@/lib/schemas/order";

import { fakeUuids } from "../../helpers/products";

const [ORDER_UUID = "", USER_UUID = "", ITEM_UUID = "", PRODUCT_A = "", PRODUCT_B = ""] =
  fakeUuids(5);

const ADDRESS = { street: "1 rue du Test", zipCode: "75001", city: "Paris", country: "France" };

/** A recent order, with the total breakdown. */
const RECENT_ORDER = {
  uuid: ORDER_UUID,
  userUuid: USER_UUID,
  orderDate: "2026-10-14",
  createdAt: "2026-10-14T10:15:30",
  status: "PAID",
  totalAmount: 425,
  refundedAmount: 0,
  currency: "EUR",
  subtotalAmount: 500,
  discountKey: "BLACK_FRIDAY",
  discountCalculationType: "PERCENTAGE",
  discountAmount: 100,
  shippingType: "EXPRESS",
  shippingProvider: "FEDEX",
  shippingCost: 25,
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

/** An order placed before the breakdown existed. */
const OLD_ORDER = {
  ...RECENT_ORDER,
  subtotalAmount: null,
  discountAmount: null,
  shippingCost: null,
  discountCalculationType: null,
  discountKey: NO_DISCOUNT_KEY,
};

describe("OrderResponseSchema", () => {
  it("accepts a recent order and an old one without breakdown", () => {
    expect(OrderResponseSchema.parse(RECENT_ORDER).status).toBe(OrderStatus.PAID);
    expect(OrderResponseSchema.parse(OLD_ORDER).subtotalAmount).toBeNull();
  });

  it("rejects a null discount key and an order without lines", () => {
    expect(OrderResponseSchema.safeParse({ ...RECENT_ORDER, discountKey: null }).success).toBe(
      false,
    );
    expect(OrderResponseSchema.safeParse({ ...RECENT_ORDER, orderItems: [] }).success).toBe(false);
  });
});

describe("OrderStatusSchema", () => {
  it("accepts a known status only", () => {
    expect(OrderStatusSchema.parse({ uuid: ORDER_UUID, status: "PAYMENT_FAILED" }).status).toBe(
      OrderStatus.PAYMENT_FAILED,
    );
    expect(OrderStatusSchema.safeParse({ uuid: ORDER_UUID, status: "LOST" }).success).toBe(false);
  });
});

describe("OrderQuoteResponseSchema", () => {
  const QUOTE = {
    subtotalAmount: 80,
    discountKey: "BLACK_FRIDAY",
    discountCalculationType: "PERCENTAGE",
    discountAmount: 0,
    discountApplied: false,
    minOrderAmount: 100,
    shippingCost: 15,
    totalAmount: 95,
    currency: "EUR",
  };

  it("accepts a nullable minimum and requires discountApplied", () => {
    expect(OrderQuoteResponseSchema.parse({ ...QUOTE, minOrderAmount: null }).minOrderAmount).toBe(
      null,
    );
    expect(
      OrderQuoteResponseSchema.safeParse({ ...QUOTE, discountApplied: undefined }).success,
    ).toBe(false);
  });
});

describe("OrderQuoteBodySchema", () => {
  it("defaults the key to NO_DISCOUNT and never accepts null", () => {
    const body = { shippingType: ShippingType.STANDARD, shippingProvider: ShippingProvider.DHL };
    expect(OrderQuoteBodySchema.parse(body).discountKey).toBe(NO_DISCOUNT_KEY);
    expect(OrderQuoteBodySchema.safeParse({ ...body, discountKey: null }).success).toBe(false);
    expect(OrderQuoteBodySchema.parse({ ...body, discountKey: " black_friday " }).discountKey).toBe(
      "BLACK_FRIDAY",
    );
  });
});

describe("OrderPlaceBodySchema", () => {
  const PLACE = {
    paymentType: PaymentType.VISA,
    shippingType: ShippingType.EXPRESS,
    shippingProvider: ShippingProvider.FEDEX,
    address: ADDRESS,
  };

  it("accepts a complete body with the default key", () => {
    expect(OrderPlaceBodySchema.parse(PLACE).discountKey).toBe(NO_DISCOUNT_KEY);
  });

  it("refuses a blank address field and a shipping type other than STANDARD or EXPRESS", () => {
    expect(
      OrderPlaceBodySchema.safeParse({ ...PLACE, address: { ...ADDRESS, city: "  " } }).success,
    ).toBe(false);
    expect(OrderPlaceBodySchema.safeParse({ ...PLACE, shippingType: "PICKUP" }).success).toBe(
      false,
    );
  });
});

describe("OrderUpdateBodySchema", () => {
  const UPDATE = {
    paymentType: PaymentType.MASTERCARD,
    shippingType: ShippingType.STANDARD,
    shippingProvider: ShippingProvider.DHL,
    address: ADDRESS,
    items: [
      { productUuid: PRODUCT_A, quantity: 1 },
      { productUuid: PRODUCT_B, quantity: 3 },
    ],
  };

  it("accepts 1 to ORDER_MAX_LINES distinct lines and drops any discount key", () => {
    const parsed = OrderUpdateBodySchema.parse({ ...UPDATE, discountKey: "BLACK_FRIDAY" });
    expect(parsed.items).toHaveLength(2);
    expect("discountKey" in parsed).toBe(false);
  });

  it("refuses no line, too many lines, a duplicate product and a bad quantity", () => {
    expect(OrderUpdateBodySchema.safeParse({ ...UPDATE, items: [] }).success).toBe(false);
    const tooMany = fakeUuids(ORDER_MAX_LINES + 1).map((productUuid) => ({
      productUuid,
      quantity: 1,
    }));
    expect(OrderUpdateBodySchema.safeParse({ ...UPDATE, items: tooMany }).success).toBe(false);
    const duplicate = [
      { productUuid: PRODUCT_A, quantity: 1 },
      { productUuid: PRODUCT_A, quantity: 2 },
    ];
    expect(OrderUpdateBodySchema.safeParse({ ...UPDATE, items: duplicate }).success).toBe(false);
    const zero = [{ productUuid: PRODUCT_A, quantity: 0 }];
    expect(OrderUpdateBodySchema.safeParse({ ...UPDATE, items: zero }).success).toBe(false);
  });
});

describe("OrdersListParamsSchema", () => {
  it("drops unknown statuses and duplicates, defaults the page to 1", () => {
    expect(OrdersListParamsSchema.parse({ statuses: ["PAID", "LOST", "PAID", "SHIPPED"] })).toEqual(
      { statuses: [OrderStatus.PAID, OrderStatus.SHIPPED], page: 1 },
    );
    expect(OrdersListParamsSchema.parse({ page: "0" }).page).toBe(1);
    expect(OrdersListParamsSchema.parse({ page: "abc" }).page).toBe(1);
    expect(OrdersListParamsSchema.parse({ page: "3" }).page).toBe(3);
  });
});
