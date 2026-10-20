/**
 * Saved bank card enums.
 *
 * @see docs/backend/api-map.md §D.21
 * @see specs/003-account-orders/data-model.md §2.6, §2.6 bis
 */

/** Card network, exactly as the backend serialises it. */
export enum BankCardType {
  /** Visa (numbers starting with 4). */
  VISA = "VISA",
  /** Mastercard (51–55, 2221–2720). */
  MASTERCARD = "MASTERCARD",
  /** American Express (34, 37). */
  AMERICAN_EXPRESS = "AMERICAN_EXPRESS",
  /** Discover (6011, 644–649, 65). */
  DISCOVER = "DISCOVER",
  /** Any other number, including the test card `1111…`. */
  OTHER = "OTHER",
}

/** Fields of the card forms; values are the names posted by the forms and the DTO keys. */
export enum BankCardField {
  /** Name printed on the card. */
  CARD_HOLDER_NAME = "cardHolderName",
  /** Full card number, only in « Ajouter une carte »; never logged nor kept. */
  CARD_NUMBER = "cardNumber",
  /** Expiry month, `01`–`12`. */
  EXPIRY_MONTH = "expiryMonth",
  /** Expiry year, 4 digits. */
  EXPIRY_YEAR = "expiryYear",
  /** Network chosen in the select (deduced from the number by default). */
  CARD_TYPE = "cardType",
}

/** State of a card form after a submission. */
export enum CardFormStatus {
  /** Nothing submitted yet. */
  IDLE = "idle",
  /** Saved. */
  SUCCESS = "success",
  /** Refused or failed; the form shows why. */
  ERROR = "error",
}
