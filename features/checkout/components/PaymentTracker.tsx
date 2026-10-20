"use client";

/**
 * Payment follow-up of the confirmation page: polls the order status until the payment is
 * accepted or refused (bounded in time), offers a retry after a refusal, and announces every
 * change politely.
 *
 * The way out leads to the order detail (« Mes commandes », US3) and to the catalog; the order
 * detail reuses the tracker without them.
 *
 * @see specs/003-account-orders/spec.md FR-013, FR-014
 * @see specs/003-account-orders/research.md R11
 */
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import { CATALOG_PATH, orderPath } from "@/lib/constants/routes";
import { PaymentTrackerState, RetryPaymentOutcomeKind } from "@/lib/enums/checkout";

import { useOrderStatus, useRetryPayment } from "../hooks/useOrderStatus";
import { CONFIRMATION_MESSAGES } from "../messages";
import { paymentTrackerState } from "../payment-tracker";

/** Props of {@link PaymentTracker}. */
export interface PaymentTrackerProps {
  readonly orderUuid: string;
  /** Shows the links to the order detail and to the catalog (confirmation page). */
  readonly withLinks?: boolean;
}

/**
 * Links of the confirmation page.
 *
 * @param props - Order to link to.
 * @returns The links.
 */
function TrackerLinks({ orderUuid }: { readonly orderUuid: string }): ReactNode {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <Link
        href={orderPath(orderUuid)}
        className="text-brand-text underline-offset-4 hover:underline"
      >
        {CONFIRMATION_MESSAGES.viewOrder}
      </Link>
      <Link href={CATALOG_PATH} className="text-text-muted underline-offset-4 hover:underline">
        {CONFIRMATION_MESSAGES.continueShopping}
      </Link>
    </div>
  );
}

/**
 * Icon and sentence of a state.
 *
 * @param state - Tracker state.
 * @returns The icon and the text.
 */
function stateContent(state: PaymentTrackerState): {
  readonly icon: ReactNode;
  readonly text: string;
} {
  switch (state) {
    case PaymentTrackerState.PENDING:
      return {
        icon: (
          <Loader2
            aria-hidden
            className="size-6 animate-spin text-brand-text motion-reduce:animate-none"
          />
        ),
        text: CONFIRMATION_MESSAGES.pending,
      };
    case PaymentTrackerState.PAID:
      return {
        icon: <CheckCircle2 aria-hidden className="size-6 text-success" />,
        text: CONFIRMATION_MESSAGES.paid,
      };
    case PaymentTrackerState.FAILED:
      return {
        icon: <XCircle aria-hidden className="size-6 text-rose" />,
        text: CONFIRMATION_MESSAGES.failed,
      };
    case PaymentTrackerState.TIMED_OUT:
      return {
        icon: <Clock aria-hidden className="size-6 text-gold" />,
        text: CONFIRMATION_MESSAGES.timeout,
      };
    case PaymentTrackerState.UNKNOWN:
      return {
        icon: <Clock aria-hidden className="size-6 text-gold" />,
        text: CONFIRMATION_MESSAGES.retryImpossible,
      };
    default:
      return assertNever(state);
  }
}

/**
 * Message of a retry outcome.
 *
 * @param outcome - Outcome of « Relancer le paiement ».
 * @returns The message, or `null` when the polling says it all.
 */
function retryMessage(outcome: RetryPaymentOutcomeKind): string | null {
  switch (outcome) {
    case RetryPaymentOutcomeKind.RESTARTED:
      return null;
    case RetryPaymentOutcomeKind.ALREADY_PAID:
      return CONFIRMATION_MESSAGES.alreadyPaid;
    case RetryPaymentOutcomeKind.FAILED:
      return CONFIRMATION_MESSAGES.retryImpossible;
    default:
      return assertNever(outcome);
  }
}

/**
 * Payment follow-up.
 *
 * @param props - Order to follow and whether to show the links.
 * @returns The status block.
 */
export function PaymentTracker({ orderUuid, withLinks = true }: PaymentTrackerProps): ReactNode {
  const { status, isTimedOut, error, restart } = useOrderStatus(orderUuid);
  const { retry, isPending } = useRetryPayment(orderUuid, restart);
  const [notice, setNotice] = useState<string | null>(null);
  const state = paymentTrackerState(status, isTimedOut, error);
  const { icon, text } = stateContent(state);
  return (
    <section className="glass flex flex-col gap-4 rounded-card p-6" aria-live="polite">
      <p role="status" className="flex items-center gap-3 text-lg" data-tracker-state={state}>
        {icon}
        <span>{text}</span>
      </p>
      {state === PaymentTrackerState.PENDING && (
        <p className="text-sm text-text-muted">{CONFIRMATION_MESSAGES.pendingHint}</p>
      )}
      {notice && <p className="text-sm">{notice}</p>}
      {state === PaymentTrackerState.FAILED && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            void retry().then((outcome) => {
              setNotice(retryMessage(outcome));
            });
          }}
          className="cta-gradient h-11 self-start rounded-button px-6 font-medium disabled:opacity-40"
        >
          {isPending ? CONFIRMATION_MESSAGES.retrying : CONFIRMATION_MESSAGES.retry}
        </button>
      )}
      {withLinks && <TrackerLinks orderUuid={orderUuid} />}
    </section>
  );
}
