"use client";

/**
 * One slide of the home carousel: the photo (a link to the slide's destination), a gradient
 * keeping the text readable, then the kicker, title, tagline, product count and call to action
 * (FR-008).
 *
 * Every slide stays in the page, stacked: the hidden ones are transparent and `inert`, so neither
 * the keyboard nor a screen reader nor a click reaches them. The shown one fades in at full
 * effects; otherwise the switch is instant (FR-010). When its photo fails to load, the slide keeps
 * its gradient background, its title and its link (edge case).
 *
 * @see specs/004-catalog-promos-reviews/research.md R4
 */
import { motion, type Transition } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { MagneticButton } from "@/components/effects/MagneticButton";
import { PRIMARY_CTA_CLASS } from "@/components/layout/cta";
import { SlideKind, SlideTransition } from "@/lib/enums/home";
import { THEME } from "@/lib/theme/theme.config";
import { cn } from "@/lib/utils";

import type { HomeSlide } from "../home-slides";
import { CAROUSEL_MESSAGES } from "../messages";

/** Transition of a switch without animation. */
const INSTANT: Transition = { duration: 0 };

/** Props of {@link CarouselSlide}. */
export interface CarouselSlideProps {
  readonly slide: HomeSlide;
  /** 1-based position and total, for the accessible name « 2 sur 9 ». */
  readonly position: number;
  readonly total: number;
  readonly isCurrent: boolean;
  /** Cross-fade transition, or `null` for an instant switch. */
  readonly fade: Transition | null;
}

/**
 * Kicker, title, tagline, count and call to action.
 *
 * @param props - The slide.
 * @returns The text block.
 */
function SlideText({ slide }: { readonly slide: HomeSlide }): ReactNode {
  const isCategory = slide.kind === SlideKind.CATEGORY;
  return (
    <div className="pointer-events-none relative flex h-full max-w-2xl flex-col justify-center gap-4 p-10 lg:p-14">
      <p className="text-sm font-medium tracking-wide text-gold uppercase">
        {isCategory ? CAROUSEL_MESSAGES.categoryKicker : CAROUSEL_MESSAGES.campaignKicker}
      </p>
      <h2 className="font-display text-4xl leading-tight text-text lg:text-5xl">{slide.title}</h2>
      <p className="text-lg text-text-muted">{slide.tagline}</p>
      {isCategory && slide.count !== null && (
        <p className="font-mono text-sm text-text-muted">
          {CAROUSEL_MESSAGES.productCount(slide.count)}
        </p>
      )}
      <MagneticButton className="pointer-events-auto self-start">
        <Link href={slide.href} className={PRIMARY_CTA_CLASS}>
          {slide.cta}
        </Link>
      </MagneticButton>
    </div>
  );
}

/**
 * Carousel slide.
 *
 * @param props - Slide, position, current state and transition.
 * @returns The slide group.
 */
export function CarouselSlide({
  slide,
  position,
  total,
  isCurrent,
  fade,
}: CarouselSlideProps): ReactNode {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <motion.div
      role="group"
      aria-roledescription={CAROUSEL_MESSAGES.slideRoleDescription}
      aria-label={CAROUSEL_MESSAGES.slidePosition(position, total)}
      inert={!isCurrent}
      data-slide-id={slide.id}
      data-transition={fade === null ? SlideTransition.INSTANT : SlideTransition.FADE}
      initial={false}
      animate={{ opacity: isCurrent ? 1 : 0 }}
      transition={fade ?? INSTANT}
      className={cn("absolute inset-0 isolate", isCurrent ? "z-1" : "z-0")}
    >
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-br from-surface-2 to-bg" />
      <Link href={slide.href} tabIndex={-1} className="absolute inset-0 -z-10">
        {!imageFailed && (
          <Image
            src={slide.image}
            alt={slide.imageAlt}
            fill
            priority={position === 1}
            sizes={THEME.media.slide.sizes}
            placeholder="blur"
            onError={() => {
              setImageFailed(true);
            }}
            className="object-cover object-right"
          />
        )}
      </Link>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-bg via-bg/80 to-transparent"
      />
      <SlideText slide={slide} />
    </motion.div>
  );
}
