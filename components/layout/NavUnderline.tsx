"use client";

/**
 * Gold underline of the current entry of the main navigation (link or « Catalogue » menu
 * trigger), so the current section is never conveyed by colour alone (FR-026).
 *
 * At full effects it slides from one entry to the next (shared layout animation); otherwise it
 * simply moves (R14).
 *
 * @see specs/002-catalog-refresh/research.md R12
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { EntranceMode } from "@/lib/enums/entrance-mode";
import { useMotionTokens, useSurfaceMotion } from "@/styles/motion";

/** Shared layout id of the underline, so it slides between entries. */
const UNDERLINE_LAYOUT_ID = "main-nav-underline";

/**
 * Gold underline of the current entry.
 *
 * @returns The indicator, sliding between entries at full effects.
 */
export function NavUnderline(): ReactNode {
  const { mode } = useSurfaceMotion();
  const tokens = useMotionTokens();
  return (
    <motion.span
      aria-hidden
      data-nav-indicator
      data-entrance={mode}
      {...(mode === EntranceMode.MOVE ? { layoutId: UNDERLINE_LAYOUT_ID } : {})}
      transition={tokens.base}
      className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-gold"
    />
  );
}
