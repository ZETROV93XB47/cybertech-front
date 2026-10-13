/**
 * Catalog facets: the backend response of `POST /product/search/facets`, and the normalised
 * {@link FacetData} every catalog page works with, whatever its source.
 *
 * @see specs/002-catalog-refresh/data-model.md §1–§2
 * @see ProductFacetsResponseDto (backend, dto/response/search/)
 */
import { z } from "zod";

import type { Brand } from "@/lib/enums/brand";
import type { FacetSource } from "@/lib/enums/facet-source";

/** One value of a facet and the number of products carrying it (`FacetValueDto`). */
export const FacetValueSchema = z.object({
  value: z.string().min(1),
  count: z.int().nonnegative(),
});

/** Bounds of a numeric facet; both `null` when no product matches (`RangeFacetDto`). */
export const RangeFacetSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
});

/**
 * Response of `POST /product/search/facets`.
 *
 * Counts are disjunctive: each facet is counted under every active filter except its own.
 * `attributes` and `numericAttributes` are present only when a category is given. The backend
 * caps each list at 50 values; the schema does not enforce it (contract free to evolve), the
 * front never shows more than `FACET_MAX_VALUES`.
 */
export const ProductFacetsResponseSchema = z.object({
  totalHits: z.int().nonnegative(),
  brands: z.array(FacetValueSchema),
  price: RangeFacetSchema,
  attributes: z.record(z.string(), z.array(FacetValueSchema)).optional(),
  numericAttributes: z.record(z.string(), RangeFacetSchema).optional(),
});

/** Validated backend facets. */
export type ProductFacetsResponse = z.infer<typeof ProductFacetsResponseSchema>;

/** One value of a text facet; `count` is `null` when the source gives no counts. */
export interface FacetCount {
  readonly value: string;
  readonly count: number | null;
}

/** Observed bounds of a numeric attribute (`null` when unknown). */
export interface FacetRange {
  readonly min: number | null;
  readonly max: number | null;
}

/**
 * Facet data of a catalog page, normalised from the backend endpoint or from the fallback scan.
 *
 * @see specs/002-catalog-refresh/data-model.md §2
 */
export interface FacetData {
  /** Where the data comes from; drives the counts and the « unavailable » notice. */
  readonly source: FacetSource;
  /** `true` only for the backend endpoint. */
  readonly hasCounts: boolean;
  /** Products matching every filter; `null` when unavailable. */
  readonly totalHits: number | null;
  /** Count per brand; a missing brand counts 0; `null` without counts. */
  readonly brandCounts: Readonly<Partial<Record<Brand, number>>> | null;
  /** Values of each text attribute, by key. */
  readonly values: Readonly<Record<string, readonly FacetCount[]>>;
  /** Bounds of each numeric attribute, by key. */
  readonly ranges: Readonly<Record<string, FacetRange>>;
}
