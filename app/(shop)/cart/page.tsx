/**
 * Cart page (US4). The same page serves the visitor (cart kept in the browser) and the
 * signed-in user (cart kept by the backend): the content is rendered on the client by
 * `CartContent`, since only the browser knows the guest cart.
 *
 * @see docs/guest-cart.md §1
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CartContent } from "@/features/cart/components/CartContent";
import { CART_MESSAGES } from "@/features/cart/messages";

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: CART_MESSAGES.pageTitle,
  description: CART_MESSAGES.pageDescription,
  robots: { index: false },
};

/**
 * Cart page.
 *
 * @returns Title and cart content.
 */
export default function CartPage(): ReactNode {
  return (
    <section
      aria-labelledby="cart-title"
      className="mx-auto flex w-full max-w-site flex-col gap-8 px-6 py-10"
    >
      <h1 id="cart-title" className="text-3xl">
        {CART_MESSAGES.pageTitle}
      </h1>
      <CartContent />
    </section>
  );
}
