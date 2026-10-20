/**
 * Expiry of a card as two native selects, month (`01`–`12`) and year (4 digits), grouped in a
 * fieldset whose error is linked to it. Native selects post with the form, so the update form
 * also works without JavaScript; the forms assemble `MM/YYYY` (data-model §3).
 *
 * @see specs/003-account-orders/spec.md FR-031
 */
import type { ReactNode } from "react";

import { BankCardField } from "@/lib/enums/bank-card";

import { CARD_MESSAGES } from "../messages";

/** Style of a native select, aligned on the inputs of the forms. */
export const SELECT_CLASS =
  "h-10 w-full rounded-field border border-border bg-surface px-3 text-sm text-text transition-colors duration-(--duration-fast) focus-visible:border-brand-text focus-visible:outline-none aria-invalid:border-rose";

/** Props of {@link ExpirySelects}. */
export interface ExpirySelectsProps {
  /** Prefix of the ids, unique per form. */
  readonly idPrefix: string;
  readonly months: readonly string[];
  readonly years: readonly string[];
  /** Month and year: controlled when `onChange` is given, initial values otherwise. */
  readonly month: string;
  readonly year: string;
  readonly error: string | undefined;
  readonly onChange?: (field: BankCardField, value: string) => void;
}

/**
 * One labelled select.
 *
 * @param props - Field, label, options, value, invalid state and change handler.
 * @returns The select with its label.
 */
function ExpirySelect({
  field,
  label,
  options,
  value,
  isInvalid,
  onChange,
}: {
  readonly field: BankCardField;
  readonly label: string;
  readonly options: readonly string[];
  readonly value: string;
  readonly isInvalid: boolean;
  readonly onChange: ExpirySelectsProps["onChange"];
}): ReactNode {
  const binding =
    onChange === undefined
      ? { defaultValue: value }
      : {
          value,
          onChange: (event: { readonly target: { readonly value: string } }): void => {
            onChange(field, event.target.value);
          },
        };
  return (
    <label className="flex flex-col gap-1 text-xs text-text-muted">
      {label}
      <select
        name={field}
        className={SELECT_CLASS}
        aria-invalid={isInvalid ? true : undefined}
        {...binding}
      >
        <option value="">{CARD_MESSAGES.selectPlaceholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Month and year selects.
 *
 * @param props - Options, values, error and change handler.
 * @returns The fieldset.
 */
export function ExpirySelects(props: ExpirySelectsProps): ReactNode {
  const { idPrefix, months, years, month, year, error, onChange } = props;
  const errorId = `${idPrefix}-expiry-error`;
  const isInvalid = error !== undefined;
  return (
    <fieldset className="grid grid-cols-2 gap-3" aria-describedby={isInvalid ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium">{CARD_MESSAGES.expiryLegend}</legend>
      <ExpirySelect
        field={BankCardField.EXPIRY_MONTH}
        label={CARD_MESSAGES.fields.expiryMonth}
        options={months}
        value={month}
        isInvalid={isInvalid}
        onChange={onChange}
      />
      <ExpirySelect
        field={BankCardField.EXPIRY_YEAR}
        label={CARD_MESSAGES.fields.expiryYear}
        options={years}
        value={year}
        isInvalid={isInvalid}
        onChange={onChange}
      />
      {isInvalid && (
        <p id={errorId} className="col-span-2 text-sm text-rose">
          {error}
        </p>
      )}
    </fieldset>
  );
}
