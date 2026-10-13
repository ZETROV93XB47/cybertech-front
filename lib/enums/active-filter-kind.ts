/**
 * Kinds of active-filter pills shown above the catalog results.
 *
 * @see specs/002-catalog-refresh/data-model.md §4
 */

/** Which search criterion an active-filter pill stands for. */
export enum ActiveFilterKind {
  /** Free-text keyword (`q`); kept by « Tout effacer ». */
  KEYWORD = "keyword",
  /** Category; removing it also drops its attribute filters. */
  CATEGORY = "category",
  /** One ticked brand. */
  BRAND = "brand",
  /** Price range (`min` / `max`). */
  PRICE = "price",
  /** One ticked value of a text or enum attribute (`a.<key>`). */
  ATTRIBUTE = "attribute",
  /** Range of a numeric attribute (`r.<key>.min` / `r.<key>.max`). */
  RANGE = "range",
}
