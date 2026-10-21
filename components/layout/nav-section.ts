/**
 * Current section of the main navigation, derived from the address.
 *
 * The section only depends on the path. The current category (marked in the « Catalogue »
 * menu) comes from the search parameters, which the root layout does not receive, or from the
 * product page, the only one to know its product's category: the page publishes it
 * (`NavSectionMarker`) in a tiny external store read by the navigation.
 *
 * @see specs/002-catalog-refresh/data-model.md §7
 * @see specs/004-catalog-promos-reviews/research.md R3
 */
import { useSyncExternalStore } from "react";

import { CATALOG_PATH, HOME_PATH, PROMOTIONS_PATH } from "@/lib/constants/routes";
import { PRIVATE_PATH_PREFIXES } from "@/lib/constants/security";
import type { CategoryKey } from "@/lib/enums/category-key";
import { NavSection } from "@/lib/enums/nav-section";
import { SearchParam } from "@/lib/enums/search-param";
import { toCategoryKey } from "@/lib/schemas/category";

/** Prefix of the product page paths (`/products/{uuid}`). */
const PRODUCT_PATH_PREFIX = `${CATALOG_PATH}/`;

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
 * @returns The section to highlight: `CATALOG` for the catalog and the product pages (whatever
 *   the category, now grouped under the « Catalogue » menu), `PROMOTIONS` for the promotions,
 *   `ACCOUNT` on the private pages (account and checkout), `NONE` elsewhere.
 */
export function resolveNavSection(pathname: string): NavSection {
  if (pathname === HOME_PATH) {
    return NavSection.HOME;
  }
  if (pathname === CATALOG_PATH || pathname.startsWith(PRODUCT_PATH_PREFIX)) {
    return NavSection.CATALOG;
  }
  if (isUnder(pathname, PROMOTIONS_PATH)) {
    return NavSection.PROMOTIONS;
  }
  if (PRIVATE_PATH_PREFIXES.some((prefix) => isUnder(pathname, prefix))) {
    return NavSection.ACCOUNT;
  }
  return NavSection.NONE;
}

/**
 * Category of the page shown, marked in the « Catalogue » menu.
 *
 * @param pathname - Current path.
 * @param searchParams - Current query parameters.
 * @param productCategory - Category published by a product page, `null` otherwise.
 * @returns The category of the filtered catalog or of the product page, `null` elsewhere or for
 *   a category the front does not know.
 * @see specs/004-catalog-promos-reviews/research.md R3
 */
export function resolveNavCategory(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">,
  productCategory: CategoryKey | null,
): CategoryKey | null {
  if (pathname === CATALOG_PATH) {
    return toCategoryKey(searchParams.get(SearchParam.CATEGORY) ?? undefined) ?? null;
  }
  if (pathname.startsWith(PRODUCT_PATH_PREFIX)) {
    return productCategory;
  }
  return null;
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
