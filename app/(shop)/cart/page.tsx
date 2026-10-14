/**
 * Cart page (lot 1 US4, shared page template since feature 003). The same page serves the
 * visitor (cart kept in the browser) and the signed-in user (cart kept by the backend): the
 * content is rendered on the client by `CartContent`, since only the browser knows the guest
 * cart.
 *
 * The checkout sends the customer back here with `?issue=stock|empty` when the order could not
 * be placed (research R10); the page shows why.
 *
 * @see docs/guest-cart.md §1
 * @see specs/003-account-orders/research.md R10, R19
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { z } from "zod";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { CartContent } from "@/features/cart/components/CartContent";
import { CART_MESSAGES } from "@/features/cart/messages";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { HOME_PATH } from "@/lib/constants/routes";
import { CartIssue } from "@/lib/enums/cart";

/** Query parameter carrying the problem met at checkout. */
const ISSUE_PARAM = "issue";

/** Accepted values of {@link ISSUE_PARAM}; anything else is ignored. */
const CartIssueSchema = z.enum(CartIssue);

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: CART_MESSAGES.pageTitle,
  description: CART_MESSAGES.pageDescription,
  robots: { index: false },
};

/** Props of the cart page. */
interface CartPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Cart page.
 *
 * @param props - Page props.
 * @param props.searchParams - Query string, read for `?issue=`.
 * @returns Header and cart content.
 */
export default async function CartPage({ searchParams }: CartPageProps): Promise<ReactNode> {
  const issue = CartIssueSchema.safeParse((await searchParams)[ISSUE_PARAM]);
  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: COMMON_MESSAGES.breadcrumbHome },
              { href: null, label: CART_MESSAGES.breadcrumb },
            ]}
          />
        }
        title={<LiveTitle text={CART_MESSAGES.pageTitle} className={PAGE_TITLE_CLASS} />}
        subtitle={CART_MESSAGES.pageDescription}
      />
      <CartContent issue={issue.success ? issue.data : null} />
    </PageShell>
  );
}
