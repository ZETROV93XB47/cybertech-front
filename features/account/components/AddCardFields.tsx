"use client";

/**
 * Fields of « Ajouter une carte »: holder, number (digits only, shown in groups of four,
 * `inputMode="numeric"`, `autoComplete="off"`), expiry lists and the network list, which
 * follows the number until the customer changes it. Controlled by `useAddCard`: the number is
 * never in a `name`d field, so it is never posted by the browser on its own.
 *
 * @see specs/003-account-orders/spec.md US5 scenarios 5 and 6, FR-032
 */
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { z } from "zod";

import { ListboxSelect } from "@/components/dropdown/ListboxSelect";
import { Input } from "@/components/ui/input";
import { BankCardField, BankCardType } from "@/lib/enums/bank-card";

import { type AddCardValues, withDigits } from "../add-card-form";
import { cardDigits, formatCardDigits } from "../card-network";
import type { CardFieldErrors } from "../card-state";
import { CARD_MESSAGES } from "../messages";

import { CardFieldShell } from "./CardFieldShell";
import { ExpirySelects } from "./ExpirySelects";

/** Prefix of the ids of this form. */
const ID_PREFIX = "card-add";

/** Networks offered by the list, in the enum order, with their names. */
const NETWORK_OPTIONS = Object.values(BankCardType).map((type) => ({
  value: type,
  label: CARD_MESSAGES.networks[type],
}));

/** Value of the network select, read back as the enum. */
const NetworkSchema = z.enum(BankCardType);

/** Props of {@link AddCardFields}. */
export interface AddCardFieldsProps {
  readonly values: AddCardValues;
  readonly setValues: Dispatch<SetStateAction<AddCardValues>>;
  readonly errors: CardFieldErrors;
  readonly months: readonly string[];
  readonly years: readonly string[];
}

/**
 * Network list.
 *
 * @param props - Current network and its setter.
 * @returns The labelled select.
 */
function NetworkSelect({
  values,
  setValues,
}: Pick<AddCardFieldsProps, "values" | "setValues">): ReactNode {
  return (
    <CardFieldShell
      id={`${ID_PREFIX}-network`}
      label={CARD_MESSAGES.fields.network}
      hint={CARD_MESSAGES.networkHint}
      error={undefined}
    >
      {(control) => (
        <ListboxSelect
          id={control.id}
          label={CARD_MESSAGES.fields.network}
          options={NETWORK_OPTIONS}
          value={values.network}
          isInvalid={control["aria-invalid"]}
          describedBy={control["aria-describedby"]}
          onValueChange={(next) => {
            const parsed = NetworkSchema.safeParse(next);
            const network = parsed.success ? parsed.data : BankCardType.OTHER;
            setValues((current) => ({ ...current, network, isNetworkChosen: true }));
          }}
        />
      )}
    </CardFieldShell>
  );
}

/**
 * The add form fields.
 *
 * @param props - Values, setter, errors and expiry options.
 * @returns The fields.
 */
export function AddCardFields({
  values,
  setValues,
  errors,
  months,
  years,
}: AddCardFieldsProps): ReactNode {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <CardFieldShell
        id={`${ID_PREFIX}-holder`}
        label={CARD_MESSAGES.fields.holder}
        error={errors[BankCardField.CARD_HOLDER_NAME]}
        className="sm:col-span-2"
      >
        {(control) => (
          <Input
            {...control}
            autoComplete="cc-name"
            value={values.holder}
            onChange={(event) => {
              setValues((current) => ({ ...current, holder: event.target.value }));
            }}
          />
        )}
      </CardFieldShell>
      <CardFieldShell
        id={`${ID_PREFIX}-number`}
        label={CARD_MESSAGES.fields.number}
        hint={CARD_MESSAGES.numberHint}
        error={errors[BankCardField.CARD_NUMBER]}
        className="sm:col-span-2"
      >
        {(control) => (
          <Input
            {...control}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={formatCardDigits(values.digits)}
            onChange={(event) => {
              const digits = cardDigits(event.target.value);
              setValues((current) => withDigits(current, digits));
            }}
            className="font-mono tracking-wider"
          />
        )}
      </CardFieldShell>
      {/* Full row: month and year side by side, then the network below. */}
      <div className="sm:col-span-2">
        <ExpirySelects
          idPrefix={ID_PREFIX}
          months={months}
          years={years}
          month={values.expiryMonth}
          year={values.expiryYear}
          error={errors[BankCardField.EXPIRY_MONTH]}
          onChange={(field, value) => {
            setValues((current) => ({
              ...current,
              ...(field === BankCardField.EXPIRY_MONTH
                ? { expiryMonth: value }
                : { expiryYear: value }),
            }));
          }}
        />
      </div>
      <NetworkSelect values={values} setValues={setValues} />
    </div>
  );
}
