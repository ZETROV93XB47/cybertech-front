/**
 * Photo of a product line, shared by the checkout summary, the confirmation and the order detail
 * (feature 003 T072, T075): the real product photo, or the category icon when the product has
 * none or left the catalog. It tilts under the pointer at full effects (`TiltCard`) and stays
 * flat otherwise. Decorative: the product name is written next to it.
 *
 * @see specs/003-account-orders/tasks.md T072, T075
 */
import type { ReactNode } from "react";

import { TiltCard } from "@/components/effects/TiltCard";
import { ProductImage } from "@/features/catalog/components/ProductImage";
import { THEME } from "@/lib/theme/theme.config";
import { cn } from "@/lib/utils";

/** Size of a line photo. */
export enum LineThumbnailSize {
  /** Narrow summaries (checkout, confirmation). */
  SMALL = "small",
  /** Order detail lines. */
  MEDIUM = "medium",
}

/** Width classes of each {@link LineThumbnailSize}, from the spacing scale. */
const SIZE_CLASSES: Readonly<Record<LineThumbnailSize, string>> = {
  [LineThumbnailSize.SMALL]: "w-14",
  [LineThumbnailSize.MEDIUM]: "w-20",
};

/** Props of {@link LineThumbnail}. */
export interface LineThumbnailProps {
  /** Photo URL, `null` when unknown. */
  readonly src: string | null;
  /** Raw category, for the fallback icon; empty when unknown. */
  readonly category: string | null;
  readonly size?: LineThumbnailSize;
}

/**
 * Line photo.
 *
 * @param props - Photo, category and size.
 * @returns The tilting photo frame.
 */
export function LineThumbnail({
  src,
  category,
  size = LineThumbnailSize.SMALL,
}: LineThumbnailProps): ReactNode {
  return (
    <TiltCard
      className={cn(
        "aspect-4/3 shrink-0 overflow-hidden rounded-field bg-surface-2",
        SIZE_CLASSES[size],
      )}
    >
      <ProductImage
        src={src}
        alt=""
        category={category ?? ""}
        media={THEME.media.thumbnail}
        iconClassName="size-5"
      />
    </TiltCard>
  );
}
