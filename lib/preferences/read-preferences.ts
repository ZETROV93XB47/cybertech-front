/**
 * Server-side reading of the interface preferences cookie.
 *
 * Called by the root layout so the first HTML already carries the right `data-*` attributes:
 * no visible switch after hydration (FR-034).
 */
import { PREFERENCES_COOKIE_NAME } from "@/lib/constants/preferences";
import { parsePreferences, type Preferences } from "@/lib/schemas/preferences";

/** Minimal cookie store interface (satisfied by Next.js `cookies()`). */
export interface CookieReader {
  get(name: string): { readonly value: string } | undefined;
}

/**
 * Reads the preferences of the current request.
 *
 * @param cookieStore - Request cookies.
 * @returns The stored preferences, or defaults when absent, invalid or of an older version.
 */
export function readPreferences(cookieStore: CookieReader): Preferences {
  return parsePreferences(cookieStore.get(PREFERENCES_COOKIE_NAME)?.value);
}
