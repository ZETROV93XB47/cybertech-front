/**
 * Current section of the main navigation, derived from the address.
 *
 * The root layout does not receive the search parameters and the category of a product page is
 * only known by that page, so the page publishes it (`NavSectionMarker`) in a tiny external
 * store read by `MainNav`.
 *
 * @see specs/002-catalog-refresh/data-model.md §7
 * @see specs/002-catalog-refresh/research.md R12
 */
import { useSyncExternalStore } from "react";

import { assertNever } from "@/lib/assert-never";
import { CATALOG_PATH, HOME_PATH } from "@/lib/constants/routes";
import { PRIVATE_PATH_PREFIXES } from "@/lib/constants/security";
import { CategoryKey } from "@/lib/enums/category-key";
import { NavSection } from "@/lib/enums/nav-section";
import { SearchParam } from "@/lib/enums/search-param";
import { toCategoryKey } from "@/lib/schemas/category";

/** Prefix of the product page paths (`/products/{uuid}`). */
const PRODUCT_PATH_PREFIX = `${CATALOG_PATH}/`;

/**
 * Section of a category.
 *
 * @param category - Category key.
 * @returns The navigation section of that category.
 */
function categorySection(category: CategoryKey): NavSection {
  switch (category) {
    case CategoryKey.COMPUTER:
      return NavSection.COMPUTER;
    case CategoryKey.MONITOR:
      return NavSection.MONITOR;
    default:
      return assertNever(category);
  }
}

/**
 * Whether a path is a prefix itself or one of its sub-paths (`/account`, `/account/orders`, but
 * not `/accounts`).
 *
 * @param pathname - Current path.
 * @param prefix - Path prefix.
 * @returns `true` when the path belongs to the prefix.
 */
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Resolves the current section of the navigation bar.
 *
 * @param pathname - Current path.
 * @param searchParams - Current query parameters.
 * @param productCategory - Category published by a product page, `null` otherwise.
 * @returns The section to highlight; `ACCOUNT` on the private pages (account and checkout),
 *   `NONE` on the other pages outside the home page and the catalog.
 */
export function resolveNavSection(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">,
  productCategory: CategoryKey | null,
): NavSection {
  if (pathname === HOME_PATH) {
    return NavSection.HOME;
  }
  if (pathname === CATALOG_PATH) {
    const category = toCategoryKey(searchParams.get(SearchParam.CATEGORY) ?? undefined);
    return category === undefined ? NavSection.CATALOG : categorySection(category);
  }
  if (pathname.startsWith(PRODUCT_PATH_PREFIX)) {
    return productCategory === null ? NavSection.CATALOG : categorySection(productCategory);
  }
  if (PRIVATE_PATH_PREFIXES.some((prefix) => isUnder(pathname, prefix))) {
    return NavSection.ACCOUNT;
  }
  return NavSection.NONE;
}

/** Category published by the product page currently shown, `null` elsewhere. */
let publishedCategory: CategoryKey | null = null;

/** Subscribers of {@link publishedCategory}. */
const listeners = new Set<() => void>();

/**
 * Publishes the category of the product page shown (or clears it with `null`).
 *
 * @param category - Category of the product, `null` when leaving the page.
 */
export function publishNavCategory(category: CategoryKey | null): void {
  if (publishedCategory === category) {
    return;
  }
  publishedCategory = category;
  listeners.forEach((listener) => {
    listener();
  });
}

/**
 * Subscribes to category changes.
 *
 * @param onChange - Callback of React.
 * @returns The unsubscribe function.
 */
function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Current published category.
 *
 * @returns The category, or `null`.
 */
function getSnapshot(): CategoryKey | null {
  return publishedCategory;
}

/**
 * Server snapshot: no product page has published anything yet.
 *
 * @returns `null`.
 */
function getServerSnapshot(): CategoryKey | null {
  return null;
}

/**
 * Reads the category published by the product page shown.
 *
 * @returns The category, or `null`.
 */
export function useNavCategory(): CategoryKey | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
