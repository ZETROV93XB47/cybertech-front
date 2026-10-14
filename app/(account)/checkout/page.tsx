/**
 * Single-page checkout (feature 003 US1): address, shipping and payment unfold one after the
 * other next to a summary priced by the backend quote. Private page, guarded by the proxy and
 * the `(account)` layout. An empty server cart waits for the guest cart merged at sign-in, or
 * sends the customer back to the cart (`CheckoutAwaitingCart`).
 *
 * @see specs/003-account-orders/spec.md US1, Clarifications (Q1)
 * @see specs/003-account-orders/research.md R3
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { CART_MESSAGES } from "@/features/cart/messages";
import { CheckoutAwaitingCart } from "@/features/checkout/components/CheckoutAwaitingCart";
import { CheckoutFlow } from "@/features/checkout/components/CheckoutFlow";
import { CHECKOUT_MESSAGES } from "@/features/checkout/messages";
import { loadCheckoutData } from "@/features/checkout/server/checkout-data";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { getAccessTokenOrRedirect } from "@/lib/auth/guards";
import { CART_PATH, CHECKOUT_PATH, HOME_PATH } from "@/lib/constants/routes";

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: CHECKOUT_MESSAGES.metaTitle,
  robots: { index: false },
};

/**
 * Checkout page.
 *
 * @returns Header and checkout flow.
 */
export default async function CheckoutPage(): Promise<ReactNode> {
  const accessToken = await getAccessTokenOrRedirect(CHECKOUT_PATH);
  const data = await loadCheckoutData(accessToken, new Date());
  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: COMMON_MESSAGES.breadcrumbHome },
              { href: CART_PATH, label: CART_MESSAGES.breadcrumb },
              { href: null, label: CHECKOUT_MESSAGES.pageTitle },
            ]}
          />
        }
        title={<LiveTitle text={CHECKOUT_MESSAGES.pageTitle} className={PAGE_TITLE_CLASS} />}
        subtitle={CHECKOUT_MESSAGES.pageDescription}
      />
      {data.hasLines ? (
        <CheckoutFlow initialAddress={data.address} choices={data.choices} />
      ) : (
        <CheckoutAwaitingCart />
      )}
    </PageShell>
  );
}
