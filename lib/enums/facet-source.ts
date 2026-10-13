/**
 * Origin of the filter values shown on the catalog.
 *
 * @see specs/002-catalog-refresh/research.md R1
 * @see specs/002-catalog-refresh/data-model.md §2
 */

/** Where the facet data of a catalog page comes from. */
export enum FacetSource {
  /** `POST /product/search/facets`: values, disjunctive counts and bounds. */
  BACKEND = "backend",
  /** Values derived from a category scan (`POST /product/search`), without counts. */
  FALLBACK = "fallback",
  /** Neither source answered: only the values already in the URL are shown. */
  UNAVAILABLE = "unavailable",
}
