/**
 * `/api/orders/[uuid]/retry-payment` — retries the payment of an order after a refusal (USER).
 * Never retried automatically by the BFF.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1, §1.1
 * @see specs/003-account-orders/research.md R11
 */
import type { NextResponse } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/bff-response";
import { ApiError } from "@/lib/api/errors";
import { retryPayment } from "@/lib/api/endpoints/orders";
import { parseQueryValue } from "@/lib/api/query-validation";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger, maskUuid } from "@/lib/logger";
import { OrderUuidParamSchema, type OrderStatusResult } from "@/lib/schemas/order";

const log = createModuleLogger("orders.retry-payment");

/** Name of the dynamic segment, reported in `fieldErrors`. */
const ORDER_UUID_PARAM = "uuid";

/** Outcomes of a retry worth a warning (contracts §5). */
const WARNED_CODES: ReadonlySet<FrontErrorCode> = new Set([
  FrontErrorCode.PAYMENT_FAILED,
  FrontErrorCode.RATE_LIMITED,
]);

/** Context given by Next.js to the handler. */
interface RetryPaymentContext {
  readonly params: Promise<{ uuid: string }>;
}

/**
 * Retries the payment.
 *
 * @param _request - Unused request.
 * @param context - Route parameters.
 * @returns `200 { uuid, status }`, or an error (`payment-failed`, `payment-already-completed`,
 *   `not-found`…).
 */
export async function POST(_request: Request, context: RetryPaymentContext): Promise<NextResponse> {
  const uuid = parseQueryValue((await context.params).uuid, OrderUuidParamSchema, ORDER_UUID_PARAM);
  if (!uuid.ok) {
    return uuid.response;
  }
  try {
    const accessToken = await getAccessTokenOrThrow();
    const order = await retryPayment(uuid.data, accessToken);
    log.info({ orderUuid: maskUuid(order.uuid), status: order.status }, "Payment retried");
    const result: OrderStatusResult = { uuid: order.uuid, status: order.status };
    return jsonOk(result);
  } catch (error) {
    if (error instanceof ApiError && WARNED_CODES.has(error.frontCode)) {
      log.warn({ orderUuid: maskUuid(uuid.data), code: error.frontCode }, "Payment retry refused");
    }
    return jsonError(error);
  }
}
