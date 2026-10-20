/**
 * Orders shared by the « Mes commandes » tests: a recent order with its total breakdown and an
 * old one without it (feature 003 US3).
 */
import { OrderStatus } from "@/lib/enums/order";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import type { OrderResponse } from "@/lib/schemas/order";

import { fakeUuids } from "../../helpers/products";

export const [
  ORDER_UUID = "",
  USER_UUID = "",
  PRODUCT_A = "",
  PRODUCT_B = "",
  PRODUCT_C = "",
  ITEM_A = "",
  ITEM_B = "",
] = fakeUuids(7);

/** Flat address as returned by the backend. */
export const FLAT_ADDRESS = "12 rue de la Paix, 75002 Paris, France";

/** Paid order of two lines (3 items), placed with BLACK_FRIDAY. */
export const RECENT_ORDER: OrderResponse = {
  uuid: ORDER_UUID,
  userUuid: USER_UUID,
  orderDate: "2026-10-14",
  createdAt: "2026-10-14T10:15:30",
  status: OrderStatus.PAID,
  totalAmount: 425,
  refundedAmount: 0,
  currency: "EUR",
  subtotalAmount: 500,
  discountKey: "BLACK_FRIDAY",
  discountCalculationType: null,
  discountAmount: 100,
  shippingType: ShippingType.EXPRESS,
  shippingProvider: ShippingProvider.FEDEX,
  shippingCost: 25,
  shippingAddress: FLAT_ADDRESS,
  orderItems: [
    {
      orderItemUuid: ITEM_A,
      productUuid: PRODUCT_A,
      productName: "Portable",
      quantity: 2,
      unitPrice: 200,
      lineItemTotalPrice: 400,
    },
    {
      orderItemUuid: ITEM_B,
      productUuid: PRODUCT_B,
      productName: "Écran",
      quantity: 1,
      unitPrice: 100,
      lineItemTotalPrice: 100,
    },
  ],
};

/** Order placed before the breakdown was stored. */
export const OLD_ORDER: OrderResponse = {
  ...RECENT_ORDER,
  status: OrderStatus.DELIVERED,
  subtotalAmount: null,
  discountAmount: null,
  shippingCost: null,
  discountKey: "NO_DISCOUNT",
};
