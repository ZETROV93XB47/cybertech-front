"use client";

/**
 * Position dots of the home carousel: one button per slide, the current one with
 * `aria-current` and a wider gold pill, so the position is not conveyed by colour alone (FR-009).
 *
 * @see specs/004-catalog-promos-reviews/research.md R4
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { CAROUSEL_MESSAGES } from "../messages";

/** Props of {@link CarouselDots}. */
export interface CarouselDotsProps {
  readonly count: number;
  readonly current: number;
  readonly onSelect: (index: number) => void;
}

/**
 * Dots.
 *
 * @param props - Number of slides, current index and handler.
 * @returns The dot buttons.
 */
export function CarouselDots({ count, current, onSelect }: CarouselDotsProps): ReactNode {
  return (
    <div role="group" aria-label={CAROUSEL_MESSAGES.dotsLabel} className="flex items-center gap-1">
      {Array.from({ length: count }, (_, index) => {
        const isCurrent = index === current;
        return (
          <button
            key={index}
            type="button"
            aria-label={CAROUSEL_MESSAGES.goTo(index + 1)}
            aria-current={isCurrent ? "true" : undefined}
            onClick={() => {
              onSelect(index);
            }}
            className="inline-flex size-6 items-center justify-center rounded-full"
          >
            <span
              aria-hidden
              className={cn(
                "h-2 rounded-full transition-all duration-(--duration-fast)",
                isCurrent ? "w-5 bg-gold" : "w-2 bg-text-muted",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
