/**
 * Turns the outcome of a cart action into the French message shown to the user and read by the
 * `aria-live` regions.
 *
 * @see specs/001-catalog-auth-cart/contracts/errors.md
 */
import { assertNever } from "@/lib/assert-never";
import { CART_LINE_MAX_QUANTITY, GUEST_CART_MAX_LINES } from "@/lib/constants/cart";
import { CartAction, CartLineStatus, GuestCartLimit } from "@/lib/enums/cart";
import { FrontErrorCode } from "@/lib/enums/error-code";
import type { CartLine, CartView } from "@/lib/schemas/cart";

import type { CartViewChange } from "./cart-view";
import { CART_FEEDBACK_MESSAGES as MESSAGES } from "./messages";

/**
 * Message of a failed cart action.
 *
 * @param code - Front error code of the failure.
 * @param availableStock - Live stock, for `insufficient-stock`.
 * @returns The message.
 */
export function cartErrorMessage(code: FrontErrorCode, availableStock?: number): string {
  switch (code) {
    case FrontErrorCode.INSUFFICIENT_STOCK:
      return availableStock ? MESSAGES.insufficientStock(availableStock) : MESSAGES.outOfStock;
    case FrontErrorCode.NOT_FOUND:
      return MESSAGES.cartChanged;
    case FrontErrorCode.CONFLICT:
      return MESSAGES.conflict;
    case FrontErrorCode.EMPTY_CART:
      return MESSAGES.emptyCart;
    case FrontErrorCode.UNAUTHENTICATED:
      return MESSAGES.sessionExpired;
    case FrontErrorCode.RATE_LIMITED:
      return MESSAGES.rateLimited;
    case FrontErrorCode.UNAVAILABLE:
      return MESSAGES.unavailable;
    case FrontErrorCode.INVALID:
    case FrontErrorCode.FORBIDDEN:
    case FrontErrorCode.ALREADY_EXISTS:
    case FrontErrorCode.UNKNOWN:
    case FrontErrorCode.REVIEW_REJECTED:
    case FrontErrorCode.MODERATION_UNAVAILABLE:
    case FrontErrorCode.REVIEW_NOT_ALLOWED:
    case FrontErrorCode.DISCOUNT_INVALID:
    case FrontErrorCode.PAYMENT_FAILED:
    case FrontErrorCode.PAYMENT_ALREADY_COMPLETED:
    case FrontErrorCode.ORDER_LOCKED:
    case FrontErrorCode.REFUND_FAILED:
    case FrontErrorCode.ACCOUNT_INACTIVE:
    case FrontErrorCode.CARD_EXPIRED:
    case FrontErrorCode.NO_SAVED_CARD:
      return MESSAGES.unknown;
    default:
      return assertNever(code);
  }
}

/**
 * Message of a guest change refused by a browser-side limit.
 *
 * @param limit - Broken limit.
 * @returns The message.
 */
export function guestLimitMessage(limit: GuestCartLimit): string {
  switch (limit) {
    case GuestCartLimit.MAX_LINES:
      return MESSAGES.cartFull(GUEST_CART_MAX_LINES);
    case GuestCartLimit.MAX_QUANTITY:
      return MESSAGES.maxQuantity(CART_LINE_MAX_QUANTITY);
    default:
      return assertNever(limit);
  }
}

/**
 * Message of a line whose stock check failed in a guest preview.
 *
 * @param line - Previewed line.
 * @returns The message, or `undefined` when the line is fine.
 */
export function previewLineProblem(line: CartLine | undefined): string | undefined {
  if (!line || line.status === CartLineStatus.UNAVAILABLE) {
    return MESSAGES.productGone;
  }
  if (line.status === CartLineStatus.INSUFFICIENT_STOCK) {
    return cartErrorMessage(FrontErrorCode.INSUFFICIENT_STOCK, line.availableStock ?? 0);
  }
  return undefined;
}

/**
 * Finds the name of a product in a view.
 *
 * @param view - Cart view.
 * @param productUuid - Product.
 * @returns The name, or `undefined` when the product is not displayed.
 */
function nameIn(view: CartView | undefined, productUuid: string): string | undefined {
  const name = view?.lines.find((line) => line.productUuid === productUuid)?.name;
  return name === "" ? undefined : name;
}

/**
 * Message of a successful cart action.
 *
 * @param change - The change that succeeded.
 * @param before - View before the change (names of removed lines).
 * @param after - View returned by the server.
 * @returns The message.
 */
export function cartSuccessMessage(
  change: CartViewChange,
  before: CartView | undefined,
  after: CartView,
): string {
  switch (change.action) {
    case CartAction.ADD: {
      const name = nameIn(after, change.productUuid);
      return name ? MESSAGES.added(name, change.quantity) : MESSAGES.addedShort;
    }
    case CartAction.SET: {
      return MESSAGES.quantityUpdated(nameIn(after, change.productUuid), change.quantity);
    }
    case CartAction.REMOVE:
      return MESSAGES.lineRemoved(nameIn(before, change.productUuid));
    case CartAction.CLEAR:
      return MESSAGES.cleared;
    default:
      return assertNever(change);
  }
}
