/**
 * Cart endpoints of the backend. Every call needs the user's access token, is never cached and,
 * for writes, is retried once on `CONCURRENT_MODIFICATION` or a temporary unavailability.
 *
 * The cart is identified by the JWT subject on the backend side; only `PATCH /cart/update`
 * needs the cart UUID (api-map E.12).
 *
 * @see docs/backend/api-map.md §5
 * @see CartManagementController, CartServiceImp (backend)
 */
import "server-only";

import { z } from "zod";

import { backendFetch } from "@/lib/api/client";
import { withSingleRetry } from "@/lib/api/retry";
import { BACKEND_PATHS } from "@/lib/constants/api";
import { HttpMethod } from "@/lib/enums/http-method";
import { AccountCartSchema, type AccountCart, type GuestLine } from "@/lib/schemas/cart";

/**
 * Builds the `CartCreateRequestDto` / `CartUpdateRequestDto` body.
 *
 * @param lines - Lines to send.
 * @returns The backend body.
 */
function toCartItemsBody(lines: readonly GuestLine[]): {
  cartItemAddRequestDtos: GuestLine[];
} {
  return {
    cartItemAddRequestDtos: lines.map(({ productUuid, quantity }) => ({ productUuid, quantity })),
  };
}

/**
 * Reads the cart of the signed-in user.
 *
 * @param accessToken - Keycloak access token; never logged.
 * @returns The cart; all fields `null` when the user has none yet.
 * @throws {ApiError} When the backend rejects the call or is unavailable.
 * @see CartServiceImp#getCart (backend)
 */
export async function getAccountCart(accessToken: string): Promise<AccountCart> {
  return backendFetch(BACKEND_PATHS.cartGet, { schema: AccountCartSchema, accessToken });
}

/**
 * Adds lines to the cart. Additive: the quantity is added to an existing line.
 *
 * @param lines - Lines to add (at least one).
 * @param accessToken - Keycloak access token; never logged.
 * @returns The updated cart.
 * @throws {ApiError} `INSUFFICIENT_STOCK` when a resulting quantity exceeds the stock,
 * `NOT_FOUND` for an unknown product, `UNAVAILABLE` after the single retry.
 * @see CartServiceImp#addItemsToCart (backend)
 */
export async function addToCart(
  lines: readonly GuestLine[],
  accessToken: string,
): Promise<AccountCart> {
  return withSingleRetry(() =>
    backendFetch(BACKEND_PATHS.cartAdd, {
      schema: AccountCartSchema,
      method: HttpMethod.POST,
      body: toCartItemsBody(lines),
      accessToken,
    }),
  );
}

/**
 * Replaces every line of the cart (absolute quantities).
 *
 * @param cartUuid - UUID of the user's cart, read with {@link getAccountCart}.
 * @param lines - The complete new list of lines.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The updated cart.
 * @throws {ApiError} `INSUFFICIENT_STOCK`, `NOT_FOUND` or `UNAVAILABLE` after the single retry.
 * @see CartServiceImp#updateCart (backend)
 */
export async function replaceCartLines(
  cartUuid: string,
  lines: readonly GuestLine[],
  accessToken: string,
): Promise<AccountCart> {
  return withSingleRetry(() =>
    backendFetch(`${BACKEND_PATHS.cartUpdate}/${cartUuid}`, {
      schema: AccountCartSchema,
      method: HttpMethod.PATCH,
      body: toCartItemsBody(lines),
      accessToken,
    }),
  );
}

/**
 * Removes one line of the cart.
 *
 * @param productUuid - Product of the line to remove.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The updated cart.
 * @throws {ApiError} `EMPTY_CART` when the line is not in the cart, `UNAVAILABLE` after the
 * single retry.
 * @see CartServiceImp#removeItemFromCart (backend)
 */
export async function removeCartLine(
  productUuid: string,
  accessToken: string,
): Promise<AccountCart> {
  return withSingleRetry(() =>
    backendFetch(`${BACKEND_PATHS.cartRemove}/${productUuid}`, {
      schema: AccountCartSchema,
      method: HttpMethod.PATCH,
      accessToken,
    }),
  );
}

/**
 * Empties the cart (`204`, also when the user has no cart).
 *
 * @param accessToken - Keycloak access token; never logged.
 * @returns A promise resolved once the cart is empty.
 * @throws {ApiError} `UNAVAILABLE` after the single retry.
 * @see CartServiceImp#clearCart (backend)
 */
export async function clearCart(accessToken: string): Promise<void> {
  await withSingleRetry(() =>
    backendFetch(BACKEND_PATHS.cartClear, {
      schema: z.undefined(),
      method: HttpMethod.DELETE,
      accessToken,
    }),
  );
}
