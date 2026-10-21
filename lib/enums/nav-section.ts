/**
 * Sections of the main navigation bar.
 *
 * Feature 004 groups every category under the « Catalogue » menu: the categories are no longer
 * sections of their own; the current category is resolved apart (`resolveNavCategory`).
 *
 * @see specs/002-catalog-refresh/data-model.md §7
 * @see specs/004-catalog-promos-reviews/research.md R3
 */

/** Section of the site a page belongs to, highlighted in the navigation bar. */
export enum NavSection {
  /** Home page `/`. */
  HOME = "home",
  /** Catalog (`/products`, with or without category) and product pages. */
  CATALOG = "catalog",
  /** Promotions (`/promotions/**`). */
  PROMOTIONS = "promotions",
  /** Account pages (`/account/**`) and the checkout (`/checkout`). */
  ACCOUNT = "account",
  /** Any other page (cart, sign-in, registration…): no link is current. */
  NONE = "none",
}
