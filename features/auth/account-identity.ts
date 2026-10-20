/**
 * What the header account menu shows about the signed-in user: initials for the avatar, first
 * name for the greeting, full name and email for the panel header.
 *
 * Built from the Auth.js session only (`name`, `email`), which is all the browser knows; no
 * profile call is made for the header.
 *
 * @see specs/003-account-orders/spec.md FR-040
 * @see lib/auth/callbacks.ts (session `user`)
 */

/** Maximum number of letters in the avatar. */
export const AVATAR_INITIALS_MAX = 2;

/** Avatar text when the session carries neither a name nor an email. */
export const AVATAR_FALLBACK = "?";

/** Separator between the words of a full name. */
const NAME_SEPARATOR = /\s+/;

/** Identity shown by the header account menu. */
export interface AccountIdentity {
  /** One or two upper-case letters for the avatar. */
  readonly initials: string;
  /** First word of the name, or the full email/name when there is no name. */
  readonly firstName: string;
  /** Full name, or the email when the session has no name. */
  readonly fullName: string;
  /** Email of the session, `null` when absent. */
  readonly email: string | null;
}

/** Session user as exposed by Auth.js. */
export interface SessionUserLike {
  readonly name?: string | null;
  readonly email?: string | null;
}

/**
 * Builds the identity of the header account menu.
 *
 * Initials are the first letters of the first two words of the name (« Camille Testeur » →
 * « CT »), or the first letter of the email when there is no name.
 *
 * @param user - Session user (may be missing).
 * @returns The identity to display.
 */
export function toAccountIdentity(user: SessionUserLike | undefined): AccountIdentity {
  const name = user?.name?.trim() ?? "";
  const email = nonEmpty(user?.email?.trim());
  const words = name.split(NAME_SEPARATOR).filter((word) => word.length > 0);
  const fullName = nonEmpty(name) ?? email ?? "";
  const fromName = nonEmpty(
    words
      .slice(0, AVATAR_INITIALS_MAX)
      .map((word) => word.charAt(0))
      .join(""),
  );
  const initials = (fromName ?? nonEmpty(email?.charAt(0)) ?? AVATAR_FALLBACK).toUpperCase();
  return { initials, firstName: words[0] ?? fullName, fullName, email };
}

/**
 * Turns an empty or missing string into `null`.
 *
 * @param value - String to check.
 * @returns The string, or `null` when it is empty or missing.
 */
function nonEmpty(value: string | null | undefined): string | null {
  return value === undefined || value === null || value.length === 0 ? null : value;
}
