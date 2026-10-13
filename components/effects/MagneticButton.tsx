"use client";

/**
 * Magnetic wrapper of a primary call to action (spec annex « Boutons magnétiques »): within
 * `radiusPx` of its centre, the child is slightly pulled toward the cursor.
 *
 * Parameters from `THEME.effects[level].magnetic`; a plain inline wrapper when disabled
 * (preference OFF or REDUCED, or system reduced motion). Pointer events only update a CSS
 * transform, with no animation loop.
 */
import { useRef, type PointerEvent, type ReactNode } from "react";

import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";

/** Divisor giving the centre of the element. */
const HALF_DIVISOR = 2;

/** Props of {@link MagneticButton}. */
export interface MagneticButtonProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Offset of the element toward the cursor.
 *
 * @param event - Pointer event.
 * @param element - Wrapper element.
 * @param settings - Magnetic settings.
 * @returns The translation, `{ x: 0, y: 0 }` outside the radius.
 */
export function magneticOffset(
  event: { readonly clientX: number; readonly clientY: number },
  element: { getBoundingClientRect(): DOMRect },
  settings: { readonly strength: number; readonly radiusPx: number },
): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  const dx = event.clientX - (box.left + box.width / HALF_DIVISOR);
  const dy = event.clientY - (box.top + box.height / HALF_DIVISOR);
  const reach = Math.max(box.width, box.height) / HALF_DIVISOR + settings.radiusPx;
  if (Math.hypot(dx, dy) > reach) {
    return { x: 0, y: 0 };
  }
  return { x: dx * settings.strength, y: dy * settings.strength };
}

/**
 * Magnetic wrapper.
 *
 * @param props - The call to action and optional classes.
 * @returns The wrapper.
 */
export function MagneticButton({ children, className }: MagneticButtonProps): ReactNode {
  const settings = useEffectiveEffects().settings.magnetic;
  const wrapper = useRef<HTMLSpanElement>(null);
  if (!settings.enabled) {
    return <span className={className}>{children}</span>;
  }
  const onPointerMove = (event: PointerEvent<HTMLSpanElement>): void => {
    const element = wrapper.current;
    if (element) {
      const { x, y } = magneticOffset(event, element, settings);
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  };
  const onPointerLeave = (): void => {
    if (wrapper.current) {
      wrapper.current.style.transform = "";
    }
  };
  return (
    <span
      ref={wrapper}
      data-magnetic
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`inline-block transition-transform duration-(--duration-base) ease-aurora ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
