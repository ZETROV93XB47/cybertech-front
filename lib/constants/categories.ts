/**
 * Category constants: display order and freshness of the active category list.
 *
 * @see specs/004-catalog-promos-reviews/research.md R1
 */
import { CategoryKey } from "@/lib/enums/category-key";

/**
 * Display order of the categories in the catalog menu, the home tiles, the carousel and the
 * catalog filter.
 *
 * The backend sorts its list by key, which is not a meaningful order for a shopper: computers
 * first, then their screens, then the mobile devices.
 */
export const CATEGORY_ORDER: readonly CategoryKey[] = [
  CategoryKey.COMPUTER,
  CategoryKey.DESKTOP,
  CategoryKey.MONITOR,
  CategoryKey.SMARTPHONE,
  CategoryKey.SMARTWATCH,
];

/**
 * Cache lifetime of the active category list, in seconds.
 *
 * Categories only change through admin actions, like their schemas
 * (`CATEGORY_SCHEMA_REVALIDATE_SECONDS`), so one hour is fresh enough.
 */
export const CATEGORIES_REVALIDATE_SECONDS = 3_600;

/** Cache tag of the active category list, for a targeted revalidation. */
export const CATEGORIES_CACHE_TAG = "categories";
