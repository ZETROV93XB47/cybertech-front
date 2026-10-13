/**
 * Account cart operations used by the cart BFF routes, on top of the raw backend endpoints:
 * absolute quantity of one line, idempotent line removal, and error responses carrying the
 * live stock.
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 * @see specs/001-catalog-auth-cart/contracts/errors.md (NOT_ENOUGH_STOCK row)
 */
import "server-only";

import type { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/bff-response";
import { ApiError } from "@/lib/api/errors";
import {
  addToCart,
  getAccountCart,
  removeCartLine,
  replaceCartLines,
} from "@/lib/api/endpoints/cart";
import { getAvailability } from "@/lib/api/endpoints/products";
import { FrontErrorCode } from "@/lib/enums/error-code";
import type { AccountCart, GuestLine } from "@/lib/schemas/cart";

import { orderableStock } from "../cart-view";

/**
 * Sets the absolute quantity of one line of the account cart.
 *
 * The backend only offers an additive add and a full replacement (`PATCH /cart/update/{cartUuid}`,
 * which needs the cart UUID), so the cart is read first and every line is sent back with this
 * one replaced (or appended). Without a cart yet, the line is simply added.
 *
 * @param productUuid - Product of the line.
 * @param quantity - New absolute quantity (1–99).
 * @param accessToken - Keycloak access token; never logged.
 * @returns The updated cart.
 * @throws {ApiError} `INSUFFICIENT_STOCK`, `NOT_FOUND` or `UNAVAILABLE`.
 * @see docs/backend/api-map.md E.12
 */
export async function setAccountLineQuantity(
  productUuid: string,
  quantity: number,
  accessToken: string,
): Promise<AccountCart> {
  const cart = await getAccountCart(accessToken);
  if (!cart.cartUuid) {
    return addToCart([{ productUuid, quantity }], accessToken);
  }
  const lines: GuestLine[] = (cart.items ?? []).map((item) => ({
    productUuid: item.productUuid,
    quantity: item.productUuid === productUuid ? quantity : item.quantity,
  }));
  if (!lines.some((line) => line.productUuid === productUuid)) {
    lines.push({ productUuid, quantity });
  }
  return replaceCartLines(cart.cartUuid, lines, accessToken);
}

/**
 * Removes one line; removing a line that is already gone is not an error (double click, other
 * tab), the current cart is returned instead.
 *
 * @param productUuid - Product of the line.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The updated cart.
 * @throws {ApiError} When the backend rejects the call for another reason or is unavailable.
 */
export async function removeAccountLine(
  productUuid: string,
  accessToken: string,
): Promise<AccountCart> {
  try {
    return await removeCartLine(productUuid, accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.EMPTY_CART) {
      return getAccountCart(accessToken);
    }
    throw error;
  }
}

/**
 * Builds the error response of a cart write. For `INSUFFICIENT_STOCK`, the live stock of the
 * product is attached so the UI can say « Il n'en reste que N ».
 *
 * @param error - Error of the write.
 * @param productUuid - Product concerned by the write.
 * @returns The error response.
 */
export async function cartWriteError(error: unknown, productUuid: string): Promise<NextResponse> {
  if (!(error instanceof ApiError) || error.frontCode !== FrontErrorCode.INSUFFICIENT_STOCK) {
    return jsonError(error);
  }
  try {
    const [availability] = await getAvailability([productUuid]);
    return jsonError(error, { availableStock: orderableStock(availability) ?? 0 });
  } catch {
    return jsonError(error);
  }
}
