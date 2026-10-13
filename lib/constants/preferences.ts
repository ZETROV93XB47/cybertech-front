/**
 * Interface preference constants (constitution XIII, research R18).
 *
 * Visual values do not live here: they belong to `lib/theme/theme.config.ts`.
 */

/**
 * Name of the cookie holding the interface preferences.
 *
 * A cookie (not `localStorage`) so the server can render the first page with the right accent
 * and effects, without a visible switch after hydration.
 */
export const PREFERENCES_COOKIE_NAME = "ct_prefs_v1";

/** Version of the stored preferences format; a different version falls back to defaults. */
export const PREFERENCES_VERSION = 1;

/** Lifetime of the preferences cookie: one year. */
export const PREFERENCES_COOKIE_MAX_AGE_SECONDS = 31_536_000;
