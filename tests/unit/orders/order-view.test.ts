/**
 * Views of « Mes commandes » (feature 003, T041): list row, detail with or without the total
 * breakdown, actions per status, timeline and the effect of an edit.
 *
 * @see specs/003-account-orders/data-model.md §4.4, §4.5, §5
 */
import { describe, expect, it } from "vitest";

import { buildOrderTimeline } from "@/features/orders/order-timeline";
import {
  describeOrderChange,
  shortOrderNumber,
  toOrderSummaryRow,
  toOrderView,
} from "@/features/orders/order-view";
import {
  OrderChangeKind,
  OrderOutcome,
  OrderStatus,
  StatusTone,
  TimelineStepState,
} from "@/lib/enums/order";

import { OLD_ORDER, ORDER_UUID, PRODUCT_A, PRODUCT_B, RECENT_ORDER } from "./fixtures";

describe("toOrderSummaryRow", () => {
  it("sums the quantities and copies the total", () => {
    expect(toOrderSummaryRow(RECENT_ORDER)).toEqual({
      uuid: ORDER_UUID,
      createdAt: RECENT_ORDER.createdAt,
      status: OrderStatus.PAID,
      statusTone: StatusTone.SUCCESS,
      itemCount: 3,
      total: 425,
      currency: "EUR",
    });
  });

  it.each([
    [OrderStatus.CREATED, StatusTone.PROGRESS],
    [OrderStatus.PAYMENT_FAILED, StatusTone.WARNING],
    [OrderStatus.DELIVERED, StatusTone.SUCCESS],
    [OrderStatus.CANCELED, StatusTone.NEUTRAL],
  ])("gives %s the tone %s", (status, tone) => {
    expect(toOrderSummaryRow({ ...RECENT_ORDER, status }).statusTone).toBe(tone);
  });
});

describe("toOrderView", () => {
  it("keeps the breakdown and the campaign key of a recent order", () => {
    const view = toOrderView(RECENT_ORDER, new Set([PRODUCT_A]));
    expect(view.breakdown).toEqual({
      subtotal: 500,
      discount: 100,
      discountKey: "BLACK_FRIDAY",
      shippingCost: 25,
    });
    expect(view.total).toBe(425);
    expect(view.address).toMatchObject({ street: "12 rue de la Paix", city: "Paris" });
  });

  it("drops the breakdown of an old order and hides NO_DISCOUNT", () => {
    const view = toOrderView(OLD_ORDER, null);
    expect(view.breakdown).toBeNull();
    expect(view.discountKey).toBeNull();
  });

  it("drops the breakdown when only one of its parts is missing", () => {
    expect(toOrderView({ ...RECENT_ORDER, shippingCost: null }, null).breakdown).toBeNull();
  });

  it("carries the category of each line, null when the backend has none", () => {
    const [first, ...others] = RECENT_ORDER.orderItems;
    const order = {
      ...RECENT_ORDER,
      orderItems: [
        { ...first!, category: "SMARTPHONE" },
        ...others.map((item) => ({ ...item, category: null })),
      ],
    };
    const categories = toOrderView(order, null).lines.map((line) => line.category);
    expect(categories[0]).toBe("SMARTPHONE");
    expect(categories.slice(1).every((category) => category === null)).toBe(true);
  });

  it("links only the lines still in the catalog", () => {
    const view = toOrderView(RECENT_ORDER, new Set([PRODUCT_A]));
    expect(view.lines.map((line) => [line.productUuid, line.isInCatalog])).toEqual([
      [PRODUCT_A, true],
      [PRODUCT_B, false],
    ]);
    expect(toOrderView(RECENT_ORDER, null).lines.every((line) => !line.isInCatalog)).toBe(true);
  });

  it.each([
    [OrderStatus.CREATED, true, true, false],
    [OrderStatus.AWAITING_PAYMENT, true, true, false],
    [OrderStatus.PAYMENT_FAILED, true, true, true],
    [OrderStatus.PAID, true, true, false],
    [OrderStatus.AWAITING_SHIPPING, true, false, false],
    [OrderStatus.SHIPPED, false, false, false],
    [OrderStatus.DELIVERED, false, false, false],
    [OrderStatus.RETURNED, false, false, false],
    [OrderStatus.CANCELED, false, false, false],
    [OrderStatus.REFUNDED, false, false, false],
  ])("%s: edit %s, cancel %s, retry %s", (status, canEdit, canCancel, canRetry) => {
    const view = toOrderView({ ...RECENT_ORDER, status }, null);
    expect([view.canEdit, view.canCancel, view.canRetryPayment]).toEqual([
      canEdit,
      canCancel,
      canRetry,
    ]);
  });
});

describe("buildOrderTimeline", () => {
  it("marks the steps before, at and after the current status", () => {
    const { steps, outcome } = buildOrderTimeline(OrderStatus.PAID);
    expect(steps.map((step) => step.state)).toEqual([
      TimelineStepState.DONE,
      TimelineStepState.DONE,
      TimelineStepState.CURRENT,
      TimelineStepState.UPCOMING,
      TimelineStepState.UPCOMING,
      TimelineStepState.UPCOMING,
    ]);
    expect(outcome).toBeNull();
  });

  it("shows a refused payment as an outcome after the second step", () => {
    const { steps, outcome } = buildOrderTimeline(OrderStatus.PAYMENT_FAILED);
    expect(outcome).toBe(OrderOutcome.PAYMENT_FAILED);
    expect(steps.filter((step) => step.state === TimelineStepState.DONE)).toHaveLength(2);
    expect(steps.some((step) => step.state === TimelineStepState.CURRENT)).toBe(false);
  });

  it.each([
    [OrderStatus.CANCELED, OrderOutcome.CANCELED, 1],
    [OrderStatus.REFUNDED, OrderOutcome.REFUNDED, 3],
    [OrderStatus.RETURNED, OrderOutcome.RETURNED, 6],
  ])("shows %s as the outcome %s with %i known steps", (status, expected, done) => {
    const { steps, outcome } = buildOrderTimeline(status);
    expect(outcome).toBe(expected);
    expect(steps.filter((step) => step.state === TimelineStepState.DONE)).toHaveLength(done);
  });
});

describe("describeOrderChange", () => {
  const before = { total: 425, refunded: 0 };

  it("reads a refund from a larger refunded amount", () => {
    expect(describeOrderChange(before, { total: 300, refunded: 125 })).toBe(
      OrderChangeKind.REFUNDED,
    );
  });

  it("reads a complement from a larger total", () => {
    expect(describeOrderChange(before, { total: 525, refunded: 0 })).toBe(OrderChangeKind.CHARGED);
  });

  it("reads no change otherwise", () => {
    expect(describeOrderChange(before, before)).toBe(OrderChangeKind.UNCHANGED);
  });
});

describe("shortOrderNumber", () => {
  it("keeps the first eight characters, upper-cased", () => {
    expect(shortOrderNumber("01a13b2d-aaaa-bbbb-cccc-ddddddd9f3c2")).toBe("DDD9F3C2");
    // Two UUID v7 created a few seconds apart share their prefix but not their number.
    expect(shortOrderNumber("01a15a86-0001-7000-8000-00000000a1b2")).not.toBe(
      shortOrderNumber("01a15a86-0002-7000-8000-00000000c3d4"),
    );
  });
});
