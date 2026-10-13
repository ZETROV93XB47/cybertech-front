/**
 * Projection of the backend registration errors onto the form (French messages only: the
 * backend messages are English and never shown).
 *
 * @see specs/001-catalog-auth-cart/contracts/errors.md
 * @see specs/001-catalog-auth-cart/research.md R9
 */
import { ApiError } from "@/lib/api/errors";
import { assertNever } from "@/lib/assert-never";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { RegisterField } from "@/lib/enums/register-field";
import { RegisterStatus } from "@/lib/enums/register-status";
import type { RegisterFieldErrors } from "@/lib/schemas/register";

import { REGISTER_MESSAGES } from "./messages";
import type { RegisterActionState } from "./register-state";

const ERRORS = REGISTER_MESSAGES.errors;

/** French message shown on a field the backend rejected. */
const FIELD_MESSAGES: Readonly<Record<RegisterField, string>> = {
  [RegisterField.EMAIL]: ERRORS.email,
  [RegisterField.FIRST_NAME]: ERRORS.nameLength,
  [RegisterField.LAST_NAME]: ERRORS.nameLength,
  [RegisterField.SEX]: ERRORS.choose,
  [RegisterField.PHONE_NUMBER]: ERRORS.phoneNumber,
  [RegisterField.FAVORITE_COMMUNICATION_CHANNEL]: ERRORS.choose,
  [RegisterField.STREET]: ERRORS.required,
  [RegisterField.CITY]: ERRORS.required,
  [RegisterField.ZIP_CODE]: ERRORS.required,
  [RegisterField.COUNTRY]: ERRORS.required,
  [RegisterField.BIRTH_DATE]: ERRORS.birthDate,
  [RegisterField.PASSWORD]: ERRORS.password,
};

/** Form fields by name, to ignore backend fields the form does not have (bank card…). */
const FIELD_BY_NAME: ReadonlyMap<string, RegisterField> = new Map(
  Object.values(RegisterField).map((field) => [field, field]),
);

/**
 * Maps the backend `fieldErrors` onto the form fields.
 *
 * @param error - `INVALID` error of the backend.
 * @returns The French message per known field.
 */
function backendFieldErrors(error: ApiError): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  for (const { field } of error.fieldErrors ?? []) {
    const key = FIELD_BY_NAME.get(field);
    if (key !== undefined) {
      errors[key] = FIELD_MESSAGES[key];
    }
  }
  return errors;
}

/**
 * Form error of a rate-limited attempt.
 *
 * @param seconds - Delay from `Retry-After`, if known.
 * @returns The message and the delay.
 */
function rateLimited(
  seconds: number | undefined,
): Pick<RegisterActionState, "formError" | "retryAfterSeconds"> {
  return seconds === undefined
    ? { formError: ERRORS.rateLimitedUnknown }
    : { formError: ERRORS.rateLimited(seconds), retryAfterSeconds: seconds };
}

/**
 * Builds the form state of a failed registration.
 *
 * @param error - Error thrown by `registerUser`.
 * @param values - Submitted values, without the password.
 * @returns The state to show.
 */
export function toRegisterFailure(
  error: unknown,
  values: RegisterActionState["values"],
): RegisterActionState {
  const failed = { status: RegisterStatus.ERROR, values, fieldErrors: {} };
  if (!(error instanceof ApiError)) {
    return { ...failed, formError: ERRORS.unknown };
  }
  switch (error.frontCode) {
    case FrontErrorCode.ALREADY_EXISTS:
      return { ...failed, fieldErrors: { [RegisterField.EMAIL]: ERRORS.alreadyExists } };
    case FrontErrorCode.INVALID:
      return { ...failed, fieldErrors: backendFieldErrors(error), formError: ERRORS.form };
    case FrontErrorCode.RATE_LIMITED:
      return { ...failed, ...rateLimited(error.retryAfterSeconds) };
    case FrontErrorCode.UNAVAILABLE:
      return { ...failed, formError: ERRORS.unavailable };
    case FrontErrorCode.UNAUTHENTICATED:
    case FrontErrorCode.FORBIDDEN:
    case FrontErrorCode.NOT_FOUND:
    case FrontErrorCode.INSUFFICIENT_STOCK:
    case FrontErrorCode.CONFLICT:
    case FrontErrorCode.EMPTY_CART:
    case FrontErrorCode.UNKNOWN:
      return { ...failed, formError: ERRORS.unknown };
    default:
      return assertNever(error.frontCode);
  }
}
