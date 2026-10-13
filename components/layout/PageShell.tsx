/**
 * Page template shared by the home page and the catalog: one horizontal padding and one
 * vertical rhythm (FR-028). The catalog is wider by the width of its filter column, so its
 * result cards have the size of the home page cards (user decision of 2026-10-13).
 *
 * @see specs/002-catalog-refresh/research.md R13
 */
import type { ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import { PageWidth } from "@/lib/enums/page-width";
import { cn } from "@/lib/utils";

/** Props of {@link PageShell}. */
export interface PageShellProps {
  readonly children: ReactNode;
  /** Content width; the site width by default. */
  readonly width?: PageWidth;
  readonly className?: string;
}

/**
 * Maximum-width class of a page width.
 *
 * @param width - Page width.
 * @returns The Tailwind class.
 */
function widthClass(width: PageWidth): string {
  switch (width) {
    case PageWidth.SITE:
      return "max-w-site";
    case PageWidth.CATALOG:
      return "max-w-catalog";
    default:
      return assertNever(width);
  }
}

/**
 * Centred page container.
 *
 * @param props - Page content and extra classes.
 * @returns The container, marked `data-page-shell` for the layout e2e checks.
 */
export function PageShell({
  children,
  width = PageWidth.SITE,
  className,
}: PageShellProps): ReactNode {
  return (
    <div
      data-page-shell
      className={cn(
        "mx-auto flex w-full flex-col gap-12 px-6 pt-10 pb-24",
        widthClass(width),
        className,
      )}
    >
      {children}
    </div>
  );
}
