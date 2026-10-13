/**
 * Loading placeholders of the product cards, with the same dimensions as `ProductCard`, used by
 * every client-loaded product list (FR-028 « mêmes squelettes »).
 */
import type { ReactNode } from "react";

import { PRODUCT_GRID_CLASS } from "./ProductGrid";

/**
 * One card placeholder.
 *
 * @returns The placeholder, hidden from assistive technologies.
 */
export function ProductCardSkeleton(): ReactNode {
  return (
    <div aria-hidden className="glass flex w-full flex-col overflow-hidden rounded-card">
      <div className="skeleton-shimmer aspect-4/3" />
      <div className="flex flex-col gap-3 p-5">
        <div className="skeleton-shimmer h-3 w-16 rounded-field" />
        <div className="skeleton-shimmer h-5 w-3/4 rounded-field" />
        <div className="skeleton-shimmer mt-4 h-6 w-24 rounded-field" />
      </div>
    </div>
  );
}

/** Props of {@link ProductGridSkeleton}. */
export interface ProductGridSkeletonProps {
  /** Number of cards expected. */
  readonly count: number;
}

/**
 * Placeholders laid out like `ProductGrid`.
 *
 * @param props - Number of cards.
 * @returns The grid of placeholders.
 */
export function ProductGridSkeleton({ count }: ProductGridSkeletonProps): ReactNode {
  return (
    <div aria-hidden className={PRODUCT_GRID_CLASS}>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
