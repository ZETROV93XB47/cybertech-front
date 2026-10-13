"use client";

/**
 * Aurora background (spec annex « Animations »): 2 to 3 very blurred blobs (accent, blue, a
 * touch of gold) drifting on slow cycles and slowly following the cursor.
 *
 * Count, blur, opacity, cycle length and cursor follow come from
 * `THEME.effects[level].aurora`. The drift is a CSS animation (compositor only, no main-thread
 * work); the cursor follow runs only while the blobs catch up. Nothing is rendered when the
 * effective level turns the aurora off.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";
import { CSS_VARIABLES } from "@/lib/theme/css-variables";
import type { AuroraSettings } from "@/lib/theme/types";

/** Placement of each blob, in viewport fractions; the colour cycles accent → blue → gold. */
const BLOB_LAYOUT = [
  { top: "-10vh", left: "-5vw", size: "55vw", color: CSS_VARIABLES.accent },
  { top: "35vh", left: "55vw", size: "45vw", color: CSS_VARIABLES.gradientTo },
  { top: "70vh", left: "10vw", size: "30vw", color: CSS_VARIABLES.gold },
] as const;

/** Divisor giving the centre of the viewport. */
const HALF_DIVISOR = 2;

/** Movement below which the cursor follow stops (pixels). */
const FOLLOW_EPSILON = 0.5;

/**
 * Cycle length of one blob, spread between the minimum and the maximum.
 *
 * @param index - Blob index.
 * @param count - Number of blobs.
 * @param settings - Aurora settings.
 * @returns The cycle length in seconds.
 */
export function blobCycleSeconds(index: number, count: number, settings: AuroraSettings): number {
  if (count <= 1) {
    return settings.minCycleSeconds;
  }
  const spread = settings.maxCycleSeconds - settings.minCycleSeconds;
  return settings.minCycleSeconds + (spread * index) / (count - 1);
}

/**
 * Makes the blob layer follow the cursor with a slow lerp, only while it moves.
 *
 * @param layer - Element to translate.
 * @param strength - Fraction of the remaining distance covered per frame.
 * @returns The cleanup function.
 */
function followCursor(layer: HTMLElement, strength: number): () => void {
  const position = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let frame: number | null = null;
  const step = (): void => {
    position.x += (position.targetX - position.x) * strength;
    position.y += (position.targetY - position.y) * strength;
    layer.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    const moving =
      Math.abs(position.targetX - position.x) + Math.abs(position.targetY - position.y) >
      FOLLOW_EPSILON;
    frame = moving && !document.hidden ? requestAnimationFrame(step) : null;
  };
  const onPointerMove = (event: PointerEvent): void => {
    position.targetX = event.clientX - window.innerWidth / HALF_DIVISOR;
    position.targetY = event.clientY - window.innerHeight / HALF_DIVISOR;
    frame ??= requestAnimationFrame(step);
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onPointerMove);
    if (frame !== null) {
      cancelAnimationFrame(frame);
    }
  };
}

/**
 * Style of one blob.
 *
 * @param index - Blob index.
 * @param settings - Aurora settings.
 * @returns Inline style (position, size, colour, blur, drift cycle).
 */
function blobStyle(index: number, settings: AuroraSettings): CSSProperties {
  const layout = BLOB_LAYOUT[index % BLOB_LAYOUT.length] ?? BLOB_LAYOUT[0];
  const cycle = blobCycleSeconds(index, settings.blobCount, settings);
  return {
    top: layout.top,
    left: layout.left,
    width: layout.size,
    height: layout.size,
    backgroundImage: `radial-gradient(circle, var(${layout.color}) 0%, transparent 70%)`,
    filter: `blur(${settings.blurPx}px)`,
    animationDuration: `${cycle}s`,
    animationPlayState: settings.animated ? "running" : "paused",
  };
}

/**
 * Aurora background.
 *
 * @returns The blob layer, or nothing when the effective effects level turns it off.
 */
export function AuroraBlobs(): ReactNode {
  const settings = useEffectiveEffects().settings.aurora;
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!settings.enabled || settings.followStrength === 0 || !layer.current) {
      return undefined;
    }
    return followCursor(layer.current, settings.followStrength);
  }, [settings]);
  if (!settings.enabled) {
    return null;
  }
  return (
    <div
      aria-hidden
      data-testid="aurora"
      className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
      style={{ opacity: settings.opacity }}
    >
      <div ref={layer} className="absolute inset-0">
        {Array.from({ length: settings.blobCount }, (_, index) => (
          <span
            key={index}
            className="aurora-blob absolute rounded-full"
            style={blobStyle(index, settings)}
          />
        ))}
      </div>
    </div>
  );
}
