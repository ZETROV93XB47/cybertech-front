/**
 * Masking helpers for log lines — front equivalent of the backend `LogSafetyUtils`.
 *
 * Identifiers are partially kept so a log line can still be correlated, but never fully exposed
 * (constitution XII: no token, password, cookie or full email in a log).
 */

/** Number of leading characters kept when masking a UUID (enough to correlate log lines). */
const UUID_VISIBLE_PREFIX_LENGTH = 8;

/** Number of leading characters kept from the local part of an email address. */
const EMAIL_VISIBLE_PREFIX_LENGTH = 1;

/** Replacement for hidden characters. */
const MASK = "***";

/** Separator between the local part and the domain of an email address. */
const EMAIL_AT = "@";

/**
 * Masks a UUID, keeping only its first characters.
 *
 * @param uuid - Identifier to mask; may be missing.
 * @returns `0193a2b4***`, or `***` when the value is empty or missing.
 */
export function maskUuid(uuid: string | null | undefined): string {
  if (!uuid) {
    return MASK;
  }
  return `${uuid.slice(0, UUID_VISIBLE_PREFIX_LENGTH)}${MASK}`;
}

/**
 * Masks an email address, keeping its first letter and its domain.
 *
 * @param email - Address to mask; may be missing.
 * @returns `j***@example.com`, or `***` when the value is not an email.
 */
export function maskEmail(email: string | null | undefined): string {
  const atIndex = email?.indexOf(EMAIL_AT) ?? -1;
  if (!email || atIndex < 1) {
    return MASK;
  }
  return `${email.slice(0, EMAIL_VISIBLE_PREFIX_LENGTH)}${MASK}${email.slice(atIndex)}`;
}
