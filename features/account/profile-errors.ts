/**
 * Projection of the backend errors of `PATCH /user/me` onto the profile form (French messages
 * only: the backend messages are English and never shown).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2
 */
import { ApiError } from "@/lib/api/errors";
import { assertNever } from "@/lib/assert-never";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { ProfileField, ProfileStatus } from "@/lib/enums/profile";
import type { ProfileFieldErrors } from "@/lib/schemas/user";

import { PROFILE_MESSAGES } from "./messages";
import type { ProfileActionState } from "./profile-state";

const ERRORS = PROFILE_MESSAGES.errors;

/** French message shown on a field the backend rejected. */
const FIELD_MESSAGES: Readonly<Record<ProfileField, string>> = {
  [ProfileField.FIRST_NAME]: ERRORS.nameLength,
  [ProfileField.LAST_NAME]: ERRORS.nameLength,
  [ProfileField.PHONE_NUMBER]: ERRORS.phoneNumber,
  [ProfileField.STREET]: ERRORS.invalidField,
  [ProfileField.ZIP_CODE]: ERRORS.invalidField,
  [ProfileField.CITY]: ERRORS.invalidField,
  [ProfileField.COUNTRY]: ERRORS.invalidField,
};

/** Form fields by name, to ignore backend fields the form does not have. */
const FIELD_BY_NAME: ReadonlyMap<string, ProfileField> = new Map(
  Object.values(ProfileField).map((field) => [field, field]),
);

/**
 * Maps the backend `fieldErrors` onto the form fields.
 *
 * @param error - `INVALID` error of the backend.
 * @returns The French message per known field.
 */
function backendFieldErrors(error: ApiError): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
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
): Pick<ProfileActionState, "formError" | "retryAfterSeconds"> {
  return seconds === undefined
    ? { formError: ERRORS.rateLimitedUnknown }
    : { formError: ERRORS.rateLimited(seconds), retryAfterSeconds: seconds };
}

/** What a failed update shows, on top of the common error state. */
type ProfileFailureDetails = Partial<
  Pick<ProfileActionState, "formError" | "fieldErrors" | "needsSignIn" | "retryAfterSeconds">
>;

/**
 * Message (and field errors) of a backend refusal.
 *
 * @param error - Backend error.
 * @returns The details to show.
 */
function failureDetails(error: ApiError): ProfileFailureDetails {
  switch (error.frontCode) {
    case FrontErrorCode.INVALID:
      return { fieldErrors: backendFieldErrors(error), formError: ERRORS.form };
    case FrontErrorCode.UNAUTHENTICATED:
      return { formError: ERRORS.sessionExpired, needsSignIn: true };
    case FrontErrorCode.NOT_FOUND:
      return { formError: ERRORS.notFound };
    case FrontErrorCode.RATE_LIMITED:
      return rateLimited(error.retryAfterSeconds);
    case FrontErrorCode.UNAVAILABLE:
      return { formError: ERRORS.unavailable };
    case FrontErrorCode.FORBIDDEN:
    case FrontErrorCode.ALREADY_EXISTS:
    case FrontErrorCode.INSUFFICIENT_STOCK:
    case FrontErrorCode.CONFLICT:
    case FrontErrorCode.EMPTY_CART:
    case FrontErrorCode.UNKNOWN:
    case FrontErrorCode.REVIEW_REJECTED:
    case FrontErrorCode.REVIEW_NOT_ALLOWED:
    case FrontErrorCode.DISCOUNT_INVALID:
    case FrontErrorCode.PAYMENT_FAILED:
    case FrontErrorCode.PAYMENT_ALREADY_COMPLETED:
    case FrontErrorCode.ORDER_LOCKED:
    case FrontErrorCode.REFUND_FAILED:
    case FrontErrorCode.ACCOUNT_INACTIVE:
    case FrontErrorCode.CARD_EXPIRED:
    case FrontErrorCode.NO_SAVED_CARD:
      return { formError: ERRORS.unknown };
    default:
      return assertNever(error.frontCode);
  }
}

/**
 * Builds the form state of a failed profile update.
 *
 * @param error - Error thrown while reading the token or calling the backend.
 * @param values - Submitted values, kept in the form.
 * @param saveCount - Successful saves so far, carried over.
 * @returns The state to show.
 */
export function toProfileFailure(
  error: unknown,
  values: ProfileActionState["values"],
  saveCount: number,
): ProfileActionState {
  const failed = { status: ProfileStatus.ERROR, values, fieldErrors: {}, saveCount };
  if (!(error instanceof ApiError)) {
    return { ...failed, formError: ERRORS.unknown };
  }
  return { ...failed, ...failureDetails(error) };
}
