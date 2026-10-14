/**
 * Saved card of the payment step (FR-009): the card that will be charged, masked; without a
 * card, why the order cannot be placed and « Ajouter une carte », coming back to the checkout.
 * No card number is ever typed in the checkout (constitution V).
 *
 * @see specs/003-account-orders/spec.md FR-009
 * @see specs/003-account-orders/research.md R21
 */
import { CreditCard } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import { CHECKOUT_PATH, cardPathReturningTo } from "@/lib/constants/routes";
import { SavedCardKind } from "@/lib/enums/checkout";

import { SAVED_CARD_MESSAGES } from "../messages";
import type { SavedCard } from "../saved-card";

/**
 * « Ajouter une carte », coming back to the checkout once the card is saved.
 *
 * @returns The link.
 */
export function AddCardLink(): ReactNode {
  return (
    <Link
      href={cardPathReturningTo(CHECKOUT_PATH)}
      className="cta-gradient inline-flex h-10 items-center self-start rounded-button px-4 text-sm font-medium"
    >
      {SAVED_CARD_MESSAGES.addCard}
    </Link>
  );
}

/**
 * Body of the panel.
 *
 * @param card - Saved card view.
 * @returns The card, the invitation to add one, or the unknown notice.
 */
function SavedCardBody({ card }: { readonly card: SavedCard }): ReactNode {
  switch (card.kind) {
    case SavedCardKind.PRESENT:
      return (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {SAVED_CARD_MESSAGES.cardEnding(
              SAVED_CARD_MESSAGES.cardTypes[card.network],
              card.lastDigits,
            )}
          </p>
          {card.expiry && (
            <p className="text-xs text-text-muted">{SAVED_CARD_MESSAGES.cardExpiry(card.expiry)}</p>
          )}
        </div>
      );
    case SavedCardKind.ABSENT:
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{SAVED_CARD_MESSAGES.noCard}</p>
          <AddCardLink />
        </div>
      );
    case SavedCardKind.UNKNOWN:
      return <p className="text-sm text-text-muted">{SAVED_CARD_MESSAGES.unknownCard}</p>;
    default:
      return assertNever(card);
  }
}

/**
 * Saved card panel.
 *
 * @param props - Saved card view.
 * @returns The panel.
 */
export function SavedCardPanel({ card }: { readonly card: SavedCard }): ReactNode {
  return (
    <div
      data-testid="saved-card"
      className="flex gap-3 rounded-card border border-border bg-surface-2 p-4"
    >
      <CreditCard aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-text" />
      <div className="flex flex-col gap-2">
        <h3 className="text-xs tracking-wide text-text-muted uppercase">
          {SAVED_CARD_MESSAGES.title}
        </h3>
        <SavedCardBody card={card} />
      </div>
    </div>
  );
}
