"use client";

/**
 * Fields of the registration form, grouped in four sections (identity, contact, address,
 * password), with browser autofill hints.
 */
import type { ReactNode } from "react";

import { CommunicationChannel } from "@/lib/enums/communication-channel";
import { RegisterField } from "@/lib/enums/register-field";
import { Sex } from "@/lib/enums/sex";
import type { RegisterFieldErrors } from "@/lib/schemas/register";

import { REGISTER_MESSAGES } from "../messages";
import type { RegisterActionState } from "../register-state";

import { RadioField, SelectField, TextField, type ChoiceOption } from "./RegisterFields";

const LABELS = REGISTER_MESSAGES.labels;

/** Choices of the sex field. */
const SEX_OPTIONS: readonly ChoiceOption[] = [
  { value: Sex.F, label: LABELS.sexFemale },
  { value: Sex.M, label: LABELS.sexMale },
];

/** Choices of the preferred communication channel. */
const CHANNEL_OPTIONS: readonly ChoiceOption[] = [
  { value: CommunicationChannel.EMAIL, label: LABELS.channelEmail },
  { value: CommunicationChannel.SMS, label: LABELS.channelSms },
  { value: CommunicationChannel.PUSH_NOTIFICATION, label: LABELS.channelPush },
];

/** Props of {@link RegisterFieldset}. */
export interface RegisterFieldsetProps {
  readonly errors: RegisterFieldErrors;
  readonly values: RegisterActionState["values"];
  readonly onBlurField: (form: HTMLFormElement | null, field: RegisterField) => void;
}

/**
 * One titled section of the form.
 *
 * @param props - Title and fields.
 * @returns The section.
 */
function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <fieldset className="glass grid gap-5 rounded-card p-6 md:grid-cols-2">
      <legend className="px-2 font-display text-lg">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Every field of the registration form.
 *
 * @param props - Errors, values to refill and blur handler.
 * @returns The four sections.
 */
export function RegisterFieldset({
  errors,
  values,
  onBlurField,
}: RegisterFieldsetProps): ReactNode {
  const common = (name: RegisterField) => ({
    name,
    label: LABELS[name],
    error: errors[name],
    defaultValue: values[name],
    onBlur: onBlurField,
  });
  return (
    <>
      <Section title={REGISTER_MESSAGES.identitySection}>
        <TextField {...common(RegisterField.FIRST_NAME)} autoComplete="given-name" />
        <TextField {...common(RegisterField.LAST_NAME)} autoComplete="family-name" />
        <RadioField {...common(RegisterField.SEX)} options={SEX_OPTIONS} />
        <TextField {...common(RegisterField.BIRTH_DATE)} type="date" autoComplete="bday" />
      </Section>
      <Section title={REGISTER_MESSAGES.contactSection}>
        <TextField {...common(RegisterField.EMAIL)} type="email" autoComplete="email" />
        <TextField {...common(RegisterField.PHONE_NUMBER)} type="tel" autoComplete="tel" />
        <SelectField
          {...common(RegisterField.FAVORITE_COMMUNICATION_CHANNEL)}
          options={CHANNEL_OPTIONS}
          placeholder={REGISTER_MESSAGES.channelPlaceholder}
        />
      </Section>
      <Section title={REGISTER_MESSAGES.addressSection}>
        <TextField
          {...common(RegisterField.STREET)}
          autoComplete="street-address"
          className="md:col-span-2"
        />
        <TextField {...common(RegisterField.ZIP_CODE)} autoComplete="postal-code" />
        <TextField {...common(RegisterField.CITY)} autoComplete="address-level2" />
        <TextField {...common(RegisterField.COUNTRY)} autoComplete="country-name" />
      </Section>
      <Section title={REGISTER_MESSAGES.securitySection}>
        <TextField
          {...common(RegisterField.PASSWORD)}
          type="password"
          autoComplete="new-password"
          hint={REGISTER_MESSAGES.passwordHint}
        />
      </Section>
    </>
  );
}
