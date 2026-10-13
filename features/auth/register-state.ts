/**
 * State shared by the registration Server Action and the form (`useActionState`).
 *
 * Kept outside `actions.ts`, whose exports must all be Server Actions.
 */
import { RegisterField } from "@/lib/enums/register-field";
import { RegisterStatus } from "@/lib/enums/register-status";
import type { RegisterFieldErrors } from "@/lib/schemas/register";

/** Result of a registration attempt. */
export interface RegisterActionState {
  readonly status: RegisterStatus;
  /** Message per field. */
  readonly fieldErrors: RegisterFieldErrors;
  /** Message for the whole form (rate limit, unavailable shop…). */
  readonly formError?: string;
  /** Seconds to wait after `TOO_MANY_REQUESTS`. */
  readonly retryAfterSeconds?: number;
  /** Submitted values, to refill the form without JavaScript; never the password. */
  readonly values: Readonly<Partial<Record<RegisterField, string>>>;
  /** Email of the created account (success only). */
  readonly email?: string;
}

/** State before any submission. */
export const INITIAL_REGISTER_STATE: RegisterActionState = {
  status: RegisterStatus.IDLE,
  fieldErrors: {},
  values: {},
};

/**
 * Removes the password from the submitted values.
 *
 * @param values - Raw form values.
 * @returns The values that may be sent back to the browser.
 */
export function withoutPassword(
  values: Readonly<Record<string, string>>,
): Partial<Record<RegisterField, string>> {
  const kept: Partial<Record<RegisterField, string>> = {};
  for (const field of Object.values(RegisterField)) {
    const value = values[field];
    if (field !== RegisterField.PASSWORD && value !== undefined) {
      kept[field] = value;
    }
  }
  return kept;
}
