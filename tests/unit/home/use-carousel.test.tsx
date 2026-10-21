/**
 * Feature 004, US3 (T039) — rotation of the home carousel: timer, wrap-around, manual moves,
 * pauses (hover, focus, hidden tab, pause button) and the disabled rotation.
 */
import { act, renderHook } from "@testing-library/react";
import type { FocusEvent, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCarousel } from "@/features/home/hooks/useCarousel";
import { PreferencesProvider } from "@/features/preferences/PreferencesProvider";
import { CarouselPlayback } from "@/lib/enums/home";
import { EffectsLevel } from "@/lib/enums/theme";
import { DEFAULT_PREFERENCES } from "@/lib/schemas/preferences";
import { THEME } from "@/lib/theme/theme.config";

import { installMatchMedia } from "../../helpers/match-media";

/** Time a slide stays on screen at full effects. */
const INTERVAL_MS = THEME.effects[EffectsLevel.FULL].carousel.intervalMs;

/** Number of slides of the tests. */
const COUNT = 3;

/**
 * Renders the hook inside the preferences.
 *
 * @param count - Number of slides.
 * @param effects - Effects level chosen.
 * @param reducedMotion - System reduced motion.
 * @returns The hook result.
 */
function renderCarousel(count = COUNT, effects = EffectsLevel.FULL, reducedMotion = false) {
  installMatchMedia(reducedMotion);
  const wrapper = ({ children }: { readonly children: ReactNode }): ReactNode => (
    <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, effects }}>
      {children}
    </PreferencesProvider>
  );
  return renderHook(() => useCarousel(count), { wrapper });
}

/**
 * Lets the time run.
 *
 * @param ms - Milliseconds.
 */
function wait(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/**
 * Sets the page visibility and notifies the listeners.
 *
 * @param state - New visibility.
 */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setVisibility("visible");
});

describe("useCarousel", () => {
  it("advances every interval and wraps around", () => {
    const { result } = renderCarousel();
    expect(result.current.playback).toBe(CarouselPlayback.PLAYING);
    wait(INTERVAL_MS);
    expect(result.current.index).toBe(1);
    wait(INTERVAL_MS);
    wait(INTERVAL_MS);
    expect(result.current.index).toBe(0);
  });

  it("moves with next, previous and goTo, wrapping around", () => {
    const { result } = renderCarousel();
    act(() => {
      result.current.previous();
    });
    expect(result.current.index).toBe(COUNT - 1);
    act(() => {
      result.current.next();
    });
    expect(result.current.index).toBe(0);
    act(() => {
      result.current.goTo(2);
    });
    expect(result.current.index).toBe(2);
  });

  it("pauses while hovered by a mouse, then resumes", () => {
    const { result } = renderCarousel();
    act(() => {
      result.current.rootHandlers.onPointerEnter({ pointerType: "mouse" });
    });
    wait(INTERVAL_MS * 2);
    expect(result.current.index).toBe(0);
    act(() => {
      result.current.rootHandlers.onPointerLeave({ pointerType: "mouse" });
    });
    wait(INTERVAL_MS);
    expect(result.current.index).toBe(1);
  });

  it("pauses while the focus is inside, then resumes when it leaves", () => {
    const { result } = renderCarousel();
    act(() => {
      result.current.rootHandlers.onFocus();
    });
    wait(INTERVAL_MS * 2);
    expect(result.current.index).toBe(0);
    const outside = document.createElement("button");
    const root = document.createElement("section");
    act(() => {
      result.current.rootHandlers.onBlur({
        currentTarget: root,
        relatedTarget: outside,
      } as unknown as FocusEvent<HTMLElement>);
    });
    wait(INTERVAL_MS);
    expect(result.current.index).toBe(1);
  });

  it("pauses while the tab is hidden", () => {
    const { result } = renderCarousel();
    setVisibility("hidden");
    wait(INTERVAL_MS * 2);
    expect(result.current.index).toBe(0);
    setVisibility("visible");
    wait(INTERVAL_MS);
    expect(result.current.index).toBe(1);
  });

  it("stops when the visitor presses pause, and plays again", () => {
    const { result } = renderCarousel();
    act(() => {
      result.current.togglePlayback();
    });
    expect(result.current.playback).toBe(CarouselPlayback.PAUSED);
    wait(INTERVAL_MS * 2);
    expect(result.current.index).toBe(0);
    act(() => {
      result.current.togglePlayback();
    });
    wait(INTERVAL_MS);
    expect(result.current.index).toBe(1);
  });

  it.each([
    ["one slide", 1, EffectsLevel.FULL, false],
    ["reduced effects", COUNT, EffectsLevel.REDUCED, false],
    ["effects off", COUNT, EffectsLevel.OFF, false],
    ["system reduced motion", COUNT, EffectsLevel.FULL, true],
  ] as const)("is disabled with %s, without any timer", (_label, count, effects, reduced) => {
    const { result } = renderCarousel(count, effects, reduced);
    expect(result.current.playback).toBe(CarouselPlayback.DISABLED);
    expect(vi.getTimerCount()).toBe(0);
    wait(INTERVAL_MS * 2);
    expect(result.current.index).toBe(0);
  });
});
