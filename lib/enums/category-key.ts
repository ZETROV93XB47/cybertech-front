/**
 * Product category keys.
 *
 * The backend lists the active categories through `GET /product-category-schemas` (backend
 * `28a15ae`), with English labels only: the front keeps one key per category it knows how to
 * name, illustrate and order. A key the backend returns but the front does not know is ignored
 * by the navigation and shown with the generic label on products.
 *
 * @see specs/004-catalog-promos-reviews/research.md R1
 * @see docs/backend/api-map.md §4
 */

/** Key of a product category, as stored in `ProductResponseDto.category`. */
export enum CategoryKey {
  /** Laptops (« Ordinateurs portables »). */
  COMPUTER = "COMPUTER",
  /** Desktop computers (« Ordinateurs de bureau »). */
  DESKTOP = "DESKTOP",
  /** Monitors (« Écrans »). */
  MONITOR = "MONITOR",
  /** Smartphones. */
  SMARTPHONE = "SMARTPHONE",
  /** Smartwatches (« Montres connectées »). */
  SMARTWATCH = "SMARTWATCH",
}
