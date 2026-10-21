"use client";

/**
 * Product photo with a fallback: when the file cannot be loaded (deleted from S3, LocalStack
 * restarted without persistence), the category icon replaces the broken image.
 *
 * The photo is shown whole (`object-contain`, never cropped) on the colour of the photos' own
 * backdrop (`photoBackdrop` in the theme), so it fills its frame without dark side bands.
 */
import Image from "next/image";
import { useState, type ReactNode } from "react";

import type { MediaSize } from "@/lib/theme/types";
import { cn } from "@/lib/utils";

import { categoryIcon } from "../category-icons";
import { PRODUCT_MESSAGES } from "../messages";

/** Props of {@link ProductImage}. */
export interface ProductImageProps {
  /** Photo URL, `null` when the product has none. */
  readonly src: string | null;
  /** Alternative text; empty for a decorative photo (the name is written next to it). */
  readonly alt: string;
  /** Product category, to pick the fallback icon. */
  readonly category: string;
  /** Slot size from `THEME.media`. */
  readonly media: MediaSize;
  readonly priority?: boolean;
  readonly className?: string;
  /** Size classes of the fallback icon. */
  readonly iconClassName?: string | undefined;
}

/**
 * Category icon shown instead of a missing photo.
 *
 * @param props - Category and icon size.
 * @returns The icon with a text alternative.
 */
function PhotoFallback({
  category,
  iconClassName,
}: Pick<ProductImageProps, "category" | "iconClassName">): ReactNode {
  const Icon = categoryIcon(category);
  return (
    <div className="flex size-full items-center justify-center bg-surface-2 text-text-muted">
      <Icon aria-hidden className={cn("size-10", iconClassName)} />
      <span className="sr-only">{PRODUCT_MESSAGES.noPhoto}</span>
    </div>
  );
}

/**
 * Photo of a product, or its category icon.
 *
 * @param props - Photo, size and fallback options.
 * @returns The image or the fallback.
 */
export function ProductImage({
  src,
  alt,
  category,
  media,
  priority = false,
  className,
  iconClassName,
}: ProductImageProps): ReactNode {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src === null || src === failedSrc) {
    return <PhotoFallback category={category} iconClassName={iconClassName} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={media.width}
      height={media.height}
      sizes={media.sizes}
      priority={priority}
      onError={() => {
        setFailedSrc(src);
      }}
      className={cn("size-full bg-photo-backdrop object-contain", className)}
    />
  );
}
