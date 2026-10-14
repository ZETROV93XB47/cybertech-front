/**
 * Product card of the grids (home, list, recently viewed).
 *
 * Server Component: only the availability badge, the add-to-cart button, the wishlist heart and,
 * on the catalog results, the « Comparer » checkbox run on the client. The whole card is clickable
 * through the title link stretched over it, so there is a single tab stop per product.
 *
 * @see specs/001-catalog-auth-cart/spec.md annex « Composants »
 */
import type { ReactNode } from "react";

import { TiltCard } from "@/components/effects/TiltCard";
import { TransitionLink } from "@/components/effects/TransitionLink";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { CompareToggle } from "@/features/compare/components/CompareToggle";
import { WishlistButton } from "@/features/wishlist/components/WishlistButton";
import { productPath } from "@/lib/constants/routes";
import { CompareToggleVariant } from "@/lib/enums/compare-toggle-variant";
import { WishlistButtonVariant } from "@/lib/enums/wishlist-button-variant";
import { toCategoryKey } from "@/lib/schemas/category";
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
  /**
   * Shows the « Comparer » checkbox: catalog results only, not the home page nor the similar
   * products (FR-013).
   */
  readonly comparable?: boolean;
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
  const { product, comparable = false } = props;
  const category = comparable ? toCategoryKey(product.category) : undefined;
  return (
    <TiltCard className="glass product-card relative flex w-full flex-col overflow-hidden rounded-card">
      <CardImage {...props} />
      <div className="absolute top-3 left-3">
        <WishlistButton
          productUuid={product.uuid}
          productName={product.name}
          variant={WishlistButtonVariant.CARD}
        />
      </div>
      {category && (
        <div className="absolute top-3 right-3">
          <CompareToggle
            productUuid={product.uuid}
            productName={product.name}
            category={category}
            variant={CompareToggleVariant.CHECKBOX}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs text-text-muted">{BRAND_LABELS[product.brand]}</p>
        <h3 className="line-clamp-2 text-base leading-snug">
          <TransitionLink
            href={productPath(product.uuid)}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {product.name}
          </TransitionLink>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="flex flex-col gap-1">
            <p className="price text-lg">{formatPrice(product.price)}</p>
            <AvailabilityBadge productUuid={product.uuid} className="relative" />
          </div>
          <AddToCartButton productUuid={product.uuid} productName={product.name} compact />
        </div>
      </div>
    </TiltCard>
  );
}
