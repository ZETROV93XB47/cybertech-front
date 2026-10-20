/**
 * Pure part of « Ajouter une carte »: the typed values, their validation with the rules of
 * `BankCardAddBodySchema` (French messages per field), and the body sent to the BFF.
 *
 * The number lives in these values only while it is typed; the form empties it as soon as it is
 * sent, success or failure (constitution V v3.0.0).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §2 bis
 */
import { CARD_NUMBER_PATTERN } from "@/lib/constants/account";
import { BankCardField, BankCardType } from "@/lib/enums/bank-card";
import { toExpiryDate } from "@/lib/schemas/bank-card";

import { detectCardNetwork } from "./card-network";
import { expiryError, type CardFieldErrors } from "./card-state";
import { CARD_MESSAGES } from "./messages";

/** Values of the add form. */
export interface AddCardValues {
  readonly holder: string;
  /** Digits only, at most 19. */
  readonly digits: string;
  readonly expiryMonth: string;
  readonly expiryYear: string;
  readonly network: BankCardType;
  /** The customer chose the network: it no longer follows the number. */
  readonly isNetworkChosen: boolean;
}

/** Body of `POST /api/bank-card`. */
export interface AddCardBody {
  readonly cardHolderName: string;
  readonly cardNumber: string;
  readonly expiryDate: string;
  readonly cardType: BankCardType;
  readonly replace: boolean;
}

/**
 * Empty form, holder prefilled when known.
 *
 * @param holder - Holder name to prefill.
 * @returns The values.
 */
export function emptyAddCardValues(holder = ""): AddCardValues {
  return {
    holder,
    digits: "",
    expiryMonth: "",
    expiryYear: "",
    network: BankCardType.OTHER,
    isNetworkChosen: false,
  };
}

/**
 * New digits typed: the network follows them unless the customer chose one.
 *
 * @param values - Current values.
 * @param digits - Digits now typed.
 * @returns The next values.
 */
export function withDigits(values: AddCardValues, digits: string): AddCardValues {
  return {
    ...values,
    digits,
    network: values.isNetworkChosen ? values.network : detectCardNetwork(digits),
  };
}

/**
 * Validates the add form.
 *
 * @param values - Typed values.
 * @param now - Current time.
 * @returns The message per invalid field (empty when valid).
 */
export function validateAddCard(values: AddCardValues, now: Date): CardFieldErrors {
  const errors: CardFieldErrors = {};
  if (values.holder.trim() === "") {
    errors[BankCardField.CARD_HOLDER_NAME] = CARD_MESSAGES.errors.holderRequired;
  }
  if (!CARD_NUMBER_PATTERN.test(values.digits)) {
    errors[BankCardField.CARD_NUMBER] = CARD_MESSAGES.errors.numberInvalid;
  }
  const expiry = expiryError(values.expiryMonth, values.expiryYear, now);
  if (expiry !== undefined) {
    errors[BankCardField.EXPIRY_MONTH] = expiry;
  }
  return errors;
}

/**
 * Builds the body sent to the BFF.
 *
 * @param values - Valid values.
 * @param replace - Whether the current card is to be replaced.
 * @returns The body.
 */
export function toAddCardBody(values: AddCardValues, replace: boolean): AddCardBody {
  return {
    cardHolderName: values.holder.trim(),
    cardNumber: values.digits,
    expiryDate: toExpiryDate(values.expiryMonth, values.expiryYear),
    cardType: values.network,
    replace,
  };
}
