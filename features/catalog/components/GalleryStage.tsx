"use client";

/**
 * Main photo of the product gallery: cross-fade when another photo is chosen, and a magnifier
 * that follows the cursor on hover (zoom factor from `THEME.effects[level].galleryZoom`, off
 * when the effects are off or the system asks for reduced motion).
 */
import { AnimatePresence, motion } from "motion/react";
import { useRef, type PointerEvent, type ReactNode } from "react";

import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";
import { useMotionTokens } from "@/styles/motion";

/** Converts a fraction (0–1) to a percentage. */
const PERCENT = 100;

/** Props of {@link GalleryStage}. */
export interface GalleryStageProps {
  /** Index of the photo shown: a change triggers the cross-fade. */
  readonly photoKey: number;
  readonly children: ReactNode;
}

/**
 * Animated stage of the main photo.
 *
 * @param props - Current photo index and the photo.
 * @returns The stage.
 */
export function GalleryStage({ photoKey, children }: GalleryStageProps): ReactNode {
  const zoom = useEffectiveEffects().settings.galleryZoom;
  const tokens = useMotionTokens();
  const layer = useRef<HTMLDivElement>(null);
  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const element = layer.current;
    if (!zoom.enabled || !element) {
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * PERCENT;
    const y = ((event.clientY - box.top) / box.height) * PERCENT;
    element.style.transformOrigin = `${x}% ${y}%`;
    element.style.transform = `scale(${zoom.scale})`;
  };
  const onPointerLeave = (): void => {
    layer.current?.style.removeProperty("transform");
  };
  return (
    <div
      className="relative size-full overflow-hidden"
      data-zoom={zoom.enabled ? "" : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={photoKey}
          className="size-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={tokens.base}
        >
          <div
            ref={layer}
            className="size-full transition-transform duration-(--duration-base) ease-aurora"
          >
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
