/**
 * Registration constraints, mirrored from the Bean Validation annotations of the backend
 * `UserCreateRequestDto`, so the form refuses what the backend would refuse, before sending.
 *
 * @see UserCreateRequestDto (backend)
 * @see specs/001-catalog-auth-cart/data-model.md §2
 */

/** `@Size(min = 2)` on `firstName` and `lastName`. */
export const NAME_MIN_LENGTH = 2;

/** `@Size(max = 50)` on `firstName` and `lastName`. */
export const NAME_MAX_LENGTH = 50;

/** `@Size(min = 8)` on `password`. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Time appended to the birth date: the backend expects a `LocalDateTime`, the form a date.
 *
 * @see specs/001-catalog-auth-cart/research.md R9
 */
export const BIRTH_DATE_TIME_SUFFIX = "T00:00:00";
