/**
 * Order endpoints of the backend: quote, placement, status, payment retry, list, detail, edit
 * and cancellation. Every call needs the user's access token and is never cached.
 *
 * Writes (place, retry-payment, update, cancel) are **never** retried: the backend has no
 * idempotency key, a replay could create a second order or charge twice (research R9). Reads
 * (quote, status, list, detail) are retried once on a temporary unavailability.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md
 * @see docs/backend/api-map.md §7
 * @see OrderManagementController, OrderManagementServiceImp (backend)
 */
import "server-only";

import { backendFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { withSingleRetry } from "@/lib/api/retry";
import { BACKEND_PATHS, BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import { ORDERS_PAGE_SIZE, ORDERS_SORT } from "@/lib/constants/orders";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { createModuleLogger, maskUuid } from "@/lib/logger";
import { toBackendShippingAddress } from "@/lib/schemas/address";
import {
  OrderQuoteResponseSchema,
  OrderResponseSchema,
  OrdersPageSchema,
  OrderStatusSchema,
  type OrderPlaceBody,
  type OrderQuoteBody,
  type OrderQuoteResponse,
  type OrderResponse,
  type OrdersListParams,
  type OrdersPage,
  type OrderStatusResult,
  type OrderUpdateBody,
} from "@/lib/schemas/order";

const log = createModuleLogger("orders.endpoints");

/** Offset between the 1-based page of the URL and the 0-based page of Spring. */
const PAGE_INDEX_OFFSET = 1;

/**
 * Retry policy of the reads: one more attempt only when the backend was unavailable.
 *
 * @param error - Error of the first attempt.
 * @returns `true` for a temporary unavailability.
 */
function isRetryableRead(error: unknown): boolean {
  return error instanceof ApiError && error.frontCode === FrontErrorCode.UNAVAILABLE;
}

/**
 * Builds the path of one order resource.
 *
 * @param base - Path from `BACKEND_PATHS`.
 * @param uuid - Order UUID, already validated.
 * @returns The path `{base}/{uuid}`.
 */
function orderResourcePath(base: string, uuid: string): string {
  return `${base}/${encodeURIComponent(uuid)}`;
}

/**
 * Prices the caller's server cart, without creating anything.
 *
 * @param body - Shipping choice and discount key (`NO_DISCOUNT` when none).
 * @param accessToken - Keycloak access token; never logged.
 * @returns The amounts the backend would charge.
 * @throws {ApiError} `DISCOUNT_INVALID` for an unknown or inactive key, `EMPTY_CART`,
 * `RATE_LIMITED` (60 req/min), `UNAVAILABLE` after the single retry.
 * @see OrderManagementController#quote (backend)
 */
export async function quoteOrder(
  body: OrderQuoteBody,
  accessToken: string,
): Promise<OrderQuoteResponse> {
  return withSingleRetry(
    () =>
      backendFetch(BACKEND_PATHS.orderQuote, {
        schema: OrderQuoteResponseSchema,
        method: HttpMethod.POST,
        body,
        accessToken,
      }),
    isRetryableRead,
  );
}

/**
 * Turns the server cart into an order; the backend empties the cart and starts the payment.
 * The payment outcome is only visible through {@link getOrderStatus} (never a 402 here).
 *
 * @param body - Payment, shipping, address and discount key, validated by Zod.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The created order.
 * @throws {ApiError} `INSUFFICIENT_STOCK`, `EMPTY_CART`, `ACCOUNT_INACTIVE`,
 * `DISCOUNT_INVALID`, `RATE_LIMITED` (30 req/min), `UNAVAILABLE` — never retried.
 * @see OrderManagementServiceImp#placeOrder (backend)
 */
export async function placeOrder(
  body: OrderPlaceBody,
  accessToken: string,
): Promise<OrderResponse> {
  const order = await backendFetch(BACKEND_PATHS.orderPlace, {
    schema: OrderResponseSchema,
    method: HttpMethod.POST,
    body: {
      paymentType: body.paymentType,
      shippingType: body.shippingType,
      shippingProvider: body.shippingProvider,
      discountKey: body.discountKey,
      ...toBackendShippingAddress(body.address),
    },
    accessToken,
  });
  log.info(
    { orderUuid: maskUuid(order.uuid), status: order.status, lines: order.orderItems.length },
    "Order placed",
  );
  return order;
}

/**
 * Reads the status of one order of the caller (polling of the confirmation page).
 *
 * @param uuid - Order UUID, already validated.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The order UUID and status.
 * @throws {ApiError} `NOT_FOUND` (also for another user's order), `UNAVAILABLE` after the
 * single retry.
 * @see OrderManagementController#getOrderStatusByUuid (backend)
 */
export async function getOrderStatus(
  uuid: string,
  accessToken: string,
): Promise<OrderStatusResult> {
  return withSingleRetry(
    () =>
      backendFetch(orderResourcePath(BACKEND_PATHS.orderStatus, uuid), {
        schema: OrderStatusSchema,
        accessToken,
      }),
    isRetryableRead,
  );
}

/**
 * Retries the payment of an order after `PAYMENT_FAILED`.
 *
 * @param uuid - Order UUID, already validated.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The order after the attempt.
 * @throws {ApiError} `PAYMENT_FAILED` (402 or 422), `PAYMENT_ALREADY_COMPLETED`, `NOT_FOUND`,
 * `UNAVAILABLE` — never retried.
 * @see OrderManagementServiceImp#retryPayment (backend)
 */
export async function retryPayment(uuid: string, accessToken: string): Promise<OrderResponse> {
  const order = await backendFetch(orderResourcePath(BACKEND_PATHS.orderRetryPayment, uuid), {
    schema: OrderResponseSchema,
    method: HttpMethod.POST,
    accessToken,
  });
  log.info({ orderUuid: maskUuid(uuid), status: order.status }, "Order payment retried");
  return order;
}

/**
 * Reads one page of the caller's orders, newest first.
 *
 * @param params - Status filter and 1-based page, validated by `OrdersListParamsSchema`.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The page of orders (`page.number` stays 0-based, as sent by Spring).
 * @throws {ApiError} `UNAVAILABLE` after the single retry.
 * @see OrderManagementController#getMyOrders (backend)
 */
export async function getMyOrders(
  params: OrdersListParams,
  accessToken: string,
): Promise<OrdersPage> {
  return withSingleRetry(
    () =>
      backendFetch(BACKEND_PATHS.orderMine, {
        schema: OrdersPageSchema,
        query: {
          [BACKEND_QUERY_PARAMS.status]: params.statuses,
          [BACKEND_QUERY_PARAMS.page]: String(params.page - PAGE_INDEX_OFFSET),
          [BACKEND_QUERY_PARAMS.size]: String(ORDERS_PAGE_SIZE),
          [BACKEND_QUERY_PARAMS.sort]: ORDERS_SORT,
        },
        accessToken,
      }),
    isRetryableRead,
  );
}

/**
 * Reads one order of the caller.
 *
 * @param uuid - Order UUID, already validated.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The order.
 * @throws {ApiError} `NOT_FOUND` (also for another user's order, relayed as 404),
 * `UNAVAILABLE` after the single retry.
 * @see OrderManagementController#getOrderByUuid (backend)
 */
export async function getOrder(uuid: string, accessToken: string): Promise<OrderResponse> {
  return withSingleRetry(
    () =>
      backendFetch(orderResourcePath(BACKEND_PATHS.orderGet, uuid), {
        schema: OrderResponseSchema,
        accessToken,
      }),
    isRetryableRead,
  );
}

/**
 * Edits an order not shipped yet: the complete list of lines replaces the old one, and the
 * order keeps the discount it was placed with.
 *
 * @param uuid - Order UUID, already validated (taken from the route path).
 * @param body - New lines, address, shipping and payment, validated by Zod.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The edited order.
 * @throws {ApiError} `ORDER_LOCKED`, `INSUFFICIENT_STOCK`, `PAYMENT_FAILED` (complement
 * refused), `NOT_FOUND`, `UNAVAILABLE` — never retried.
 * @see OrderManagementServiceImp#updateOrder (backend)
 */
export async function updateOrder(
  uuid: string,
  body: OrderUpdateBody,
  accessToken: string,
): Promise<OrderResponse> {
  const order = await backendFetch(BACKEND_PATHS.orderUpdate, {
    schema: OrderResponseSchema,
    method: HttpMethod.POST,
    body: {
      uuid,
      paymentType: body.paymentType,
      shippingType: body.shippingType,
      shippingProvider: body.shippingProvider,
      ...toBackendShippingAddress(body.address),
      itemUpdateRequestDtoList: body.items.map(({ productUuid, quantity }) => ({
        productUuid,
        quantity,
      })),
    },
    accessToken,
  });
  log.info(
    { orderUuid: maskUuid(uuid), status: order.status, lines: body.items.length },
    "Order updated",
  );
  return order;
}

/**
 * Cancels an order of the caller.
 *
 * @param uuid - Order UUID, already validated.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The cancelled order.
 * @throws {ApiError} `ORDER_LOCKED` (being prepared or shipped), `REFUND_FAILED`, `NOT_FOUND`,
 * `UNAVAILABLE` — never retried.
 * @see OrderCancellationTransactionalDelegateImp (backend)
 */
export async function cancelOrder(uuid: string, accessToken: string): Promise<OrderResponse> {
  const order = await backendFetch(BACKEND_PATHS.orderCancel, {
    schema: OrderResponseSchema,
    method: HttpMethod.POST,
    // `OrderCancellationRequestDto`.
    body: { orderUuid: uuid },
    accessToken,
  });
  log.info({ orderUuid: maskUuid(uuid), status: order.status }, "Order cancelled");
  return order;
}
