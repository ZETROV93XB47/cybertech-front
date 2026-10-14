/**
 * Checkout constants.
 *
 * @see specs/003-account-orders/research.md R5, R8
 */
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";

/** Shipping choice of a quote. */
export interface QuoteShipping {
  readonly type: ShippingType;
  readonly provider: ShippingProvider;
}

/**
 * Shipping choice sent with the quote of the cart page.
 *
 * The quote needs one, but the cart page only shows the subtotal and the discount, which do
 * not depend on shipping (`OrderPriceCalculationServiceImp`), so any valid pair works.
 *
 * @see specs/003-account-orders/spec.md Clarifications (Q3)
 */
export const CART_QUOTE_SHIPPING: QuoteShipping = {
  type: ShippingType.STANDARD,
  provider: ShippingProvider.DHL,
};

/**
 * Longest wait of the checkout for the guest cart merged at sign-in before sending the customer
 * back to the cart (the merge is one batched `POST /cart/add`, plus a line-by-line replay on
 * `NOT_ENOUGH_STOCK`).
 *
 * @see docs/guest-cart.md §4
 */
export const CHECKOUT_MERGE_WAIT_MS = 8_000;
