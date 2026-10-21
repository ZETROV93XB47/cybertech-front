/**
 * Order schemas: backend responses (order, status, quote) and the bodies sent by the BFF
 * (quote, place, update), plus the query of « Mes commandes ».
 *
 * Every response is validated before use (constitution V); every input repeats the Bean
 * Validation constraints of the backend DTO. Amounts are never recomputed here.
 *
 * @see specs/003-account-orders/data-model.md §2 and §3
 * @see docs/backend/api-map.md §7, §D.8, §D.9, §D.17, §D.18, §D.27
 */
import { z } from "zod";

import { CART_LINE_MAX_QUANTITY, CART_LINE_MIN_QUANTITY } from "@/lib/constants/cart";
import { NO_DISCOUNT_KEY } from "@/lib/constants/discount";
import { ORDER_MAX_LINES } from "@/lib/constants/orders";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import { OrderStatus, PaymentType } from "@/lib/enums/order";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";

import { ShippingAddressSchema } from "./address";
import { DiscountKeySchema } from "./discount";
import { pagedSchema } from "./paged";

/** Length of an ISO 4217 currency code (`EUR`). */
const CURRENCY_CODE_LENGTH = 3;

/** First page of « Mes commandes » (1-based in the URL, 0-based for the backend). */
const FIRST_ORDERS_PAGE = 1;

/** ISO 4217 currency code. */
const CurrencySchema = z.string().length(CURRENCY_CODE_LENGTH);

/** Amount in euros, never negative. */
const AmountSchema = z.number().nonnegative();

/** `OrderItemResponseDto`: one line of an order, priced at purchase time. */
export const OrderItemSchema = z.object({
  orderItemUuid: z.uuid(),
  productUuid: z.uuid(),
  productName: z.string().min(1),
  quantity: z.int().min(CART_LINE_MIN_QUANTITY),
  unitPrice: AmountSchema,
  lineItemTotalPrice: AmountSchema,
  /**
   * Category key of the product at read time (backend `abe674d`); `null` when the product was
   * deleted since. Free text, read through `toCategoryKey`.
   */
  category: z.string().min(1).nullish(),
});

/** One line of an order. */
export type OrderItem = z.infer<typeof OrderItemSchema>;

/**
 * `OrderResponseDto`, returned by place, get, mine, update, cancel and retry-payment.
 *
 * The total breakdown (`subtotalAmount`, `discountAmount`, `shippingCost`,
 * `discountCalculationType`) is `null` on orders placed before it existed; `discountKey` is
 * never `null` (`NOT NULL` column, `NO_DISCOUNT` by default). The payment type is not returned.
 */
export const OrderResponseSchema = z.object({
  uuid: z.uuid(),
  userUuid: z.uuid(),
  orderDate: z.iso.date(),
  createdAt: z.string().min(1),
  status: z.enum(OrderStatus),
  totalAmount: AmountSchema,
  refundedAmount: AmountSchema,
  currency: CurrencySchema,
  subtotalAmount: AmountSchema.nullable(),
  discountKey: z.string().min(1),
  discountCalculationType: z.enum(DiscountCalculationType).nullable(),
  discountAmount: AmountSchema.nullable(),
  shippingType: z.enum(ShippingType),
  shippingProvider: z.enum(ShippingProvider),
  shippingCost: AmountSchema.nullable(),
  shippingAddress: z.string(),
  /** Indicative earliest delivery day; null or absent on orders placed before estimates existed. */
  estimatedDeliveryFrom: z.iso.date().nullish(),
  /** Indicative latest delivery day; null or absent on orders placed before estimates existed. */
  estimatedDeliveryTo: z.iso.date().nullish(),
  orderItems: z.array(OrderItemSchema).min(1),
});

/** An order as returned by the backend. */
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

/** `PagedModel<OrderResponseDto>` of `GET /management/order/mine`. */
export const OrdersPageSchema = pagedSchema(OrderResponseSchema);

/** A page of orders. */
export type OrdersPage = z.infer<typeof OrdersPageSchema>;

/** `OrderStatusDto`: status of one order, polled by the confirmation page. */
export const OrderStatusSchema = z.object({
  uuid: z.uuid(),
  status: z.enum(OrderStatus),
});

/** Status of one order. */
export type OrderStatusResult = z.infer<typeof OrderStatusSchema>;

/**
 * Body of a successful `POST /api/checkout/place` (`201`): only what the confirmation page
 * needs; the order itself is read again there.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 */
export const PlacedOrderSchema = z.object({
  orderUuid: z.uuid(),
  status: z.enum(OrderStatus),
});

/** Order just placed. */
export type PlacedOrder = z.infer<typeof PlacedOrderSchema>;

/**
 * Body of a successful `POST /api/orders/{uuid}` (edit) and `POST /api/orders/{uuid}/cancel`:
 * the new status and the backend amounts the page compares with the previous ones (never
 * recomputed). The page then reads the order again with `router.refresh()`.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 */
export const OrderChangeResultSchema = z.object({
  uuid: z.uuid(),
  status: z.enum(OrderStatus),
  total: AmountSchema,
  refunded: AmountSchema,
});

/** Outcome of an order edit or cancellation. */
export type OrderChangeResult = z.infer<typeof OrderChangeResultSchema>;

/**
 * Keeps from an edited or cancelled order what the page needs (no address, no lines).
 *
 * @param order - Order returned by the backend.
 * @returns Its status and amounts.
 */
export function toOrderChangeResult(order: OrderResponse): OrderChangeResult {
  return {
    uuid: order.uuid,
    status: order.status,
    total: order.totalAmount,
    refunded: order.refundedAmount,
  };
}

/**
 * `OrderQuoteResponseDto`: amounts the backend would charge for the cart, nothing created.
 *
 * `discountApplied` is false under `minOrderAmount` (the backend then drops the discount
 * without error) and for `NO_DISCOUNT`; `totalAmount = max(0, subtotal − discount) + shipping`
 * is the backend invariant, never recomputed by the front.
 */
export const OrderQuoteResponseSchema = z.object({
  subtotalAmount: AmountSchema,
  discountKey: z.string().min(1),
  discountCalculationType: z.enum(DiscountCalculationType),
  discountAmount: AmountSchema,
  discountApplied: z.boolean(),
  minOrderAmount: AmountSchema.nullable(),
  shippingCost: AmountSchema,
  totalAmount: AmountSchema,
  currency: CurrencySchema,
});

/** A backend quote. */
export type OrderQuoteResponse = z.infer<typeof OrderQuoteResponseSchema>;

/**
 * Body of `POST /api/checkout/quote` and of the backend quote. A missing key becomes
 * `NO_DISCOUNT`: the backend rejects an explicit `null` (api-map §D.8).
 */
export const OrderQuoteBodySchema = z.object({
  shippingType: z.enum(ShippingType),
  shippingProvider: z.enum(ShippingProvider),
  discountKey: DiscountKeySchema.default(NO_DISCOUNT_KEY),
});

/** Validated quote request. */
export type OrderQuoteBody = z.infer<typeof OrderQuoteBodySchema>;

/**
 * Body of `POST /api/checkout/place`. Store pickup is not a `ShippingType`, so it can never be
 * sent. The BFF flattens the address into `shippingStreet/City/ZipCode/Country`.
 */
export const OrderPlaceBodySchema = z.object({
  paymentType: z.enum(PaymentType),
  shippingType: z.enum(ShippingType),
  shippingProvider: z.enum(ShippingProvider),
  address: ShippingAddressSchema,
  discountKey: DiscountKeySchema.default(NO_DISCOUNT_KEY),
});

/** Validated placement request. */
export type OrderPlaceBody = z.infer<typeof OrderPlaceBodySchema>;

/** One line of an edited order: product and absolute quantity. */
export const OrderUpdateItemSchema = z.object({
  productUuid: z.uuid(),
  quantity: z.int().min(CART_LINE_MIN_QUANTITY).max(CART_LINE_MAX_QUANTITY),
});

/** One line of an edited order. */
export type OrderUpdateItem = z.infer<typeof OrderUpdateItemSchema>;

/**
 * Body of `POST /api/orders/{uuid}`: the complete new list of lines (the backend replaces
 * them all), address, shipping and payment. No discount key: an edited order keeps the
 * discount it was placed with (backend commit `e0b93b4`). The order UUID comes from the path.
 */
export const OrderUpdateBodySchema = z.object({
  paymentType: z.enum(PaymentType),
  shippingType: z.enum(ShippingType),
  shippingProvider: z.enum(ShippingProvider),
  address: ShippingAddressSchema,
  items: z
    .array(OrderUpdateItemSchema)
    .min(1)
    .max(ORDER_MAX_LINES)
    .refine((items) => new Set(items.map(({ productUuid }) => productUuid)).size === items.length, {
      message: "Each product must appear on one line only",
    }),
});

/** Validated order edit. */
export type OrderUpdateBody = z.infer<typeof OrderUpdateBodySchema>;

/** Order UUID read from a route path or a page parameter. */
export const OrderUuidParamSchema = z.uuid();

/**
 * Query of « Mes commandes » read from the URL: unknown statuses and duplicates are dropped
 * (no 400 for a hand-edited URL), the page is 1-based and defaults to the first one.
 */
export const OrdersListParamsSchema = z.object({
  statuses: z
    .array(z.unknown())
    .default([])
    .transform((values) => [
      ...new Set(values.flatMap((value) => z.enum(OrderStatus).safeParse(value).data ?? [])),
    ]),
  page: z.coerce.number().int().min(FIRST_ORDERS_PAGE).catch(FIRST_ORDERS_PAGE),
});

/** Validated query of « Mes commandes ». */
export type OrdersListParams = z.infer<typeof OrdersListParamsSchema>;
