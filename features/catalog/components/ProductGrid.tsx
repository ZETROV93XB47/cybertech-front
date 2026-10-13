/**
 * Grid of product cards, as a list so screen readers announce the number of products.
 */
import type { ReactNode } from "react";

import type { ProductCard as ProductCardData } from "@/lib/schemas/product";

import { ProductCard } from "./ProductCard";

/** Number of cards of a grid loaded eagerly: the first row is visible at first paint. */
const EAGER_CARD_COUNT = 3;

/** Props of {@link ProductGrid}. */
export interface ProductGridProps {
  readonly products: readonly ProductCardData[];
  /** Accessible name of the list. */
  readonly label: string;
  /** See {@link ProductCard}; off when the grid can repeat products shown elsewhere. */
  readonly withTransition?: boolean;
  /** Loads the first row eagerly (grid at the top of the page). */
  readonly eager?: boolean;
  /** Shows the « Comparer » checkbox on every card (catalog results only, FR-013). */
  readonly comparable?: boolean;
}

/**
 * Three-column grid of cards (two below the `lg` breakpoint).
 *
 * @param props - Products and options.
 * @returns The list.
 */
export function ProductGrid({
  products,
  label,
  withTransition = true,
  eager = false,
  comparable = false,
}: ProductGridProps): ReactNode {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-6 lg:grid-cols-3">
      {products.map((product, index) => (
        <li key={product.uuid} className="flex">
          <ProductCard
            product={product}
            withTransition={withTransition}
            priority={eager && index < EAGER_CARD_COUNT}
            comparable={comparable}
          />
        </li>
      ))}
    </ul>
  );
}
