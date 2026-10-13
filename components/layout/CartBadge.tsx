"use client";

/**
 * Cart link of the header with the number of items.
 *
 * The guest cart lives in the browser, so the server cannot render the count: the badge always
 * reserves its place (no layout shift, CLS) and shows the number once the cart is read on the
 * client. A change of the count gives a short gold bounce, removed by `MotionConfig` when the
 * system asks for reduced motion.
 *
 * @see docs/guest-cart.md §2 (« Seul inconvénient »)
 */
import { ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { useCart } from "@/features/cart/hooks/useCart";
import { CART_MESSAGES } from "@/features/cart/messages";
import { CART_PATH } from "@/lib/constants/routes";
import { useMotionTokens } from "@/styles/motion";

/** Largest count written in full; above it the badge shows « 99+ ». */
const BADGE_MAX_COUNT = 99;

/** Suffix of a capped count. */
const OVERFLOW_SUFFIX = "+";

/** Scale of the badge at the start of the bounce. */
const BOUNCE_START_SCALE = 1.35;

/**
 * Text of the count.
 *
 * @param count - Number of items.
 * @returns The count, capped to « 99+ ».
 */
function formatCount(count: number): string {
  return count > BADGE_MAX_COUNT ? `${BADGE_MAX_COUNT}${OVERFLOW_SUFFIX}` : String(count);
}

/**
 * Header cart link.
 *
 * @returns The link with its badge.
 */
export function CartBadge(): ReactNode {
  const { cart } = useCart();
  const motionTokens = useMotionTokens();
  const count = cart?.itemCount;
  return (
    <Link
      href={CART_PATH}
      aria-label={count === undefined ? CART_MESSAGES.pageTitle : CART_MESSAGES.badgeLabel(count)}
      className="relative inline-flex size-10 items-center justify-center rounded-button text-text-muted transition-colors duration-(--duration-fast) hover:text-text"
    >
      <ShoppingBag aria-hidden className="size-5" />
      <span
        aria-hidden
        className="absolute -top-0.5 -right-1.5 inline-flex h-5 min-w-6 justify-center"
      >
        {count !== undefined && count > 0 && (
          <motion.span
            key={count}
            data-testid="cart-count"
            initial={{ scale: BOUNCE_START_SCALE }}
            animate={{ scale: 1 }}
            transition={motionTokens.base}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 font-mono text-xs font-semibold text-bg"
          >
            {formatCount(count)}
          </motion.span>
        )}
      </span>
    </Link>
  );
}
