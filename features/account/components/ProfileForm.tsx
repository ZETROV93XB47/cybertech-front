"use client";

/**
 * « Modifier mes informations » (US4): first name, last name, phone, address.
 *
 * The same Zod schema validates on blur, on submit (no network call while a field is wrong,
 * focus moved to the first invalid field) and in the Server Action. Without JavaScript, the form
 * posts to the Server Action and comes back with the errors and the typed values. After each
 * save the fields are remounted, so the phone field is emptied (never shown back).
 *
 * @see specs/003-account-orders/spec.md US4, FR-028, FR-002
 */
import Link from "next/link";
import { useActionState, useState, type ReactNode, type SyntheticEvent } from "react";

import { loginPath } from "@/lib/auth/callback-url";
import { ACCOUNT_PATHS } from "@/lib/constants/routes";
import { ProfileField, ProfileStatus } from "@/lib/enums/profile";
import {
  ProfileUpdateSchema,
  readProfileForm,
  toProfileFieldErrors,
  type ProfileFieldErrors,
} from "@/lib/schemas/user";

import { updateProfile } from "../actions";
import { PROFILE_MESSAGES } from "../messages";
import { INITIAL_PROFILE_STATE, type ProfileActionState } from "../profile-state";
import type { ProfileView } from "../profile-view";

import { ProfileFieldset } from "./ProfileFieldset";

/** Client errors, tied to the server state they were computed against. */
interface ClientErrors {
  readonly forState: ProfileActionState;
  readonly errors: ProfileFieldErrors;
}

/**
 * Validates the whole form as it is now.
 *
 * @param form - The form element.
 * @returns The message per invalid field.
 */
function validate(form: HTMLFormElement): ProfileFieldErrors {
  const parsed = ProfileUpdateSchema.safeParse(readProfileForm(new FormData(form)));
  return parsed.success ? {} : toProfileFieldErrors(parsed.error);
}

/**
 * Moves the focus to the first invalid field, in the order of the form.
 *
 * @param form - The form element.
 * @param errors - Invalid fields.
 */
function focusFirstInvalid(form: HTMLFormElement, errors: ProfileFieldErrors): void {
  const invalid = new Set<string>(
    Object.values(ProfileField).filter((field) => errors[field] !== undefined),
  );
  const first = Array.from(form.elements).find(
    (element) => element instanceof HTMLInputElement && invalid.has(element.name),
  );
  if (first instanceof HTMLElement) {
    first.focus();
  }
}

/**
 * Values shown before any submission: the profile, phone empty.
 *
 * @param view - Displayed profile.
 * @returns The value per field.
 */
function initialValues(view: ProfileView): Partial<Record<ProfileField, string>> {
  return {
    [ProfileField.FIRST_NAME]: view.firstName,
    [ProfileField.LAST_NAME]: view.lastName,
    [ProfileField.STREET]: view.address.street,
    [ProfileField.ZIP_CODE]: view.address.zipCode,
    [ProfileField.CITY]: view.address.city,
    [ProfileField.COUNTRY]: view.address.country,
  };
}

/**
 * Form feedback: the error (with a sign-in link after a session expiry) or the confirmation,
 * in live regions so both are announced.
 *
 * @param props - Current state.
 * @returns The messages.
 */
function ProfileFeedback({ state }: { readonly state: ProfileActionState }): ReactNode {
  return (
    <>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-success">
        {state.status === ProfileStatus.SUCCESS ? PROFILE_MESSAGES.success : ""}
      </p>
      {state.formError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-rose">
          <p>{state.formError}</p>
          {state.needsSignIn && (
            <Link href={loginPath(ACCOUNT_PATHS.profile)} className="text-brand-text underline">
              {PROFILE_MESSAGES.errors.signInAgain}
            </Link>
          )}
        </div>
      )}
    </>
  );
}

/** Props of {@link ProfileForm}. */
export interface ProfileFormProps {
  readonly view: ProfileView;
}

/**
 * Profile form.
 *
 * @param props - Displayed profile, to prefill the fields.
 * @returns The form.
 */
export function ProfileForm({ view }: ProfileFormProps): ReactNode {
  const [state, formAction, pending] = useActionState(updateProfile, INITIAL_PROFILE_STATE);
  const [client, setClient] = useState<ClientErrors>({ forState: state, errors: {} });
  const clientErrors = client.forState === state ? client.errors : {};
  const errors: ProfileFieldErrors = { ...state.fieldErrors, ...clientErrors };
  const values = state.status === ProfileStatus.IDLE ? initialValues(view) : state.values;
  const onBlurField = (form: HTMLFormElement | null, field: ProfileField): void => {
    if (form) {
      setClient({ forState: state, errors: { ...clientErrors, [field]: validate(form)[field] } });
    }
  };
  const onSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    const found = validate(event.currentTarget);
    setClient({ forState: state, errors: found });
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      focusFirstInvalid(event.currentTarget, found);
    }
  };
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <ProfileFieldset
        key={state.saveCount}
        errors={errors}
        values={values}
        onBlurField={onBlurField}
      />
      <ProfileFeedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="cta-gradient inline-flex h-11 items-center justify-center self-start rounded-button px-8 font-medium disabled:opacity-60"
      >
        {pending ? PROFILE_MESSAGES.submitting : PROFILE_MESSAGES.submit}
      </button>
    </form>
  );
}
