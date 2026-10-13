/**
 * Registration form: client and server validation (same schema on both sides) and conversion
 * to the backend `UserCreateRequestDto`.
 *
 * The constraints mirror the backend Bean Validation annotations, so an error is shown on the
 * field before anything is sent (FR-011). The bank card of the DTO is never sent (lot 1).
 *
 * @see specs/001-catalog-auth-cart/data-model.md §2 (RegisterInput)
 * @see UserCreateRequestDto (backend)
 */
import { z } from "zod";

import { REGISTER_MESSAGES } from "@/features/auth/messages";
import {
  BIRTH_DATE_TIME_SUFFIX,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/constants/register";
import { MS_PER_MINUTE } from "@/lib/constants/time";
import { CommunicationChannel } from "@/lib/enums/communication-channel";
import { RegisterField } from "@/lib/enums/register-field";
import { Sex } from "@/lib/enums/sex";

const ERRORS = REGISTER_MESSAGES.errors;

/** Shape of an ISO calendar date, as produced by `<input type="date">`. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Number of characters of an ISO calendar date (`YYYY-MM-DD`). */
const ISO_DATE_LENGTH = 10;

/**
 * Today's date in the visitor's (or server's) time zone, as `YYYY-MM-DD`.
 *
 * @param now - Current instant (injected for tests).
 * @returns The local calendar date.
 */
export function localIsoDate(now: Date = new Date()): string {
  const offsetMs = now.getTimezoneOffset() * MS_PER_MINUTE;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, ISO_DATE_LENGTH);
}

/**
 * Tells whether a birth date is empty (optional) or a real date before today.
 *
 * @param value - Trimmed field value.
 * @returns `true` when the value is acceptable.
 */
function isEmptyOrPastDate(value: string): boolean {
  if (value === "") {
    return true;
  }
  return ISO_DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value)) && value < localIsoDate();
}

/** A trimmed name of 2 to 50 characters. */
const NameSchema = z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH, ERRORS.nameLength)
  .max(NAME_MAX_LENGTH, ERRORS.nameLength);

/** A required free text. */
const RequiredTextSchema = z.string().trim().min(1, ERRORS.required);

/** Registration form, field by field (keys are {@link RegisterField} values). */
export const RegisterInputSchema = z.object({
  [RegisterField.EMAIL]: z.string().trim().pipe(z.email(ERRORS.email)),
  [RegisterField.FIRST_NAME]: NameSchema,
  [RegisterField.LAST_NAME]: NameSchema,
  [RegisterField.SEX]: z.enum(Sex, ERRORS.choose),
  [RegisterField.PHONE_NUMBER]: z.string().trim().min(1, ERRORS.phoneNumber),
  [RegisterField.FAVORITE_COMMUNICATION_CHANNEL]: z.enum(CommunicationChannel, ERRORS.choose),
  [RegisterField.STREET]: RequiredTextSchema,
  [RegisterField.CITY]: RequiredTextSchema,
  [RegisterField.ZIP_CODE]: RequiredTextSchema,
  [RegisterField.COUNTRY]: RequiredTextSchema,
  [RegisterField.BIRTH_DATE]: z
    .string()
    .trim()
    .refine(isEmptyOrPastDate, ERRORS.birthDate)
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
  [RegisterField.PASSWORD]: z.string().min(PASSWORD_MIN_LENGTH, ERRORS.password),
});

/** Validated registration form. */
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

/** Error message per field, as shown under each field. */
export type RegisterFieldErrors = Partial<Record<RegisterField, string>>;

/** `UserCreateRequestDto` as sent by the BFF (no bank card). */
export interface UserCreateRequest {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly sex: Sex;
  readonly phoneNumber: string;
  readonly favoriteCommunicationChanel: CommunicationChannel;
  readonly street: string;
  readonly city: string;
  readonly zipCode: string;
  readonly country: string;
  readonly birthDate?: string;
  readonly password: string;
}

/**
 * Reads the raw form values (strings only; files are ignored).
 *
 * @param formData - Submitted form.
 * @returns The raw values by field name.
 */
export function readRegisterForm(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of Object.values(RegisterField)) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

/**
 * Keeps the first error message of each field.
 *
 * @param error - Zod error of {@link RegisterInputSchema}.
 * @returns The message per field.
 */
export function toRegisterFieldErrors(error: z.ZodError): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const fields: ReadonlyMap<unknown, RegisterField> = new Map(
    Object.values(RegisterField).map((field) => [field, field]),
  );
  for (const issue of error.issues) {
    const field = fields.get(issue.path[0]);
    if (field !== undefined && errors[field] === undefined) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/**
 * Builds the backend body. The birth date becomes a `LocalDateTime` at midnight.
 *
 * @param input - Validated form.
 * @returns The `UserCreateRequestDto` body, without bank card.
 */
export function toUserCreateRequest(input: RegisterInput): UserCreateRequest {
  const { birthDate, ...rest } = input;
  return birthDate ? { ...rest, birthDate: `${birthDate}${BIRTH_DATE_TIME_SUFFIX}` } : rest;
}
