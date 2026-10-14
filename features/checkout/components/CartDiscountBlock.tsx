"use client";

/**
 * Discount block of the cart page: for a signed-in customer, the block priced by a quote of the
 * account cart with `CART_QUOTE_SHIPPING` (the subtotal and the discount do not depend on the
 * shipping); for a visitor, an invitation to sign in, without any quote (FR-021).
 *
 * @see specs/003-account-orders/research.md R5
 * @see specs/003-account-orders/spec.md FR-016, FR-021
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { loginPath } from "@/lib/auth/callback-url";
import { CART_QUOTE_SHIPPING } from "@/lib/constants/checkout";
import { CART_PATH } from "@/lib/constants/routes";
import { CartSource } from "@/lib/enums/cart";
import { DiscountBlockMode } from "@/lib/enums/checkout";
import type { CartView } from "@/lib/schemas/cart";
import type { ActiveDiscount } from "@/lib/schemas/discount";

import { useDiscountedQuote } from "../hooks/useDiscountedQuote";
import { cartSignature } from "../hooks/useQuote";
import { DISCOUNT_MESSAGES } from "../messages";

import { DiscountBlock } from "./DiscountBlock";

/** Props of {@link CartDiscountBlock}. */
export interface CartDiscountBlockProps {
  readonly cart: CartView;
  /** Displayable campaigns, read on the server. */
  readonly campaigns: readonly ActiveDiscount[];
}

/**
 * Invitation to sign in, for a visitor.
 *
 * @returns The invitation.
 */
function GuestInvite(): ReactNode {
  return (
    <div
      data-testid="discount-block"
      className="flex flex-col gap-2 border-t border-border pt-4 text-sm"
    >
      <p className="text-text-muted">{DISCOUNT_MESSAGES.guestInvite}</p>
      <Link href={loginPath(CART_PATH)} className="self-start text-brand-text underline">
        {DISCOUNT_MESSAGES.signIn}
      </Link>
    </div>
  );
}

/**
 * Block of a signed-in customer.
 *
 * @param props - Cart and campaigns.
 * @returns The block in cart mode.
 */
function AccountDiscountBlock({ cart, campaigns }: CartDiscountBlockProps): ReactNode {
  const discount = useDiscountedQuote({
    shipping: cart.lines.length > 0 ? CART_QUOTE_SHIPPING : null,
    cartSignature: cartSignature(cart),
  });
  return <DiscountBlock mode={DiscountBlockMode.CART} campaigns={campaigns} discount={discount} />;
}

/**
 * Discount block of the cart page.
 *
 * @param props - Cart and campaigns.
 * @returns The block, or the sign-in invitation for a visitor.
 */
export function CartDiscountBlock({ cart, campaigns }: CartDiscountBlockProps): ReactNode {
  return cart.source === CartSource.GUEST ? (
    <GuestInvite />
  ) : (
    <AccountDiscountBlock cart={cart} campaigns={campaigns} />
  );
}
