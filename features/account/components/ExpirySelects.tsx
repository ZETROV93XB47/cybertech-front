"use client";

/**
 * Expiry of a card as two dropdown lists, month (`01`–`12`) and year (4 digits), grouped in a
 * fieldset whose error is linked to it. The lists follow the site dropdown rule (they look and
 * open like the « Catalogue » menu) and post their value through a hidden input, with a native
 * select without JavaScript, so the update form keeps working without JavaScript; the forms
 * assemble `MM/YYYY` (data-model §3).
 *
 * @see specs/003-account-orders/spec.md FR-031
 * @see components/dropdown/ListboxSelect.tsx
 */
import type { ReactNode } from "react";

import { ListboxSelect } from "@/components/dropdown/ListboxSelect";

import { BankCardField } from "@/lib/enums/bank-card";

import { CARD_MESSAGES } from "../messages";

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
 * One labelled list.
 *
 * @param props - Id, field, label, options, value, invalid state and change handler.
 * @returns The list with its label.
 */
function ExpirySelect({
  id,
  field,
  label,
  options,
  value,
  isInvalid,
  onChange,
}: {
  readonly id: string;
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
          onValueChange: (next: string): void => {
            onChange(field, next);
          },
        };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-text-muted">
        {label}
      </label>
      <ListboxSelect
        id={id}
        name={field}
        label={label}
        options={options.map((option) => ({ value: option, label: option }))}
        placeholder={CARD_MESSAGES.selectPlaceholder}
        isInvalid={isInvalid}
        {...binding}
      />
    </div>
  );
}

/**
 * Month and year lists.
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
        id={`${idPrefix}-${BankCardField.EXPIRY_MONTH}`}
        field={BankCardField.EXPIRY_MONTH}
        label={CARD_MESSAGES.fields.expiryMonth}
        options={months}
        value={month}
        isInvalid={isInvalid}
        onChange={onChange}
      />
      <ExpirySelect
        id={`${idPrefix}-${BankCardField.EXPIRY_YEAR}`}
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
