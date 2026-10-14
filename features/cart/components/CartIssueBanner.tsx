/**
 * Banner of the cart page explaining why the checkout sent the customer back (`?issue=`).
 *
 * @see specs/003-account-orders/research.md R10
 * @see specs/003-account-orders/spec.md FR-015
 */
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import { CartIssue } from "@/lib/enums/cart";

import { CART_MESSAGES } from "../messages";

/** Props of {@link CartIssueBanner}. */
export interface CartIssueBannerProps {
  readonly issue: CartIssue;
}

/**
 * Text of an issue.
 *
 * @param issue - Problem met at checkout.
 * @returns The sentence.
 */
function issueText(issue: CartIssue): string {
  switch (issue) {
    case CartIssue.STOCK:
      return CART_MESSAGES.issueStock;
    case CartIssue.EMPTY:
      return CART_MESSAGES.issueEmpty;
    default:
      return assertNever(issue);
  }
}

/**
 * Issue banner, announced as an alert since the customer expected an order.
 *
 * @param props - The issue.
 * @returns The banner.
 */
export function CartIssueBanner({ issue }: CartIssueBannerProps): ReactNode {
  return (
    <p
      role="alert"
      className="glass flex items-start gap-3 rounded-card border border-gold p-4 text-sm"
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-gold" />
      <span>{issueText(issue)}</span>
    </p>
  );
}
