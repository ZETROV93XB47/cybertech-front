"use client";

/**
 * « Ajouter une carte » (US5): the test-card notice, the fields, and — when a card is already
 * saved — the replacement confirmation. Sent to `POST /api/bank-card` by `useAddCard`; the
 * number is emptied as soon as it is sent and never stored in the browser
 * (constitution V v3.0.0).
 *
 * @see specs/003-account-orders/spec.md US5, FR-032, SC-008
 * @see specs/003-account-orders/research.md R21
 */
import { FlaskConical } from "lucide-react";
import type { ReactNode, SyntheticEvent } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardFormStatus } from "@/lib/enums/bank-card";

import { useAddCard } from "../hooks/useAddCard";
import { CARD_MESSAGES } from "../messages";

import { AddCardFields } from "./AddCardFields";
import { CardFeedback } from "./CardFeedback";

/** Style of the secondary buttons. */
const SECONDARY_BUTTON =
  "inline-flex h-10 items-center justify-center rounded-button border border-border px-4 text-sm text-text transition-colors duration-(--duration-fast) hover:border-brand-text";

/** Props of {@link AddCardForm}. */
export interface AddCardFormProps {
  /** A card is saved: adding replaces it, after confirmation. */
  readonly hasCard: boolean;
  /** Safe relative path to go back to after success (`?returnTo=`), or `null`. */
  readonly returnTo: string | null;
  /** Holder to prefill (the saved card's), if any. */
  readonly holder?: string;
  readonly months: readonly string[];
  readonly years: readonly string[];
}

/**
 * Replacement confirmation.
 *
 * @param props - Open state, setter and confirm handler.
 * @returns The dialog.
 */
function ReplaceDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
}): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="rounded-card border-border bg-surface-2">
        <DialogTitle>{CARD_MESSAGES.replaceTitle}</DialogTitle>
        <DialogDescription>{CARD_MESSAGES.replaceBody}</DialogDescription>
        <DialogFooter>
          <button
            type="button"
            className={SECONDARY_BUTTON}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {CARD_MESSAGES.replaceCancel}
          </button>
          <button
            type="button"
            className="cta-gradient inline-flex h-10 items-center justify-center rounded-button px-4 text-sm font-medium"
            onClick={onConfirm}
          >
            {CARD_MESSAGES.replaceConfirm}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Success text of the form.
 *
 * @param status - Outcome status.
 * @param returnTo - Path the customer is sent back to, if any.
 * @returns The confirmation, or `null`.
 */
function successText(status: CardFormStatus, returnTo: string | null): string | null {
  if (status !== CardFormStatus.SUCCESS) {
    return null;
  }
  return returnTo === null ? CARD_MESSAGES.added : CARD_MESSAGES.returning;
}

/**
 * Add form.
 *
 * @param props - Saved-card flag, return path, holder and expiry options.
 * @returns The form.
 */
export function AddCardForm({
  hasCard,
  returnTo,
  holder,
  months,
  years,
}: AddCardFormProps): ReactNode {
  const form = useAddCard(hasCard, returnTo, holder);
  const onSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    form.submit();
  };
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
      aria-labelledby="card-add-title"
    >
      <h3 id="card-add-title" className="text-base font-medium">
        {CARD_MESSAGES.addTitle}
      </h3>
      <p className="flex items-start gap-2 rounded-card border border-gold bg-surface-2 p-3 text-sm">
        <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
        {CARD_MESSAGES.testNotice}
      </p>
      <AddCardFields
        values={form.values}
        setValues={form.setValues}
        errors={form.errors}
        months={months}
        years={years}
      />
      <CardFeedback
        success={successText(form.outcome.status, returnTo)}
        error={form.outcome.formError}
        needsSignIn={form.outcome.needsSignIn}
      />
      <button
        type="submit"
        disabled={form.isPending}
        className="cta-gradient inline-flex h-11 items-center justify-center self-start rounded-button px-8 font-medium disabled:opacity-60"
      >
        {form.isPending ? CARD_MESSAGES.adding : CARD_MESSAGES.addSubmit}
      </button>
      <ReplaceDialog
        open={form.isConfirming}
        onOpenChange={form.setConfirming}
        onConfirm={form.confirmReplace}
      />
    </form>
  );
}
