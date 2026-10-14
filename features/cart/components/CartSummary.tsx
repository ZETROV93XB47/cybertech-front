"use client";

/**
 * Summary of the cart page: item count, total (« estimé » for a visitor), and the clear button
 * with its confirmation dialog.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRIMARY_CTA_CLASS } from "@/components/layout/cta";
import { loginPath } from "@/lib/auth/callback-url";
import { CHECKOUT_PATH } from "@/lib/constants/routes";
import { formatPrice } from "@/lib/format";
import { CartLineStatus, CartSource } from "@/lib/enums/cart";
import { cn } from "@/lib/utils";
import type { CartView } from "@/lib/schemas/cart";

import { CART_MESSAGES } from "../messages";

/** Props of {@link CartSummary}. */
export interface CartSummaryProps {
  readonly cart: CartView;
  readonly disabled: boolean;
  readonly onClear: () => void;
}

/** Style of the secondary buttons. */
const SECONDARY_BUTTON =
  "inline-flex h-10 items-center justify-center rounded-button border border-border px-4 text-sm text-text transition-colors duration-(--duration-fast) hover:border-rose hover:text-rose disabled:opacity-40";

/**
 * Confirmation dialog of « Vider le panier ».
 *
 * @param props - Open state and handlers.
 * @returns The dialog.
 */
function ClearCartDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
}): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="rounded-card border-border bg-surface-2">
        <DialogTitle>{CART_MESSAGES.clearConfirmTitle}</DialogTitle>
        <DialogDescription>{CART_MESSAGES.clearConfirmBody}</DialogDescription>
        <DialogFooter>
          <button
            type="button"
            className={SECONDARY_BUTTON}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {CART_MESSAGES.clearCancel}
          </button>
          <button
            type="button"
            className="cta-gradient inline-flex h-10 items-center justify-center rounded-button px-4 text-sm font-medium"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {CART_MESSAGES.clearConfirm}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * « Passer commande »: the checkout for a signed-in user, the sign-in page coming back to the
 * checkout for a visitor (the guest cart is merged on the way, as today). Disabled while a line
 * is out of stock or gone, since the backend would refuse the order.
 *
 * @param props - Cart and busy state.
 * @returns The call to action and its hint.
 * @see specs/003-account-orders/spec.md FR-005
 */
function CheckoutButton({
  cart,
  disabled,
}: {
  readonly cart: CartView;
  readonly disabled: boolean;
}): ReactNode {
  const isBlocked = cart.lines.some((line) => line.status !== CartLineStatus.OK);
  const href = cart.source === CartSource.GUEST ? loginPath(CHECKOUT_PATH) : CHECKOUT_PATH;
  if (isBlocked || disabled) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" disabled className={cn(PRIMARY_CTA_CLASS, "opacity-40")}>
          {CART_MESSAGES.checkout}
        </button>
        {isBlocked && <p className="text-xs text-text-muted">{CART_MESSAGES.checkoutBlocked}</p>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Link href={href} className={PRIMARY_CTA_CLASS}>
        {CART_MESSAGES.checkout}
      </Link>
      {cart.source === CartSource.GUEST && (
        <p className="text-xs text-text-muted">{CART_MESSAGES.checkoutGuestHint}</p>
      )}
    </div>
  );
}

/**
 * Cart summary.
 *
 * @param props - Cart, busy state and clear handler.
 * @returns The summary panel.
 */
export function CartSummary({ cart, disabled, onClear }: CartSummaryProps): ReactNode {
  const [confirming, setConfirming] = useState(false);
  return (
    <section
      aria-labelledby="cart-summary-title"
      className="glass flex flex-col gap-4 rounded-card p-6"
    >
      <h2 id="cart-summary-title" className="text-lg">
        {CART_MESSAGES.summaryTitle}
      </h2>
      <p className="text-sm text-text-muted">{CART_MESSAGES.itemCount(cart.itemCount)}</p>
      <div className="flex items-baseline justify-between gap-4">
        <span>{cart.totalIsEstimate ? CART_MESSAGES.estimatedTotal : CART_MESSAGES.total}</span>
        <span className="price text-2xl" data-testid="cart-total">
          {formatPrice(cart.total)}
        </span>
      </div>
      {cart.totalIsEstimate && (
        <p className="text-xs text-text-muted">{CART_MESSAGES.estimateHint}</p>
      )}
      {cart.source === CartSource.GUEST && (
        <p className="text-xs text-text-muted">{CART_MESSAGES.guestHint}</p>
      )}
      <CheckoutButton cart={cart} disabled={disabled} />
      <button
        type="button"
        className={SECONDARY_BUTTON}
        disabled={disabled}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {CART_MESSAGES.clearCart}
      </button>
      <ClearCartDialog open={confirming} onOpenChange={setConfirming} onConfirm={onClear} />
    </section>
  );
}
