"use client";

/**
 * Actions of the order detail: « Modifier la commande » and « Annuler la commande », offered
 * only for the statuses that allow them (FR-027; the backend stays the only judge). A refused
 * cancellation is explained and the page reads the order again.
 *
 * @see specs/003-account-orders/spec.md FR-026, FR-027
 * @see specs/003-account-orders/research.md R15
 */
import { PencilLine, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { orderEditPath } from "@/lib/constants/routes";
import { OrderActionOutcomeKind } from "@/lib/enums/order";

import { useCancelOrder } from "../hooks/useOrderActions";
import { CANCEL_ORDER_MESSAGES, ORDER_DETAIL_MESSAGES } from "../messages";
import { cancelErrorMessage } from "../order-errors";

import { CancelOrderDialog } from "./CancelOrderDialog";

/** Props of {@link OrderActions}. */
export interface OrderActionsProps {
  readonly orderUuid: string;
  readonly canEdit: boolean;
  readonly canCancel: boolean;
}

/** Style of an action button. */
const ACTION =
  "inline-flex h-11 items-center gap-2 rounded-button border border-border px-5 text-sm font-medium transition-colors duration-(--duration-fast)";

/**
 * Cancels the order and turns the outcome into a message.
 *
 * @param orderUuid - Order to cancel.
 * @returns The confirm handler, its state and the message.
 */
function useCancelFlow(orderUuid: string): {
  readonly confirm: () => Promise<void>;
  readonly isPending: boolean;
  readonly message: string | null;
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
} {
  const router = useRouter();
  const { run, isPending } = useCancelOrder(orderUuid);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const confirm = async (): Promise<void> => {
    const outcome = await run();
    setOpen(false);
    if (outcome.kind === OrderActionOutcomeKind.DONE) {
      setMessage(CANCEL_ORDER_MESSAGES.done);
    } else if (outcome.kind === OrderActionOutcomeKind.FAILED) {
      setMessage(cancelErrorMessage(outcome.error));
      // The status may have moved on: read the order again.
      router.refresh();
    }
  };
  return { confirm, isPending, message, open, setOpen };
}

/**
 * Detail actions.
 *
 * @param props - Order and allowed actions.
 * @returns The actions block.
 */
export function OrderActions({ orderUuid, canEdit, canCancel }: OrderActionsProps): ReactNode {
  const flow = useCancelFlow(orderUuid);
  return (
    <div className="flex flex-col gap-3">
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {flow.message}
      </p>
      {!canEdit && !canCancel && (
        <p className="text-sm text-text-muted">{ORDER_DETAIL_MESSAGES.noAction}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {canEdit && (
          <Link href={orderEditPath(orderUuid)} className={`${ACTION} hover:border-brand-text`}>
            <PencilLine aria-hidden className="size-4" />
            {ORDER_DETAIL_MESSAGES.edit}
          </Link>
        )}
        {canCancel && (
          <CancelOrderDialog
            trigger={
              <button type="button" className={`${ACTION} text-rose hover:border-rose`}>
                <XCircle aria-hidden className="size-4" />
                {ORDER_DETAIL_MESSAGES.cancel}
              </button>
            }
            open={flow.open}
            onOpenChange={flow.setOpen}
            onConfirm={() => void flow.confirm()}
            isPending={flow.isPending}
          />
        )}
      </div>
    </div>
  );
}
