/**
 * Pure operations on the guest cart lines (add, set, remove), applying the browser-side limits
 * before anything is checked against the stock or written.
 *
 * @see docs/guest-cart.md §2–§3
 */
import { CART_LINE_MAX_QUANTITY, GUEST_CART_MAX_LINES } from "@/lib/constants/cart";
import { CartAction, GuestCartLimit } from "@/lib/enums/cart";
import { assertNever } from "@/lib/assert-never";
import type { GuestLine } from "@/lib/schemas/storage";

import type { CartViewChange } from "./cart-view";

/** A guest cart change, as requested by the UI. */
export type GuestCartChange = CartViewChange;

/** Result of {@link applyGuestChange}: the new lines, or the limit the change would break. */
export type GuestChangeResult =
  | { readonly ok: true; readonly lines: readonly GuestLine[] }
  | { readonly ok: false; readonly limit: GuestCartLimit };

/**
 * Sets the quantity of one line, appending it when absent.
 *
 * @param lines - Current lines.
 * @param productUuid - Product of the line.
 * @param quantity - New absolute quantity.
 * @returns The new lines, or the broken limit.
 */
function setLine(
  lines: readonly GuestLine[],
  productUuid: string,
  quantity: number,
): GuestChangeResult {
  if (quantity > CART_LINE_MAX_QUANTITY) {
    return { ok: false, limit: GuestCartLimit.MAX_QUANTITY };
  }
  const exists = lines.some((line) => line.productUuid === productUuid);
  if (!exists && lines.length >= GUEST_CART_MAX_LINES) {
    return { ok: false, limit: GuestCartLimit.MAX_LINES };
  }
  const updated = exists
    ? lines.map((line) => (line.productUuid === productUuid ? { productUuid, quantity } : line))
    : [...lines, { productUuid, quantity }];
  return { ok: true, lines: updated };
}

/**
 * Quantity of a product in the guest cart.
 *
 * @param lines - Current lines.
 * @param productUuid - Product.
 * @returns The quantity, 0 when the product is not in the cart.
 */
export function guestQuantityOf(lines: readonly GuestLine[], productUuid: string): number {
  return lines.find((line) => line.productUuid === productUuid)?.quantity ?? 0;
}

/**
 * Applies a change to the guest lines. Adding is additive, like the backend `POST /cart/add`.
 *
 * @param lines - Current lines.
 * @param change - Requested change.
 * @returns The new lines, or the limit the change would break.
 */
export function applyGuestChange(
  lines: readonly GuestLine[],
  change: GuestCartChange,
): GuestChangeResult {
  switch (change.action) {
    case CartAction.ADD:
      return setLine(
        lines,
        change.productUuid,
        guestQuantityOf(lines, change.productUuid) + change.quantity,
      );
    case CartAction.SET:
      return setLine(lines, change.productUuid, change.quantity);
    case CartAction.REMOVE:
      return { ok: true, lines: lines.filter((line) => line.productUuid !== change.productUuid) };
    case CartAction.CLEAR:
      return { ok: true, lines: [] };
    default:
      return assertNever(change);
  }
}
