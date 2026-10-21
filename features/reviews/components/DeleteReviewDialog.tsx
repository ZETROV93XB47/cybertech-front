"use client";

/**
 * « Supprimer » of a published review: a confirmation dialog, then the Server Action
 * `deleteReview` (FR-018). The outcome goes to the page live region; a failure stays in the dialog
 * row.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US5 scenario 4
 */
import { Trash2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReviewFormStatus } from "@/lib/enums/review";

import { deleteReview } from "../actions";
import { DELETE_REVIEW_MESSAGES, MY_REVIEWS_MESSAGES } from "../messages";

/** Style of the secondary buttons. */
const SECONDARY_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-button border border-border px-4 text-sm text-text transition-colors duration-(--duration-fast) hover:border-brand-text";

/** Style of the destructive buttons. */
const DANGER_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-button border border-rose px-4 text-sm font-medium text-rose transition-colors duration-(--duration-fast) hover:bg-surface disabled:opacity-40";

/** Props of {@link DeleteReviewDialog}. */
export interface DeleteReviewDialogProps {
  readonly reviewUuid: string;
  readonly productUuid: string;
  readonly productName: string;
  /** Called once deleted, with the message to announce. */
  readonly onDeleted: (message: string) => void;
}

/**
 * Delete button and its confirmation.
 *
 * @param props - Review, product and callback.
 * @returns The trigger, the dialog and the error, if any.
 */
export function DeleteReviewDialog(props: DeleteReviewDialogProps): ReactNode {
  const { reviewUuid, productUuid, productName, onDeleted } = props;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = (): void => {
    startTransition(async () => {
      const result = await deleteReview({ reviewUuid, productUuid });
      setOpen(false);
      if (result.status === ReviewFormStatus.SUCCESS) {
        onDeleted(MY_REVIEWS_MESSAGES.deleted);
      } else {
        setError(result.formError ?? null);
      }
    });
  };
  return (
    <div className="flex flex-col gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={MY_REVIEWS_MESSAGES.deleteLabel(productName)}
            className={SECONDARY_BUTTON}
          >
            <Trash2 aria-hidden className="size-4" />
            {MY_REVIEWS_MESSAGES.delete}
          </button>
        </DialogTrigger>
        <DialogContent showCloseButton={false} className="rounded-card border-border bg-surface-2">
          <DialogTitle>{DELETE_REVIEW_MESSAGES.title}</DialogTitle>
          <DialogDescription>{DELETE_REVIEW_MESSAGES.body(productName)}</DialogDescription>
          <DialogFooter>
            <button
              type="button"
              className={SECONDARY_BUTTON}
              onClick={() => {
                setOpen(false);
              }}
            >
              {DELETE_REVIEW_MESSAGES.cancel}
            </button>
            <button type="button" disabled={pending} onClick={confirm} className={DANGER_BUTTON}>
              {pending ? DELETE_REVIEW_MESSAGES.deleting : DELETE_REVIEW_MESSAGES.confirm}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {error !== null && <p className="text-sm text-rose">{error}</p>}
    </div>
  );
}
