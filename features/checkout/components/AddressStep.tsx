"use client";

/**
 * Address step of the checkout: the four fields required by the backend (`@NotBlank`),
 * prefilled from the profile, each error written under its field and linked to it.
 *
 * @see specs/003-account-orders/spec.md FR-007
 */
import type { ReactNode, SyntheticEvent } from "react";

import { Input } from "@/components/ui/input";
import type { ParsedAddress } from "@/lib/address";
import { AddressField } from "@/lib/enums/checkout-step-state";

import type { AddressErrors } from "../address-form";
import { CHECKOUT_MESSAGES } from "../messages";

/** Browser autofill token of each field. */
const AUTOCOMPLETE: Readonly<Record<AddressField, string>> = {
  [AddressField.STREET]: "shipping street-address",
  [AddressField.ZIP_CODE]: "shipping postal-code",
  [AddressField.CITY]: "shipping address-level2",
  [AddressField.COUNTRY]: "shipping country-name",
};

/** Props of {@link AddressStep}. */
export interface AddressStepProps {
  readonly value: ParsedAddress;
  readonly errors: AddressErrors;
  /** Notice shown above the fields (address reprefilled after a re-login). */
  readonly notice: string | null;
  readonly onChange: (field: AddressField, value: string) => void;
  readonly onSubmit: () => void;
}

/**
 * One labelled field.
 *
 * @param props - Field, value, error and change handler.
 * @returns The field.
 */
function AddressInput({
  field,
  value,
  error,
  onChange,
}: {
  readonly field: AddressField;
  readonly value: string;
  readonly error: string | undefined;
  readonly onChange: (field: AddressField, value: string) => void;
}): ReactNode {
  const id = `address-${field}`;
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {CHECKOUT_MESSAGES.addressFields[field]}
      </label>
      <Input
        id={id}
        name={field}
        value={value}
        autoComplete={AUTOCOMPLETE[field]}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          onChange(field, event.currentTarget.value);
        }}
      />
      {error && (
        <p id={errorId} className="text-sm text-rose">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Address step form.
 *
 * @param props - Values, errors, notice and handlers.
 * @returns The form.
 */
export function AddressStep({
  value,
  errors,
  notice,
  onChange,
  onSubmit,
}: AddressStepProps): ReactNode {
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {notice && (
        <p role="status" className="rounded-card border border-gold p-3 text-sm">
          {notice}
        </p>
      )}
      <p className="text-sm text-text-muted">{CHECKOUT_MESSAGES.addressHint}</p>
      <AddressInput
        field={AddressField.STREET}
        value={value.street}
        error={errors.street}
        onChange={onChange}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <AddressInput
          field={AddressField.ZIP_CODE}
          value={value.zipCode}
          error={errors.zipCode}
          onChange={onChange}
        />
        <div className="sm:col-span-2">
          <AddressInput
            field={AddressField.CITY}
            value={value.city}
            error={errors.city}
            onChange={onChange}
          />
        </div>
      </div>
      <AddressInput
        field={AddressField.COUNTRY}
        value={value.country}
        error={errors.country}
        onChange={onChange}
      />
      <button
        type="submit"
        className="cta-gradient h-11 self-start rounded-button px-6 font-medium"
      >
        {CHECKOUT_MESSAGES.continue}
      </button>
    </form>
  );
}
