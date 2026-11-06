"use client";

/**
 * Unfolding of a block that opens in place (checkout steps, feature 003 T074): at full effects
 * the block grows from a zero height while fading in; with reduced or disabled effects, or with
 * system reduced motion, it only fades in. Durations come from the motion tokens.
 *
 * @see specs/003-account-orders/tasks.md T074
 * @see styles/motion.ts useSurfaceMotion
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { EntranceMode } from "@/lib/enums/entrance-mode";
import { useMotionTokens, useSurfaceMotion } from "@/styles/motion";

/** Props of {@link Unfold}. */
export interface UnfoldProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Block unfolding when it mounts.
 *
 * @param props - Content and classes.
 * @returns The animated block, tagged with its entrance mode (`data-entrance`).
 */
export function Unfold({ children, className }: UnfoldProps): ReactNode {
  const { mode } = useSurfaceMotion();
  const tokens = useMotionTokens();
  const isMove = mode === EntranceMode.MOVE;
  return (
    <motion.div
      data-entrance={mode}
      initial={isMove ? { opacity: 0, height: 0 } : { opacity: 0 }}
      animate={isMove ? { opacity: 1, height: "auto" } : { opacity: 1 }}
      transition={tokens.base}
      className={isMove ? `overflow-hidden ${className ?? ""}` : className}
    >
      {children}
    </motion.div>
  );
}
