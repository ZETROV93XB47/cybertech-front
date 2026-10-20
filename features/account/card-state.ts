/**
 * State of the card forms of « Ma carte »: the update Server Action (holder and expiry), the
 * delete Server Action, and the client-side « Ajouter une carte » form. Kept outside
 * `actions.ts`, whose exports must all be Server Actions.
 *
 * The full card number never appears in these states: it only lives in the add form's input
 * until it is sent (constitution V v3.0.0).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2, §2 bis
 */
import { BankCardField, CardFormStatus } from "@/lib/enums/bank-card";
import {
  BankCardUpdateSchema,
  isExpiryPast,
  toExpiryDate,
  type BankCardUpdate,
} from "@/lib/schemas/bank-card";

import { CARD_MESSAGES } from "./messages";

/** Message per invalid field. */
export type CardFieldErrors = Partial<Record<BankCardField, string>>;

/** Values of the update form (holder and expiry selects). */
export interface CardUpdateValues {
  readonly holder: string;
  readonly expiryMonth: string;
  readonly expiryYear: string;
}

/** Why a card request failed, as the forms show it. */
export interface CardFailure {
  readonly formError: string;
  readonly fieldErrors?: CardFieldErrors;
  /** The session expired: the form offers to sign in again. */
  readonly needsSignIn?: boolean;
  readonly retryAfterSeconds?: number;
}

/** Result of the update Server Action. */
export interface CardUpdateState extends Partial<CardFailure> {
  readonly status: CardFormStatus;
  readonly fieldErrors: CardFieldErrors;
  /** Values to refill the form with (the typed ones after a refusal, FR-002). */
  readonly values: CardUpdateValues | null;
}

/** Result of the delete Server Action. */
export interface CardDeleteState extends Partial<CardFailure> {
  readonly status: CardFormStatus;
}

/** Update state before any submission. */
export const INITIAL_CARD_UPDATE_STATE: CardUpdateState = {
  status: CardFormStatus.IDLE,
  fieldErrors: {},
  values: null,
};

/** Delete state before any submission. */
export const INITIAL_CARD_DELETE_STATE: CardDeleteState = { status: CardFormStatus.IDLE };

/**
 * Reads the update form.
 *
 * @param formData - Submitted form.
 * @returns The typed values.
 */
export function readCardUpdateForm(formData: FormData): CardUpdateValues {
  const read = (field: BankCardField): string => {
    const value = formData.get(field);
    return typeof value === "string" ? value : "";
  };
  return {
    holder: read(BankCardField.CARD_HOLDER_NAME),
    expiryMonth: read(BankCardField.EXPIRY_MONTH),
    expiryYear: read(BankCardField.EXPIRY_YEAR),
  };
}

/**
 * Message of an expiry that cannot be saved, or `undefined` when it is fine.
 *
 * @param month - Selected month.
 * @param year - Selected year.
 * @param now - Current time.
 * @returns The French message, if any.
 */
export function expiryError(month: string, year: string, now: Date): string | undefined {
  if (month === "" || year === "") {
    return CARD_MESSAGES.errors.expiryRequired;
  }
  return isExpiryPast(toExpiryDate(month, year), now) ? CARD_MESSAGES.errors.expiryPast : undefined;
}

/**
 * Validates the update form: same rules as `BankCardUpdateSchema`, French messages per field.
 *
 * @param values - Typed values.
 * @param now - Current time.
 * @returns The message per invalid field (empty when valid).
 */
export function validateCardUpdate(values: CardUpdateValues, now: Date): CardFieldErrors {
  const errors: CardFieldErrors = {};
  if (values.holder.trim() === "") {
    errors[BankCardField.CARD_HOLDER_NAME] = CARD_MESSAGES.errors.holderRequired;
  }
  const expiry = expiryError(values.expiryMonth, values.expiryYear, now);
  if (expiry !== undefined) {
    errors[BankCardField.EXPIRY_MONTH] = expiry;
  }
  return errors;
}

/**
 * Turns valid form values into the update body.
 *
 * @param values - Values already checked by {@link validateCardUpdate}.
 * @returns The body, or `null` when the schema still refuses it.
 */
export function toCardUpdate(values: CardUpdateValues): BankCardUpdate | null {
  const parsed = BankCardUpdateSchema.safeParse({
    cardHolderName: values.holder,
    expiryDate: toExpiryDate(values.expiryMonth, values.expiryYear),
  });
  return parsed.success ? parsed.data : null;
}
