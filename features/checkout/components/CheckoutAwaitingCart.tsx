"use client";

/**
 * Shown by the checkout when the server cart is still empty. Right after a sign-in coming from
 * the guest cart, the merge runs in the browser (`GuestCartMerger`) after the page was rendered:
 * the page waits for the merged cart, then renders again on the server. Without a guest cart to
 * merge, or after `CHECKOUT_MERGE_WAIT_MS`, the customer goes back to the cart.
 *
 * @see specs/003-account-orders/spec.md US1 scenario 1
 * @see docs/guest-cart.md §4
 */
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/features/cart/hooks/useCart";
import { readGuestCart } from "@/features/cart/guest-storage";
import { CHECKOUT_MERGE_WAIT_MS } from "@/lib/constants/checkout";
import { CART_PATH } from "@/lib/constants/routes";

import { CHECKOUT_MESSAGES } from "../messages";

/**
 * Waiting state of the checkout.
 *
 * @returns A placeholder, while the cart arrives or the customer is sent back to the cart.
 */
export function CheckoutAwaitingCart(): ReactNode {
  const router = useRouter();
  const { cart } = useCart();
  const isLoaded = cart !== undefined;
  const hasLines = (cart?.lines.length ?? 0) > 0;
  useEffect(() => {
    // Decide only once the account cart is known: a merge may have just emptied the guest cart.
    if (!isLoaded) {
      return undefined;
    }
    if (hasLines) {
      router.refresh();
      return undefined;
    }
    if (readGuestCart(window.localStorage).length === 0) {
      router.replace(CART_PATH);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      router.replace(CART_PATH);
    }, CHECKOUT_MERGE_WAIT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isLoaded, hasLines, router]);
  return (
    <div aria-busy className="flex flex-col gap-3">
      <p role="status" className="text-text-muted">
        {CHECKOUT_MESSAGES.awaitingCart}
      </p>
      <Skeleton className="skeleton-shimmer h-40 rounded-card" />
    </div>
  );
}
