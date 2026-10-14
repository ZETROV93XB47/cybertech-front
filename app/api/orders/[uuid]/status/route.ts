/**
 * `/api/orders/[uuid]/status` — status of one order of the caller (USER), polled by the
 * confirmation page. Another user's order answers 404, like a missing one.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 * @see specs/003-account-orders/research.md R11
 */
import type { NextResponse } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/bff-response";
import { getOrderStatus } from "@/lib/api/endpoints/orders";
import { parseQueryValue } from "@/lib/api/query-validation";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { OrderUuidParamSchema } from "@/lib/schemas/order";

/** Name of the dynamic segment, reported in `fieldErrors`. */
const ORDER_UUID_PARAM = "uuid";

/** Context given by Next.js to the handler. */
interface OrderStatusContext {
  readonly params: Promise<{ uuid: string }>;
}

/**
 * Reads the status of the order.
 *
 * @param _request - Unused request.
 * @param context - Route parameters.
 * @returns `200 { uuid, status }`, or an error (`not-found`, `unauthenticated`, `unavailable`).
 */
export async function GET(_request: Request, context: OrderStatusContext): Promise<NextResponse> {
  const uuid = parseQueryValue((await context.params).uuid, OrderUuidParamSchema, ORDER_UUID_PARAM);
  if (!uuid.ok) {
    return uuid.response;
  }
  try {
    const accessToken = await getAccessTokenOrThrow();
    return jsonOk(await getOrderStatus(uuid.data, accessToken));
  } catch (error) {
    return jsonError(error);
  }
}
