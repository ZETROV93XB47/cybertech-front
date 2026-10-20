/**
 * State shared by the profile Server Action and the form (`useActionState`).
 *
 * Kept outside `actions.ts`, whose exports must all be Server Actions.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2
 */
import { ProfileField, ProfileStatus } from "@/lib/enums/profile";
import type { ProfileFieldErrors } from "@/lib/schemas/user";

/** Result of a profile submission. */
export interface ProfileActionState {
  readonly status: ProfileStatus;
  /** Message per field. */
  readonly fieldErrors: ProfileFieldErrors;
  /** Message for the whole form (session expired, rate limit, unavailable shop…). */
  readonly formError?: string;
  /** Seconds to wait after `TOO_MANY_REQUESTS`. */
  readonly retryAfterSeconds?: number;
  /** The session expired: the form offers to sign in again, the typed values are kept. */
  readonly needsSignIn?: boolean;
  /**
   * Values to refill the form with: the typed ones after a refusal (FR-002), the saved ones
   * after a success (the phone is then emptied: it is never shown back).
   */
  readonly values: Readonly<Partial<Record<ProfileField, string>>>;
  /** Number of successful saves so far, used to empty the phone field after each one. */
  readonly saveCount: number;
}

/** State before any submission. */
export const INITIAL_PROFILE_STATE: ProfileActionState = {
  status: ProfileStatus.IDLE,
  fieldErrors: {},
  values: {},
  saveCount: 0,
};

/**
 * Values kept after a successful save: everything typed, except the phone number, which the
 * backend never returns and the form never shows back.
 *
 * @param values - Submitted values.
 * @returns The values to refill the form with.
 */
export function savedValues(
  values: Readonly<Record<ProfileField, string>>,
): Partial<Record<ProfileField, string>> {
  const kept: Partial<Record<ProfileField, string>> = {};
  for (const field of Object.values(ProfileField)) {
    if (field !== ProfileField.PHONE_NUMBER) {
      kept[field] = values[field].trim();
    }
  }
  return kept;
}
