"use client";

/**
 * Main navigation links: Accueil, Catalogue, Ordinateurs, Écrans (FR-025).
 *
 * The current section carries `aria-current="page"` and a gold underline, so it is never
 * conveyed by colour alone (FR-026). Every link has the same hover and focus states. The static
 * version (no current link) is the `Suspense` fallback required by `useSearchParams`.
 *
 * @see specs/002-catalog-refresh/research.md R12
 */
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { CATEGORY_LABELS } from "@/features/catalog/messages";
import { SITE_MESSAGES } from "@/features/common/messages";
import { CATALOG_PATH, HOME_PATH } from "@/lib/constants/routes";
import { CategoryKey } from "@/lib/enums/category-key";
import { NavSection } from "@/lib/enums/nav-section";
import { SearchParam } from "@/lib/enums/search-param";
import { cn } from "@/lib/utils";

import { resolveNavSection, useNavCategory } from "./nav-section";

/** One link of the bar. */
interface NavLink {
  readonly section: NavSection;
  readonly href: string;
  readonly label: string;
}

/**
 * Builds the address of the catalog filtered on a category.
 *
 * @param category - Category key.
 * @returns The canonical catalog URL of that category.
 */
function categoryHref(category: CategoryKey): string {
  return `${CATALOG_PATH}?${new URLSearchParams({ [SearchParam.CATEGORY]: category }).toString()}`;
}

/** Links of the bar, in display order. */
const NAV_LINKS: readonly NavLink[] = [
  { section: NavSection.HOME, href: HOME_PATH, label: SITE_MESSAGES.homeNavLink },
  { section: NavSection.CATALOG, href: CATALOG_PATH, label: SITE_MESSAGES.catalogLink },
  {
    section: NavSection.COMPUTER,
    href: categoryHref(CategoryKey.COMPUTER),
    label: CATEGORY_LABELS[CategoryKey.COMPUTER],
  },
  {
    section: NavSection.MONITOR,
    href: categoryHref(CategoryKey.MONITOR),
    label: CATEGORY_LABELS[CategoryKey.MONITOR],
  },
];

/**
 * The navigation landmark with its links.
 *
 * @param props - Section to mark as current, `NONE` for none.
 * @returns The navigation.
 */
function NavLinks({ current }: { readonly current: NavSection }): ReactNode {
  return (
    <nav aria-label={SITE_MESSAGES.mainNavigation} className="flex-1">
      <ul className="flex items-center gap-1">
        {NAV_LINKS.map((link) => {
          const isCurrent = link.section === current;
          return (
            <li key={link.section}>
              <Link
                href={link.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-10 items-center rounded-button px-3 text-sm transition-colors duration-(--duration-fast) hover:text-text",
                  isCurrent ? "text-text" : "text-text-muted",
                )}
              >
                {link.label}
                {isCurrent && (
                  <span
                    aria-hidden
                    data-nav-indicator
                    className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-gold"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Links without current section, rendered before the address is known on the client.
 *
 * @returns The navigation.
 */
export function StaticMainNav(): ReactNode {
  return <NavLinks current={NavSection.NONE} />;
}

/**
 * Links with the current section of the page.
 *
 * @returns The navigation.
 */
export function MainNav(): ReactNode {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const productCategory = useNavCategory();
  return <NavLinks current={resolveNavSection(pathname, searchParams, productCategory)} />;
}
