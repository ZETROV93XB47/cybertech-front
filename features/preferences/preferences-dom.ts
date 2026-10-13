/**
 * Browser side effects of a preference change: the `ct_prefs_v1` cookie (read by the server on
 * the next visit, so the first paint is already right, FR-034) and the `data-*` attributes of
 * `<html>` (the theme stylesheet switches variants on them, so the change is immediate).
 *
 * @see specs/001-catalog-auth-cart/research.md R18
 */
import {
  PREFERENCES_COOKIE_MAX_AGE_SECONDS,
  PREFERENCES_COOKIE_NAME,
} from "@/lib/constants/preferences";
import { ThemeDataAttribute } from "@/lib/enums/theme";
import { serializePreferences, type Preferences } from "@/lib/schemas/preferences";

/** Attributes of the preferences cookie: whole site, sent on top-level navigations. */
const COOKIE_ATTRIBUTES = `Path=/; Max-Age=${PREFERENCES_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;

/**
 * Writes the preferences cookie (not httpOnly: written by the browser, read by the server).
 *
 * @param preferences - Validated preferences.
 * @returns `false` when the browser refused the cookie.
 */
export function writePreferencesCookie(preferences: Preferences): boolean {
  try {
    document.cookie = `${PREFERENCES_COOKIE_NAME}=${serializePreferences(preferences)}; ${COOKIE_ATTRIBUTES}`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Applies the preferences to `<html>` at once.
 *
 * @param preferences - Validated preferences.
 */
export function applyPreferenceAttributes(preferences: Preferences): void {
  const root = document.documentElement;
  root.setAttribute(ThemeDataAttribute.ACCENT, preferences.accent);
  root.setAttribute(ThemeDataAttribute.EFFECTS, preferences.effects);
  root.setAttribute(ThemeDataAttribute.MOTION, preferences.motion);
}
