/**
 * Category of a product, as a discreet tag: its icon and its French name (FR-003).
 *
 * Reads the raw category the backend sends (products, cart and order lines, wishlist items):
 * an unknown or missing category shows the generic name and icon, never an empty label.
 *
 * @see specs/004-catalog-promos-reviews/research.md R12
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { categoryIcon, categoryLabel } from "../category-icons";

/** Props of {@link CategoryTag}. */
export interface CategoryTagProps {
  /** Raw category of the product; `null` or absent when unknown. */
  readonly category: string | null | undefined;
  /** Extra classes (size, colour) of the tag. */
  readonly className?: string;
}

/**
 * Icon and name of a product category.
 *
 * @param props - Raw category and extra classes.
 * @returns The tag; the icon is decorative, the name is read.
 */
export function CategoryTag({ category, className }: CategoryTagProps): ReactNode {
  const Icon = categoryIcon(category);
  return (
    <span
      data-testid="category-tag"
      className={cn("inline-flex items-center gap-1 text-xs text-text-muted", className)}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {categoryLabel(category)}
    </span>
  );
}
