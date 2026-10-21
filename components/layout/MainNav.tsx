"use client";

/**
 * Main navigation: « Accueil », the « Catalogue » menu, which groups every active category
 * (FR-025, feature 004 US2), and « Promotions » (FR-006, feature 004 US4).
 *
 * The current section carries `aria-current="page"` and a gold underline, so it is never
 * conveyed by colour alone (FR-026); the current category is marked inside the menu. Every entry
 * has the same hover and focus states. The static version (no current entry) is the `Suspense`
 * fallback required by `useSearchParams`, and is shown while the categories are being read.
 *
 * @see specs/002-catalog-refresh/research.md R12
 * @see specs/004-catalog-promos-reviews/research.md R3
 */
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NavigationMenu } from "radix-ui";
import type { ReactNode } from "react";

import { SITE_MESSAGES } from "@/features/common/messages";
import { PROMOTIONS_MESSAGES } from "@/features/promotions/messages";
import { CATALOG_PATH, HOME_PATH, PROMOTIONS_PATH } from "@/lib/constants/routes";
import type { CategoryKey } from "@/lib/enums/category-key";
import { NavSection } from "@/lib/enums/nav-section";
import { cn } from "@/lib/utils";

import {
  CATALOG_MENU_VALUE,
  CatalogMenu,
  useCatalogMenuState,
  type CategoryCounts,
} from "./CatalogMenu";
import { NAV_ITEM_CLASS } from "./header-controls";
import { resolveNavCategory, resolveNavSection, useNavCategory } from "./nav-section";
import { NavUnderline } from "./NavUnderline";

/** Categories offered by the « Catalogue » menu, read by the header on the server. */
export interface MainNavProps {
  /** Active categories, in display order. */
  readonly categories: readonly CategoryKey[];
  /** Number of products of each category, when known. */
  readonly counts: CategoryCounts;
}

/** Current page, as the navigation marks it. */
interface CurrentPage {
  readonly section: NavSection;
  readonly category: CategoryKey | null;
  /** Whether the whole catalog, without category, is shown. */
  readonly isAllCatalog: boolean;
}

/** No current page: nothing marked (static version). */
const NO_CURRENT_PAGE: CurrentPage = {
  section: NavSection.NONE,
  category: null,
  isAllCatalog: false,
};

/** Props of {@link NavLink}. */
interface NavLinkProps {
  readonly href: string;
  readonly label: string;
  readonly isCurrent: boolean;
}

/**
 * Plain link of the bar, underlined when current.
 *
 * @param props - Address, label and current state.
 * @returns The navigation item.
 */
function NavLink({ href, label, isCurrent }: NavLinkProps): ReactNode {
  return (
    <NavigationMenu.Item>
      <NavigationMenu.Link asChild active={isCurrent}>
        <Link
          href={href}
          aria-current={isCurrent ? "page" : undefined}
          className={cn(NAV_ITEM_CLASS, isCurrent ? "text-text" : "text-text-muted")}
        >
          {label}
          {isCurrent && <NavUnderline />}
        </Link>
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  );
}

/**
 * The navigation landmark with « Accueil », the « Catalogue » menu and « Promotions ».
 *
 * @param props - Categories, counts and current page.
 * @returns The navigation.
 */
function NavItems({
  categories,
  counts,
  current,
}: MainNavProps & { readonly current: CurrentPage }): ReactNode {
  const menu = useCatalogMenuState();
  return (
    <NavigationMenu.Root
      aria-label={SITE_MESSAGES.mainNavigation}
      value={menu.value}
      onValueChange={menu.onValueChange}
      className="flex-1"
    >
      <NavigationMenu.List className="flex items-center gap-1">
        <NavLink
          href={HOME_PATH}
          label={SITE_MESSAGES.homeNavLink}
          isCurrent={current.section === NavSection.HOME}
        />
        <CatalogMenu
          categories={categories}
          counts={counts}
          isCurrent={current.section === NavSection.CATALOG}
          currentCategory={current.category}
          isAllCatalogCurrent={current.isAllCatalog}
          isOpen={menu.value === CATALOG_MENU_VALUE}
          onTriggerClick={menu.onTriggerClick}
        />
        <NavLink
          href={PROMOTIONS_PATH}
          label={PROMOTIONS_MESSAGES.navLink}
          isCurrent={current.section === NavSection.PROMOTIONS}
        />
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}

/**
 * Navigation without current entry, rendered before the address or the categories are known.
 *
 * @param props - Categories and counts.
 * @returns The navigation.
 */
export function StaticMainNav(props: MainNavProps): ReactNode {
  return <NavItems {...props} current={NO_CURRENT_PAGE} />;
}

/**
 * Navigation with the current section and category of the page.
 *
 * @param props - Categories and counts.
 * @returns The navigation.
 */
export function MainNav(props: MainNavProps): ReactNode {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const productCategory = useNavCategory();
  const category = resolveNavCategory(pathname, searchParams, productCategory);
  const current: CurrentPage = {
    section: resolveNavSection(pathname),
    category,
    isAllCatalog: pathname === CATALOG_PATH && category === null,
  };
  return <NavItems {...props} current={current} />;
}
