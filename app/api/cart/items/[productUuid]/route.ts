/**
 * `/api/cart/items/[productUuid]` — one line of the account cart: absolute quantity (`PATCH`)
 * and removal (`DELETE`). `401 unauthenticated` without a valid session.
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import type { NextResponse } from "next/server";
import { z } from "zod";

import {
  cartWriteError,
  removeAccountLine,
  setAccountLineQuantity,
} from "@/features/cart/server/account-cart";
import { toAccountCartView } from "@/features/cart/server/cart-view";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { parseQueryValue } from "@/lib/api/query-validation";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { CartQuantityBodySchema } from "@/lib/schemas/cart";

/** Name of the dynamic segment, reported in `fieldErrors`. */
const PRODUCT_UUID_PARAM = "productUuid";

/** Context given by Next.js to the handlers. */
interface CartItemContext {
  readonly params: Promise<{ productUuid: string }>;
}

/**
 * Sets the absolute quantity of a line (the line is created when absent).
 *
 * @param request - Request carrying `{ quantity }` (1–99).
 * @param context - Route parameters.
 * @returns `200 CartView`, or an error (`insufficient-stock` carries `availableStock`).
 */
export async function PATCH(request: Request, context: CartItemContext): Promise<NextResponse> {
  const productUuid = parseQueryValue(
    (await context.params).productUuid,
    z.uuid(),
    PRODUCT_UUID_PARAM,
  );
  if (!productUuid.ok) {
    return productUuid.response;
  }
  const body = await parseJsonBody(request, CartQuantityBodySchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    const accessToken = await getAccessTokenOrThrow();
    const cart = await setAccountLineQuantity(productUuid.data, body.data.quantity, accessToken);
    return jsonOk(await toAccountCartView(cart));
  } catch (error) {
    return cartWriteError(error, productUuid.data);
  }
}

/**
 * Removes a line (no error when it is already gone).
 *
 * @param _request - Unused request.
 * @param context - Route parameters.
 * @returns `200 CartView`, or an error.
 */
export async function DELETE(_request: Request, context: CartItemContext): Promise<NextResponse> {
  const productUuid = parseQueryValue(
    (await context.params).productUuid,
    z.uuid(),
    PRODUCT_UUID_PARAM,
  );
  if (!productUuid.ok) {
    return productUuid.response;
  }
  try {
    const accessToken = await getAccessTokenOrThrow();
    return jsonOk(await toAccountCartView(await removeAccountLine(productUuid.data, accessToken)));
  } catch (error) {
    return jsonError(error);
  }
}
