"use client";

/**
 * Product card shell with 3D tilt and an inner spotlight following the cursor (spec annex
 * « Cartes produits »); the gold reflection on the border comes from `.product-card:hover`.
 *
 * Parameters from `THEME.effects[level].tilt`; a plain `article` when disabled. Pointer events
 * only write two CSS variables and a transform, coalesced to one per frame.
 */
import { useRef, type PointerEvent, type ReactNode } from "react";

import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";

/** Centre of the card, as a fraction of its size. */
const CENTRE_FRACTION = 0.5;

/** The tilt swings from `-maxDeg` to `+maxDeg`: twice the largest rotation. */
const FULL_SWING = 2;

/** Converts a fraction (0–1) to a percentage. */
const PERCENT = 100;

/** CSS variables read by the `.tilt-spotlight` layer. */
const SPOT_X_VARIABLE = "--spot-x";
const SPOT_Y_VARIABLE = "--spot-y";

/** Props of {@link TiltCard}. */
export interface TiltCardProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Rotation of the card for a pointer position.
 *
 * @param fractionX - Horizontal pointer position in the card (0–1).
 * @param fractionY - Vertical pointer position in the card (0–1).
 * @param maxDeg - Largest rotation.
 * @returns Rotations around X and Y, in degrees.
 */
export function tiltAngles(
  fractionX: number,
  fractionY: number,
  maxDeg: number,
): { rotateX: number; rotateY: number } {
  return {
    rotateX: (CENTRE_FRACTION - fractionY) * maxDeg * FULL_SWING,
    rotateY: (fractionX - CENTRE_FRACTION) * maxDeg * FULL_SWING,
  };
}

/**
 * Card shell.
 *
 * @param props - Card content and classes.
 * @returns The `article`.
 */
export function TiltCard({ children, className }: TiltCardProps): ReactNode {
  const settings = useEffectiveEffects().settings.tilt;
  const card = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  if (!settings.enabled) {
    return <article className={className}>{children}</article>;
  }
  const onPointerMove = (event: PointerEvent<HTMLElement>): void => {
    const element = card.current;
    if (!element || frame.current !== null) {
      return;
    }
    const { clientX, clientY } = event;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const box = element.getBoundingClientRect();
      const fractionX = (clientX - box.left) / box.width;
      const fractionY = (clientY - box.top) / box.height;
      const { rotateX, rotateY } = tiltAngles(fractionX, fractionY, settings.maxDeg);
      element.style.transform = `perspective(${settings.perspectivePx}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(var(--card-hover-lift))`;
      element.style.setProperty(SPOT_X_VARIABLE, `${fractionX * PERCENT}%`);
      element.style.setProperty(SPOT_Y_VARIABLE, `${fractionY * PERCENT}%`);
    });
  };
  const onPointerLeave = (): void => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    card.current?.style.removeProperty("transform");
  };
  return (
    <article
      ref={card}
      data-tilt
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`tilt-spotlight ${className ?? ""}`}
    >
      {children}
    </article>
  );
}
