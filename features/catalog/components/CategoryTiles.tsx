/**
 * Category tiles of the home page: one tile per category, leading to the catalog filtered on it,
 * with the real number of products (FR-029) and a strip of real product photos of the category,
 * so the tiles are not text only. A count that could not be read is not shown; a category
 * without product shows its icon and says so instead of inventing anything.
 *
 * @see specs/002-catalog-refresh/research.md R13
 */
import { ArrowRight, Laptop, Monitor } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { TiltCard } from "@/components/effects/TiltCard";
import { THEME } from "@/lib/theme/theme.config";
import { assertNever } from "@/lib/assert-never";
import { CategoryKey } from "@/lib/enums/category-key";
import { EMPTY_SEARCH_FILTERS } from "@/lib/schemas/search";

import { CATEGORY_LABELS, CATEGORY_TILE_MESSAGES } from "../messages";
import { buildSearchUrl } from "../search-params";

import { ProductImage } from "./ProductImage";

/** Props of {@link CategoryTiles}. */
export interface CategoryTilesProps {
  /** Products by category; `null` when the count is unknown. */
  readonly counts: Readonly<Record<CategoryKey, number | null>>;
  /** Real product photos by category; the category icon is shown without any. */
  readonly photos?: Readonly<Record<CategoryKey, readonly string[]>>;
}

/**
 * Icon of a category.
 *
 * @param category - Category key.
 * @returns The icon.
 */
function CategoryIcon({ category }: { readonly category: CategoryKey }): ReactNode {
  switch (category) {
    case CategoryKey.COMPUTER:
      return <Laptop aria-hidden className="size-12 text-brand-text" />;
    case CategoryKey.MONITOR:
      return <Monitor aria-hidden className="size-12 text-brand-text" />;
    default:
      return assertNever(category);
  }
}

/**
 * Text of a count.
 *
 * @param count - Number of products, `null` when unknown.
 * @returns The text, or `null` to show nothing.
 */
function countText(count: number | null): string | null {
  if (count === null) {
    return null;
  }
  return count === 0 ? CATEGORY_TILE_MESSAGES.empty : CATEGORY_TILE_MESSAGES.count(count);
}

/**
 * Strip of real product photos of the category, or its icon when it has no product yet.
 *
 * @param props - Category and photo URLs.
 * @returns The decorative strip.
 */
function TileVisual({
  category,
  photos,
}: {
  readonly category: CategoryKey;
  readonly photos: readonly string[];
}): ReactNode {
  if (photos.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center bg-surface-2">
        <CategoryIcon category={category} />
      </div>
    );
  }
  return (
    <div aria-hidden className="flex h-40 gap-px bg-photo-backdrop">
      {photos.map((photo) => (
        <div key={photo} className="flex-1 overflow-hidden p-3">
          <ProductImage src={photo} alt="" category={category} media={THEME.media.card} />
        </div>
      ))}
    </div>
  );
}

/**
 * The tiles, as a list of links.
 *
 * @param props - Counts and photos by category.
 * @returns The list.
 */
export function CategoryTiles({ counts, photos }: CategoryTilesProps): ReactNode {
  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {Object.values(CategoryKey).map((category) => {
        const text = countText(counts[category]);
        return (
          <li key={category} className="flex">
            <TiltCard className="glass relative flex w-full flex-col overflow-hidden rounded-card">
              <TileVisual category={category} photos={photos?.[category] ?? []} />
              <div className="flex items-center gap-4 p-5">
                <span className="flex flex-1 flex-col gap-1">
                  <Link
                    href={buildSearchUrl({ ...EMPTY_SEARCH_FILTERS, category })}
                    className="font-display text-xl text-text after:absolute after:inset-0"
                  >
                    {CATEGORY_LABELS[category]}
                    {text && <span className="sr-only">, {text}</span>}
                  </Link>
                  {text && (
                    <span aria-hidden className="text-sm text-text-muted">
                      {text}
                    </span>
                  )}
                </span>
                <ArrowRight aria-hidden className="size-5 text-text-muted" />
              </div>
            </TiltCard>
          </li>
        );
      })}
    </ul>
  );
}
