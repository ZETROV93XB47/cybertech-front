/**
 * `/api/orders/[uuid]` — edits an order not shipped yet (USER): the complete new list of lines,
 * the address, the shipping and the payment method. The order keeps its discount. Never retried
 * automatically by the BFF (no idempotency key on the backend).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1, §1.1
 * @see specs/003-account-orders/research.md R14
 */
import type { NextResponse } from "next/server";

import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { ApiError } from "@/lib/api/errors";
import { updateOrder } from "@/lib/api/endpoints/orders";
import { parseQueryValue } from "@/lib/api/query-validation";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger, maskUuid } from "@/lib/logger";
import {
  OrderUpdateBodySchema,
  OrderUuidParamSchema,
  toOrderChangeResult,
} from "@/lib/schemas/order";

const log = createModuleLogger("orders.update");

/** Name of the dynamic segment, reported in `fieldErrors`. */
const ORDER_UUID_PARAM = "uuid";

/** Refusals worth a warning (contracts §5). */
const WARNED_CODES: ReadonlySet<FrontErrorCode> = new Set([
  FrontErrorCode.ORDER_LOCKED,
  FrontErrorCode.PAYMENT_FAILED,
  FrontErrorCode.RATE_LIMITED,
]);

/** Context given by Next.js to the handler. */
interface OrderContext {
  readonly params: Promise<{ uuid: string }>;
}

/**
 * Edits the order.
 *
 * @param request - Request carrying the lines, address, shipping and payment.
 * @param context - Route parameters.
 * @returns `200 OrderChangeResult`, or an error (`order-locked`, `insufficient-stock`,
 *   `payment-failed`, `not-found`…).
 */
export async function POST(request: Request, context: OrderContext): Promise<NextResponse> {
  const uuid = parseQueryValue((await context.params).uuid, OrderUuidParamSchema, ORDER_UUID_PARAM);
  if (!uuid.ok) {
    return uuid.response;
  }
  const body = await parseJsonBody(request, OrderUpdateBodySchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    const accessToken = await getAccessTokenOrThrow();
    const order = await updateOrder(uuid.data, body.data, accessToken);
    // The address is never logged.
    log.info(
      { orderUuid: maskUuid(order.uuid), status: order.status, lines: body.data.items.length },
      "Order edited",
    );
    return jsonOk(toOrderChangeResult(order));
  } catch (error) {
    if (error instanceof ApiError && WARNED_CODES.has(error.frontCode)) {
      log.warn({ orderUuid: maskUuid(uuid.data), code: error.frontCode }, "Order edit refused");
    }
    return jsonError(error);
  }
}
