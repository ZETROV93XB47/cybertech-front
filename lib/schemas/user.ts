/**
 * Profile of the signed-in user (`UserResponseDto` from `GET /user/me`).
 *
 * Only the fields lot 1 displays are validated and kept; Zod strips the others (address, phone,
 * birth date…), so the front neither depends on their format nor keeps personal data it does not
 * need (constitution IV).
 *
 * Also holds the « Mon profil » form schema (feature 003 US4), whose constraints mirror the
 * Bean Validation of `UserSelfUpdateRequestDto`.
 *
 * @see specs/001-catalog-auth-cart/data-model.md §1 (CurrentUser)
 * @see specs/003-account-orders/data-model.md §2.5
 * @see docs/backend/api-map.md D.3, D.20
 */
import { z } from "zod";

import { PROFILE_MESSAGES } from "@/features/account/messages";
import {
  ADDRESS_FIELD_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PHONE_PATTERN,
} from "@/lib/constants/account";
import { ProfileField } from "@/lib/enums/profile";

/** `UserResponseDto`, reduced to what the welcome message needs. */
export const CurrentUserSchema = z.object({
  uuid: z.uuid(),
  email: z.email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

/** The signed-in user. */
export type CurrentUser = z.infer<typeof CurrentUserSchema>;

/**
 * `UserResponseDto` for the profile page and the checkout prefill (feature 003): adds the user
 * name and the one-line address (`"street, zip city, country"`, split by `parseFlatAddress`).
 * The phone is never returned by the backend.
 *
 * @see specs/003-account-orders/data-model.md §2.5
 */
export const UserProfileSchema = CurrentUserSchema.extend({
  username: z.string().min(1),
  address: z.string().nullable().optional(),
});

/** Profile of the signed-in user. */
export type UserProfile = z.infer<typeof UserProfileSchema>;

const PROFILE_ERRORS = PROFILE_MESSAGES.errors;

/** A trimmed first or last name of 2 to 50 characters (`@Size` of the backend). */
const ProfileNameSchema = z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH, PROFILE_ERRORS.nameLength)
  .max(NAME_MAX_LENGTH, PROFILE_ERRORS.nameLength);

/**
 * An optional free text: an empty value is omitted (partial update, the stored value is kept).
 */
const OptionalTextSchema = z
  .string()
  .trim()
  .max(ADDRESS_FIELD_MAX_LENGTH, PROFILE_ERRORS.fieldTooLong(ADDRESS_FIELD_MAX_LENGTH))
  .transform((value) => (value === "" ? undefined : value));

/** An optional phone number: empty → omitted (the stored number is kept). */
const OptionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || PHONE_PATTERN.test(value), PROFILE_ERRORS.phoneNumber)
  .transform((value) => (value === "" ? undefined : value));

/**
 * Profile form, field by field (keys are {@link ProfileField} values), turned into the
 * `UserSelfUpdateRequestDto` body of `PATCH /user/me`: names always sent, phone and address
 * fields only when typed (the backend leaves `null` fields untouched).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2
 * @see UserSelfUpdateRequestDto (backend)
 */
export const ProfileUpdateSchema = z.object({
  [ProfileField.FIRST_NAME]: ProfileNameSchema,
  [ProfileField.LAST_NAME]: ProfileNameSchema,
  [ProfileField.PHONE_NUMBER]: OptionalPhoneSchema,
  [ProfileField.STREET]: OptionalTextSchema,
  [ProfileField.ZIP_CODE]: OptionalTextSchema,
  [ProfileField.CITY]: OptionalTextSchema,
  [ProfileField.COUNTRY]: OptionalTextSchema,
});

/** Validated profile update; absent keys are not sent. */
export type ProfileUpdate = z.output<typeof ProfileUpdateSchema>;

/** French message per invalid field. */
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

/**
 * Reads the profile fields of a submitted form (a missing field reads as empty).
 *
 * @param formData - Submitted form.
 * @returns The raw value per field.
 */
export function readProfileForm(formData: FormData): Record<ProfileField, string> {
  const values = {} as Record<ProfileField, string>;
  for (const field of Object.values(ProfileField)) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

/**
 * Keeps the first error message of each field.
 *
 * @param error - Zod error of {@link ProfileUpdateSchema}.
 * @returns The message per field.
 */
export function toProfileFieldErrors(error: z.ZodError): ProfileFieldErrors {
  const fields: ReadonlyMap<unknown, ProfileField> = new Map(
    Object.values(ProfileField).map((field) => [field, field]),
  );
  const errors: ProfileFieldErrors = {};
  for (const issue of error.issues) {
    const field = fields.get(issue.path[0]);
    if (field !== undefined && errors[field] === undefined) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/**
 * Builds the `PATCH /user/me` body without the omitted (empty) fields, so a cleared field never
 * overwrites a stored value with `null` or `""`.
 *
 * @param update - Validated form.
 * @returns The body.
 */
export function toUserSelfUpdateBody(update: ProfileUpdate): Partial<Record<ProfileField, string>> {
  const body: Partial<Record<ProfileField, string>> = {};
  for (const field of Object.values(ProfileField)) {
    const value = update[field];
    if (value !== undefined) {
      body[field] = value;
    }
  }
  return body;
}
