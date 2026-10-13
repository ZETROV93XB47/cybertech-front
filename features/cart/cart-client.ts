/**
 * Browser-side cart operations: calls to the cart BFF routes and guest cart changes checked
 * against the live stock before they are written.
 *
 * The browser never calls Spring (constitution III); every call goes through the BFF.
 *
 * @see docs/guest-cart.md §3, §5
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import { assertNever } from "@/lib/assert-never";
import { bffSend } from "@/lib/api/bff-client";
import { BFF_ROUTES, cartItemRoute } from "@/lib/constants/routes";
import { CartAction, CartSource } from "@/lib/enums/cart";
import { HttpMethod } from "@/lib/enums/http-method";
import { CartViewSchema, type CartView } from "@/lib/schemas/cart";
import type { GuestLine } from "@/lib/schemas/storage";

import { emptyCartView, type CartViewChange } from "./cart-view";
import { guestLimitMessage, previewLineProblem } from "./cart-feedback";
import { applyGuestChange } from "./guest-lines";
import { readGuestCart } from "./guest-storage";

/** Outcome of a guest change: the new view, or the message explaining the refusal. */
export type GuestChangeOutcome =
  | { readonly ok: true; readonly lines: readonly GuestLine[]; readonly cart: CartView }
  | { readonly ok: false; readonly message: string };

/**
 * Loads the account cart.
 *
 * @returns The account view.
 * @throws {BffError} On error responses (`unauthenticated` without a session).
 */
export async function fetchAccountCart(): Promise<CartView> {
  return bffSend(BFF_ROUTES.cart, HttpMethod.GET, CartViewSchema);
}

/**
 * Builds the guest view of some lines (live prices and stock).
 *
 * @param lines - Guest lines.
 * @returns The guest view; no network call when there is no line.
 * @throws {BffError} When the BFF or the backend is unavailable.
 */
export async function fetchGuestPreview(lines: readonly GuestLine[]): Promise<CartView> {
  if (lines.length === 0) {
    return emptyCartView(CartSource.GUEST);
  }
  return bffSend(BFF_ROUTES.cartPreview, HttpMethod.POST, CartViewSchema, { items: lines });
}

/**
 * Sends a change of the account cart.
 *
 * @param change - Requested change.
 * @returns The account view returned by the server.
 * @throws {BffError} On error responses (`insufficient-stock` carries `availableStock`).
 */
export async function sendAccountChange(change: CartViewChange): Promise<CartView> {
  switch (change.action) {
    case CartAction.ADD:
      return bffSend(BFF_ROUTES.cart, HttpMethod.POST, CartViewSchema, {
        productUuid: change.productUuid,
        quantity: change.quantity,
      });
    case CartAction.SET:
      return bffSend(cartItemRoute(change.productUuid), HttpMethod.PATCH, CartViewSchema, {
        quantity: change.quantity,
      });
    case CartAction.REMOVE:
      return bffSend(cartItemRoute(change.productUuid), HttpMethod.DELETE, CartViewSchema);
    case CartAction.CLEAR:
      return bffSend(BFF_ROUTES.cart, HttpMethod.DELETE, CartViewSchema);
    default:
      return assertNever(change);
  }
}

/**
 * Prepares a change of the guest cart, without writing it.
 *
 * Adding or setting a quantity is first checked through the preview: when the stock is too low
 * the change is refused and the message says how many are left (docs/guest-cart.md §3). The
 * caller writes the returned lines with `writeGuestCart` only when the change is accepted.
 *
 * @param change - Requested change.
 * @param storage - `localStorage` (injected for tests).
 * @returns The new lines and their view, or the refusal message.
 * @throws {BffError} When the preview cannot be loaded.
 */
export async function prepareGuestCartChange(
  change: CartViewChange,
  storage: Storage,
): Promise<GuestChangeOutcome> {
  const next = applyGuestChange(readGuestCart(storage), change);
  if (!next.ok) {
    return { ok: false, message: guestLimitMessage(next.limit) };
  }
  const cart = await fetchGuestPreview(next.lines);
  if (change.action === CartAction.ADD || change.action === CartAction.SET) {
    const line = cart.lines.find((item) => item.productUuid === change.productUuid);
    const problem = previewLineProblem(line);
    if (problem) {
      return { ok: false, message: problem };
    }
  }
  return { ok: true, lines: next.lines, cart };
}
