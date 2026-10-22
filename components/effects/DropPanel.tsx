"use client";

/**
 * Floating panel of the header menus and of the « Trier par » list: card surface, gold-violet
 * line on top, and an opening that drops and grows from its trigger at full effects.
 *
 * Shared so every dropdown of the site opens the same way. Reduced or disabled effects and
 * `prefers-reduced-motion` give the static panel (`data-entrance="fade"`, no transform).
 *
 * @see specs/004-catalog-promos-reviews/research.md R3
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { EntranceMode } from "@/lib/enums/entrance-mode";
import { cn } from "@/lib/utils";
import { useMotionTokens, useSurfaceMotion } from "@/styles/motion";

/** Vertical offset of the panel at the start of its opening, in Motion units (pixels). */
const PANEL_DROP_OFFSET = -6;

/** Scale of the panel at the start of its opening (it grows from the trigger). */
const PANEL_START_SCALE = 0.96;

/** Corner of the panel its opening grows from: the one under its trigger. */
export enum PanelOrigin {
  /** Panel aligned on the left edge of its trigger. */
  TOP_LEFT = "top left",
  /** Panel aligned on the right edge of its trigger. */
  TOP_RIGHT = "top right",
}

/** Props of {@link DropPanel}. */
export interface DropPanelProps {
  readonly children: ReactNode;
  /** Corner the opening grows from. */
  readonly origin: PanelOrigin;
  /** Placement and width classes (the surface itself is fixed). */
  readonly className?: string;
  /** Id of the panel, when its trigger points to it (`aria-controls`). */
  readonly id?: string;
}

/**
 * Dropdown panel.
 *
 * @param props - Content, origin corner, classes and id.
 * @returns The animated panel.
 */
export function DropPanel({ children, origin, className, id }: DropPanelProps): ReactNode {
  const { mode } = useSurfaceMotion();
  const tokens = useMotionTokens();
  const isAnimated = mode === EntranceMode.MOVE;
  return (
    <motion.div
      id={id}
      data-entrance={isAnimated ? EntranceMode.MOVE : EntranceMode.FADE}
      initial={isAnimated ? { opacity: 0, y: PANEL_DROP_OFFSET, scale: PANEL_START_SCALE } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={tokens.base}
      style={{ transformOrigin: origin }}
      className={cn(
        "relative overflow-hidden rounded-card border border-border bg-surface p-2 shadow-card-hover",
        className,
      )}
    >
      <span aria-hidden className="cta-gradient absolute inset-x-0 top-0 h-0.5" />
      {children}
    </motion.div>
  );
}
