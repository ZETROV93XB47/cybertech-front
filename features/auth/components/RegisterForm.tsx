"use client";

/**
 * Registration form (US2).
 *
 * The same Zod schema validates on blur, on submit (no network call while a field is wrong,
 * focus moved to the first invalid field) and in the Server Action. Without JavaScript, the form
 * posts to the Server Action and the page comes back with the errors and the typed values (except
 * the password).
 *
 * @see specs/001-catalog-auth-cart/spec.md US2, FR-011 to FR-014
 */
import Link from "next/link";
import { useActionState, useState, type ReactNode, type SyntheticEvent } from "react";

import { loginPath } from "@/lib/auth/callback-url";
import { HOME_PATH } from "@/lib/constants/routes";
import { RegisterField } from "@/lib/enums/register-field";
import { RegisterStatus } from "@/lib/enums/register-status";
import {
  RegisterInputSchema,
  readRegisterForm,
  toRegisterFieldErrors,
  type RegisterFieldErrors,
} from "@/lib/schemas/register";

import { registerUserAction } from "../actions";
import { AUTH_MESSAGES, REGISTER_MESSAGES } from "../messages";
import { INITIAL_REGISTER_STATE, type RegisterActionState } from "../register-state";

import { RegisterFieldset } from "./RegisterFieldset";

/** Client errors, tied to the server state they were computed against. */
interface ClientErrors {
  readonly forState: RegisterActionState;
  readonly errors: RegisterFieldErrors;
}

/**
 * Validates the whole form as it is now.
 *
 * @param form - The form element.
 * @returns The message per invalid field.
 */
function validate(form: HTMLFormElement): RegisterFieldErrors {
  const parsed = RegisterInputSchema.safeParse(readRegisterForm(new FormData(form)));
  return parsed.success ? {} : toRegisterFieldErrors(parsed.error);
}

/**
 * Moves the focus to the first invalid field, in the visual order of the form (DOM order).
 *
 * @param form - The form element.
 * @param errors - Invalid fields.
 */
function focusFirstInvalid(form: HTMLFormElement, errors: RegisterFieldErrors): void {
  const invalid = new Set<string>(
    Object.values(RegisterField).filter((field) => errors[field] !== undefined),
  );
  const first = Array.from(form.elements).find(
    (element) =>
      (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) &&
      invalid.has(element.name),
  );
  if (first instanceof HTMLElement) {
    first.focus();
  }
}

/**
 * Success panel: the account exists, the visitor is invited to sign in (FR-014).
 *
 * @param props - Email of the new account.
 * @returns The panel.
 */
function RegisterSuccess({ email }: { readonly email: string }): ReactNode {
  return (
    <div role="status" className="glass flex flex-col gap-4 rounded-card p-8">
      <h2 className="text-2xl">{REGISTER_MESSAGES.successTitle}</h2>
      <p className="text-text-muted">{REGISTER_MESSAGES.successBody(email)}</p>
      <Link
        href={loginPath(HOME_PATH)}
        className="cta-gradient inline-flex h-11 items-center justify-center self-start rounded-button px-6 font-medium"
      >
        {AUTH_MESSAGES.signIn}
      </Link>
    </div>
  );
}

/**
 * Registration form.
 *
 * @returns The form, or the success panel once the account is created.
 */
export function RegisterForm(): ReactNode {
  const [state, formAction, pending] = useActionState(registerUserAction, INITIAL_REGISTER_STATE);
  const [client, setClient] = useState<ClientErrors>({ forState: state, errors: {} });
  if (state.status === RegisterStatus.SUCCESS && state.email) {
    return <RegisterSuccess email={state.email} />;
  }
  const clientErrors = client.forState === state ? client.errors : {};
  const errors: RegisterFieldErrors = { ...state.fieldErrors, ...clientErrors };
  const onBlurField = (form: HTMLFormElement | null, field: RegisterField): void => {
    if (!form) {
      return;
    }
    const message = validate(form)[field];
    const next: RegisterFieldErrors = { ...clientErrors, [field]: message };
    setClient({ forState: state, errors: next });
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
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      {state.formError && (
        <p role="alert" className="text-rose">
          {state.formError}
        </p>
      )}
      <RegisterFieldset errors={errors} values={state.values} onBlurField={onBlurField} />
      <button
        type="submit"
        disabled={pending}
        className="cta-gradient inline-flex h-11 items-center justify-center self-start rounded-button px-8 font-medium disabled:opacity-60"
      >
        {pending ? REGISTER_MESSAGES.submitting : REGISTER_MESSAGES.submit}
      </button>
    </form>
  );
}
