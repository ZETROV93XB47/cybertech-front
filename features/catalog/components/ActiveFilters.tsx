/**
 * Active-filter pills above the catalog results (FR-009).
 *
 * Server Component: each pill is a link to the canonical URL without its criterion, and
 * « Tout effacer » a link keeping only the keyword, so everything works without JavaScript,
 * can be shared and follows the back button.
 *
 * @see specs/002-catalog-refresh/research.md R6
 */
import { X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import type { SearchFilters } from "@/lib/schemas/search";

import { clearAllHref, describeActiveFilters } from "../active-filters";
import type { FilterFacet } from "../filter-facets";
import { LIST_MESSAGES } from "../messages";

/** Props of {@link ActiveFilters}. */
export interface ActiveFiltersProps {
  readonly filters: SearchFilters;
  /** Displayed attribute filters, for the French labels of the pills. */
  readonly facets: readonly FilterFacet[];
}

/**
 * Removable pills of the active filters, then « Tout effacer ».
 *
 * @param props - Current filters and displayed attribute filters.
 * @returns The list, or nothing when no filter is active.
 */
export function ActiveFilters({ filters, facets }: ActiveFiltersProps): ReactNode {
  const pills = describeActiveFilters(filters, facets);
  if (pills.length === 0) {
    return null;
  }
  return (
    <nav
      aria-label={LIST_MESSAGES.activeFiltersLabel}
      className="flex flex-wrap items-center gap-2"
    >
      <ul className="flex flex-wrap gap-2">
        {pills.map((pill) => (
          <li key={pill.removeHref + pill.label}>
            <Link
              href={pill.removeHref}
              aria-label={LIST_MESSAGES.removeFilter(pill.label)}
              className="glass inline-flex items-center gap-2 rounded-button px-3 py-1 text-sm text-text transition-colors duration-(--duration-fast) hover:text-brand-text focus-visible:text-brand-text"
            >
              {pill.label}
              <X aria-hidden className="size-3.5" />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={clearAllHref(filters)}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        {LIST_MESSAGES.clearAllFilters}
      </Link>
    </nav>
  );
}
