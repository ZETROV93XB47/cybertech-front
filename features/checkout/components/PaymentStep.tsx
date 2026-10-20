"use client";

/**
 * Payment step of the checkout: the four methods accepted by the backend (type recorded on the
 * order), the saved card that will be charged, and no card number field (constitution V).
 *
 * @see specs/003-account-orders/spec.md FR-009, FR-032
 */
import { CreditCard } from "lucide-react";
import type { ReactNode } from "react";

import { PaymentType } from "@/lib/enums/order";

import { CHECKOUT_MESSAGES } from "../messages";
import type { SavedCard } from "../saved-card";

import { SavedCardPanel } from "./SavedCardPanel";

/** Name shared by the radio buttons of the step. */
const RADIO_NAME = "payment";

/** Props of {@link PaymentStep}. */
export interface PaymentStepProps {
  /** Card that will be charged, or its absence. */
  readonly savedCard: SavedCard;
  readonly value: PaymentType | null;
  readonly error: string | null;
  readonly onChange: (value: PaymentType) => void;
  readonly onSubmit: () => void;
}

/** Props of {@link PaymentMethodsFieldset}. */
export interface PaymentMethodsFieldsetProps {
  readonly value: PaymentType | null;
  /** Id of the element describing the choice (hint or error). */
  readonly describedBy: string;
  readonly onChange: (value: PaymentType) => void;
}

/**
 * The four payment methods, shared by the checkout and the order edit form.
 *
 * @param props - Selection, description and handler.
 * @returns The fieldset.
 */
export function PaymentMethodsFieldset({
  value,
  describedBy,
  onChange,
}: PaymentMethodsFieldsetProps): ReactNode {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2" aria-describedby={describedBy}>
      <legend className="mb-2 text-sm font-medium">{CHECKOUT_MESSAGES.paymentLegend}</legend>
      {Object.values(PaymentType).map((type) => (
        <label
          key={type}
          className="flex cursor-pointer items-center gap-3 rounded-card border border-border p-4 transition-colors duration-(--duration-fast) has-checked:border-brand-text"
        >
          <input
            type="radio"
            name={RADIO_NAME}
            className="accent-brand"
            checked={value === type}
            onChange={() => {
              onChange(type);
            }}
          />
          <CreditCard aria-hidden className="size-5 text-brand-text" />
          <span className="text-sm font-medium">{CHECKOUT_MESSAGES.paymentLabels[type]}</span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Payment step form.
 *
 * @param props - Selection, error and handlers.
 * @returns The form.
 */
export function PaymentStep({
  savedCard,
  value,
  error,
  onChange,
  onSubmit,
}: PaymentStepProps): ReactNode {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <PaymentMethodsFieldset
        value={value}
        describedBy={error ? "payment-error" : "payment-hint"}
        onChange={onChange}
      />
      <SavedCardPanel card={savedCard} />
      <p id="payment-hint" className="text-xs text-text-muted">
        {CHECKOUT_MESSAGES.paymentTest}
      </p>
      {error && (
        <p id="payment-error" className="text-sm text-rose">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="cta-gradient h-11 self-start rounded-button px-6 font-medium"
      >
        {CHECKOUT_MESSAGES.continue}
      </button>
    </form>
  );
}
