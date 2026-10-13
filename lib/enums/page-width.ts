/**
 * Widths of the page template.
 *
 * @see specs/002-catalog-refresh/spec.md Clarifications (2026-10-13, catalog cards)
 */

/** Content width of a page. */
export enum PageWidth {
  /** Site width (`max-w-site`), the header and most pages. */
  SITE = "site",
  /** Site width plus the filter column, so the catalog cards match the home page cards. */
  CATALOG = "catalog",
}
