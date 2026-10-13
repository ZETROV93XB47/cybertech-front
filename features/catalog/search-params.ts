/**
 * Product list URL ↔ {@link SearchFilters} (FR-004).
 *
 * The URL is the only state of the filters: it can be shared, reloaded and navigated with the
 * back button. Parsing never fails: an invalid parameter is ignored, and the page then
 * redirects to the canonical URL built by {@link buildSearchUrl}. The same parser reads the
 * no-JavaScript filter form (FR-010), whose range inputs are named `r.<key>.min` / `r.<key>.max`.
 *
 * @see specs/001-catalog-auth-cart/data-model.md §2 SearchFilters
 */
import { z } from "zod";

import {
  ATTRIBUTE_KEY_PATTERN,
  FIRST_PAGE_NUMBER,
  PRICE_MAX_EUR,
  PRICE_MIN_EUR,
  RANGE_SEPARATOR,
  SEARCH_ATTRIBUTE_MAX_VALUES,
  SEARCH_KEYWORD_MAX_LENGTH,
} from "@/lib/constants/catalog";
import { CATALOG_PATH } from "@/lib/constants/routes";
import { Brand } from "@/lib/enums/brand";
import { RangeBound, SearchParam, SearchParamPrefix } from "@/lib/enums/search-param";
import { FacetKind } from "@/lib/enums/facet-kind";
import { toCategoryKey, type CategoryFacet } from "@/lib/schemas/category";
import type { NumericRange, SearchFilters } from "@/lib/schemas/search";

/** Query parameters as Next.js passes them to a page, or as `URLSearchParams`. */
export type SearchParamsInput =
  URLSearchParams | Readonly<Record<string, string | readonly string[] | undefined>>;

/** Only digits: integers in the URL are written without sign, decimals or exponent. */
const INTEGER_PATTERN = /^\d+$/;

/** A non-negative decimal number (`7.5`), as accepted in a range bound. */
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

/** Schema of one brand value. */
const BrandSchema = z.enum(Brand);

/** Schema of the bound suffix of a range input (`min` / `max`). */
const RangeBoundSchema = z.enum(RangeBound);

/** Separator between a range key and its bound in the form input names (`r.ram.min`). */
const RANGE_BOUND_SEPARATOR = ".";

/**
 * Flattens the input into `[name, value]` pairs, keeping repeated parameters.
 *
 * @param input - Page search params or `URLSearchParams`.
 * @returns Every pair, in input order.
 */
function toEntries(input: SearchParamsInput): readonly (readonly [string, string])[] {
  if (input instanceof URLSearchParams) {
    return [...input.entries()];
  }
  return Object.entries(input).flatMap(([name, value]) => {
    if (value === undefined) {
      return [];
    }
    const values = typeof value === "string" ? [value] : value;
    return values.map((item) => [name, item] as const);
  });
}

/**
 * Reads a whole number written with digits only.
 *
 * @param value - Raw value.
 * @returns The number, or `undefined` when the value is not a safe integer.
 */
function readInteger(value: string | undefined): number | undefined {
  const trimmed = value?.trim() ?? "";
  if (!INTEGER_PATTERN.test(trimmed)) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

/**
 * Reads a non-negative decimal number.
 *
 * @param value - Raw value.
 * @returns The number, or `undefined` when empty or invalid.
 */
function readDecimal(value: string | undefined): number | undefined {
  const trimmed = value?.trim() ?? "";
  return DECIMAL_PATTERN.test(trimmed) ? Number(trimmed) : undefined;
}

/**
 * Builds a range from its two optional bounds.
 *
 * @param min - Raw lower bound.
 * @param max - Raw upper bound.
 * @returns The range, or `undefined` when no bound is valid or the bounds are reversed.
 */
function toRange(min: string | undefined, max: string | undefined): NumericRange | undefined {
  const lower = readDecimal(min);
  const upper = readDecimal(max);
  if (lower === undefined && upper === undefined) {
    return undefined;
  }
  if (lower !== undefined && upper !== undefined && lower > upper) {
    return undefined;
  }
  return {
    ...(lower === undefined ? {} : { min: lower }),
    ...(upper === undefined ? {} : { max: upper }),
  };
}

/** Raw parameters grouped by meaning, before validation. */
interface RawParams {
  readonly single: Map<string, string>;
  readonly brands: string[];
  readonly attributes: Map<string, string[]>;
  readonly ranges: Map<string, string>;
  readonly rangeBounds: Map<string, Partial<Record<RangeBound, string>>>;
}

/**
 * Stores a `r.<key>` or `r.<key>.min|max` parameter.
 *
 * @param raw - Accumulator.
 * @param rest - Parameter name without the `r.` prefix.
 * @param value - Parameter value.
 */
function collectRange(raw: RawParams, rest: string, value: string): void {
  const [key = "", rawBound, ...extra] = rest.split(RANGE_BOUND_SEPARATOR);
  if (!ATTRIBUTE_KEY_PATTERN.test(key) || extra.length > 0) {
    return;
  }
  if (rawBound === undefined) {
    raw.ranges.set(key, value);
    return;
  }
  const bound = RangeBoundSchema.safeParse(rawBound);
  if (bound.success) {
    raw.rangeBounds.set(key, { ...raw.rangeBounds.get(key), [bound.data]: value });
  }
}

/**
 * Tells whether a received parameter name is a given fixed parameter.
 *
 * @param name - Received name.
 * @param param - Expected parameter.
 * @returns `true` when they are the same.
 */
function isParam(name: string, param: SearchParam): boolean {
  const expected: string = param;
  return name === expected;
}

/**
 * Sorts the parameters by meaning.
 *
 * @param entries - Every `[name, value]` pair.
 * @returns The grouped raw values; the first occurrence wins for single-valued parameters.
 */
function groupParams(entries: readonly (readonly [string, string])[]): RawParams {
  const raw: RawParams = {
    single: new Map(),
    brands: [],
    attributes: new Map(),
    ranges: new Map(),
    rangeBounds: new Map(),
  };
  for (const [name, value] of entries) {
    if (isParam(name, SearchParam.BRAND)) {
      raw.brands.push(value);
    } else if (name.startsWith(SearchParamPrefix.ATTRIBUTE)) {
      const key = name.slice(SearchParamPrefix.ATTRIBUTE.length);
      raw.attributes.set(key, [...(raw.attributes.get(key) ?? []), value]);
    } else if (name.startsWith(SearchParamPrefix.RANGE)) {
      collectRange(raw, name.slice(SearchParamPrefix.RANGE.length), value);
    } else if (!raw.single.has(name)) {
      raw.single.set(name, value);
    }
  }
  return raw;
}

/**
 * Validates the attribute values (`a.<key>`).
 *
 * @param attributes - Raw values per key.
 * @returns Valid keys with their distinct, non-empty, sorted values.
 */
function readAttributes(attributes: ReadonlyMap<string, string[]>): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, values] of attributes) {
    const kept = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
    if (ATTRIBUTE_KEY_PATTERN.test(key) && kept.length > 0) {
      result[key] = kept.slice(0, SEARCH_ATTRIBUTE_MAX_VALUES).sort();
    }
  }
  return result;
}

/**
 * Validates the numeric ranges, from `r.<key>=min-max` or from the form inputs.
 *
 * @param raw - Grouped raw parameters.
 * @returns Valid ranges per key; the URL form wins over the form inputs.
 */
function readRanges(raw: RawParams): Record<string, NumericRange> {
  const result: Record<string, NumericRange> = {};
  for (const [key, bounds] of raw.rangeBounds) {
    const range = toRange(bounds[RangeBound.MIN], bounds[RangeBound.MAX]);
    if (range) {
      result[key] = range;
    }
  }
  for (const [key, value] of raw.ranges) {
    const [min, max, ...extra] = value.split(RANGE_SEPARATOR);
    const range = extra.length === 0 ? toRange(min, max) : undefined;
    if (range) {
      result[key] = range;
    }
  }
  return result;
}

/**
 * Validates the price bounds: `min` ≥ 100 (backend `@Min(100)`), `max` ≤ 1 000 000 and ≥ `min`.
 *
 * @param single - Single-valued parameters.
 * @returns The valid bounds.
 */
function readPrices(
  single: ReadonlyMap<string, string>,
): Pick<SearchFilters, "priceMin" | "priceMax"> {
  const min = readInteger(single.get(SearchParam.PRICE_MIN));
  const priceMin =
    min !== undefined && min >= PRICE_MIN_EUR && min <= PRICE_MAX_EUR ? min : undefined;
  const max = readInteger(single.get(SearchParam.PRICE_MAX));
  const priceMax =
    max !== undefined && max > 0 && max <= PRICE_MAX_EUR && max >= (priceMin ?? 0)
      ? max
      : undefined;
  return {
    ...(priceMin === undefined ? {} : { priceMin }),
    ...(priceMax === undefined ? {} : { priceMax }),
  };
}

/**
 * Reads the keyword: trimmed, cut to {@link SEARCH_KEYWORD_MAX_LENGTH}, omitted when empty.
 *
 * @param value - Raw keyword.
 * @returns The keyword, or `undefined`.
 */
function readKeyword(value: string | undefined): string | undefined {
  const keyword = value?.trim().slice(0, SEARCH_KEYWORD_MAX_LENGTH).trim() ?? "";
  return keyword === "" ? undefined : keyword;
}

/**
 * Parses the product list query parameters.
 *
 * @param input - Page search params, `URLSearchParams` or form data turned into params.
 * @returns Valid filters in canonical form (brands and attribute values sorted); `page` is
 *   zero-based. Category attributes are kept only with a category.
 */
export function parseSearchParams(input: SearchParamsInput): SearchFilters {
  const raw = groupParams(toEntries(input));
  const keyword = readKeyword(raw.single.get(SearchParam.KEYWORD));
  const category = toCategoryKey(raw.single.get(SearchParam.CATEGORY));
  const brands = [...new Set(raw.brands)]
    .flatMap((value) => BrandSchema.safeParse(value).data ?? [])
    .sort();
  const page = readInteger(raw.single.get(SearchParam.PAGE)) ?? FIRST_PAGE_NUMBER;
  return {
    ...(keyword === undefined ? {} : { keyword }),
    ...(category === undefined ? {} : { category }),
    brands,
    ...readPrices(raw.single),
    attributes: category === undefined ? {} : readAttributes(raw.attributes),
    numericRanges: category === undefined ? {} : readRanges(raw),
    page: Math.max(page, FIRST_PAGE_NUMBER) - FIRST_PAGE_NUMBER,
  };
}

/**
 * Writes a range in its URL form (`8-32`, `8-`, `-32`).
 *
 * @param range - Range with at least one bound.
 * @returns The URL value.
 */
function formatRange(range: NumericRange): string {
  return `${range.min ?? ""}${RANGE_SEPARATOR}${range.max ?? ""}`;
}

/**
 * Builds the canonical query string of the filters.
 *
 * Parameters always come in the same order and brands, attribute keys and values are sorted,
 * so two equivalent filter sets give the same URL (and the same data-cache entry).
 *
 * @param filters - Valid filters.
 * @returns The query string without `?`, empty when nothing is selected.
 */
export function buildSearchQuery(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.keyword !== undefined) params.append(SearchParam.KEYWORD, filters.keyword);
  if (filters.category !== undefined) params.append(SearchParam.CATEGORY, filters.category);
  for (const brand of [...filters.brands].sort()) params.append(SearchParam.BRAND, brand);
  if (filters.priceMin !== undefined)
    params.append(SearchParam.PRICE_MIN, String(filters.priceMin));
  if (filters.priceMax !== undefined)
    params.append(SearchParam.PRICE_MAX, String(filters.priceMax));
  for (const [key, values] of Object.entries(filters.attributes).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    for (const value of [...values].sort())
      params.append(`${SearchParamPrefix.ATTRIBUTE}${key}`, value);
  }
  for (const [key, range] of Object.entries(filters.numericRanges).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    params.append(`${SearchParamPrefix.RANGE}${key}`, formatRange(range));
  }
  if (filters.page > 0) params.append(SearchParam.PAGE, String(filters.page + FIRST_PAGE_NUMBER));
  return params.toString();
}

/**
 * Builds the canonical product list URL of the filters.
 *
 * @param filters - Valid filters.
 * @returns `/products` followed by the canonical query string, if any.
 */
export function buildSearchUrl(filters: SearchFilters): string {
  const query = buildSearchQuery(filters);
  return query === "" ? CATALOG_PATH : `${CATALOG_PATH}?${query}`;
}

/**
 * Keeps only the attribute filters that the category schema defines.
 *
 * Values of an enum facet must be one of its options; values of a text facet are kept as they
 * are (their possible values come from the catalog, not from the schema, and a value no longer
 * present simply matches nothing, its pill staying removable); ranges must target a numeric
 * facet. This
 * drops the attributes of a previous category left in a no-JavaScript form, and hand-written
 * URLs that would silently match nothing.
 *
 * @param filters - Parsed filters.
 * @param facets - Facets of the selected category.
 * @returns The filters with only the attributes the category knows.
 */
export function restrictToFacets(
  filters: SearchFilters,
  facets: readonly CategoryFacet[],
): SearchFilters {
  const attributes: Record<string, string[]> = {};
  const numericRanges: Record<string, NumericRange> = {};
  for (const facet of facets) {
    const values = filters.attributes[facet.key];
    const range = filters.numericRanges[facet.key];
    if (facet.kind === FacetKind.ENUM && values) {
      const kept = values.filter((value) => facet.options.includes(value));
      if (kept.length > 0) attributes[facet.key] = kept;
    } else if ((facet.kind === FacetKind.BOOLEAN || facet.kind === FacetKind.TEXT) && values) {
      attributes[facet.key] = values;
    } else if (facet.kind === FacetKind.RANGE && range) {
      numericRanges[facet.key] = range;
    }
  }
  return { ...filters, attributes, numericRanges };
}
