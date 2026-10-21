"use client";

/**
 * Buttons of the home carousel: pause / play (first in the tab order, only while the carousel can
 * rotate), previous and next (FR-009).
 *
 * @see specs/004-catalog-promos-reviews/research.md R4
 */
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { ReactNode } from "react";

import { CarouselPlayback } from "@/lib/enums/home";

import { CAROUSEL_MESSAGES } from "../messages";

/** Look of the round glass buttons over the photo. */
export const CAROUSEL_BUTTON_CLASS =
  "glass inline-flex size-10 items-center justify-center rounded-full text-text transition-colors duration-(--duration-fast) hover:text-brand-text";

/** Props of {@link CarouselPlaybackButton}. */
export interface CarouselPlaybackButtonProps {
  readonly playback: CarouselPlayback;
  readonly onToggle: () => void;
}

/**
 * Pause / play button; nothing when the rotation is disabled.
 *
 * @param props - Playback state and toggle.
 * @returns The button, or `null`.
 */
export function CarouselPlaybackButton({
  playback,
  onToggle,
}: CarouselPlaybackButtonProps): ReactNode {
  if (playback === CarouselPlayback.DISABLED) {
    return null;
  }
  const isPlaying = playback === CarouselPlayback.PLAYING;
  const Icon = isPlaying ? Pause : Play;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isPlaying ? CAROUSEL_MESSAGES.pause : CAROUSEL_MESSAGES.play}
      className={CAROUSEL_BUTTON_CLASS}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}

/** Props of {@link CarouselArrows}. */
export interface CarouselArrowsProps {
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

/**
 * Previous and next buttons.
 *
 * @param props - Handlers.
 * @returns The two buttons.
 */
export function CarouselArrows({ onPrevious, onNext }: CarouselArrowsProps): ReactNode {
  return (
    <>
      <button
        type="button"
        onClick={onPrevious}
        aria-label={CAROUSEL_MESSAGES.previous}
        className={CAROUSEL_BUTTON_CLASS}
      >
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label={CAROUSEL_MESSAGES.next}
        className={CAROUSEL_BUTTON_CLASS}
      >
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </>
  );
}
