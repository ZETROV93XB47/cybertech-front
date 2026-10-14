/**
 * `/api/wishlist/ids` — product UUIDs of the signed-in user's wishlist, read once per page view
 * and shared by every heart (USER). `401 unauthenticated` without a valid session, read by the
 * browser as « empty ».
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 * @see specs/003-account-orders/research.md R22
 */
import type { NextResponse } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/bff-response";
import { getWishlistProductUuids } from "@/lib/api/endpoints/wishlist";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import type { WishlistIds } from "@/lib/schemas/wishlist";

/**
 * Reads the product UUIDs of the wishlist.
 *
 * @returns `200 { productUuids }`, or an error (`unauthenticated`, `unavailable`).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const accessToken = await getAccessTokenOrThrow();
    const body: WishlistIds = { productUuids: await getWishlistProductUuids(accessToken) };
    return jsonOk(body);
  } catch (error) {
    return jsonError(error);
  }
}
