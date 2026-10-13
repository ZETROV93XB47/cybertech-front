/**
 * Interface preferences stored in the `ct_prefs_v1` cookie (constitution XIII, US5).
 *
 * Only bounded values are possible: every field is an enum. Client-safe (no server import), so
 * both the server reader and the client provider use it.
 *
 * @see specs/001-catalog-auth-cart/data-model.md (Préférences d'interface)
 */
import { z } from "zod";

import { PREFERENCES_VERSION } from "@/lib/constants/preferences";
import { AccentVariant, EffectsLevel, MotionIntensity, SoundSetting } from "@/lib/enums/theme";

/** Schema of the stored preferences; a different `version` is rejected. */
export const PreferencesSchema = z.object({
  version: z.literal(PREFERENCES_VERSION),
  effects: z.enum(EffectsLevel),
  motion: z.enum(MotionIntensity),
  accent: z.enum(AccentVariant),
  sound: z.enum(SoundSetting),
});

/** Interface preferences of the current browser. */
export type Preferences = z.infer<typeof PreferencesSchema>;

/** Preferences of a first visit, and the target of « Réinitialiser » (FR-038). */
export const DEFAULT_PREFERENCES: Preferences = {
  version: PREFERENCES_VERSION,
  effects: EffectsLevel.FULL,
  motion: MotionIntensity.NORMAL,
  accent: AccentVariant.VIOLET,
  sound: SoundSetting.OFF,
};

/**
 * Parses the raw cookie value, falling back to defaults on anything invalid.
 *
 * @param raw - Cookie value (URI-encoded JSON), or `undefined` when absent.
 * @returns Valid preferences.
 */
export function parsePreferences(raw: string | undefined): Preferences {
  if (!raw) {
    return DEFAULT_PREFERENCES;
  }
  try {
    const parsed = PreferencesSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Serialises preferences for the cookie.
 *
 * @param preferences - Valid preferences.
 * @returns URI-encoded JSON.
 */
export function serializePreferences(preferences: Preferences): string {
  return encodeURIComponent(JSON.stringify(preferences));
}
