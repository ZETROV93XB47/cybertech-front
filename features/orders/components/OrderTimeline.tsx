/**
 * Lifecycle timeline of an order: the nominal steps in an ordered list, the current one marked
 * with `aria-current="step"`, and the outcome (cancelled, refunded, returned, payment refused)
 * shown apart as an outcome, never as a step (FR-024).
 *
 * The steps, then the outcome, appear through the shared staggered entrance (motion tokens,
 * static when effects are reduced or the system asks for reduced motion).
 *
 * @see specs/003-account-orders/data-model.md §5
 */
import { Check, Circle, CircleDot, Flag } from "lucide-react";
import type { ReactNode } from "react";

import { RevealGroup, RevealItem } from "@/components/effects/Reveal";
import { assertNever } from "@/lib/assert-never";
import { TimelineStepState } from "@/lib/enums/order";
import { cn } from "@/lib/utils";

import { ORDER_DETAIL_MESSAGES, ORDERS_MESSAGES } from "../messages";
import type { OrderTimeline as OrderTimelineView, TimelineStep } from "../order-timeline";

/** Props of {@link OrderTimeline}. */
export interface OrderTimelineProps {
  readonly timeline: OrderTimelineView;
}

/**
 * Icon, classes and screen-reader suffix of a step state.
 *
 * @param state - Step state.
 * @returns How the step looks.
 */
function stepLook(state: TimelineStepState): {
  readonly icon: ReactNode;
  readonly className: string;
  readonly suffix: string;
} {
  switch (state) {
    case TimelineStepState.DONE:
      return {
        icon: <Check aria-hidden className="size-4" />,
        className: "border-success text-success",
        suffix: ORDER_DETAIL_MESSAGES.stepDone,
      };
    case TimelineStepState.CURRENT:
      return {
        icon: <CircleDot aria-hidden className="size-4" />,
        className: "border-gold bg-surface-2 text-gold",
        suffix: ORDER_DETAIL_MESSAGES.stepCurrent,
      };
    case TimelineStepState.UPCOMING:
      return {
        icon: <Circle aria-hidden className="size-4" />,
        className: "border-border text-text-muted",
        suffix: ORDER_DETAIL_MESSAGES.stepUpcoming,
      };
    default:
      return assertNever(state);
  }
}

/**
 * One step of the timeline.
 *
 * @param props - Step.
 * @returns The list item.
 */
function Step({ step }: { readonly step: TimelineStep }): ReactNode {
  const look = stepLook(step.state);
  const isCurrent = step.state === TimelineStepState.CURRENT;
  return (
    <li
      aria-current={isCurrent ? "step" : undefined}
      data-state={step.state}
      className="flex items-center gap-3"
    >
      <span
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-full border",
          look.className,
        )}
      >
        {look.icon}
      </span>
      <span className={cn("text-sm", isCurrent ? "font-medium text-text" : "text-text-muted")}>
        {ORDERS_MESSAGES.statusLabels[step.status]}
        <span className="sr-only">{` (${look.suffix})`}</span>
      </span>
    </li>
  );
}

/**
 * Order timeline.
 *
 * @param props - Steps and outcome.
 * @returns The section.
 */
export function OrderTimeline({ timeline }: OrderTimelineProps): ReactNode {
  return (
    <section
      aria-labelledby="order-timeline"
      className="glass flex flex-col gap-5 rounded-card p-6"
    >
      <h2 id="order-timeline" className="text-lg">
        {ORDER_DETAIL_MESSAGES.timelineTitle}
      </h2>
      <RevealGroup className="flex flex-col gap-5">
        <RevealItem>
          <ol aria-label={ORDER_DETAIL_MESSAGES.timelineLabel} className="flex flex-col gap-3">
            {timeline.steps.map((step) => (
              <Step key={step.status} step={step} />
            ))}
          </ol>
        </RevealItem>
        {timeline.outcome !== null && (
          <RevealItem>
            <p
              data-testid="order-outcome"
              className="flex items-center gap-3 rounded-card border border-rose p-3 text-sm"
            >
              <Flag aria-hidden className="size-4 text-rose" />
              <span>
                <span className="sr-only">{`${ORDER_DETAIL_MESSAGES.outcomeLabel} : `}</span>
                {ORDER_DETAIL_MESSAGES.outcomes[timeline.outcome]}
              </span>
            </p>
          </RevealItem>
        )}
      </RevealGroup>
    </section>
  );
}
