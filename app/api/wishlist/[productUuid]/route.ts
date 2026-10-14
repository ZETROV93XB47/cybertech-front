/**
 * `/api/wishlist/[productUuid]` — adds (`PUT`) or removes (`DELETE`) one product of the
 * signed-in user's wishlist (USER). Both are idempotent: « already in » and « already gone »
 * are successes (FR-036). The answer is `200 { productUuid, isInWishlist }`.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 * @see specs/003-account-orders/research.md R22
 */
import type { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/bff-response";
import { addToWishlist, removeFromWishlist } from "@/lib/api/endpoints/wishlist";
import { parseQueryValue } from "@/lib/api/query-validation";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { createModuleLogger } from "@/lib/logger";
import type { WishlistToggleResult } from "@/lib/schemas/wishlist";

const log = createModuleLogger("wishlist.toggle");

/** Name of the dynamic segment, reported in `fieldErrors`. */
const PRODUCT_UUID_PARAM = "productUuid";

/** Context given by Next.js to the handlers. */
interface WishlistItemContext {
  readonly params: Promise<{ productUuid: string }>;
}

/**
 * Validates the product UUID, then runs the change with the user's token.
 *
 * @param context - Route parameters.
 * @param isInWishlist - State after the change.
 * @param change - Backend call.
 * @returns `200 WishlistToggleResult`, `400` for an invalid UUID, or the backend error.
 */
async function toggle(
  context: WishlistItemContext,
  isInWishlist: boolean,
  change: (productUuid: string, accessToken: string) => Promise<void>,
): Promise<NextResponse> {
  const productUuid = parseQueryValue(
    (await context.params).productUuid,
    z.uuid(),
    PRODUCT_UUID_PARAM,
  );
  if (!productUuid.ok) {
    return productUuid.response;
  }
  try {
    await change(productUuid.data, await getAccessTokenOrThrow());
    log.info({ productUuid: productUuid.data, isInWishlist }, "Wishlist changed");
    const body: WishlistToggleResult = { productUuid: productUuid.data, isInWishlist };
    return jsonOk(body);
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Adds the product to the wishlist.
 *
 * @param _request - Unused request.
 * @param context - Route parameters.
 * @returns `200 { productUuid, isInWishlist: true }`, or an error (`not-found`…).
 */
export async function PUT(_request: Request, context: WishlistItemContext): Promise<NextResponse> {
  return toggle(context, true, addToWishlist);
}

/**
 * Removes the product from the wishlist.
 *
 * @param _request - Unused request.
 * @param context - Route parameters.
 * @returns `200 { productUuid, isInWishlist: false }`, or an error.
 */
export async function DELETE(
  _request: Request,
  context: WishlistItemContext,
): Promise<NextResponse> {
  return toggle(context, false, removeFromWishlist);
}
