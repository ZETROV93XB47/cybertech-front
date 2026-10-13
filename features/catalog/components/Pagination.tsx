/**
 * Pagination of the product list (FR-005): plain links, so it works without JavaScript and each
 * page has its own URL.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { FIRST_PAGE_NUMBER, PAGINATION_SIBLING_COUNT } from "@/lib/constants/catalog";
import type { SearchFilters } from "@/lib/schemas/search";
import { cn } from "@/lib/utils";

import { PAGINATION_MESSAGES } from "../messages";
import { buildSearchUrl } from "../search-params";

/** Props of {@link Pagination}. */
export interface PaginationProps {
  /** Current filters; `page` is zero-based. */
  readonly filters: SearchFilters;
  /** Total number of pages returned by the backend. */
  readonly totalPages: number;
}

/** Style of a page link. */
const PAGE_LINK =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-button px-3 text-sm text-text-muted transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-text";

/**
 * Lists the zero-based pages to show: first, last, and the current page with its siblings.
 *
 * @param current - Current zero-based page.
 * @param total - Number of pages.
 * @returns Sorted page indexes, `null` marking a gap.
 */
export function visiblePages(current: number, total: number): readonly (number | null)[] {
  const last = total - 1;
  const pages = new Set([0, last]);
  for (
    let page = current - PAGINATION_SIBLING_COUNT;
    page <= current + PAGINATION_SIBLING_COUNT;
    page++
  ) {
    if (page > 0 && page < last) {
      pages.add(page);
    }
  }
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((page, index) => {
    const previous = sorted[index - 1];
    return previous !== undefined && page - previous > 1 ? [null, page] : [page];
  });
}

/**
 * Previous / next arrow link, inert at the ends.
 *
 * @param props - Target page (or `null`), label and icon.
 * @returns The link, or a disabled placeholder.
 */
function ArrowLink({
  filters,
  page,
  label,
  children,
}: {
  readonly filters: SearchFilters;
  readonly page: number | null;
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode {
  if (page === null) {
    return (
      <span aria-hidden className={cn(PAGE_LINK, "opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={buildSearchUrl({ ...filters, page })} aria-label={label} className={PAGE_LINK}>
      {children}
    </Link>
  );
}

/**
 * Page links of the list; nothing when everything fits on one page.
 *
 * @param props - Filters and number of pages.
 * @returns The navigation landmark, or `null`.
 */
export function Pagination({ filters, totalPages }: PaginationProps): ReactNode {
  if (totalPages <= 1) {
    return null;
  }
  const current = filters.page;
  return (
    <nav aria-label={PAGINATION_MESSAGES.label} className="flex items-center justify-center gap-1">
      <ArrowLink
        filters={filters}
        page={current > 0 ? current - 1 : null}
        label={PAGINATION_MESSAGES.previous}
      >
        <ChevronLeft aria-hidden className="size-4" />
      </ArrowLink>
      {visiblePages(current, totalPages).map((page, index) =>
        page === null ? (
          <span key={`gap-${index}`} aria-hidden className="px-2 text-text-muted">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={buildSearchUrl({ ...filters, page })}
            aria-label={PAGINATION_MESSAGES.page(page + FIRST_PAGE_NUMBER)}
            aria-current={page === current ? "page" : undefined}
            className={cn(PAGE_LINK, page === current && "bg-surface-2 font-medium text-text")}
          >
            {page + FIRST_PAGE_NUMBER}
          </Link>
        ),
      )}
      <ArrowLink
        filters={filters}
        page={current < totalPages - 1 ? current + 1 : null}
        label={PAGINATION_MESSAGES.next}
      >
        <ChevronRight aria-hidden className="size-4" />
      </ArrowLink>
    </nav>
  );
}
