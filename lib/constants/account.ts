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
