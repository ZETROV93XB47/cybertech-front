"use client";

/**
 * Tells the navigation bar which category the product page belongs to (FR-026); renders
 * nothing.
 *
 * @see specs/002-catalog-refresh/research.md R12
 */
import { useEffect, type ReactNode } from "react";

import type { CategoryKey } from "@/lib/enums/category-key";

import { publishNavCategory } from "./nav-section";

/** Props of {@link NavSectionMarker}. */
export interface NavSectionMarkerProps {
  /** Category of the product, `undefined` when the front does not know it. */
  readonly category: CategoryKey | undefined;
}

/**
 * Publishes the category on mount and clears it on unmount.
 *
 * @param props - The product category.
 * @returns Nothing.
 */
export function NavSectionMarker({ category }: NavSectionMarkerProps): ReactNode {
  useEffect(() => {
    publishNavCategory(category ?? null);
    return () => {
      publishNavCategory(null);
    };
  }, [category]);
  return null;
}
