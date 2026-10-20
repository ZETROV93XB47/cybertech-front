"use client";

/**
 * « Supprimer la carte » and its confirmation dialog; the deletion runs the `deleteBankCard`
 * Server Action, which revalidates the page (the « aucune carte » state then shows). Radix
 * returns the focus to the trigger when the dialog closes.
 *
 * @see specs/003-account-orders/spec.md US5 scenario 3, FR-031
 */
import { Trash2 } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { deleteBankCard } from "../actions";
import { INITIAL_CARD_DELETE_STATE } from "../card-state";
import { CARD_MESSAGES } from "../messages";

import { CardFeedback } from "./CardFeedback";

/** Style of the secondary buttons. */
const SECONDARY_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-button border border-border px-4 text-sm text-text transition-colors duration-(--duration-fast) hover:border-brand-text";

/** Style of the destructive buttons. */
const DANGER_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-button border border-rose px-4 text-sm font-medium text-rose transition-colors duration-(--duration-fast) hover:bg-surface disabled:opacity-40";

/**
 * Delete button, dialog and outcome.
 *
 * @returns The trigger and its dialog.
 */
export function DeleteCardDialog(): ReactNode {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteBankCard, INITIAL_CARD_DELETE_STATE);
  return (
    <div className="flex flex-col gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button" className={DANGER_BUTTON}>
            <Trash2 aria-hidden className="size-4" />
            {CARD_MESSAGES.deleteOpen}
          </button>
        </DialogTrigger>
        <DialogContent showCloseButton={false} className="rounded-card border-border bg-surface-2">
          <DialogTitle>{CARD_MESSAGES.deleteTitle}</DialogTitle>
          <DialogDescription>{CARD_MESSAGES.deleteBody}</DialogDescription>
          <form
            action={formAction}
            onSubmit={() => {
              setOpen(false);
            }}
          >
            <DialogFooter>
              <button
                type="button"
                className={SECONDARY_BUTTON}
                onClick={() => {
                  setOpen(false);
                }}
              >
                {CARD_MESSAGES.deleteCancel}
              </button>
              <button type="submit" disabled={pending} className={DANGER_BUTTON}>
                {pending ? CARD_MESSAGES.deleting : CARD_MESSAGES.deleteConfirm}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <CardFeedback success={null} error={state.formError} needsSignIn={state.needsSignIn} />
    </div>
  );
}
