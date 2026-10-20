/**
 * Pagination of « Mes commandes »: plain links keeping the status filter, so it works without
 * JavaScript and each page has its own address. Reuses the page window of the catalog.
 *
 * @see specs/003-account-orders/research.md R12
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { visiblePages } from "@/features/catalog/components/Pagination";
import type { OrderStatus } from "@/lib/enums/order";
import { cn } from "@/lib/utils";

import { ORDERS_MESSAGES } from "../messages";
import { ordersListPath } from "../orders-list";

/** Props of {@link OrdersPagination}. */
export interface OrdersPaginationProps {
  readonly statuses: readonly OrderStatus[];
  /** Current 1-based page. */
  readonly page: number;
  readonly totalPages: number;
}

/** Style of a page link. */
const PAGE_LINK =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-button px-3 text-sm text-text-muted transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-text";

/**
 * Previous / next link, inert at the ends.
 *
 * @param props - Target page (or `null`), label and icon.
 * @returns The link or a disabled placeholder.
 */
function ArrowLink({
  href,
  label,
  children,
}: {
  readonly href: string | null;
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode {
  if (href === null) {
    return (
      <span aria-disabled className={cn(PAGE_LINK, "opacity-40")}>
        <span className="sr-only">{label}</span>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={PAGE_LINK} aria-label={label}>
      {children}
    </Link>
  );
}

/**
 * Pagination links.
 *
 * @param props - Filter, current page and page count.
 * @returns The navigation, or nothing for a single page.
 */
export function OrdersPagination({ statuses, page, totalPages }: OrdersPaginationProps): ReactNode {
  if (totalPages <= 1) {
    return null;
  }
  const pages = visiblePages(page - 1, totalPages);
  return (
    <nav aria-label={ORDERS_MESSAGES.paginationLabel} className="flex items-center gap-1">
      <ArrowLink
        href={page > 1 ? ordersListPath(statuses, page - 1) : null}
        label={ORDERS_MESSAGES.previousPage}
      >
        <ChevronLeft aria-hidden className="size-4" />
      </ArrowLink>
      {pages.map((index, position) =>
        index === null ? (
          <span key={`gap-${String(position)}`} aria-hidden className="px-2 text-text-muted">
            …
          </span>
        ) : (
          <Link
            key={index}
            href={ordersListPath(statuses, index + 1)}
            aria-label={ORDERS_MESSAGES.pageLink(index + 1)}
            aria-current={index + 1 === page ? "page" : undefined}
            className={cn(PAGE_LINK, index + 1 === page && "bg-surface-2 font-medium text-text")}
          >
            {index + 1}
          </Link>
        ),
      )}
      <ArrowLink
        href={page < totalPages ? ordersListPath(statuses, page + 1) : null}
        label={ORDERS_MESSAGES.nextPage}
      >
        <ChevronRight aria-hidden className="size-4" />
      </ArrowLink>
    </nav>
  );
}
