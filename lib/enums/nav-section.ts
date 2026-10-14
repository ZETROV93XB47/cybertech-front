/**
 * Sections of the main navigation bar.
 *
 * @see specs/002-catalog-refresh/data-model.md §7
 */

/** Section of the site a page belongs to, highlighted in the navigation bar. */
export enum NavSection {
  /** Home page `/`. */
  HOME = "home",
  /** Catalog without category, or with an unknown one. */
  CATALOG = "catalog",
  /** Catalog filtered on computers, or a computer product page. */
  COMPUTER = "computer",
  /** Catalog filtered on monitors, or a monitor product page. */
  MONITOR = "monitor",
  /** Account pages (`/account/**`) and the checkout (`/checkout`). */
  ACCOUNT = "account",
  /** Any other page (cart, sign-in, registration…): no link is current. */
  NONE = "none",
}
