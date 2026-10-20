/**
 * Body of « Ma carte »: the masked card with its edit form, replacement and deletion, or the
 * illustrated « aucune carte » state with « Ajouter une carte ». No control of this page shows a
 * full card number; only « Ajouter une carte » accepts one, on its way to the backend.
 *
 * @see specs/003-account-orders/spec.md US5, FR-031, FR-032
 */
import { CreditCard } from "lucide-react";
import type { ReactNode } from "react";

import { StateIllustration } from "@/components/effects/StateIllustration";

import type { CardView } from "../card-view";
import { CARD_MESSAGES } from "../messages";

import { AddCardForm } from "./AddCardForm";
import { CardVisual } from "./CardVisual";
import { DeleteCardDialog } from "./DeleteCardDialog";
import { EditCardForm } from "./EditCardForm";
import { ReplaceCardSection } from "./ReplaceCardSection";

/** Props of {@link BankCardPanel}. */
export interface BankCardPanelProps {
  /** Saved card, `null` when there is none. */
  readonly card: CardView | null;
  /** Safe relative path to go back to once a card is saved, or `null`. */
  readonly returnTo: string | null;
  readonly months: readonly string[];
  readonly years: readonly string[];
}

/**
 * « Aucune carte » state and the add form.
 *
 * @param props - Return path and expiry options.
 * @returns The section.
 */
function NoCard({ returnTo, months, years }: Omit<BankCardPanelProps, "card">): ReactNode {
  return (
    <section aria-labelledby="no-card-title" className="glass flex flex-col gap-6 rounded-card p-6">
      <div className="flex flex-col items-start gap-3">
        <StateIllustration icon={<CreditCard className="size-10" />} />
        <h2 id="no-card-title" className="text-xl">
          {CARD_MESSAGES.noCardTitle}
        </h2>
        <p className="max-w-prose text-text-muted">{CARD_MESSAGES.noCardBody}</p>
      </div>
      <AddCardForm hasCard={false} returnTo={returnTo} months={months} years={years} />
    </section>
  );
}

/**
 * Card page body.
 *
 * @param props - Card, return path and expiry options.
 * @returns The saved card and its actions, or the add form.
 */
export function BankCardPanel({ card, returnTo, months, years }: BankCardPanelProps): ReactNode {
  if (card === null) {
    return <NoCard returnTo={returnTo} months={months} years={years} />;
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-12">
      <section
        aria-labelledby="card-title"
        className="glass flex flex-col gap-5 rounded-card p-6 xl:col-span-5"
      >
        <h2 id="card-title" className="text-lg">
          {CARD_MESSAGES.cardTitle}
        </h2>
        <CardVisual card={card} />
        <DeleteCardDialog />
      </section>
      <div className="flex flex-col gap-6 xl:col-span-7">
        <section
          aria-labelledby="card-edit-title"
          className="glass flex flex-col gap-5 rounded-card p-6"
        >
          <h2 id="card-edit-title" className="text-lg">
            {CARD_MESSAGES.editTitle}
          </h2>
          <EditCardForm card={card} months={months} years={years} />
        </section>
        <section className="glass flex flex-col gap-5 rounded-card p-6">
          <ReplaceCardSection
            returnTo={returnTo}
            holder={card.holder}
            months={months}
            years={years}
          />
        </section>
      </div>
    </div>
  );
}
