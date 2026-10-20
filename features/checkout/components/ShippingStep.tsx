"use client";

/**
 * Shipping step of the checkout: every (speed, carrier) pair of the backend with its real price
 * and its delay (fixed by the backend, or a front estimate labelled as such), the express
 * promise of the moment, and store pickup greyed out « Bientôt disponible ».
 *
 * Native radio buttons: the whole card is the label, so the accessible name carries the speed,
 * the carrier and the price.
 *
 * @see specs/003-account-orders/spec.md FR-008, Clarifications (Q2)
 */
import { Store, Truck, Zap } from "lucide-react";
import type { ReactNode } from "react";

import { DELIVERY_MESSAGES } from "@/features/catalog/messages";
import { assertNever } from "@/lib/assert-never";
import type { QuoteShipping } from "@/lib/constants/checkout";
import { EXPRESS_CUTOFF_HOUR } from "@/lib/constants/shipping";
import { DelaySource, ShippingChoiceKind } from "@/lib/enums/checkout";
import { ExpressPromise, ShippingType } from "@/lib/enums/shipping";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

import { CHECKOUT_MESSAGES } from "../messages";
import type { CarrierChoice, ShippingChoice } from "../shipping-choices";

/** Name shared by the radio buttons of the step. */
const RADIO_NAME = "shipping";

/** Classes of a choice card. */
const CARD =
  "flex cursor-pointer items-start gap-3 rounded-card border border-border p-4 transition-colors duration-(--duration-fast) has-checked:border-brand-text";

/** Props of {@link ShippingStep}. */
export interface ShippingStepProps {
  readonly choices: readonly ShippingChoice[];
  readonly value: QuoteShipping | null;
  readonly error: string | null;
  readonly onChange: (value: QuoteShipping) => void;
  readonly onSubmit: () => void;
}

/**
 * Delay line of a carrier choice: the express promise, the backend delay, or the estimate.
 *
 * @param choice - Carrier choice.
 * @returns The sentence.
 */
function delayText(choice: CarrierChoice): string {
  if (choice.expressPromise === ExpressPromise.TOMORROW) {
    return DELIVERY_MESSAGES.expressTomorrow(EXPRESS_CUTOFF_HOUR);
  }
  if (choice.expressPromise === ExpressPromise.NEXT_BUSINESS_DAY) {
    return DELIVERY_MESSAGES.expressNextBusinessDay;
  }
  return CHECKOUT_MESSAGES.shippingDelay(choice.delay.minDays, choice.delay.maxDays);
}

/**
 * One carrier choice.
 *
 * @param props - Choice, selection state and handler.
 * @returns The labelled radio card.
 */
function CarrierOption({
  choice,
  isChecked,
  onChange,
}: {
  readonly choice: CarrierChoice;
  readonly isChecked: boolean;
  readonly onChange: (value: QuoteShipping) => void;
}): ReactNode {
  const Icon = choice.type === ShippingType.EXPRESS ? Zap : Truck;
  return (
    <label className={CARD}>
      <input
        type="radio"
        name={RADIO_NAME}
        className="mt-1 accent-brand"
        checked={isChecked}
        onChange={() => {
          onChange({ type: choice.type, provider: choice.provider });
        }}
      />
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-text" />
      <span className="flex flex-1 flex-col gap-0.5 text-sm">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-text">
            {`${DELIVERY_MESSAGES.typeLabels[choice.type]} — ${DELIVERY_MESSAGES.providerLabels[choice.provider]}`}
          </span>
          <span className="price">{formatPrice(choice.cost)}</span>
        </span>
        <span className="text-text-muted">{delayText(choice)}</span>
        {choice.delaySource === DelaySource.ESTIMATE && (
          <span className="text-xs text-text-muted">{CHECKOUT_MESSAGES.shippingEstimate}</span>
        )}
      </span>
    </label>
  );
}

/**
 * Store pickup, shown but never selectable.
 *
 * @returns The disabled radio card.
 */
function PickupOption(): ReactNode {
  return (
    <label className={cn(CARD, "cursor-not-allowed opacity-50")}>
      <input type="radio" name={RADIO_NAME} disabled className="mt-1" />
      <Store aria-hidden className="mt-0.5 size-5 shrink-0" />
      <span className="flex flex-1 items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{CHECKOUT_MESSAGES.pickupLabel}</span>
        <span className="text-xs">{CHECKOUT_MESSAGES.pickupSoon}</span>
      </span>
    </label>
  );
}

/**
 * Renders one entry of the list.
 *
 * @param choice - Choice.
 * @param value - Selected pair.
 * @param onChange - Selection handler.
 * @returns The option.
 */
function renderChoice(
  choice: ShippingChoice,
  value: QuoteShipping | null,
  onChange: (value: QuoteShipping) => void,
): ReactNode {
  switch (choice.kind) {
    case ShippingChoiceKind.CARRIER:
      return (
        <CarrierOption
          key={`${choice.type}-${choice.provider}`}
          choice={choice}
          isChecked={value?.type === choice.type && value.provider === choice.provider}
          onChange={onChange}
        />
      );
    case ShippingChoiceKind.PICKUP_PLACEHOLDER:
      return <PickupOption key={choice.kind} />;
    default:
      return assertNever(choice);
  }
}

/** Props of {@link ShippingChoicesFieldset}. */
export interface ShippingChoicesFieldsetProps {
  readonly choices: readonly ShippingChoice[];
  readonly value: QuoteShipping | null;
  readonly error: string | null;
  readonly onChange: (value: QuoteShipping) => void;
}

/**
 * Shipping choices with their real prices, shared by the checkout and the order edit form.
 *
 * @param props - Choices, selection, error and handler.
 * @returns The fieldset and its error.
 */
export function ShippingChoicesFieldset({
  choices,
  value,
  error,
  onChange,
}: ShippingChoicesFieldsetProps): ReactNode {
  return (
    <>
      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={error ? "shipping-error" : undefined}
      >
        <legend className="mb-2 text-sm font-medium">{CHECKOUT_MESSAGES.shippingLegend}</legend>
        {choices.map((choice) => renderChoice(choice, value, onChange))}
      </fieldset>
      {error && (
        <p id="shipping-error" className="text-sm text-rose">
          {error}
        </p>
      )}
    </>
  );
}

/**
 * Shipping step form.
 *
 * @param props - Choices, selection, error and handlers.
 * @returns The form.
 */
export function ShippingStep({
  choices,
  value,
  error,
  onChange,
  onSubmit,
}: ShippingStepProps): ReactNode {
  if (choices.length === 0) {
    return <p role="alert">{CHECKOUT_MESSAGES.shippingUnavailable}</p>;
  }
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <ShippingChoicesFieldset choices={choices} value={value} error={error} onChange={onChange} />
      <button
        type="submit"
        className="cta-gradient h-11 self-start rounded-button px-6 font-medium"
      >
        {CHECKOUT_MESSAGES.continue}
      </button>
    </form>
  );
}
