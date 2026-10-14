"use client";

/**
 * « Appliquer une réduction » block, on the cart page (signed-in customer) and in the checkout
 * summary. The chosen campaign is checked by the backend quote; the amounts shown are those of
 * the quote, never computed by the front (constitution V). On the cart, only the subtotal and the
 * discount are shown, followed by « Livraison et total calculés à l'étape suivante »
 * (clarification Q3); in the checkout, the summary shows the full breakdown.
 *
 * @see specs/003-account-orders/spec.md US2, FR-016 to FR-019
 * @see specs/003-account-orders/research.md R5, R6, R7
 */
import { ChevronDown, TicketPercent, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { DiscountBlockMode } from "@/lib/enums/checkout";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { formatPrice } from "@/lib/format";
import type { ActiveDiscount } from "@/lib/schemas/discount";
import { cn } from "@/lib/utils";

import { discountFeedbackText, isKeyError } from "../discount-feedback";
import type { UseDiscountedQuoteResult } from "../hooks/useDiscountedQuote";
import { DISCOUNT_MESSAGES } from "../messages";
import type { QuoteView } from "../quote-view";

import { DiscountChooser } from "./DiscountChooser";

/** Props of {@link DiscountBlock}. */
export interface DiscountBlockProps {
  readonly mode: DiscountBlockMode;
  /** Displayable campaigns, read on the server. */
  readonly campaigns: readonly ActiveDiscount[];
  /** Selection and quote, from `useDiscountedQuote`. */
  readonly discount: UseDiscountedQuoteResult;
}

/**
 * Applied discount, with its removal.
 *
 * @param props - Applied key and removal handler.
 * @returns The chip.
 */
function AppliedDiscount({
  appliedKey,
  onRemove,
}: {
  readonly appliedKey: string;
  readonly onRemove: () => void;
}): ReactNode {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-gold p-3 text-sm">
      <span>{DISCOUNT_MESSAGES.currentKey(appliedKey)}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={DISCOUNT_MESSAGES.remove}
        className="inline-flex size-8 items-center justify-center rounded-button text-text-muted transition-colors duration-(--duration-fast) hover:text-rose"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

/**
 * Message of a campaign whose minimum is not reached (FR-019): the discount stays selected.
 *
 * @param props - Quote.
 * @returns The message, or `null`.
 */
function MissingAmount({ quote }: { readonly quote: QuoteView | undefined }): ReactNode {
  if (quote?.missingAmount == null || quote.discountKey === null) {
    return null;
  }
  return (
    <div className="flex flex-col gap-1 rounded-card bg-surface-2 p-3 text-sm">
      <p className="text-gold">
        {DISCOUNT_MESSAGES.missing(formatPrice(quote.missingAmount), quote.discountKey)}
      </p>
      <p className="text-xs text-text-muted">{DISCOUNT_MESSAGES.missingHint}</p>
    </div>
  );
}

/**
 * Amounts of the cart mode: the discount of the quote, then the next-step notice. The subtotal
 * is the « Sous-total » row of the cart summary just above (the same backend amount), so it is
 * not repeated here.
 *
 * @param props - Discount state.
 * @returns The amounts, the error with its retry, or nothing yet.
 */
function CartAmounts({ discount }: { readonly discount: UseDiscountedQuoteResult }): ReactNode {
  const { quote, error, isStale, refetch } = discount.quote;
  // A refused key is explained under the field; only an outage is reported here.
  if (error !== null && error.code !== FrontErrorCode.DISCOUNT_INVALID) {
    return (
      <div role="alert" className="flex flex-col items-start gap-1 text-sm">
        <p>{DISCOUNT_MESSAGES.unavailable}</p>
        <button type="button" onClick={refetch} className="text-brand-text underline">
          {DISCOUNT_MESSAGES.retry}
        </button>
      </div>
    );
  }
  if (quote === undefined) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-1 text-sm" aria-busy={isStale}>
        {quote.discount > 0 && quote.discountKey !== null && (
          <div className="flex items-baseline justify-between gap-4 text-gold">
            <dt>{DISCOUNT_MESSAGES.discount(quote.discountKey)}</dt>
            <dd data-testid="discount-amount">− {formatPrice(quote.discount)}</dd>
          </div>
        )}
      </dl>
      <p className="text-xs text-text-muted">{DISCOUNT_MESSAGES.nextStep}</p>
    </div>
  );
}

/**
 * Text of the polite live region of the block.
 *
 * @param discount - Discount state.
 * @returns The text to announce.
 */
function liveText(discount: UseDiscountedQuoteResult): string {
  const { feedback, pendingKey } = discount.selection;
  if (pendingKey !== null) {
    return DISCOUNT_MESSAGES.checking;
  }
  return feedback === null || isKeyError(feedback) ? "" : discountFeedbackText(feedback);
}

/**
 * Disclosure header of the block.
 *
 * @param props - Open state, toggle and controlled region id.
 * @returns The heading with its toggle.
 */
function BlockHeading({
  isOpen,
  onToggle,
  regionId,
}: {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly regionId: string;
}): ReactNode {
  return (
    <h3 className="text-sm font-medium">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={regionId}
        onClick={onToggle}
        className="flex w-full items-center gap-2 text-left transition-colors duration-(--duration-fast) hover:text-brand-text"
      >
        <TicketPercent aria-hidden className="size-5 text-gold" />
        <span className="flex-1">{DISCOUNT_MESSAGES.title}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 transition-transform duration-(--duration-fast)",
            isOpen && "rotate-180",
          )}
        />
      </button>
    </h3>
  );
}

/**
 * Discount block.
 *
 * @param props - Mode, campaigns and discount state.
 * @returns The block.
 */
export function DiscountBlock({ mode, campaigns, discount }: DiscountBlockProps): ReactNode {
  const [isOpen, setOpen] = useState(false);
  const regionId = useId();
  const { selection } = discount;
  const feedback = selection.feedback;
  return (
    <section
      aria-label={DISCOUNT_MESSAGES.title}
      data-testid="discount-block"
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <BlockHeading
        isOpen={isOpen}
        onToggle={() => {
          setOpen(!isOpen);
        }}
        regionId={regionId}
      />
      {selection.appliedKey !== null && (
        <AppliedDiscount appliedKey={selection.appliedKey} onRemove={discount.remove} />
      )}
      <div id={regionId} hidden={!isOpen}>
        <DiscountChooser
          campaigns={campaigns}
          appliedKey={selection.appliedKey}
          isChecking={selection.pendingKey !== null}
          keyError={
            feedback !== null && isKeyError(feedback) ? discountFeedbackText(feedback) : null
          }
          onPropose={discount.propose}
        />
      </div>
      <p role="status" aria-live="polite" className="min-h-4 text-xs text-text-muted">
        {liveText(discount)}
      </p>
      <MissingAmount quote={discount.quote.quote} />
      {mode === DiscountBlockMode.CART && <CartAmounts discount={discount} />}
    </section>
  );
}
