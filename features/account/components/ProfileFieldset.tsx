"use client";

/**
 * Fields of the profile form, grouped in three sections (identity, contact, address), with
 * browser autofill hints. The phone field always starts empty: the backend never returns the
 * number, a typed one replaces the stored one (US4 scenario 5).
 *
 * @see specs/003-account-orders/spec.md US4, FR-028
 */
import type { ReactNode } from "react";

import { ProfileField } from "@/lib/enums/profile";
import type { ProfileFieldErrors } from "@/lib/schemas/user";

import { PROFILE_MESSAGES } from "../messages";

import { ProfileTextField } from "./ProfileTextField";

const LABELS = PROFILE_MESSAGES.labels;

/** Browser autofill token of each field. */
const AUTOCOMPLETE: Readonly<Record<ProfileField, string>> = {
  [ProfileField.FIRST_NAME]: "given-name",
  [ProfileField.LAST_NAME]: "family-name",
  [ProfileField.PHONE_NUMBER]: "tel",
  [ProfileField.STREET]: "street-address",
  [ProfileField.ZIP_CODE]: "postal-code",
  [ProfileField.CITY]: "address-level2",
  [ProfileField.COUNTRY]: "country-name",
};

/** Props of {@link ProfileFieldset}. */
export interface ProfileFieldsetProps {
  readonly errors: ProfileFieldErrors;
  readonly values: Readonly<Partial<Record<ProfileField, string>>>;
  readonly onBlurField: (form: HTMLFormElement | null, field: ProfileField) => void;
}

/**
 * One titled section of the form.
 *
 * @param props - Legend and fields.
 * @returns The section.
 */
function Section({
  legend,
  children,
}: {
  readonly legend: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <fieldset className="grid gap-5 md:grid-cols-2">
      <legend className="mb-3 font-display text-base text-text-muted">{legend}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Every field of the profile form.
 *
 * @param props - Errors, values to show and blur handler.
 * @returns The three sections.
 */
export function ProfileFieldset({ errors, values, onBlurField }: ProfileFieldsetProps): ReactNode {
  const common = (name: ProfileField) => ({
    name,
    label: LABELS[name],
    error: errors[name],
    defaultValue: values[name],
    autoComplete: AUTOCOMPLETE[name],
    onBlur: onBlurField,
  });
  return (
    <div className="flex flex-col gap-8">
      <Section legend={PROFILE_MESSAGES.identityLegend}>
        <ProfileTextField {...common(ProfileField.FIRST_NAME)} />
        <ProfileTextField {...common(ProfileField.LAST_NAME)} />
      </Section>
      <Section legend={PROFILE_MESSAGES.contactLegend}>
        <ProfileTextField
          {...common(ProfileField.PHONE_NUMBER)}
          type="tel"
          hint={PROFILE_MESSAGES.phoneHint}
          className="md:col-span-2"
        />
      </Section>
      <Section legend={PROFILE_MESSAGES.addressLegend}>
        <p className="text-xs text-text-muted md:col-span-2">{PROFILE_MESSAGES.addressHint}</p>
        <ProfileTextField {...common(ProfileField.STREET)} className="md:col-span-2" />
        <ProfileTextField {...common(ProfileField.ZIP_CODE)} />
        <ProfileTextField {...common(ProfileField.CITY)} />
        <ProfileTextField {...common(ProfileField.COUNTRY)} className="md:col-span-2" />
      </Section>
    </div>
  );
}
