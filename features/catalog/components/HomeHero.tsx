/**
 * Banner at the top of the home page: a close-up photo of a laptop behind the page header, so a
 * visitor sees at first glance that the site sells computers.
 *
 * The photo is decorative (`alt=""`, the header says it all), loaded eagerly as it is the
 * largest element of the first paint, and darkened on its left side so the title stays readable
 * (contrast checked by the a11y e2e).
 *
 * Photo: Ludovic Delot, Unsplash License (https://unsplash.com/photos/pW6Q2ifY87M), see
 * `docs/credits.md`.
 */
import Image from "next/image";
import type { ReactNode } from "react";

import heroLaptop from "@/public/images/hero-laptop.jpg";
import { THEME } from "@/lib/theme/theme.config";

/** Props of {@link HomeHero}. */
export interface HomeHeroProps {
  /** Page header shown over the photo. */
  readonly children: ReactNode;
}

/**
 * Photo banner with the page header over it.
 *
 * @param props - The header.
 * @returns The banner.
 */
export function HomeHero({ children }: HomeHeroProps): ReactNode {
  return (
    <div className="relative isolate overflow-hidden rounded-card border border-border">
      <Image
        src={heroLaptop}
        alt=""
        priority
        placeholder="blur"
        sizes={THEME.media.hero.sizes}
        className="absolute inset-0 -z-10 size-full object-cover object-right"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-r from-bg via-bg/80 to-transparent"
      />
      <div className="flex min-h-96 flex-col justify-center p-10 lg:p-14">{children}</div>
    </div>
  );
}
