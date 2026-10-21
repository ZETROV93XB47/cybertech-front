/**
 * Views of « Mes commandes » and of the order detail, built from the backend order by pure
 * functions: list row, detail (lines, address, total breakdown, timeline, allowed actions) and
 * the effect of an edit.
 *
 * Every amount is copied from the backend; nothing is recomputed (constitution V). The allowed
 * actions are indicative: the backend stays the only judge (FR-027).
 *
 * @see specs/003-account-orders/data-model.md §4.4, §4.5, §5
 * @see specs/003-account-orders/research.md R13
 */
import { parseFlatAddress, type ParsedAddress } from "@/lib/address";
import { NO_DISCOUNT_KEY } from "@/lib/constants/discount";
import { ORDER_NUMBER_LENGTH } from "@/lib/constants/orders";
import { OrderChangeKind, OrderStatus, StatusTone } from "@/lib/enums/order";
import type { ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import type { OrderResponse } from "@/lib/schemas/order";

import { buildOrderTimeline, type OrderTimeline } from "./order-timeline";

/** What the customer may do with an order in a given status, and how the status looks. */
interface StatusRules {
  readonly canEdit: boolean;
  readonly canCancel: boolean;
  readonly canRetryPayment: boolean;
  readonly tone: StatusTone;
}

/**
 * Builds the rules of one status (keeps the table above on one line per status).
 *
 * @param canEdit - Whether the order can be edited.
 * @param canCancel - Whether the order can be cancelled.
 * @param canRetryPayment - Whether « Relancer le paiement » is offered.
 * @param tone - Visual tone of the status badge.
 * @returns The rules.
 */
function rules(
  canEdit: boolean,
  canCancel: boolean,
  canRetryPayment: boolean,
  tone: StatusTone,
): StatusRules {
  return { canEdit, canCancel, canRetryPayment, tone };
}

/**
 * Actions and tone per status, read in the backend (`OrderManagementServiceImp`,
 * `OrderCancellationTransactionalDelegateImp`): editable until `AWAITING_SHIPPING` included,
 * cancellable until `PAID` included, payment retry offered only after a refusal.
 *
 * @see specs/003-account-orders/data-model.md §5
 */
export const ORDER_STATUS_RULES: Readonly<Record<OrderStatus, StatusRules>> = {
  [OrderStatus.CREATED]: rules(true, true, false, StatusTone.PROGRESS),
  [OrderStatus.AWAITING_PAYMENT]: rules(true, true, false, StatusTone.PROGRESS),
  [OrderStatus.PAYMENT_FAILED]: rules(true, true, true, StatusTone.WARNING),
  [OrderStatus.PAID]: rules(true, true, false, StatusTone.SUCCESS),
  [OrderStatus.AWAITING_SHIPPING]: rules(true, false, false, StatusTone.PROGRESS),
  [OrderStatus.SHIPPED]: rules(false, false, false, StatusTone.PROGRESS),
  [OrderStatus.DELIVERED]: rules(false, false, false, StatusTone.SUCCESS),
  [OrderStatus.RETURNED]: rules(false, false, false, StatusTone.NEUTRAL),
  [OrderStatus.CANCELED]: rules(false, false, false, StatusTone.NEUTRAL),
  [OrderStatus.REFUNDED]: rules(false, false, false, StatusTone.NEUTRAL),
};

/** One row of « Mes commandes ». */
export interface OrderSummaryRow {
  readonly uuid: string;
  /** Date and time the order was placed (`LocalDateTime`, no time zone). */
  readonly createdAt: string;
  readonly status: OrderStatus;
  readonly statusTone: StatusTone;
  /** Sum of the quantities of the lines. */
  readonly itemCount: number;
  readonly total: number;
  readonly currency: string;
}

/**
 * Turns an order into a row of the list.
 *
 * @param order - Backend order.
 * @returns The row.
 */
export function toOrderSummaryRow(order: OrderResponse): OrderSummaryRow {
  return {
    uuid: order.uuid,
    createdAt: order.createdAt,
    status: order.status,
    statusTone: ORDER_STATUS_RULES[order.status].tone,
    itemCount: order.orderItems.reduce((count, item) => count + item.quantity, 0),
    total: order.totalAmount,
    currency: order.currency,
  };
}

/** One line of the order detail. */
export interface OrderLineView {
  readonly productUuid: string;
  readonly productName: string;
  /** Raw category of the product (backend `abe674d`); `null` when unknown (product deleted). */
  readonly category: string | null;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
  /** Whether the product is still in the catalog (only then is it linked). */
  readonly isInCatalog: boolean;
}

/** Breakdown of the total; absent on orders placed before it was stored. */
export interface OrderBreakdownView {
  readonly subtotal: number;
  readonly discount: number;
  /** Campaign key, `null` for `NO_DISCOUNT`. */
  readonly discountKey: string | null;
  readonly shippingCost: number;
}

/** Detail of an order. */
export interface OrderView {
  readonly uuid: string;
  readonly createdAt: string;
  readonly status: OrderStatus;
  readonly statusTone: StatusTone;
  readonly currency: string;
  readonly lines: readonly OrderLineView[];
  readonly address: ParsedAddress & { readonly raw: string };
  readonly shipping: { readonly type: ShippingType; readonly provider: ShippingProvider };
  readonly breakdown: OrderBreakdownView | null;
  /** Campaign key the order was placed with, `null` for `NO_DISCOUNT` (kept on edit). */
  readonly discountKey: string | null;
  readonly total: number;
  /** Amount refunded so far; shown only when positive. */
  readonly refunded: number;
  readonly timeline: OrderTimeline;
  readonly canEdit: boolean;
  readonly canCancel: boolean;
  readonly canRetryPayment: boolean;
}

/**
 * Campaign key to display.
 *
 * @param key - Backend key.
 * @returns The key, or `null` for `NO_DISCOUNT`.
 */
function displayedDiscountKey(key: string): string | null {
  return key === NO_DISCOUNT_KEY ? null : key;
}

/**
 * Breakdown of the total, or `null` when one of its parts is missing (old order, FR-023).
 *
 * @param order - Backend order.
 * @returns The breakdown, or `null`.
 */
function toBreakdown(order: OrderResponse): OrderBreakdownView | null {
  const { subtotalAmount, discountAmount, shippingCost } = order;
  if (subtotalAmount === null || discountAmount === null || shippingCost === null) {
    return null;
  }
  return {
    subtotal: subtotalAmount,
    discount: discountAmount,
    discountKey: displayedDiscountKey(order.discountKey),
    shippingCost,
  };
}

/**
 * Turns an order into its detail view.
 *
 * @param order - Backend order.
 * @param catalogUuids - UUIDs of the products still in the catalog, `null` when the
 *   availability could not be read (no line is then linked).
 * @returns The detail view.
 */
export function toOrderView(
  order: OrderResponse,
  catalogUuids: ReadonlySet<string> | null,
): OrderView {
  const statusRules = ORDER_STATUS_RULES[order.status];
  return {
    uuid: order.uuid,
    createdAt: order.createdAt,
    status: order.status,
    statusTone: statusRules.tone,
    currency: order.currency,
    lines: order.orderItems.map((item) => ({
      productUuid: item.productUuid,
      productName: item.productName,
      category: item.category ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineItemTotalPrice,
      isInCatalog: catalogUuids?.has(item.productUuid) ?? false,
    })),
    address: { ...parseFlatAddress(order.shippingAddress), raw: order.shippingAddress },
    shipping: { type: order.shippingType, provider: order.shippingProvider },
    breakdown: toBreakdown(order),
    discountKey: displayedDiscountKey(order.discountKey),
    total: order.totalAmount,
    refunded: order.refundedAmount,
    timeline: buildOrderTimeline(order.status),
    canEdit: statusRules.canEdit,
    canCancel: statusRules.canCancel,
    canRetryPayment: statusRules.canRetryPayment,
  };
}

/** Backend amounts compared before and after an edit. */
export interface OrderAmounts {
  readonly total: number;
  readonly refunded: number;
}

/**
 * Effect of an edit on what the customer pays, read from the backend amounts only (FR-025):
 * a larger refunded amount means a refund, a larger total a complement charged.
 *
 * @param before - Amounts before the edit.
 * @param after - Amounts returned by the edit.
 * @returns The kind of change.
 */
export function describeOrderChange(before: OrderAmounts, after: OrderAmounts): OrderChangeKind {
  if (after.refunded > before.refunded) {
    return OrderChangeKind.REFUNDED;
  }
  if (after.total > before.total) {
    return OrderChangeKind.CHARGED;
  }
  return OrderChangeKind.UNCHANGED;
}

/**
 * Short number of an order shown to the customer: the last characters of its UUID (the random
 * part of a UUID v7; its first characters are a timestamp, identical for close orders).
 *
 * @param uuid - Order UUID.
 * @returns The number, upper-cased.
 */
export function shortOrderNumber(uuid: string): string {
  return uuid.slice(-ORDER_NUMBER_LENGTH).toUpperCase();
}
