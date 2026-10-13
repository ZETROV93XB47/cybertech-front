/**
 * Category tiles of the home page: one tile per category, leading to the catalog filtered on it,
 * with the real number of products (FR-029). A count that could not be read is not shown; a
 * category without product says so instead of inventing anything.
 *
 * @see specs/002-catalog-refresh/research.md R13
 */
import { ArrowRight, Laptop, Monitor } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { TiltCard } from "@/components/effects/TiltCard";
import { assertNever } from "@/lib/assert-never";
import { CategoryKey } from "@/lib/enums/category-key";
import { EMPTY_SEARCH_FILTERS } from "@/lib/schemas/search";

import { CATEGORY_LABELS, CATEGORY_TILE_MESSAGES } from "../messages";
import { buildSearchUrl } from "../search-params";

/** Props of {@link CategoryTiles}. */
export interface CategoryTilesProps {
  /** Products by category; `null` when the count is unknown. */
  readonly counts: Readonly<Record<CategoryKey, number | null>>;
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
      return <Laptop aria-hidden className="size-8 text-brand-text" />;
    case CategoryKey.MONITOR:
      return <Monitor aria-hidden className="size-8 text-brand-text" />;
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
 * The tiles, as a list of links.
 *
 * @param props - Counts by category.
 * @returns The list.
 */
export function CategoryTiles({ counts }: CategoryTilesProps): ReactNode {
  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {Object.values(CategoryKey).map((category) => {
        const text = countText(counts[category]);
        return (
          <li key={category} className="flex">
            <TiltCard className="glass relative flex w-full rounded-card">
              <Link
                href={buildSearchUrl({ ...EMPTY_SEARCH_FILTERS, category })}
                className="flex w-full items-center gap-5 p-6"
              >
                <CategoryIcon category={category} />
                <span className="flex flex-1 flex-col gap-1">
                  <span className="font-display text-xl text-text">
                    {CATEGORY_LABELS[category]}
                  </span>
                  {text && <span className="text-sm text-text-muted">{text}</span>}
                </span>
                <ArrowRight aria-hidden className="size-5 text-text-muted" />
              </Link>
            </TiltCard>
          </li>
        );
      })}
    </ul>
  );
}
