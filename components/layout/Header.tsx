/**
 * Site header: wordmark, main navigation and action slots.
 *
 * The slots (search, preferences, account, cart) are filled by the user stories that own them
 * (US1 command palette, US5 preferences, US3 account menu, US4 cart badge), so the header does
 * not depend on any feature. The navigation marks the current section (feature 002, US3) and
 * offers the active categories with their number of products in the « Catalogue » menu (feature
 * 004, US2). Both are read on the server (cached with the catalog) inside a `Suspense`, so the
 * page never waits for them: until they arrive, and while the search parameters are unknown, the
 * static navigation shows every known category without counts.
 *
 * @see specs/002-catalog-refresh/spec.md US3
 * @see specs/004-catalog-promos-reviews/spec.md US2
 */
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { SITE_MESSAGES } from "@/features/common/messages";
import { getActiveCategories } from "@/lib/api/endpoints/categories";
import { getCategoryCounts } from "@/lib/api/endpoints/facets";
import { CATEGORY_ORDER } from "@/lib/constants/categories";
import { HOME_PATH } from "@/lib/constants/routes";

import { BrandLogo, BrandLogoVariant } from "./BrandLogo";
import { MainNav, StaticMainNav } from "./MainNav";

/** Action slots of the header, right-hand side, in reading order. */
export interface HeaderProps {
  readonly search?: ReactNode;
  readonly preferences?: ReactNode;
  readonly account?: ReactNode;
  readonly cart?: ReactNode;
}

/** No count known yet (static navigation). */
const NO_COUNTS = {} as const;

/**
 * Main navigation fed with the active categories and their counts. Neither read throws: an
 * unreadable list gives every known category, an unreadable count is left out.
 *
 * @returns The navigation with the current section.
 * @see lib/api/endpoints/categories.ts getActiveCategories
 */
async function CatalogNav(): Promise<ReactNode> {
  const categories = await getActiveCategories();
  const counts = await getCategoryCounts(categories);
  return <MainNav categories={categories} counts={counts} />;
}

/**
 * Sticky glass header.
 *
 * @param props - Optional action slots.
 * @returns The header landmark.
 */
export function Header({ search, preferences, account, cart }: HeaderProps): ReactNode {
  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
      <div className="mx-auto flex h-header w-full max-w-site items-center gap-6 px-6">
        <Link
          href={HOME_PATH}
          aria-label={SITE_MESSAGES.homeLink}
          className="shrink-0 rounded-button"
        >
          <BrandLogo variant={BrandLogoVariant.WORDMARK} isPriority />
        </Link>
        <Suspense fallback={<StaticMainNav categories={CATEGORY_ORDER} counts={NO_COUNTS} />}>
          <CatalogNav />
        </Suspense>
        <div className="flex items-center gap-2">
          {search}
          {preferences}
          {account}
          {cart}
        </div>
      </div>
    </header>
  );
}
