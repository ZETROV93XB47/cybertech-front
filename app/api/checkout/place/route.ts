/**
 * `/api/checkout/place` — turns the account cart into an order (USER). The backend empties the
 * cart and starts the server-side payment; the outcome is read later through the order status.
 *
 * Never retried automatically: the backend has no idempotency key, a replay could place a
 * second order (research R9).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 * @see specs/003-account-orders/research.md R9, R10
 */
import type { NextResponse } from "next/server";

import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { ApiError } from "@/lib/api/errors";
import { placeOrder } from "@/lib/api/endpoints/orders";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { HTTP_STATUS } from "@/lib/constants/http";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger, maskUuid } from "@/lib/logger";
import { OrderPlaceBodySchema, type PlacedOrder } from "@/lib/schemas/order";

const log = createModuleLogger("checkout.place");

/** Refusals worth a warning (contracts §5); other errors are logged by the backend client. */
const WARNED_CODES: ReadonlySet<FrontErrorCode> = new Set([
  FrontErrorCode.DISCOUNT_INVALID,
  FrontErrorCode.ACCOUNT_INACTIVE,
  FrontErrorCode.RATE_LIMITED,
]);

/**
 * Places the order.
 *
 * @param request - Request carrying payment, shipping, address and discount key.
 * @returns `201 PlacedOrder`, or an error (`insufficient-stock`, `empty-cart`,
 *   `account-inactive`, `discount-invalid`, `rate-limited`…).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = await parseJsonBody(request, OrderPlaceBodySchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    const accessToken = await getAccessTokenOrThrow();
    const order = await placeOrder(body.data, accessToken);
    // The address is never logged; the requested key is (discountApplied is not returned).
    log.info(
      {
        orderUuid: maskUuid(order.uuid),
        lines: order.orderItems.length,
        shippingType: order.shippingType,
        shippingProvider: order.shippingProvider,
        discountKey: body.data.discountKey,
      },
      "Order placed from the checkout",
    );
    const placed: PlacedOrder = { orderUuid: order.uuid, status: order.status };
    return jsonOk(placed, HTTP_STATUS.CREATED);
  } catch (error) {
    if (error instanceof ApiError && WARNED_CODES.has(error.frontCode)) {
      log.warn({ code: error.frontCode }, "Order placement refused");
    }
    return jsonError(error);
  }
}
