"use client";

/**
 * Rotation of the home carousel: current slide, previous / next / go to, and the automatic
 * rotation (FR-009, FR-010).
 *
 * The rotation runs only when the visitor did not press pause and the carousel is neither
 * hovered, nor focused, nor in a hidden tab: one `setTimeout` per slide, cleared on every change.
 * It is `DISABLED` (no timer at all) with a single slide, or when the applied effects have no
 * autoplay (reduced, off, or `prefers-reduced-motion`, which forces the effects off).
 *
 * @see specs/004-catalog-promos-reviews/research.md R4
 * @see specs/004-catalog-promos-reviews/data-model.md §3
 */
import { useCallback, useEffect, useState, type FocusEvent } from "react";

import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";
import { CarouselPlayback } from "@/lib/enums/home";

/** Pointer type of a mouse (a touch does not hover). */
const MOUSE_POINTER = "mouse";

/** Value of `document.visibilityState` for a hidden tab. */
const HIDDEN_VISIBILITY = "hidden";

/** Handlers to spread on the carousel root. */
export interface CarouselRootHandlers {
  readonly onPointerEnter: (event: { readonly pointerType: string }) => void;
  readonly onPointerLeave: (event: { readonly pointerType: string }) => void;
  readonly onFocus: () => void;
  readonly onBlur: (event: FocusEvent<HTMLElement>) => void;
}

/** State and actions returned by {@link useCarousel}. */
export interface Carousel {
  /** Index of the slide shown. */
  readonly index: number;
  /** `PLAYING`, `PAUSED` by the visitor, or `DISABLED`. */
  readonly playback: CarouselPlayback;
  /** Whether a timer is running right now (playing, not hovered, focused nor hidden). */
  readonly isRotating: boolean;
  readonly next: () => void;
  readonly previous: () => void;
  readonly goTo: (index: number) => void;
  /** Pause button: `PLAYING` ⇄ `PAUSED`. */
  readonly togglePlayback: () => void;
  readonly rootHandlers: CarouselRootHandlers;
}

/**
 * Tracks whether the tab is hidden.
 *
 * @returns `true` while `document.visibilityState` is `hidden`.
 */
function useTabHidden(): boolean {
  const [isHidden, setHidden] = useState(false);
  useEffect(() => {
    const update = (): void => {
      setHidden(document.visibilityState === HIDDEN_VISIBILITY);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return isHidden;
}

/**
 * Hover and focus inside the carousel root.
 *
 * @returns The two flags and the handlers that set them.
 */
function useHoverAndFocus(): {
  readonly isHovered: boolean;
  readonly isFocused: boolean;
  readonly rootHandlers: CarouselRootHandlers;
} {
  const [isHovered, setHovered] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const rootHandlers: CarouselRootHandlers = {
    onPointerEnter: (event) => {
      if (event.pointerType === MOUSE_POINTER) setHovered(true);
    },
    onPointerLeave: (event) => {
      if (event.pointerType === MOUSE_POINTER) setHovered(false);
    },
    onFocus: () => {
      setFocused(true);
    },
    onBlur: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    },
  };
  return { isHovered, isFocused, rootHandlers };
}

/**
 * Playback state of the carousel.
 *
 * @param isDisabled - No rotation possible (one slide, or no autoplay at these effects).
 * @param isPaused - The visitor pressed pause.
 * @returns `DISABLED`, `PAUSED` or `PLAYING`.
 */
function playbackOf(isDisabled: boolean, isPaused: boolean): CarouselPlayback {
  if (isDisabled) {
    return CarouselPlayback.DISABLED;
  }
  return isPaused ? CarouselPlayback.PAUSED : CarouselPlayback.PLAYING;
}

/**
 * Moves to the next slide after `intervalMs`, while rotating; the timer restarts on every slide
 * change, so a manual change gives the new slide its full time.
 *
 * @param isRotating - Whether the rotation runs.
 * @param index - Slide shown.
 * @param intervalMs - Time a slide stays on screen.
 * @param advance - Moves to the next slide.
 */
function useAutoAdvance(
  isRotating: boolean,
  index: number,
  intervalMs: number,
  advance: () => void,
): void {
  useEffect(() => {
    if (!isRotating) {
      return undefined;
    }
    const timer = window.setTimeout(advance, intervalMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isRotating, index, intervalMs, advance]);
}

/**
 * Rotation of a carousel.
 *
 * @param count - Number of slides.
 * @returns The current slide, the playback state and the actions.
 */
export function useCarousel(count: number): Carousel {
  const { settings } = useEffectiveEffects();
  const [index, setIndex] = useState(0);
  const [isPaused, setPaused] = useState(false);
  const isHidden = useTabHidden();
  const { isHovered, isFocused, rootHandlers } = useHoverAndFocus();
  const playback = playbackOf(count <= 1 || !settings.carousel.autoplay, isPaused);
  const isRotating = playback === CarouselPlayback.PLAYING && !isHovered && !isFocused && !isHidden;
  const advance = useCallback((): void => {
    setIndex((current) => (current + 1) % count);
  }, [count]);
  useAutoAdvance(isRotating, index, settings.carousel.intervalMs, advance);
  const goTo = (target: number): void => {
    setIndex(((target % count) + count) % count);
  };
  return {
    index,
    playback,
    isRotating,
    next: () => {
      goTo(index + 1);
    },
    previous: () => {
      goTo(index - 1);
    },
    goTo,
    togglePlayback: () => {
      setPaused((paused) => !paused);
    },
    rootHandlers,
  };
}
