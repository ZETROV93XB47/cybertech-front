/**
 * Active-filter pills of the catalog: one removable pill per criterion, each one a plain link
 * to the canonical URL without it, so they work without JavaScript and with the back button.
 *
 * @see specs/002-catalog-refresh/data-model.md §4
 * @see specs/002-catalog-refresh/research.md R6
 */
import { ActiveFilterKind } from "@/lib/enums/active-filter-kind";
import { formatPrice, UI_LOCALE } from "@/lib/format";
import { humanizeKey } from "@/lib/schemas/category";
import { EMPTY_SEARCH_FILTERS, type NumericRange, type SearchFilters } from "@/lib/schemas/search";

import type { FilterFacet } from "./filter-facets";
import {
  ATTRIBUTE_LABELS,
  ATTRIBUTE_UNITS,
  BRAND_LABELS,
  CATEGORY_LABELS,
  LIST_MESSAGES,
} from "./messages";
import { buildSearchUrl } from "./search-params";

/** One pill above the results. */
export interface ActiveFilter {
  readonly kind: ActiveFilterKind;
  /** Text of the pill, e.g. « Processeur : AMD Ryzen 7 ». */
  readonly label: string;
  /** Canonical catalog URL without this criterion (first page). */
  readonly removeHref: string;
}

/**
 * Writes a range with its two optional bounds (« 16 – 32 Go », « à partir de 16 Go »).
 *
 * @param range - Range with at least one bound.
 * @param format - Formats one bound.
 * @returns The text.
 */
export function formatRangeText(range: NumericRange, format: (value: number) => string): string {
  if (range.min !== undefined && range.max !== undefined) {
    return LIST_MESSAGES.rangeBetween(format(range.min), format(range.max));
  }
  if (range.min !== undefined) {
    return LIST_MESSAGES.rangeFrom(format(range.min));
  }
  return LIST_MESSAGES.rangeUpTo(format(range.max ?? 0));
}

/**
 * Formats a number of an attribute with its unit.
 *
 * @param key - Attribute key.
 * @returns A formatter of one value (« 16 Go »).
 */
function unitFormatter(key: string): (value: number) => string {
  const unit = ATTRIBUTE_UNITS[key];
  return (value) => {
    const number = value.toLocaleString(UI_LOCALE);
    return unit ? `${number} ${unit}` : number;
  };
}

/**
 * French label of an attribute key, from the displayed facets first.
 *
 * @param key - Attribute key.
 * @param facets - Displayed attribute filters.
 * @returns The label.
 */
function attributeName(key: string, facets: readonly FilterFacet[]): string {
  return (
    facets.find((facet) => facet.key === key)?.label ?? ATTRIBUTE_LABELS[key] ?? humanizeKey(key)
  );
}

/**
 * Copy of the filters back to the first page, with some criteria changed.
 *
 * @param filters - Current filters.
 * @param change - Criteria to replace.
 * @returns The URL of the changed filters.
 */
function hrefWith(filters: SearchFilters, change: Partial<SearchFilters>): string {
  return buildSearchUrl({ ...filters, ...change, page: 0 });
}

/**
 * Removes one key from a record.
 *
 * @param record - Source record.
 * @param key - Key to drop.
 * @returns A copy without the key.
 */
function without<TValue>(
  record: Readonly<Record<string, TValue>>,
  key: string,
): Record<string, TValue> {
  return Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
}

/** Optional criteria a pill removes by deleting them. */
type OptionalFilterKey = "keyword" | "category" | "priceMin" | "priceMax";

/**
 * Copy of the filters without some optional criteria.
 *
 * @param filters - Current filters.
 * @param keys - Criteria to drop.
 * @returns The copy.
 */
function omit(filters: SearchFilters, keys: readonly OptionalFilterKey[]): SearchFilters {
  const dropped = new Set<string>(keys);
  // Rebuilt rather than mutated: `exactOptionalPropertyTypes` forbids assigning `undefined`.
  return Object.fromEntries(
    Object.entries(filters).filter(([key]) => !dropped.has(key)),
  ) as SearchFilters;
}

/**
 * Pill of the price range, if any.
 *
 * @param filters - Current filters.
 * @returns The pill, or nothing.
 */
function pricePills(filters: SearchFilters): ActiveFilter[] {
  const { priceMin, priceMax } = filters;
  if (priceMin === undefined && priceMax === undefined) {
    return [];
  }
  const range: NumericRange = {
    ...(priceMin === undefined ? {} : { min: priceMin }),
    ...(priceMax === undefined ? {} : { max: priceMax }),
  };
  return [
    {
      kind: ActiveFilterKind.PRICE,
      label: LIST_MESSAGES.pricePill(formatRangeText(range, formatPrice)),
      removeHref: hrefWith(omit(filters, ["priceMin", "priceMax"]), {}),
    },
  ];
}

/**
 * Pills of the keyword, category, brands and price.
 *
 * @param filters - Current filters.
 * @returns The pills, in that order.
 */
function generalPills(filters: SearchFilters): ActiveFilter[] {
  const { keyword, category } = filters;
  const pills: ActiveFilter[] = [];
  if (keyword !== undefined) {
    pills.push({
      kind: ActiveFilterKind.KEYWORD,
      label: LIST_MESSAGES.keywordPill(keyword),
      removeHref: hrefWith(omit(filters, ["keyword"]), {}),
    });
  }
  if (category !== undefined) {
    pills.push({
      kind: ActiveFilterKind.CATEGORY,
      label: LIST_MESSAGES.categoryPill(CATEGORY_LABELS[category]),
      // Attribute filters belong to the category: they go with it (FR-011).
      removeHref: hrefWith(omit(filters, ["category"]), { attributes: {}, numericRanges: {} }),
    });
  }
  for (const brand of filters.brands) {
    pills.push({
      kind: ActiveFilterKind.BRAND,
      label: LIST_MESSAGES.brandPill(BRAND_LABELS[brand]),
      removeHref: hrefWith(filters, { brands: filters.brands.filter((item) => item !== brand) }),
    });
  }
  return [...pills, ...pricePills(filters)];
}

/**
 * Pills of the attribute values and numeric ranges.
 *
 * @param filters - Current filters.
 * @param facets - Displayed attribute filters (for the labels).
 * @returns One pill per ticked value, then one per range.
 */
function attributePills(filters: SearchFilters, facets: readonly FilterFacet[]): ActiveFilter[] {
  const values = Object.entries(filters.attributes).flatMap(([key, ticked]) =>
    ticked.map((value) => {
      const remaining = ticked.filter((item) => item !== value);
      const attributes =
        remaining.length > 0
          ? { ...filters.attributes, [key]: remaining }
          : without(filters.attributes, key);
      return {
        kind: ActiveFilterKind.ATTRIBUTE,
        label: LIST_MESSAGES.attributePill(attributeName(key, facets), value),
        removeHref: hrefWith(filters, { attributes }),
      };
    }),
  );
  const ranges = Object.entries(filters.numericRanges).map(([key, range]) => ({
    kind: ActiveFilterKind.RANGE,
    label: LIST_MESSAGES.attributePill(
      attributeName(key, facets),
      formatRangeText(range, unitFormatter(key)),
    ),
    removeHref: hrefWith(filters, { numericRanges: without(filters.numericRanges, key) }),
  }));
  return [...values, ...ranges];
}

/**
 * Describes the active filters as removable pills.
 *
 * @param filters - Current filters.
 * @param facets - Displayed attribute filters (for the labels).
 * @returns The pills: keyword, category, brands, price, attribute values, ranges.
 * @see specs/002-catalog-refresh/spec.md FR-009, FR-011
 */
export function describeActiveFilters(
  filters: SearchFilters,
  facets: readonly FilterFacet[],
): readonly ActiveFilter[] {
  return [...generalPills(filters), ...attributePills(filters, facets)];
}

/**
 * URL of « Tout effacer »: every filter removed except the keyword (FR-009).
 *
 * @param filters - Current filters.
 * @returns The catalog URL keeping only the keyword.
 */
export function clearAllHref(filters: SearchFilters): string {
  return buildSearchUrl({
    ...EMPTY_SEARCH_FILTERS,
    ...(filters.keyword === undefined ? {} : { keyword: filters.keyword }),
  });
}
