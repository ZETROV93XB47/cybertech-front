"use client";

/**
 * One step of the single-page checkout: open (its form), done (folded into a summary with
 * « Modifier ») or upcoming (title only). The heading carries the position and the state for
 * screen readers.
 *
 * @see specs/003-account-orders/spec.md FR-006
 */
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import type { CheckoutStep } from "@/lib/enums/checkout";
import { CheckoutStepState } from "@/lib/enums/checkout-step-state";
import { cn } from "@/lib/utils";

import { CHECKOUT_MESSAGES } from "../messages";

/** Props of {@link CheckoutStepPanel}. */
export interface CheckoutStepPanelProps {
  readonly step: CheckoutStep;
  /** 1-based position of the step. */
  readonly position: number;
  readonly total: number;
  readonly state: CheckoutStepState;
  /** Summary of the choices, shown once the step is done. */
  readonly summary: ReactNode;
  /** Reopens the step. */
  readonly onEdit: () => void;
  /** Form of the step, shown while it is open. */
  readonly children: ReactNode;
}

/**
 * Text of a state, for screen readers.
 *
 * @param state - Step state.
 * @returns The French label.
 */
function stateLabel(state: CheckoutStepState): string {
  switch (state) {
    case CheckoutStepState.DONE:
      return CHECKOUT_MESSAGES.stepDone;
    case CheckoutStepState.CURRENT:
      return CHECKOUT_MESSAGES.stepCurrent;
    case CheckoutStepState.UPCOMING:
      return CHECKOUT_MESSAGES.stepUpcoming;
    default:
      return assertNever(state);
  }
}

/**
 * Checkout step.
 *
 * @param props - Step, position, state, summary and form.
 * @returns The section.
 */
export function CheckoutStepPanel(props: CheckoutStepPanelProps): ReactNode {
  const { step, position, total, state, summary, onEdit, children } = props;
  const title = CHECKOUT_MESSAGES.stepTitles[step];
  const headingId = `checkout-step-${step}`;
  return (
    <section
      aria-labelledby={headingId}
      aria-current={state === CheckoutStepState.CURRENT ? "step" : undefined}
      className={cn(
        "glass flex flex-col gap-5 rounded-card p-6",
        state === CheckoutStepState.UPCOMING && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={headingId} className="flex items-center gap-3 text-lg">
          <span
            aria-hidden
            className="inline-flex size-7 items-center justify-center rounded-full border border-border text-sm"
          >
            {state === CheckoutStepState.DONE ? (
              <Check className="size-4 text-success" />
            ) : (
              position
            )}
          </span>
          <span>{title}</span>
          <span className="sr-only">
            {`${CHECKOUT_MESSAGES.stepPosition(position, total)}, ${stateLabel(state)}`}
          </span>
        </h2>
        {state === CheckoutStepState.DONE && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={CHECKOUT_MESSAGES.editStep(title)}
            className="text-sm text-brand-text underline-offset-4 hover:underline"
          >
            {CHECKOUT_MESSAGES.edit}
          </button>
        )}
      </div>
      {state === CheckoutStepState.DONE && <div className="text-sm text-text-muted">{summary}</div>}
      {state === CheckoutStepState.CURRENT && children}
    </section>
  );
}
