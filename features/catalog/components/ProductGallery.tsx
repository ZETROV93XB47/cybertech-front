/**
 * Photo gallery of the product page.
 *
 * Photos that fail to load fall back to the category icon ({@link ProductImage}).
 * The selected photo is a URL parameter (`?photo=1`), so the thumbnails are plain links that work
 * without JavaScript (FR-010) and the main photo is rendered on the server.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { SearchParam } from "@/lib/enums/search-param";
import type { Product } from "@/lib/schemas/product";
import { THEME } from "@/lib/theme/theme.config";
import { cn } from "@/lib/utils";

import { PRODUCT_MESSAGES } from "../messages";

import { GalleryStage } from "./GalleryStage";
import { PRODUCT_TRANSITION_PREFIX } from "./ProductCard";
import { ProductImage } from "./ProductImage";

/** Props of {@link ProductGallery}. */
export interface ProductGalleryProps {
  readonly product: Product;
  /** Zero-based index of the photo to show, already bounded. */
  readonly selected: number;
}

/**
 * Main photo and thumbnails.
 *
 * @param props - Product and selected photo.
 * @returns The gallery.
 */
export function ProductGallery({ product, selected }: ProductGalleryProps): ReactNode {
  const style = { viewTransitionName: `${PRODUCT_TRANSITION_PREFIX}${product.uuid}` };
  return (
    <section aria-label={PRODUCT_MESSAGES.galleryLabel} className="flex flex-col gap-4">
      <div style={style} className="glass aspect-4/3 overflow-hidden rounded-card">
        <GalleryStage photoKey={selected}>
          <ProductImage
            src={product.photoUrls[selected] ?? null}
            alt={PRODUCT_MESSAGES.photoAlt(product.name, selected + 1)}
            category={product.category}
            media={THEME.media.gallery}
            priority
            iconClassName="size-16"
          />
        </GalleryStage>
      </div>
      {product.photoUrls.length > 1 && (
        <ul className="flex flex-wrap gap-3">
          {product.photoUrls.map((url, index) => (
            <li key={url}>
              <Link
                href={`?${SearchParam.PHOTO}=${index}`}
                replace
                scroll={false}
                aria-label={PRODUCT_MESSAGES.showPhoto(index + 1)}
                aria-current={index === selected ? "true" : undefined}
                className={cn(
                  "block aspect-4/3 w-24 overflow-hidden rounded-field border border-border bg-surface-2 opacity-70 transition-opacity duration-(--duration-fast) hover:opacity-100",
                  index === selected && "border-brand-text opacity-100",
                )}
              >
                <ProductImage
                  src={url}
                  alt=""
                  category={product.category}
                  media={THEME.media.thumbnail}
                  iconClassName="size-5"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
