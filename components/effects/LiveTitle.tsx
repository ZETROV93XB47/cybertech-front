"use client";

/**
 * Living page title (spec annex « Titres vivants »): letters revealed one by one on first
 * display, and a font weight that follows the cursor's proximity (variable `wght` axis of Sora).
 *
 * Parameters from `THEME.effects[level].liveTitle` and the motion tokens; a plain heading when
 * disabled. The heading is named by `aria-label`, so screen readers read the words, not letters.
 */
import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";
import { useMotionTokens } from "@/styles/motion";

/** Divisor giving the centre of the title. */
const HALF_DIVISOR = 2;

/** Props of {@link LiveTitle}. */
export interface LiveTitleProps {
  readonly text: string;
  readonly className?: string | undefined;
}

/**
 * Font weight for a distance to the cursor.
 *
 * @param distance - Distance between the cursor and the title centre, in pixels.
 * @param settings - Live title settings.
 * @returns A weight between `weightMin` (far) and `weightMax` (close).
 */
export function liveTitleWeight(
  distance: number,
  settings: { readonly weightMin: number; readonly weightMax: number; readonly radiusPx: number },
): number {
  if (settings.radiusPx <= 0) {
    return settings.weightMin;
  }
  const closeness = Math.max(0, 1 - distance / settings.radiusPx);
  return Math.round(settings.weightMin + (settings.weightMax - settings.weightMin) * closeness);
}

/**
 * Follows the cursor and updates the weight of the title, at most once per frame.
 *
 * @param element - Title element.
 * @param settings - Live title settings.
 * @returns The cleanup function.
 */
function followWeight(
  element: HTMLElement,
  settings: { readonly weightMin: number; readonly weightMax: number; readonly radiusPx: number },
): () => void {
  let frame: number | null = null;
  const onPointerMove = (event: PointerEvent): void => {
    if (frame !== null) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = null;
      const box = element.getBoundingClientRect();
      const centreX = Math.min(Math.max(event.clientX, box.left), box.right);
      const distance = Math.hypot(
        event.clientX - centreX,
        event.clientY - (box.top + box.height / HALF_DIVISOR),
      );
      element.style.fontWeight = String(liveTitleWeight(distance, settings));
    });
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
 * Page title.
 *
 * @param props - Text and classes.
 * @returns The `h1`.
 */
export function LiveTitle({ text, className }: LiveTitleProps): ReactNode {
  const settings = useEffectiveEffects().settings.liveTitle;
  const tokens = useMotionTokens();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!settings.enabled || !heading.current) {
      return undefined;
    }
    return followWeight(heading.current, settings);
  }, [settings]);
  if (!settings.enabled) {
    return <h1 className={className}>{text}</h1>;
  }
  return (
    <h1 ref={heading} className={className} aria-label={text} data-live-title>
      <motion.span
        key={text}
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: tokens.staggerSeconds }}
      >
        {Array.from(text).map((letter, index) => (
          <motion.span key={index} variants={tokens.reveal} className="inline-block whitespace-pre">
            {letter}
          </motion.span>
        ))}
      </motion.span>
    </h1>
  );
}
