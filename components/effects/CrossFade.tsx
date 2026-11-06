"use client";

/**
 * Cross-fade of a value that changes in place (checkout amounts, feature 003 T074): the new value
 * fades in over the old one, with a small rise at full effects and a plain fade with reduced or
 * disabled effects or system reduced motion. Durations come from the motion tokens.
 *
 * @see specs/003-account-orders/tasks.md T074
 */
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { EntranceMode } from "@/lib/enums/entrance-mode";
import { THEME } from "@/lib/theme/theme.config";
import { useMotionIntensity } from "@/features/preferences/PreferencesProvider";
import { useMotionTokens, useSurfaceMotion } from "@/styles/motion";

/** Props of {@link CrossFade}. */
export interface CrossFadeProps {
  /** Text shown; a new value replaces the previous one with the fade. */
  readonly value: string;
  readonly className?: string;
}

/**
 * Value replaced with a cross-fade.
 *
 * @param props - Value and classes.
 * @returns The animated value, tagged with its entrance mode (`data-entrance`).
 */
export function CrossFade({ value, className }: CrossFadeProps): ReactNode {
  const { mode } = useSurfaceMotion();
  const tokens = useMotionTokens();
  const offset = THEME.motion[useMotionIntensity()].revealOffsetPx;
  const hidden = mode === EntranceMode.MOVE ? { opacity: 0, y: offset } : { opacity: 0 };
  return (
    <span className={`inline-grid ${className ?? ""}`}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          data-entrance={mode}
          initial={hidden}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={tokens.fast}
          className="col-start-1 row-start-1"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
