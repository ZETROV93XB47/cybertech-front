"use client";

/**
 * Confirmation dialog of « Annuler la commande », opened by its trigger button; Radix returns
 * the focus to that button when the dialog closes.
 *
 * @see specs/003-account-orders/spec.md US3 scenario 7, FR-026
 */
import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CANCEL_ORDER_MESSAGES } from "../messages";

/** Props of {@link CancelOrderDialog}. */
export interface CancelOrderDialogProps {
  /** Button opening the dialog; it gets the focus back when the dialog closes. */
  readonly trigger: ReactNode;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
  readonly isPending: boolean;
}

/** Style of the « keep » button. */
const SECONDARY_BUTTON =
  "inline-flex h-10 items-center justify-center rounded-button border border-border px-4 text-sm text-text transition-colors duration-(--duration-fast) hover:border-brand-text";

/**
 * Cancellation dialog.
 *
 * @param props - Trigger, open state, handlers and pending state.
 * @returns The dialog.
 */
export function CancelOrderDialog({
  trigger,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: CancelOrderDialogProps): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent showCloseButton={false} className="rounded-card border-border bg-surface-2">
        <DialogTitle>{CANCEL_ORDER_MESSAGES.title}</DialogTitle>
        <DialogDescription>{CANCEL_ORDER_MESSAGES.body}</DialogDescription>
        <DialogFooter>
          <button
            type="button"
            className={SECONDARY_BUTTON}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {CANCEL_ORDER_MESSAGES.keep}
          </button>
          <button
            type="button"
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-button border border-rose px-4 text-sm font-medium text-rose transition-colors duration-(--duration-fast) hover:bg-surface disabled:opacity-40"
            onClick={onConfirm}
          >
            {isPending ? CANCEL_ORDER_MESSAGES.confirming : CANCEL_ORDER_MESSAGES.confirm}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
