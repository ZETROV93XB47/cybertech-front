"use client";

/**
 * Home carousel (FR-007 to FR-010): one slide per active category and per running campaign,
 * built on the server; only the rotation runs here.
 *
 * WAI-ARIA carousel pattern (research R4): a named `section` with `aria-roledescription`, the
 * pause / play button first in the tab order, previous / next and position dots, and a slides
 * region announced only after a visitor action (`aria-live="off"` while rotating by itself). The
 * height is fixed by the theme classes, so the page does not shift when the photos arrive.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US3
 */
import type { ReactNode } from "react";

import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";
import { useMotionTokens } from "@/styles/motion";

import type { HomeSlide } from "../home-slides";
import { useCarousel } from "../hooks/useCarousel";
import { CAROUSEL_MESSAGES } from "../messages";

import { CarouselArrows, CarouselPlaybackButton } from "./CarouselControls";
import { CarouselDots } from "./CarouselDots";
import { CarouselSlide } from "./CarouselSlide";

/** Props of {@link HomeCarousel}. */
export interface HomeCarouselProps {
  readonly slides: readonly HomeSlide[];
}

/**
 * Home carousel.
 *
 * @param props - Slides, in display order.
 * @returns The carousel, or nothing without slides.
 */
export function HomeCarousel({ slides }: HomeCarouselProps): ReactNode {
  const carousel = useCarousel(slides.length);
  const { settings } = useEffectiveEffects();
  const tokens = useMotionTokens();
  if (slides.length === 0) {
    return null;
  }
  const hasControls = slides.length > 1;
  const fade = settings.carousel.crossFade ? tokens.slow : null;
  return (
    <section
      aria-roledescription={CAROUSEL_MESSAGES.roleDescription}
      aria-label={CAROUSEL_MESSAGES.name}
      data-playback={carousel.playback}
      className="relative h-96 overflow-hidden rounded-card border border-border lg:h-112"
      {...carousel.rootHandlers}
    >
      {hasControls && (
        <div className="absolute right-6 bottom-6 z-10 flex items-center gap-2">
          <CarouselPlaybackButton playback={carousel.playback} onToggle={carousel.togglePlayback} />
          <CarouselArrows onPrevious={carousel.previous} onNext={carousel.next} />
        </div>
      )}
      <div aria-live={carousel.isRotating ? "off" : "polite"}>
        {slides.map((slide, index) => (
          <CarouselSlide
            key={slide.id}
            slide={slide}
            position={index + 1}
            total={slides.length}
            isCurrent={index === carousel.index}
            fade={fade}
          />
        ))}
      </div>
      {hasControls && (
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
          <CarouselDots count={slides.length} current={carousel.index} onSelect={carousel.goTo} />
        </div>
      )}
    </section>
  );
}
