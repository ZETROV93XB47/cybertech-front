/**
 * CSS entrance of server-rendered blocks (`.enter-fade`, `.enter-rise` in `styles/globals.css`):
 * the content stays visible without JavaScript, and the staggered delay comes from the motion
 * tokens (`--stagger`) of the chosen intensity.
 *
 * @see specs/002-catalog-refresh/research.md R14
 */
import type { CSSProperties, ReactNode } from "react";

import { EnterAnimation } from "@/lib/enums/enter-animation";
import { cn } from "@/lib/utils";

/** Position after which every element enters at the same time, so long lists never lag. */
export const ENTER_MAX_INDEX = 8;

/** CSS custom property holding the position of an element in its cascade. */
const ENTER_INDEX_PROPERTY = "--enter-index";

/**
 * Inline style placing an element in a cascade.
 *
 * @param index - Zero-based position.
 * @returns The style setting `--enter-index`, capped to {@link ENTER_MAX_INDEX}.
 */
export function enterStyle(index: number): CSSProperties {
  return { [ENTER_INDEX_PROPERTY]: Math.min(index, ENTER_MAX_INDEX) } as CSSProperties;
}

/** Props of {@link Enter}. */
export interface EnterProps {
  readonly children: ReactNode;
  /** Position in the cascade of the page. */
  readonly index: number;
  readonly animation?: EnterAnimation;
  readonly className?: string;
}

/**
 * Block entering with the cascade of its page.
 *
 * @param props - Content, position, kind and classes.
 * @returns The animated block.
 */
export function Enter({
  children,
  index,
  animation = EnterAnimation.RISE,
  className,
}: EnterProps): ReactNode {
  return (
    <div className={cn(animation, className)} style={enterStyle(index)}>
      {children}
    </div>
  );
}
