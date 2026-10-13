/**
 * `POST /api/cart/merge` — merges the guest cart into the account cart at sign-in (USER).
 *
 * @see docs/guest-cart.md §4
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import type { NextResponse } from "next/server";

import { mergeGuestCart } from "@/features/cart/server/merge-guest-cart";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { GuestLinesBodySchema } from "@/lib/schemas/cart";

/**
 * Merges the given guest lines.
 *
 * @param request - Request carrying `{ items: GuestLine[] }`.
 * @returns `200 MergeReport`, or an error (the browser then keeps its guest cart).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = await parseJsonBody(request, GuestLinesBodySchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    return jsonOk(await mergeGuestCart(body.data.items, await getAccessTokenOrThrow()));
  } catch (error) {
    return jsonError(error);
  }
}
