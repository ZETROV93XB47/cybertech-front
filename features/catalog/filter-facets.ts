/**
 * Filters ready to display: the category schema (order, kinds, labels) merged with the facet
 * data (values, counts, bounds) and the current filters.
 *
 * Every display rule lives here, in pure functions, so the components only render: exclusion
 * of composite attributes, ordering, values at 0 greyed out, ticked values always kept,
 * « Voir tout » split and range bounds.
 *
 * @see specs/002-catalog-refresh/data-model.md §3
 * @see specs/002-catalog-refresh/research.md R2–R5, R7
 */
import { assertNever } from "@/lib/assert-never";
import { FACET_VISIBLE_VALUES, FILTER_EXCLUDED_ATTRIBUTES } from "@/lib/constants/catalog";
import { Brand } from "@/lib/enums/brand";
import { FacetKind } from "@/lib/enums/facet-kind";
import type { CategoryFacet, ParsedCategorySchema } from "@/lib/schemas/category";
import type { FacetCount, FacetData } from "@/lib/schemas/facets";
import type { NumericRange, SearchFilters } from "@/lib/schemas/search";

import { ATTRIBUTE_LABELS, ATTRIBUTE_UNITS, BRAND_LABELS } from "./messages";

/** Value sent for a checked boolean attribute; the backend matches it as text. */
export const BOOLEAN_FILTER_VALUE = "true";

/** One checkbox of a filter. */
export interface FilterValue {
  /** Value sent in the URL and to the backend. */
  readonly value: string;
  /** Text shown next to the checkbox. */
  readonly label: string;
  /** Products this value would give with the other filters; `null` when unknown. */
  readonly count: number | null;
  readonly isChecked: boolean;
  /** `true` when the count is 0 and the value is not ticked (FR-004). */
  readonly isDisabled: boolean;
}

/** Fields shared by every filter of a category attribute. */
interface FacetBase {
  readonly key: string;
  /** French label without unit. */
  readonly label: string;
  /** Unit shown after the label (« Go »), when known. */
  readonly unit: string | undefined;
}

/** Checkbox list of a text or enum attribute. */
export interface ValuesFilterFacet extends FacetBase {
  readonly kind: FacetKind.TEXT | FacetKind.ENUM;
  readonly values: readonly FilterValue[];
  /** Values shown before the « Voir tout » disclosure. */
  readonly visibleCount: number;
  /** `true` when a hidden value is ticked: the disclosure starts open. */
  readonly isExpanded: boolean;
}

/** Minimum and maximum inputs of a numeric attribute. */
export interface RangeFilterFacet extends FacetBase {
  readonly kind: FacetKind.RANGE;
  /** Lowest accepted bound: the schema minimum and the observed minimum, whichever is higher. */
  readonly lower: number | undefined;
  /** Highest accepted bound: the observed maximum, else the schema maximum. */
  readonly upper: number | undefined;
  readonly selected: NumericRange | undefined;
}

/** Single « Oui » checkbox of a boolean attribute. */
export interface BooleanFilterFacet extends FacetBase {
  readonly kind: FacetKind.BOOLEAN;
  readonly isChecked: boolean;
}

/** A category attribute filter ready to display. */
export type FilterFacet = ValuesFilterFacet | RangeFilterFacet | BooleanFilterFacet;

/** Brand checkboxes ready to display, in the fixed order of the `Brand` enum. */
export interface BrandFilter {
  readonly values: readonly FilterValue[];
}

/**
 * Builds one checkbox.
 *
 * @param value - Value.
 * @param label - Displayed text.
 * @param count - Count, or `null`.
 * @param isChecked - Whether the value is in the filters.
 * @returns The checkbox model.
 */
function toFilterValue(
  value: string,
  label: string,
  count: number | null,
  isChecked: boolean,
): FilterValue {
  return { value, label, count, isChecked, isDisabled: count === 0 && !isChecked };
}

/**
 * Merges the known values with the ticked ones: a ticked value missing from the data (gone
 * from the catalog, or beyond the capped list) is appended so it stays visible and untickable.
 *
 * @param known - Values from the facet data, in display order.
 * @param ticked - Values of the filters.
 * @param hasCounts - Whether counts are known (a missing ticked value then counts 0).
 * @returns The checkboxes.
 */
function mergeValues(
  known: readonly FacetCount[],
  ticked: readonly string[],
  hasCounts: boolean,
): FilterValue[] {
  const listed = new Set(known.map(({ value }) => value));
  const missing = ticked.filter((value) => !listed.has(value));
  return [
    ...known.map(({ value, count }) => toFilterValue(value, value, count, ticked.includes(value))),
    ...missing.map((value) => toFilterValue(value, value, hasCounts ? 0 : null, true)),
  ];
}

/**
 * Builds the checkbox list of a text or enum attribute.
 *
 * @param facet - Schema facet.
 * @param base - Key, label and unit.
 * @param data - Facet data.
 * @param ticked - Ticked values.
 * @returns The filter, or `null` when it has nothing to offer.
 */
function toValuesFacet(
  facet: Extract<CategoryFacet, { kind: FacetKind.TEXT | FacetKind.ENUM }>,
  base: FacetBase,
  data: FacetData,
  ticked: readonly string[],
): ValuesFilterFacet | null {
  const counts = data.values[facet.key] ?? [];
  const known: readonly FacetCount[] =
    facet.kind === FacetKind.ENUM
      ? facet.options.map((option) => ({
          value: option,
          count: counts.find(({ value }) => value === option)?.count ?? (data.hasCounts ? 0 : null),
        }))
      : counts;
  const values = mergeValues(known, ticked, data.hasCounts);
  if (values.length === 0) {
    return null;
  }
  const visibleCount = Math.min(values.length, FACET_VISIBLE_VALUES);
  const isExpanded = values.slice(visibleCount).some(({ isChecked }) => isChecked);
  return { ...base, kind: facet.kind, values, visibleCount, isExpanded };
}

/**
 * Picks the smallest or largest of the defined numbers.
 *
 * @param values - Candidates, possibly undefined.
 * @param pick - `Math.min` or `Math.max`.
 * @returns The picked value, or `undefined` when none is defined.
 */
function pickBound(
  values: readonly (number | null | undefined)[],
  pick: (...numbers: number[]) => number,
): number | undefined {
  const defined = values.filter((value) => value !== undefined && value !== null);
  return defined.length > 0 ? pick(...defined) : undefined;
}

/**
 * Builds the range inputs of a numeric attribute.
 *
 * The accepted bounds come from the schema minimum and the observed values, then widen to
 * include the range already chosen: under other filters the observed values can shrink below
 * it, and a stale out-of-bounds field would otherwise block every later form submission.
 *
 * @param facet - Schema facet.
 * @param base - Key, label and unit.
 * @param data - Facet data.
 * @param selected - Current range.
 * @returns The filter.
 */
function toRangeFacet(
  facet: Extract<CategoryFacet, { kind: FacetKind.RANGE }>,
  base: FacetBase,
  data: FacetData,
  selected: NumericRange | undefined,
): RangeFilterFacet {
  const observed = data.ranges[facet.key];
  const lower = pickBound([facet.minimum, observed?.min], Math.max);
  const upper = observed?.max ?? facet.maximum;
  return {
    ...base,
    kind: FacetKind.RANGE,
    lower:
      lower === undefined ? undefined : pickBound([lower, selected?.min, selected?.max], Math.min),
    upper:
      upper === undefined ? undefined : pickBound([upper, selected?.max, selected?.min], Math.max),
    selected,
  };
}

/**
 * Builds the filter of one schema facet.
 *
 * @param facet - Schema facet.
 * @param data - Facet data.
 * @param filters - Current filters.
 * @returns The filter, or `null` when it has nothing to offer.
 */
function toFilterFacet(
  facet: CategoryFacet,
  data: FacetData,
  filters: SearchFilters,
): FilterFacet | null {
  const base: FacetBase = {
    key: facet.key,
    label: ATTRIBUTE_LABELS[facet.key] ?? facet.label,
    unit: ATTRIBUTE_UNITS[facet.key],
  };
  const ticked = filters.attributes[facet.key] ?? [];
  switch (facet.kind) {
    case FacetKind.TEXT:
    case FacetKind.ENUM:
      return toValuesFacet(facet, base, data, ticked);
    case FacetKind.RANGE:
      return toRangeFacet(facet, base, data, filters.numericRanges[facet.key]);
    case FacetKind.BOOLEAN:
      return { ...base, kind: FacetKind.BOOLEAN, isChecked: ticked.includes(BOOLEAN_FILTER_VALUE) };
    default:
      return assertNever(facet);
  }
}

/**
 * Builds the attribute filters of the selected category.
 *
 * @param schema - Parsed category schema (empty without category).
 * @param data - Facet data of the page.
 * @param filters - Current filters.
 * @returns The filters in schema order, without the excluded attributes (connectivity) nor the
 *   text filters that have no value at all.
 * @see specs/002-catalog-refresh/spec.md FR-001 to FR-008
 */
export function buildFilterFacets(
  schema: ParsedCategorySchema,
  data: FacetData,
  filters: SearchFilters,
): readonly FilterFacet[] {
  return schema.facets
    .filter((facet) => !FILTER_EXCLUDED_ATTRIBUTES.includes(facet.key))
    .flatMap((facet) => toFilterFacet(facet, data, filters) ?? []);
}

/**
 * Builds the brand checkboxes, in the order of the `Brand` enum, with their count when known.
 *
 * With counts, a brand that would give no product and is not ticked is left out: since the
 * LDLC catalog import the backend knows 43 brands, most of them absent from a given category,
 * and 43 greyed checkboxes would bury the useful ones. A ticked brand always stays (greyed
 * out only if it gives nothing), so that it can be unticked. Without counts every brand is
 * listed, as nothing tells which ones are empty.
 *
 * @param data - Facet data of the page (`brandCounts`).
 * @param filters - Current filters.
 * @returns The brand filter, in the order of the `Brand` enum.
 * @see specs/002-catalog-refresh/spec.md FR-004
 */
export function buildBrandFilter(data: FacetData, filters: SearchFilters): BrandFilter {
  const { brandCounts } = data;
  return {
    values: Object.values(Brand).flatMap((brand) => {
      const isChecked = filters.brands.includes(brand);
      const count = brandCounts === null ? null : (brandCounts[brand] ?? 0);
      if (count === 0 && !isChecked) {
        return [];
      }
      return [toFilterValue(brand, BRAND_LABELS[brand], count, isChecked)];
    }),
  };
}
