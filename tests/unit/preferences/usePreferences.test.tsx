import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { PreferencesProvider, usePreferences } from "@/features/preferences/PreferencesProvider";
import { AccentVariant, EffectsLevel, MotionIntensity, SoundSetting } from "@/lib/enums/theme";
import { DEFAULT_PREFERENCES, parsePreferences } from "@/lib/schemas/preferences";

const COOKIE = "ct_prefs_v1";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider initialPreferences={DEFAULT_PREFERENCES}>{children}</PreferencesProvider>
  );
}

function storedPreferences() {
  const entry = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${COOKIE}=`));
  return parsePreferences(entry?.slice(COOKIE.length + 1));
}

afterEach(() => {
  document.cookie = `${COOKIE}=; Path=/; Max-Age=0`;
  for (const attribute of ["data-accent", "data-effects", "data-motion"]) {
    document.documentElement.removeAttribute(attribute);
  }
});

describe("usePreferences", () => {
  it("applies a change to <html> at once and writes the cookie", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => {
      result.current.update({ accent: AccentVariant.BLUE, effects: EffectsLevel.OFF });
    });
    expect(result.current.accent).toBe(AccentVariant.BLUE);
    expect(document.documentElement.getAttribute("data-accent")).toBe("blue");
    expect(document.documentElement.getAttribute("data-effects")).toBe("off");
    expect(storedPreferences()).toMatchObject({ accent: "blue", effects: "off", version: 1 });
  });

  it("ignores values outside the predefined options", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => {
      result.current.update({ accent: "pink" as AccentVariant });
    });
    expect(result.current.accent).toBe(AccentVariant.VIOLET);
    expect(document.documentElement.getAttribute("data-accent")).toBeNull();
  });

  it("resets to the defaults", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => {
      result.current.update({ motion: MotionIntensity.SOFT, sound: SoundSetting.ON });
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current).toMatchObject(DEFAULT_PREFERENCES);
    expect(storedPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(document.documentElement.getAttribute("data-motion")).toBe("normal");
  });
});
