"use client";

/**
 * Summary of the checkout, sticky next to the steps: the cart lines and the amounts of the
 * backend quote (never computed by the front). While a new quote is on its way the previous
 * amounts stay, marked as updating; the place button waits for an up-to-date quote. Until a
 * shipping is chosen, only the subtotal and the discount are shown (the quote is then priced
 * with a default shipping, as on the cart page). The discount block sits under the amounts;
 * without a saved card, « Ajouter une carte » replaces the way to place the order.
 *
 * @see specs/003-account-orders/spec.md FR-009, FR-010, FR-011, FR-012, FR-016
 */
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import type { CartView } from "@/lib/schemas/cart";

import { CHECKOUT_SUMMARY_MESSAGES } from "../messages";
import type { QuoteView } from "../quote-view";

import { AddCardLink } from "./SavedCardPanel";

/** Props of {@link CheckoutSummary}. */
export interface CheckoutSummaryProps {
  readonly cart: CartView | undefined;
  readonly quote: QuoteView | undefined;
  /** Whether a shipping is chosen: shipping cost and total are shown only then. */
  readonly showShipping: boolean;
  /** Discount block, rendered under the amounts. */
  readonly discountBlock: ReactNode;
  /** No saved card: placing is impossible, « Ajouter une carte » is offered. */
  readonly needsCard: boolean;
  /** A newer quote is expected: the amounts shown are being updated. */
  readonly isStale: boolean;
  /** Error to show instead of the amounts (French), with a retry. */
  readonly quoteError: string | null;
  readonly onRetry: () => void;
  readonly canPlace: boolean;
  readonly isPlacing: boolean;
  readonly onPlace: () => void;
  /** Outcome of the last click on « Valider la commande » (French), if any. */
  readonly message: string | null;
}

/**
 * One amount row.
 *
 * @param props - Label and amount.
 * @returns The row.
 */
function AmountRow({
  label,
  amount,
}: {
  readonly label: string;
  readonly amount: string;
}): ReactNode {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd>{amount}</dd>
    </div>
  );
}

/**
 * Amounts of the quote.
 *
 * @param props - Quote and stale state.
 * @returns The definition list.
 */
function QuoteAmounts({
  quote,
  isStale,
  showShipping,
}: {
  readonly quote: QuoteView;
  readonly isStale: boolean;
  readonly showShipping: boolean;
}): ReactNode {
  return (
    <dl className="flex flex-col gap-2">
      <AmountRow label={CHECKOUT_SUMMARY_MESSAGES.subtotal} amount={formatPrice(quote.subtotal)} />
      {quote.discount > 0 && (
        <AmountRow
          label={
            quote.discountKey === null
              ? CHECKOUT_SUMMARY_MESSAGES.discount
              : CHECKOUT_SUMMARY_MESSAGES.discountWithKey(quote.discountKey)
          }
          amount={`− ${formatPrice(quote.discount)}`}
        />
      )}
      {showShipping ? (
        <>
          <AmountRow
            label={CHECKOUT_SUMMARY_MESSAGES.shipping}
            amount={formatPrice(quote.shippingCost)}
          />
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <dt>{CHECKOUT_SUMMARY_MESSAGES.total}</dt>
            <dd className="price text-2xl" data-testid="checkout-total" aria-busy={isStale}>
              {formatPrice(quote.total)}
            </dd>
          </div>
        </>
      ) : (
        <p className="text-xs text-text-muted">{CHECKOUT_SUMMARY_MESSAGES.nextStep}</p>
      )}
    </dl>
  );
}

/**
 * Lines of the order.
 *
 * @param props - Cart.
 * @returns The list.
 */
function SummaryLines({ cart }: { readonly cart: CartView }): ReactNode {
  return (
    <ul aria-label={CHECKOUT_SUMMARY_MESSAGES.linesLabel} className="flex flex-col gap-2 text-sm">
      {cart.lines.map((line) => (
        <li key={line.productUuid} className="flex items-baseline justify-between gap-3">
          <span className="line-clamp-2">
            {line.name}{" "}
            <span className="text-text-muted">
              {CHECKOUT_SUMMARY_MESSAGES.quantity(line.quantity)}
            </span>
          </span>
          <span className="shrink-0">{formatPrice(line.lineTotal)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Body of the amounts area: error, placeholder or amounts.
 *
 * @param props - Summary props.
 * @returns The area.
 */
function AmountsArea(props: CheckoutSummaryProps): ReactNode {
  const { quote, isStale, quoteError, onRetry, showShipping } = props;
  if (quoteError !== null) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 text-sm">
        <p>{quoteError}</p>
        <button type="button" onClick={onRetry} className="text-brand-text underline">
          {CHECKOUT_SUMMARY_MESSAGES.retry}
        </button>
      </div>
    );
  }
  if (quote === undefined) {
    return <p className="text-sm text-text-muted">{CHECKOUT_SUMMARY_MESSAGES.placeHint}</p>;
  }
  return <QuoteAmounts quote={quote} isStale={isStale} showShipping={showShipping} />;
}

/**
 * Text of the polite live region: the update in progress, then the new total.
 *
 * @param quote - Quote shown.
 * @param isStale - Whether a newer quote is expected.
 * @param showShipping - Whether the total is shown.
 * @returns The text to announce.
 */
function liveText(quote: QuoteView | undefined, isStale: boolean, showShipping: boolean): string {
  if (isStale) {
    return CHECKOUT_SUMMARY_MESSAGES.updating;
  }
  return quote && showShipping
    ? CHECKOUT_SUMMARY_MESSAGES.amountsAnnounce(formatPrice(quote.total))
    : "";
}

/**
 * Checkout summary.
 *
 * @param props - Cart, quote state and place handler.
 * @returns The sticky panel.
 */
export function CheckoutSummary(props: CheckoutSummaryProps): ReactNode {
  const { cart, quote, isStale, showShipping, canPlace, isPlacing, onPlace, message } = props;
  return (
    <section
      aria-labelledby="checkout-summary-title"
      className="glass sticky top-24 flex flex-col gap-5 rounded-card p-6"
    >
      <h2 id="checkout-summary-title" className="text-lg">
        {CHECKOUT_SUMMARY_MESSAGES.title}
      </h2>
      {cart ? <SummaryLines cart={cart} /> : <Skeleton className="skeleton-shimmer h-16" />}
      <AmountsArea {...props} />
      <p role="status" aria-live="polite" className="min-h-5 text-xs text-text-muted">
        {liveText(quote, isStale, showShipping)}
      </p>
      {props.discountBlock}
      {message && (
        <p role="alert" className="text-sm text-gold">
          {message}
        </p>
      )}
      {props.needsCard && <AddCardLink />}
      <button
        type="button"
        disabled={!canPlace || isPlacing || props.needsCard}
        onClick={onPlace}
        className="cta-gradient h-12 rounded-button px-6 font-medium disabled:opacity-40"
      >
        {isPlacing ? CHECKOUT_SUMMARY_MESSAGES.placing : CHECKOUT_SUMMARY_MESSAGES.place}
      </button>
    </section>
  );
}
