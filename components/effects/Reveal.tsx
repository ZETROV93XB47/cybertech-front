"use client";

/**
 * Staggered entrance of a page's main blocks (spec annex « Apparition » : fondu + translation,
 * 300–400 ms, ease-out, avec stagger). Durations, offset and stagger come from the motion tokens
 * of the chosen intensity; with system reduced motion, `MotionConfig` keeps only the fade.
 *
 * One orchestrated moment per page: wrap the blocks once, not every element.
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { useMotionTokens } from "@/styles/motion";

/** Props shared by {@link RevealGroup} and {@link RevealItem}. */
export interface RevealProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Container whose {@link RevealItem} children appear one after the other.
 *
 * @param props - Children and classes.
 * @returns The animated container.
 */
export function RevealGroup({ children, className }: RevealProps): ReactNode {
  const tokens = useMotionTokens();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: tokens.staggerSeconds }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: tokens.staggerSeconds } } }}
    >
      {children}
    </motion.div>
  );
}

/**
 * One block of a {@link RevealGroup}.
 *
 * @param props - Children and classes.
 * @returns The animated block.
 */
export function RevealItem({ children, className }: RevealProps): ReactNode {
  const tokens = useMotionTokens();
  return (
    <motion.div className={className} variants={tokens.reveal}>
      {children}
    </motion.div>
  );
}
