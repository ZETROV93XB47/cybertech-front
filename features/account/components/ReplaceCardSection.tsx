"use client";

/**
 * « Remplacer ma carte »: opens the add form in replacement mode (the confirmation comes before
 * sending, the current card stays until then).
 *
 * @see specs/003-account-orders/spec.md US5 scenario 6, FR-032
 */
import { RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { CARD_MESSAGES } from "../messages";

import { AddCardForm, type AddCardFormProps } from "./AddCardForm";

/** Style of the toggle button. */
const TOGGLE_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 self-start rounded-button border border-border px-4 text-sm text-text transition-colors duration-(--duration-fast) hover:border-brand-text";

/** Props of {@link ReplaceCardSection}. */
export type ReplaceCardSectionProps = Omit<AddCardFormProps, "hasCard">;

/**
 * Replacement toggle and form.
 *
 * @param props - Return path, holder and expiry options.
 * @returns The toggle, then the form once opened.
 */
export function ReplaceCardSection(props: ReplaceCardSectionProps): ReactNode {
  const [isOpen, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        aria-expanded={isOpen}
        className={TOGGLE_BUTTON}
        onClick={() => {
          setOpen((open) => !open);
        }}
      >
        <RefreshCw aria-hidden className="size-4" />
        {isOpen ? CARD_MESSAGES.replaceCancel : CARD_MESSAGES.replaceOpen}
      </button>
      {isOpen && <AddCardForm hasCard {...props} />}
    </div>
  );
}
