"use client";

/**
 * Interface preferences on the client (constitution XIII, research R18).
 *
 * The provider starts from the preferences read on the server from the cookie (no flash,
 * FR-034). `usePreferences()` exposes them with `update` and `reset`: a change is validated,
 * written to the cookie and applied to `<html>` at once (FR-033, FR-038). Other hooks expose the
 * accent, the motion intensity and the *effective* effects level, which also honours the system
 * « reduce motion » setting (FR-036).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { AccentVariant, EffectsLevel, MotionIntensity } from "@/lib/enums/theme";
import {
  DEFAULT_PREFERENCES,
  PreferencesSchema,
  type Preferences,
} from "@/lib/schemas/preferences";
import { THEME } from "@/lib/theme/theme.config";
import type { EffectsSettings } from "@/lib/theme/types";

import {
  readReducedMotion,
  readReducedMotionOnServer,
  subscribeToReducedMotion,
} from "./reduced-motion";
import { applyPreferenceAttributes, writePreferencesCookie } from "./preferences-dom";

/** Changeable part of the preferences (the version is managed here). */
export type PreferencesUpdate = Partial<Omit<Preferences, "version">>;

/** Preferences with the actions that change them. */
export interface PreferencesWithActions extends Preferences {
  /** Changes some preferences; invalid values are ignored. */
  readonly update: (changes: PreferencesUpdate) => void;
  /** Goes back to the default preferences (FR-038). */
  readonly reset: () => void;
}

/** Value shared by the context. */
interface PreferencesContextValue {
  readonly preferences: Preferences;
  readonly update: (changes: PreferencesUpdate) => void;
  readonly reset: () => void;
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
  const [preferences, setPreferences] = useState(initialPreferences);
  const apply = useCallback((next: Preferences): void => {
    applyPreferenceAttributes(next);
    writePreferencesCookie(next);
    setPreferences(next);
  }, []);
  const update = useCallback(
    (changes: PreferencesUpdate): void => {
      const parsed = PreferencesSchema.safeParse({ ...preferences, ...changes });
      if (parsed.success) {
        apply(parsed.data);
      }
    },
    [preferences, apply],
  );
  const reset = useCallback((): void => {
    apply(DEFAULT_PREFERENCES);
  }, [apply]);
  const value = useMemo(() => ({ preferences, update, reset }), [preferences, update, reset]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

/**
 * Reads the context.
 *
 * @returns The context value.
 * @throws {Error} When used outside {@link PreferencesProvider}.
 */
function usePreferencesContext(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context;
}

/**
 * Returns the current preferences and the actions to change them.
 *
 * @returns The preferences, `update` and `reset`.
 * @throws {Error} When used outside {@link PreferencesProvider}.
 */
export function usePreferences(): PreferencesWithActions {
  const { preferences, update, reset } = usePreferencesContext();
  return useMemo(() => ({ ...preferences, update, reset }), [preferences, update, reset]);
}

/**
 * Tells whether the system asks for reduced motion, updated live.
 *
 * @returns `true` when `prefers-reduced-motion: reduce` is active.
 */
export function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    readReducedMotion,
    readReducedMotionOnServer,
  );
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
  return resolveEffects(preferred, useSystemReducedMotion());
}
