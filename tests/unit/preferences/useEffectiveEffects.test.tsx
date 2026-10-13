import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PreferencesProvider,
  resolveEffects,
  useEffectiveEffects,
} from "@/features/preferences/PreferencesProvider";
import { EffectsLevel } from "@/lib/enums/theme";
import { DEFAULT_PREFERENCES } from "@/lib/schemas/preferences";
import { THEME } from "@/lib/theme/theme.config";

import { installMatchMedia } from "../../helpers/match-media";

const wrapper =
  (effects: EffectsLevel) =>
  ({ children }: { children: ReactNode }) => (
    <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, effects }}>
      {children}
    </PreferencesProvider>
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveEffects", () => {
  it.each(Object.values(EffectsLevel))(
    "keeps the preference %s without system request",
    (level) => {
      expect(resolveEffects(level, false)).toEqual({
        level,
        settings: THEME.effects[level],
        forcedBySystem: false,
      });
    },
  );

  it("forces effects off when the system asks for reduced motion", () => {
    expect(resolveEffects(EffectsLevel.FULL, true)).toMatchObject({
      level: EffectsLevel.OFF,
      forcedBySystem: true,
    });
  });

  it("does not report a forced change when the user already chose off", () => {
    expect(resolveEffects(EffectsLevel.OFF, true).forcedBySystem).toBe(false);
  });
});

describe("useEffectiveEffects", () => {
  it("follows the preference and reacts live to the system setting", () => {
    const control = installMatchMedia(false);
    const { result } = renderHook(() => useEffectiveEffects(), {
      wrapper: wrapper(EffectsLevel.FULL),
    });
    expect(result.current.level).toBe(EffectsLevel.FULL);

    act(() => {
      control.setReducedMotion(true);
    });
    expect(result.current.level).toBe(EffectsLevel.OFF);
    expect(result.current.forcedBySystem).toBe(true);
  });

  it("fails clearly outside the provider", () => {
    installMatchMedia(false);
    expect(() => renderHook(() => useEffectiveEffects())).toThrow(/PreferencesProvider/);
  });
});
