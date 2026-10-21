/**
 * Blocks of the product page (US1): summary column (brand, name, key specs, price, current
 * offer, live stock, add to cart, comparison toggle of feature 002), technical sheet,
 * description and similar products.
 *
 * Server Components fed with real catalog data only; the entrance is one staggered reveal of
 * the summary column (`RevealGroup`), the rest of the page stays still.
 */
import { BadgePercent } from "lucide-react";
import type { ReactNode } from "react";

import { RevealGroup, RevealItem } from "@/components/effects/Reveal";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { CompareToggle } from "@/features/compare/components/CompareToggle";
import { WishlistButton } from "@/features/wishlist/components/WishlistButton";
import { CompareToggleVariant } from "@/lib/enums/compare-toggle-variant";
import { WishlistButtonVariant } from "@/lib/enums/wishlist-button-variant";
import { formatPrice } from "@/lib/format";
import { toCategoryKey } from "@/lib/schemas/category";
import type { ActiveDiscount } from "@/lib/schemas/discount";
import type { Product, ProductAvailability, ProductCard } from "@/lib/schemas/product";

import { BRAND_LABELS, PRODUCT_MESSAGES } from "../messages";
import type { ProductSpec } from "../product-specs";

import { AvailabilityBadge } from "./AvailabilityBadge";
import { CategoryTag } from "./CategoryTag";
import { describeDiscount } from "./DiscountBanner";
import { ProductGrid } from "./ProductGrid";

/** Props of {@link ProductSummary}. */
export interface ProductSummaryProps {
  readonly product: Product;
  readonly highlights: readonly ProductSpec[];
  readonly offer: ActiveDiscount | undefined;
  /** Stock read with the page; `undefined` when it could not be read (the badge retries). */
  readonly availability: ProductAvailability | null | undefined;
}

/**
 * Key specs as chips (the first lines of the technical sheet).
 *
 * @param props - Specs to show.
 * @returns The list, or nothing.
 */
function Highlights({ specs }: { readonly specs: readonly ProductSpec[] }): ReactNode {
  if (specs.length === 0) {
    return null;
  }
  return (
    <ul aria-label={PRODUCT_MESSAGES.highlightsLabel} className="flex flex-wrap gap-2">
      {specs.map((spec) => (
        <li key={spec.key} className="glass rounded-full px-3 py-1 text-xs">
          <span className="text-text-muted">{spec.label} : </span>
          <span className="font-mono text-text">{spec.value}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Current discount campaign, with when it applies.
 *
 * @param props - The campaign.
 * @returns The offer block.
 */
function Offer({ offer }: { readonly offer: ActiveDiscount }): ReactNode {
  return (
    <div className="flex items-start gap-3 rounded-card border border-border p-4">
      <BadgePercent aria-hidden className="mt-0.5 size-5 text-gold" />
      <div className="flex flex-col gap-1 text-sm">
        <p>
          <span className="sr-only">{PRODUCT_MESSAGES.offerLabel} : </span>
          {describeDiscount(offer)}
        </p>
        <p className="text-xs text-text-muted">{PRODUCT_MESSAGES.offerHint}</p>
      </div>
    </div>
  );
}

/**
 * Summary column, revealed block by block.
 *
 * @param props - Product, key specs, offer and stock.
 * @returns The column.
 */
export function ProductSummary({
  product,
  highlights,
  offer,
  availability,
}: ProductSummaryProps): ReactNode {
  const category = toCategoryKey(product.category);
  return (
    <RevealGroup className="flex flex-col gap-6">
      <RevealItem className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-text-muted">
          <span>
            <span className="sr-only">{PRODUCT_MESSAGES.brandLabel} : </span>
            {BRAND_LABELS[product.brand]}
          </span>
          <span aria-hidden>·</span>
          <CategoryTag category={product.category} className="text-sm" />
        </p>
        <h1 className="text-3xl leading-tight">{product.name}</h1>
      </RevealItem>
      <RevealItem>
        <Highlights specs={highlights} />
      </RevealItem>
      <RevealItem className="flex flex-col gap-3">
        <p className="price text-3xl">{formatPrice(product.price)}</p>
        <AvailabilityBadge
          productUuid={product.uuid}
          {...(availability === undefined ? {} : { initialAvailability: availability })}
        />
      </RevealItem>
      {offer && (
        <RevealItem>
          <Offer offer={offer} />
        </RevealItem>
      )}
      <RevealItem className="flex flex-col items-start gap-3">
        <AddToCartButton productUuid={product.uuid} productName={product.name} />
        <div className="flex flex-wrap items-start gap-3">
          <WishlistButton
            productUuid={product.uuid}
            productName={product.name}
            variant={WishlistButtonVariant.DETAIL}
          />
          {category && (
            <CompareToggle
              productUuid={product.uuid}
              productName={product.name}
              category={category}
              variant={CompareToggleVariant.BUTTON}
            />
          )}
        </div>
      </RevealItem>
    </RevealGroup>
  );
}

/**
 * Technical sheet.
 *
 * @param props - All specs of the product.
 * @returns The section, or nothing without specs.
 */
export function ProductSpecs({ specs }: { readonly specs: readonly ProductSpec[] }): ReactNode {
  if (specs.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="specs-title" className="glass flex flex-col gap-4 rounded-card p-6">
      <h2 id="specs-title" className="text-lg">
        {PRODUCT_MESSAGES.specsTitle}
      </h2>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {specs.map((spec) => (
          <div key={spec.key} className="flex justify-between gap-4 border-b border-border pb-2">
            <dt className="text-text-muted">{spec.label}</dt>
            <dd className="text-right text-text">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Similar products (same category).
 *
 * @param props - Product cards to show.
 * @returns The section, or nothing when there is none.
 */
export function SimilarProducts({
  products,
}: {
  readonly products: readonly ProductCard[];
}): ReactNode {
  if (products.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="similar-title" className="flex flex-col gap-6">
      <h2 id="similar-title" className="text-2xl">
        {PRODUCT_MESSAGES.similarTitle}
      </h2>
      <ProductGrid products={[...products]} label={PRODUCT_MESSAGES.similarLabel} />
    </section>
  );
}
