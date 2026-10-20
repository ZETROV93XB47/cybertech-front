/**
 * The saved card drawn as a card: network, `•••• 4242`, holder and expiry. Only the masked
 * data read from the backend is shown; the full number never exists here. The visual is
 * decorative for screen readers, which read one sentence instead.
 *
 * @see specs/003-account-orders/spec.md US5 scenario 1, FR-031
 */
import { CreditCard } from "lucide-react";
import type { ReactNode } from "react";

import type { CardView } from "../card-view";
import { CARD_MESSAGES } from "../messages";

/** Hidden groups shown before the last four digits. */
const MASKED_GROUPS = "•••• •••• ••••";

/** Separator of the expiry shown on the card (`12/2030`). */
const EXPIRY_SEPARATOR = "/";

/** Props of {@link CardVisual}. */
export interface CardVisualProps {
  readonly card: CardView;
}

/**
 * Masked card.
 *
 * @param props - Displayed card.
 * @returns The card drawing and its accessible summary.
 */
export function CardVisual({ card }: CardVisualProps): ReactNode {
  const network = CARD_MESSAGES.networks[card.network];
  const expiry =
    card.expiryMonth === "" ? "" : `${card.expiryMonth}${EXPIRY_SEPARATOR}${card.expiryYear}`;
  return (
    <figure className="flex flex-col gap-3">
      <div
        aria-hidden
        data-testid="card-visual"
        className="cta-gradient relative flex aspect-8/5 w-full max-w-sm flex-col justify-between overflow-hidden rounded-card p-6 shadow-card-hover"
      >
        <div className="flex items-center justify-between">
          <CreditCard className="size-8" />
          <span className="font-display text-sm font-semibold tracking-wide uppercase">
            {network}
          </span>
        </div>
        <p className="font-mono text-lg tracking-wider whitespace-nowrap">
          {MASKED_GROUPS} {card.lastDigits}
        </p>
        <div className="flex items-end justify-between gap-4 text-xs">
          <span className="flex flex-col">
            <span className="opacity-80">{CARD_MESSAGES.holderLabel}</span>
            <span className="truncate text-sm font-medium">{card.holder}</span>
          </span>
          <span className="flex flex-col text-right">
            <span className="opacity-80">{CARD_MESSAGES.expiryLabel}</span>
            <span className="text-sm font-medium">{expiry}</span>
          </span>
        </div>
      </div>
      <figcaption className="text-sm text-text-muted">
        {CARD_MESSAGES.cardLabel(network, card.lastDigits)}
        {card.holder !== "" && ` · ${CARD_MESSAGES.holderLabel} : ${card.holder}`}
        {expiry !== "" && ` · ${CARD_MESSAGES.expiryLabel} ${expiry}`}
      </figcaption>
    </figure>
  );
}
