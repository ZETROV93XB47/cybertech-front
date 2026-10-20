/**
 * Account constants: validation of the profile, address and saved-card forms, aligned with the
 * backend Bean Validation constraints.
 *
 * @see specs/003-account-orders/data-model.md §3 and §6
 * @see docs/backend/api-map.md §D.3, §D.4b, §D.8
 */

/**
 * Longest value of one address field. The backend only requires `@NotBlank`; 255 is the JPA
 * default `VARCHAR` length of the columns.
 */
export const ADDRESS_FIELD_MAX_LENGTH = 255;

/** Shortest first or last name (`@Size(min = 2)`, `UserSelfUpdateRequestDto`). */
export const NAME_MIN_LENGTH = 2;

/** Longest first or last name (`@Size(max = 50)`, `UserSelfUpdateRequestDto`). */
export const NAME_MAX_LENGTH = 50;

/**
 * Accepted phone number. Front guard only (the backend has no constraint): digits, spaces, dots
 * and dashes, optional leading `+`.
 */
export const PHONE_PATTERN = /^\+?[0-9 .-]{6,20}$/;

/** Expiry of a saved card, `MM/YYYY` (`@Pattern` of `BankCardUpdateRequestDto`). */
export const CARD_EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/[0-9]{4}$/;

/**
 * Last four digits at the end of a masked card number (`"**** **** **** 4242"`, built by
 * `BankCardMapper` from `lastFourDigits`).
 *
 * @see BankCardMapper#toResponseDto (backend)
 */
export const CARD_LAST_DIGITS_PATTERN = /(\d{4})\s*$/;

/**
 * Card number accepted by the « Ajouter une carte » form once spaces are removed: 13 to 19
 * digits (`@Size` and `@Pattern` of `BankCardCreationRequestDto`).
 *
 * @see BankCardCreationRequestDto#cardNumber (backend)
 */
export const CARD_NUMBER_PATTERN = /^\d{13,19}$/;

/** Most digits of a card number, used to stop typing beyond them. */
export const CARD_NUMBER_MAX_DIGITS = 19;

/** Digits per group when a card number is shown while typing (`1111 1111 1111 1111`). */
export const CARD_NUMBER_GROUP_SIZE = 4;

/** Longest card holder name accepted (column length of the backend). */
export const CARD_HOLDER_MAX_LENGTH = ADDRESS_FIELD_MAX_LENGTH;

/** Years offered by the expiry year select, from the current year on. */
export const CARD_EXPIRY_YEARS_AHEAD = 15;

/** Months of a year, for the expiry month select. */
export const MONTHS_PER_YEAR = 12;

/** Card number that pays on the backend (`docs/test-cards.md`): only 1s. */
export const PAYING_TEST_CARD = "1111 1111 1111 1111";
