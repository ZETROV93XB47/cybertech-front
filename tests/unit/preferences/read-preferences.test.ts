// @vitest-environment node
import { describe, expect, it } from "vitest";

import { AccentVariant, EffectsLevel, MotionIntensity, SoundSetting } from "@/lib/enums/theme";
import { readPreferences } from "@/lib/preferences/read-preferences";
import { DEFAULT_PREFERENCES, serializePreferences } from "@/lib/schemas/preferences";

const store = (value?: string) => ({
  get: (name: string) => (name === "ct_prefs_v1" && value !== undefined ? { value } : undefined),
});

describe("readPreferences", () => {
  it("returns defaults when the cookie is absent", () => {
    expect(readPreferences(store())).toEqual(DEFAULT_PREFERENCES);
  });

  it("reads stored preferences", () => {
    const stored = {
      version: 1 as const,
      effects: EffectsLevel.OFF,
      motion: MotionIntensity.SOFT,
      accent: AccentVariant.BLUE,
      sound: SoundSetting.ON,
    };
    expect(readPreferences(store(serializePreferences(stored)))).toEqual(stored);
  });

  it.each([
    ["not json", "%%%"],
    [
      "unknown accent",
      encodeURIComponent(JSON.stringify({ ...DEFAULT_PREFERENCES, accent: "pink" })),
    ],
    ["older version", encodeURIComponent(JSON.stringify({ ...DEFAULT_PREFERENCES, version: 0 }))],
  ])("falls back to defaults on %s", (_label, raw) => {
    expect(readPreferences(store(raw))).toEqual(DEFAULT_PREFERENCES);
  });

  it("defaults keep sounds off and effects full", () => {
    expect(DEFAULT_PREFERENCES.sound).toBe(SoundSetting.OFF);
    expect(DEFAULT_PREFERENCES.effects).toBe(EffectsLevel.FULL);
    expect(DEFAULT_PREFERENCES.accent).toBe(AccentVariant.VIOLET);
  });
});
