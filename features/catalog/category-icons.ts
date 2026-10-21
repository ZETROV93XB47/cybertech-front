/**
 * Name and icon of a product category, read from the raw value the backend sends.
 *
 * `ProductResponseDto.category` (and the cart and order lines since backend `abe674d`) is free
 * text: a key the front does not know, or a missing one, gets the generic name and icon instead
 * of an empty label or an error (FR-003, edge case « catégorie inconnue »).
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §2.1
 * @see specs/004-catalog-promos-reviews/research.md R12
 */
import { Laptop, type LucideIcon, Monitor, Package, PcCase, Smartphone, Watch } from "lucide-react";

import { CategoryKey } from "@/lib/enums/category-key";
import { toCategoryKey } from "@/lib/schemas/category";

import { CATEGORY_LABELS, GENERIC_CATEGORY_LABEL } from "./messages";

/** Icon of each known category. */
export const CATEGORY_ICONS: Readonly<Record<CategoryKey, LucideIcon>> = {
  [CategoryKey.COMPUTER]: Laptop,
  [CategoryKey.DESKTOP]: PcCase,
  [CategoryKey.MONITOR]: Monitor,
  [CategoryKey.SMARTPHONE]: Smartphone,
  [CategoryKey.SMARTWATCH]: Watch,
};

/** Icon of a category the front does not know. */
export const GENERIC_CATEGORY_ICON: LucideIcon = Package;

/**
 * French name of a raw category.
 *
 * @param raw - Category as sent by the backend; `null` or `undefined` when unknown.
 * @returns The French name, or {@link GENERIC_CATEGORY_LABEL}.
 */
export function categoryLabel(raw: string | null | undefined): string {
  const key = toCategoryKey(raw ?? undefined);
  return key === undefined ? GENERIC_CATEGORY_LABEL : CATEGORY_LABELS[key];
}

/**
 * Icon of a raw category.
 *
 * @param raw - Category as sent by the backend; `null` or `undefined` when unknown.
 * @returns The category icon, or {@link GENERIC_CATEGORY_ICON}.
 */
export function categoryIcon(raw: string | null | undefined): LucideIcon {
  const key = toCategoryKey(raw ?? undefined);
  return key === undefined ? GENERIC_CATEGORY_ICON : CATEGORY_ICONS[key];
}
