"use client";

/**
 * Body of the cart page: loading, error and empty states, lines and summary, and the polite
 * live region announcing every change (FR-039).
 */
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { CATALOG_PATH } from "@/lib/constants/routes";

import { useCart } from "../hooks/useCart";
import { usePruneUnavailableGuestLines } from "../hooks/usePruneUnavailableGuestLines";
import { CART_MESSAGES } from "../messages";

import { CartLines } from "./CartLines";
import { CartSummary } from "./CartSummary";

/**
 * Empty cart state.
 *
 * @returns The invitation to browse the catalog.
 */
function EmptyCart(): ReactNode {
  return (
    <div className="glass flex flex-col items-center gap-4 rounded-card p-12 text-center">
      <ShoppingBag aria-hidden className="size-10 text-text-muted" />
      <h2 className="text-xl">{CART_MESSAGES.emptyTitle}</h2>
      <p className="max-w-prose text-text-muted">{CART_MESSAGES.emptyBody}</p>
      <Link
        href={CATALOG_PATH}
        className="cta-gradient inline-flex h-11 items-center rounded-button px-6 font-medium"
      >
        {CART_MESSAGES.goToCatalog}
      </Link>
    </div>
  );
}

/**
 * Loading state: skeleton lines with the accent shimmer.
 *
 * @returns The placeholder.
 */
function CartSkeleton(): ReactNode {
  return (
    <div aria-busy className="flex flex-col gap-3">
      <span className="sr-only">{CART_MESSAGES.loading}</span>
      <Skeleton className="skeleton-shimmer h-24 rounded-card" />
      <Skeleton className="skeleton-shimmer h-24 rounded-card" />
    </div>
  );
}

/**
 * Cart page body.
 *
 * @returns Lines and summary, or the matching state.
 */
export function CartContent(): ReactNode {
  const { cart, isLoading, isError, isMutating, announcement, setQuantity, remove, clear } =
    useCart();
  const pruneNotice = usePruneUnavailableGuestLines(cart);
  let body: ReactNode;
  if (cart === undefined && isLoading) {
    body = <CartSkeleton />;
  } else if (cart === undefined || (isError && cart.lines.length === 0)) {
    body = <p className="text-rose">{CART_MESSAGES.loadError}</p>;
  } else if (cart.lines.length === 0) {
    body = <EmptyCart />;
  } else {
    body = (
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <CartLines
            lines={cart.lines}
            disabled={isMutating}
            onSetQuantity={(productUuid, quantity) => void setQuantity(productUuid, quantity)}
            onRemove={(productUuid) => void remove(productUuid)}
          />
        </div>
        <div className="lg:col-span-4">
          <CartSummary cart={cart} disabled={isMutating} onClear={() => void clear()} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="min-h-6 text-sm text-text-muted">
        {announcement || pruneNotice}
      </p>
      {body}
    </div>
  );
}
