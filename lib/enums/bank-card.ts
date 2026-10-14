/**
 * Saved bank card enums.
 *
 * @see docs/backend/api-map.md §D.21
 */

/** Card network, exactly as the backend serialises it (read only: the front never adds a card). */
export enum BankCardType {
  VISA = "VISA",
  MASTERCARD = "MASTERCARD",
  AMERICAN_EXPRESS = "AMERICAN_EXPRESS",
  DISCOVER = "DISCOVER",
  OTHER = "OTHER",
}
