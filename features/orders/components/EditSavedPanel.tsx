/**
 * Summary shown after an order edit is saved: old and new totals, both from the backend, and
 * what it means for the payment (complement charged, refund, no change) — FR-025.
 *
 * @see specs/003-account-orders/spec.md US3 scenario 5
 */
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import { orderPath } from "@/lib/constants/routes";
import { OrderChangeKind } from "@/lib/enums/order";
import { formatPrice } from "@/lib/format";

import type { SavedEdit } from "../hooks/useOrderEditForm";
import { ORDER_EDIT_MESSAGES } from "../messages";

/** Props of {@link EditSavedPanel}. */
export interface EditSavedPanelProps {
  readonly orderUuid: string;
  readonly saved: SavedEdit;
}

/**
 * Sentence of the effect of the edit on the payment.
 *
 * @param saved - Saved edit.
 * @returns The sentence.
 */
function changeText(saved: SavedEdit): string {
  switch (saved.change) {
    case OrderChangeKind.CHARGED:
      return ORDER_EDIT_MESSAGES.changes[OrderChangeKind.CHARGED];
    case OrderChangeKind.REFUNDED:
      return ORDER_EDIT_MESSAGES.changes[OrderChangeKind.REFUNDED](formatPrice(saved.refunded));
    case OrderChangeKind.UNCHANGED:
      return ORDER_EDIT_MESSAGES.changes[OrderChangeKind.UNCHANGED];
    default:
      return assertNever(saved.change);
  }
}

/**
 * Saved edit summary.
 *
 * @param props - Order and saved amounts.
 * @returns The panel.
 */
export function EditSavedPanel({ orderUuid, saved }: EditSavedPanelProps): ReactNode {
  return (
    <section
      aria-labelledby="edit-saved"
      className="flex flex-col gap-3 rounded-card border border-success p-5"
    >
      <h2 id="edit-saved" className="flex items-center gap-2 text-lg">
        <CheckCircle2 aria-hidden className="size-5 text-success" />
        {ORDER_EDIT_MESSAGES.savedTitle}
      </h2>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-text-muted">{ORDER_EDIT_MESSAGES.previousTotal}</dt>
        <dd className="text-right line-through" data-testid="edit-previous-total">
          {formatPrice(saved.previousTotal)}
        </dd>
        <dt>{ORDER_EDIT_MESSAGES.newTotal}</dt>
        <dd className="price text-right text-lg" data-testid="edit-new-total">
          {formatPrice(saved.newTotal)}
        </dd>
      </dl>
      <p className="text-sm">{changeText(saved)}</p>
      <Link
        href={orderPath(orderUuid)}
        className="text-sm text-brand-text underline underline-offset-4"
      >
        {ORDER_EDIT_MESSAGES.viewOrder}
      </Link>
    </section>
  );
}
