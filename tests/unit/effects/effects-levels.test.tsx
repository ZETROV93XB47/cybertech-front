import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuroraBlobs } from "@/components/effects/AuroraBlobs";
import { createDots, stepDots } from "@/components/effects/dot-grid-engine";
import { DotGrid } from "@/components/effects/DotGrid";
import { LiveTitle, liveTitleWeight } from "@/components/effects/LiveTitle";
import { MagneticButton, magneticOffset } from "@/components/effects/MagneticButton";
import { TiltCard, tiltAngles } from "@/components/effects/TiltCard";
import { PreferencesProvider } from "@/features/preferences/PreferencesProvider";
import { EffectsLevel } from "@/lib/enums/theme";
import { DEFAULT_PREFERENCES } from "@/lib/schemas/preferences";
import { THEME } from "@/lib/theme/theme.config";

import { installMatchMedia } from "../../helpers/match-media";

function renderAt(level: EffectsLevel, ui: ReactNode, reducedMotion = false) {
  installMatchMedia(reducedMotion);
  return render(
    <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, effects: level }}>
      {ui}
    </PreferencesProvider>,
  );
}

const raf = vi.fn<(callback: FrameRequestCallback) => number>(() => 1);

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", raf);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const context = new Proxy(
    { canvas: { width: 0, height: 0 } },
    {
      get: (target, key) =>
        key in target ? target[key as "canvas"] : vi.fn(() => ({ addColorStop: vi.fn() })),
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  raf.mockClear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DotGrid", () => {
  it("FULL: reacts to the cursor with an animation loop", () => {
    renderAt(EffectsLevel.FULL, <DotGrid />);
    expect(screen.getByTestId("dot-grid")).toBeInTheDocument();
    fireEvent.pointerMove(window, { clientX: 100, clientY: 100 });
    expect(raf).toHaveBeenCalled();
  });

  it("REDUCED: draws a static grid and never starts a loop", () => {
    renderAt(EffectsLevel.REDUCED, <DotGrid />);
    expect(screen.getByTestId("dot-grid")).toBeInTheDocument();
    fireEvent.pointerMove(window, { clientX: 100, clientY: 100 });
    expect(raf).not.toHaveBeenCalled();
  });

  it.each([
    ["OFF", EffectsLevel.OFF, false],
    ["FULL with system reduced motion", EffectsLevel.FULL, true],
  ])("%s: renders nothing", (_label, level, reduced) => {
    renderAt(level, <DotGrid />, reduced);
    expect(screen.queryByTestId("dot-grid")).not.toBeInTheDocument();
  });

  it("pushes the dots near the cursor, then brings them back to rest", () => {
    const settings = THEME.effects[EffectsLevel.FULL].dotGrid;
    const dots = createDots(200, 200, settings);
    const near = dots[0]!;
    expect(stepDots(dots, { x: near.x + 5, y: near.y + 5 }, settings)).toBe(true);
    expect(near.opacity).toBeGreaterThan(settings.restOpacity);
    let frames = 0;
    while (stepDots(dots, null, settings) && frames < 500) {
      frames += 1;
    }
    expect(frames).toBeLessThan(500);
    expect(near.dx).toBeCloseTo(0, 1);
  });
});

describe("AuroraBlobs", () => {
  it("FULL: three drifting blobs", () => {
    const { container } = renderAt(EffectsLevel.FULL, <AuroraBlobs />);
    const blobs = container.querySelectorAll<HTMLElement>(".aurora-blob");
    expect(blobs).toHaveLength(THEME.effects[EffectsLevel.FULL].aurora.blobCount);
    expect(blobs[0]?.style.animationPlayState).toBe("running");
  });

  it("REDUCED: fewer, slower blobs and no cursor follow", () => {
    const { container } = renderAt(EffectsLevel.REDUCED, <AuroraBlobs />);
    expect(container.querySelectorAll(".aurora-blob")).toHaveLength(
      THEME.effects[EffectsLevel.REDUCED].aurora.blobCount,
    );
    fireEvent.pointerMove(window, { clientX: 10, clientY: 10 });
    expect(raf).not.toHaveBeenCalled();
  });

  it("OFF and system reduced motion: nothing", () => {
    renderAt(EffectsLevel.OFF, <AuroraBlobs />);
    expect(screen.queryByTestId("aurora")).not.toBeInTheDocument();
  });
});

describe("TiltCard, MagneticButton and LiveTitle", () => {
  it("FULL: interactive wrappers", () => {
    const { container } = renderAt(
      EffectsLevel.FULL,
      <>
        <TiltCard>carte</TiltCard>
        <MagneticButton>
          <button type="button">CTA</button>
        </MagneticButton>
        <LiveTitle text="Bonsoir" />
      </>,
    );
    expect(container.querySelector("[data-tilt]")).not.toBeNull();
    expect(container.querySelector("[data-magnetic]")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Bonsoir" })).toHaveAttribute("data-live-title");
  });

  it.each([EffectsLevel.REDUCED, EffectsLevel.OFF])("%s: static elements", (level) => {
    const { container } = renderAt(
      level,
      <>
        <TiltCard>carte</TiltCard>
        <MagneticButton>
          <button type="button">CTA</button>
        </MagneticButton>
        <LiveTitle text="Bonsoir" />
      </>,
    );
    expect(container.querySelector("[data-tilt]")).toBeNull();
    expect(container.querySelector("[data-magnetic]")).toBeNull();
    expect(screen.getByRole("heading", { name: "Bonsoir" })).not.toHaveAttribute("data-live-title");
  });

  it("computes bounded tilt, magnetic pull and title weight", () => {
    expect(tiltAngles(1, 0, 8)).toEqual({ rotateX: 8, rotateY: 8 });
    expect(tiltAngles(0.5, 0.5, 8)).toEqual({ rotateX: 0, rotateY: 0 });
    const box = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect,
    };
    expect(
      magneticOffset({ clientX: 60, clientY: 20 }, box, { strength: 0.25, radiusPx: 80 }),
    ).toEqual({ x: 2.5, y: 0 });
    expect(
      magneticOffset({ clientX: 900, clientY: 20 }, box, { strength: 0.25, radiusPx: 80 }),
    ).toEqual({ x: 0, y: 0 });
    const live = THEME.effects[EffectsLevel.FULL].liveTitle;
    expect(liveTitleWeight(0, live)).toBe(live.weightMax);
    expect(liveTitleWeight(10_000, live)).toBe(live.weightMin);
  });
});
