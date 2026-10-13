/**
 * `POST /api/cart/preview` — guest cart lines enriched with live prices and stock (public).
 *
 * The guest cart lives in the browser; this route is how the visitor sees names, images, prices,
 * an estimated total and a status per line, and how the stock is checked before each write.
 *
 * @see docs/guest-cart.md §3
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import type { NextResponse } from "next/server";

import { toGuestCartView } from "@/features/cart/server/cart-view";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { GuestLinesBodySchema } from "@/lib/schemas/cart";

/**
 * Builds the guest cart view of up to 50 lines.
 *
 * @param request - Request carrying `{ items: GuestLine[] }`.
 * @returns `200 CartView` (`source: "guest"`), or an error.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = await parseJsonBody(request, GuestLinesBodySchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    return jsonOk(await toGuestCartView(body.data.items));
  } catch (error) {
    return jsonError(error);
  }
}
