/**
 * Product card of the grids (home, list, recently viewed).
 *
 * Server Component: only the availability badge runs on the client. The whole card is clickable
 * through the title link stretched over it, so there is a single tab stop per product.
 *
 * @see specs/001-catalog-auth-cart/spec.md annex « Composants »
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { productPath } from "@/lib/constants/routes";
import { formatPrice } from "@/lib/format";
import type { ProductCard as ProductCardData } from "@/lib/schemas/product";
import { THEME } from "@/lib/theme/theme.config";

import { BRAND_LABELS } from "../messages";

import { AvailabilityBadge } from "./AvailabilityBadge";
import { ProductImage } from "./ProductImage";

/** Prefix of the `view-transition-name` shared by a card image and the product page gallery. */
export const PRODUCT_TRANSITION_PREFIX = "product-";

/** Props of {@link ProductCard}. */
export interface ProductCardProps {
  readonly product: ProductCardData;
  /**
   * Gives the image its shared-transition name. Turn it off when the same product can appear
   * twice on a page: a duplicated name cancels the transition.
   */
  readonly withTransition?: boolean;
  /** Loads the image eagerly (cards visible at first paint). */
  readonly priority?: boolean;
}

/**
 * Image of the card, or a category icon when the product has no photo.
 *
 * @param props - Card data and options.
 * @returns The image slot.
 */
function CardImage({
  product,
  withTransition = true,
  priority = false,
}: ProductCardProps): ReactNode {
  const style = withTransition
    ? { viewTransitionName: `${PRODUCT_TRANSITION_PREFIX}${product.uuid}` }
    : undefined;
  return (
    <div style={style} className="aspect-4/3 overflow-hidden bg-surface-2">
      <ProductImage
        src={product.imageUrl}
        alt=""
        category={product.category}
        media={THEME.media.card}
        priority={priority}
      />
    </div>
  );
}

/**
 * A product in a grid: photo, name, brand, gold price and live stock.
 *
 * @param props - Card data and options.
 * @returns The card.
 */
export function ProductCard(props: ProductCardProps): ReactNode {
  const { product } = props;
  return (
    <article className="glass product-card relative flex w-full flex-col overflow-hidden rounded-card">
      <CardImage {...props} />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs text-text-muted">{BRAND_LABELS[product.brand]}</p>
        <h3 className="line-clamp-2 text-base leading-snug">
          <Link
            href={productPath(product.uuid)}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <p className="price text-lg">{formatPrice(product.price)}</p>
          <AvailabilityBadge productUuid={product.uuid} className="relative" />
        </div>
      </div>
    </article>
  );
}
