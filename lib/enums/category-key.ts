/**
 * Product category keys.
 *
 * The backend has no public endpoint listing categories, so the front keeps the two categories
 * seeded by `ProductCategorySchemaInitializer` (capability carried by the front, see spec).
 *
 * @see docs/backend/api-map.md §4
 */

/** Key of a product category, as stored in `ProductResponseDto.category`. */
export enum CategoryKey {
  COMPUTER = "COMPUTER",
  MONITOR = "MONITOR",
}
