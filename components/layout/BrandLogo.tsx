/**
 * The cybertech logo supplied by the owner (feature 005, Phase 7): the mark and the wordmark in
 * the header, the full lockup with « Premium tech store » in the footer. The files are made
 * transparent from `styles/cybertech-logo-1-fond-sombre.png` by `scripts/brand-assets.mjs`;
 * static imports give `next/image` their size, and the height comes from the theme (constitution
 * XIII), the width following the image.
 *
 * @see specs/005-web-push-notifications/tasks.md Phase 7
 */
import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";

import { SITE_MESSAGES } from "@/features/common/messages";
import { assertNever } from "@/lib/assert-never";
import { cn } from "@/lib/utils";
import lockup from "@/public/brand/cybertech-lockup.png";
import wordmark from "@/public/brand/cybertech-wordmark.png";

/** Which version of the logo is shown. */
export enum BrandLogoVariant {
  /** Mark and wordmark, for the header. */
  WORDMARK = "wordmark",
  /** Mark, wordmark and tagline, for the footer. */
  LOCKUP = "lockup",
}

/** File, text alternative and height class of one variant. */
interface BrandLogoAsset {
  readonly image: StaticImageData;
  readonly alt: string;
  readonly heightClass: string;
}

/**
 * Asset of a variant.
 *
 * @param variant - Version of the logo.
 * @returns Its file, text alternative and height.
 */
function assetOf(variant: BrandLogoVariant): BrandLogoAsset {
  switch (variant) {
    case BrandLogoVariant.WORDMARK:
      return { image: wordmark, alt: SITE_MESSAGES.name, heightClass: "h-logo-header" };
    case BrandLogoVariant.LOCKUP:
      return { image: lockup, alt: SITE_MESSAGES.logoLockupAlt, heightClass: "h-logo-footer" };
    default:
      return assertNever(variant);
  }
}

/** Props of {@link BrandLogo}. */
export interface BrandLogoProps {
  readonly variant: BrandLogoVariant;
  /** Loads it first: the header logo is above the fold on every page. */
  readonly isPriority?: boolean;
  readonly className?: string;
}

/**
 * The logo.
 *
 * @param props - Variant, priority and extra classes.
 * @returns The image.
 */
export function BrandLogo({ variant, isPriority = false, className }: BrandLogoProps): ReactNode {
  const { image, alt, heightClass } = assetOf(variant);
  return (
    <Image
      src={image}
      alt={alt}
      priority={isPriority}
      className={cn(heightClass, "w-auto", className)}
    />
  );
}
