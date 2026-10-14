/**
 * `/api/checkout/quote` — backend quote of the account cart for a shipping choice and a
 * discount key (USER). Every amount comes from the backend; nothing is created.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 * @see specs/003-account-orders/research.md R4
 */
import type { NextResponse } from "next/server";

import { toQuoteView } from "@/features/checkout/quote-view";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { ApiError } from "@/lib/api/errors";
import { quoteOrder } from "@/lib/api/endpoints/orders";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger } from "@/lib/logger";
import { OrderQuoteBodySchema } from "@/lib/schemas/order";

const log = createModuleLogger("checkout.quote");

/**
 * Prices the account cart.
 *
 * @param request - Request carrying `{ shippingType, shippingProvider, discountKey? }`.
 * @returns `200 QuoteView`, or an error (`discount-invalid`, `empty-cart`, `rate-limited`…).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = await parseJsonBody(request, OrderQuoteBodySchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    const accessToken = await getAccessTokenOrThrow();
    return jsonOk(toQuoteView(await quoteOrder(body.data, accessToken)));
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.RATE_LIMITED) {
      log.warn({ retryAfterSeconds: error.retryAfterSeconds }, "Quote rate limited");
    }
    return jsonError(error);
  }
}
