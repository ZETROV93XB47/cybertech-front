/**
 * Kinds of catalog filters generated from a category JSON schema.
 *
 * @see specs/001-catalog-auth-cart/data-model.md §1 CategorySchema
 */

/** How a category attribute is filtered. */
export enum FacetKind {
  /** `string` property with an `enum`: one checkbox per value. */
  ENUM = "enum",
  /**
   * `string` property without an `enum`: one checkbox per value actually present in the
   * catalog, read from the facets endpoint (or its fallback).
   *
   * @see specs/002-catalog-refresh/research.md R3
   */
  TEXT = "text",
  /** `number` / `integer` property: minimum and maximum inputs. */
  RANGE = "range",
  /** `boolean` property: a single switch. */
  BOOLEAN = "boolean",
}
