/**
 * `/api/cart` — account cart of the signed-in user: read (`GET`), additive add (`POST`) and
 * clear (`DELETE`). `401 unauthenticated` without a valid session.
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 * @see docs/guest-cart.md §5
 */
import type { NextResponse } from "next/server";

import { emptyCartView } from "@/features/cart/cart-view";
import { cartWriteError } from "@/features/cart/server/account-cart";
import { toAccountCartView } from "@/features/cart/server/cart-view";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { addToCart, clearCart, getAccountCart } from "@/lib/api/endpoints/cart";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { HTTP_STATUS } from "@/lib/constants/http";
import { CartSource } from "@/lib/enums/cart";
import { CartAddBodySchema } from "@/lib/schemas/cart";

/**
 * Returns the cart of the signed-in user.
 *
 * @returns `200 CartView` (`source: "account"`), or an error.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const accessToken = await getAccessTokenOrThrow();
    return jsonOk(await toAccountCartView(await getAccountCart(accessToken)));
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Adds a quantity of a product (added to the existing line, if any).
 *
 * @param request - Request carrying `{ productUuid, quantity }`.
 * @returns `201 CartView`, or an error (`insufficient-stock` carries `availableStock`).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = await parseJsonBody(request, CartAddBodySchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    const accessToken = await getAccessTokenOrThrow();
    const cart = await addToCart([body.data], accessToken);
    return jsonOk(await toAccountCartView(cart), HTTP_STATUS.CREATED);
  } catch (error) {
    return cartWriteError(error, body.data.productUuid);
  }
}

/**
 * Empties the cart.
 *
 * @returns `200 CartView` (empty), or an error.
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    await clearCart(await getAccessTokenOrThrow());
    return jsonOk(emptyCartView(CartSource.ACCOUNT));
  } catch (error) {
    return jsonError(error);
  }
}
