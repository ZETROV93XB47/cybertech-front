/**
 * Page header shared by the home page and the catalog: optional breadcrumb (none on the home
 * page, the root of the site), living title, subtitle, actions and a live slot announcing the
 * result count (FR-028, FR-009).
 *
 * @see specs/002-catalog-refresh/research.md R13
 */
import type { ReactNode } from "react";

/** Classes of the page title, the same on every page (`LiveTitle` or greeting). */
export const PAGE_TITLE_CLASS = "text-4xl leading-tight lg:text-5xl";

/** Props of {@link PageHeader}. */
export interface PageHeaderProps {
  /** Breadcrumb navigation, omitted on the home page. */
  readonly breadcrumb?: ReactNode;
  /** The `h1` of the page, styled with {@link PAGE_TITLE_CLASS}. */
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  /** Calls to action, below the subtitle. */
  readonly actions?: ReactNode;
  /** Text announced politely to screen readers when it changes (result count). */
  readonly live?: ReactNode;
}

/**
 * Page header.
 *
 * @param props - Breadcrumb, title, subtitle, actions and live slot.
 * @returns The header block.
 */
export function PageHeader({
  breadcrumb,
  title,
  subtitle,
  actions,
  live,
}: PageHeaderProps): ReactNode {
  return (
    <header className="flex flex-col gap-4">
      {breadcrumb}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {title}
        {live !== undefined && (
          <p className="text-sm text-text-muted" aria-live="polite">
            {live}
          </p>
        )}
      </div>
      {subtitle !== undefined && <p className="max-w-2xl text-lg text-text-muted">{subtitle}</p>}
      {actions !== undefined && <div className="flex flex-wrap gap-3 pt-2">{actions}</div>}
    </header>
  );
}
