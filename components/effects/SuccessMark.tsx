"use client";

/**
 * Animated success check of the forms of feature 003 (profile saved, card updated, order
 * edited, T076): it pops in at full effects and only fades in with reduced or disabled effects
 * or system reduced motion. Decorative: the success text next to it carries the meaning.
 *
 * @see specs/003-account-orders/tasks.md T076
 */
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { EntranceMode } from "@/lib/enums/entrance-mode";
import { cn } from "@/lib/utils";
import { useMotionTokens, useSurfaceMotion } from "@/styles/motion";

/** Starting scale of the check when it pops in at full effects (same as the compare check). */
const SUCCESS_POP_SCALE = 0.4;

/** Props of {@link SuccessMark}. */
export interface SuccessMarkProps {
  readonly className?: string;
}

/**
 * Success check.
 *
 * @param props - Size and color classes.
 * @returns The animated icon, tagged with its entrance mode (`data-entrance`).
 */
export function SuccessMark({ className }: SuccessMarkProps): ReactNode {
  const { mode } = useSurfaceMotion();
  const tokens = useMotionTokens();
  const hidden =
    mode === EntranceMode.MOVE ? { opacity: 0, scale: SUCCESS_POP_SCALE } : { opacity: 0 };
  return (
    <motion.span
      aria-hidden
      data-entrance={mode}
      data-success-mark
      initial={hidden}
      animate={{ opacity: 1, scale: 1 }}
      transition={tokens.base}
      className="inline-flex shrink-0"
    >
      <CheckCircle2 className={cn("size-5 text-success", className)} />
    </motion.span>
  );
}
