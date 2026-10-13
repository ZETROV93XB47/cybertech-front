"use client";

/**
 * Interface preferences on the client (constitution XIII, research R18).
 *
 * This is the read-only half (task T131): the provider receives the preferences read on the
 * server from the cookie, and hooks expose them, plus the *effective* effects level that also
 * honours the system « reduce motion » setting. US5 (task T128) adds updating and resetting.
 */
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

import { AccentVariant, EffectsLevel, MotionIntensity } from "@/lib/enums/theme";
import type { Preferences } from "@/lib/schemas/preferences";
import { THEME } from "@/lib/theme/theme.config";
import type { EffectsSettings } from "@/lib/theme/types";

import {
  readReducedMotion,
  readReducedMotionOnServer,
  subscribeToReducedMotion,
} from "./reduced-motion";

/** Value shared by the context. */
interface PreferencesContextValue {
  readonly preferences: Preferences;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

/** Props of {@link PreferencesProvider}. */
export interface PreferencesProviderProps {
  /** Preferences read on the server from the `ct_prefs_v1` cookie. */
  readonly initialPreferences: Preferences;
  readonly children: ReactNode;
}

/**
 * Makes the preferences available to every client component.
 *
 * @param props - Server-read preferences and children.
 * @returns The provider.
 */
export function PreferencesProvider({
  initialPreferences,
  children,
}: PreferencesProviderProps): ReactNode {
  return (
    <PreferencesContext.Provider value={{ preferences: initialPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

/**
 * Returns the current preferences.
 *
 * @returns The preferences.
 * @throws {Error} When used outside {@link PreferencesProvider}.
 */
export function usePreferences(): Preferences {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context.preferences;
}

/**
 * Returns the chosen accent variant.
 *
 * @returns The accent.
 */
export function useAccent(): AccentVariant {
  return usePreferences().accent;
}

/**
 * Returns the chosen motion intensity.
 *
 * @returns The motion intensity.
 */
export function useMotionIntensity(): MotionIntensity {
  return usePreferences().motion;
}

/** Effects level actually applied, with its settings. */
export interface EffectiveEffects {
  readonly level: EffectsLevel;
  readonly settings: EffectsSettings;
  /** `true` when the system setting forced effects off despite the preference (FR-036). */
  readonly forcedBySystem: boolean;
}

/**
 * Computes the effects level actually applied: the preference, unless the system asks for
 * reduced motion, in which case effects are off.
 *
 * @param preferred - Level chosen by the user.
 * @param systemReducedMotion - Whether the system asks for reduced motion.
 * @returns The applied level and its settings.
 */
export function resolveEffects(
  preferred: EffectsLevel,
  systemReducedMotion: boolean,
): EffectiveEffects {
  const level = systemReducedMotion ? EffectsLevel.OFF : preferred;
  return {
    level,
    settings: THEME.effects[level],
    forcedBySystem: systemReducedMotion && preferred !== EffectsLevel.OFF,
  };
}

/**
 * Returns the effects level actually applied, updated live when the system setting changes.
 *
 * @returns The applied level, its settings and whether the system forced it.
 */
export function useEffectiveEffects(): EffectiveEffects {
  const preferred = usePreferences().effects;
  const systemReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    readReducedMotion,
    readReducedMotionOnServer,
  );
  return resolveEffects(preferred, systemReducedMotion);
}
