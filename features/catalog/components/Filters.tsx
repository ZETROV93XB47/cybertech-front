"use client";

/**
 * Catalog filters (FR-003, FR-004, FR-010).
 *
 * A plain `GET` form on `/products`: without JavaScript it submits the native way and the page
 * redirects to the canonical URL. With JavaScript, checkboxes and radios apply at once and the
 * form navigates to the canonical URL built by {@link buildSearchUrl}, so the URL stays the only
 * state of the filters (shareable, reloadable, back button). Brand and attribute values show
 * their counts when the facets endpoint gives them (FR-004).
 *
 * @see specs/002-catalog-refresh/research.md R1–R7
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ChangeEvent, type ReactNode, type SubmitEvent } from "react";

import { buttonVariants } from "@/components/ui/button";
import { PRICE_MAX_EUR, PRICE_MIN_EUR } from "@/lib/constants/catalog";
import { CATALOG_PATH } from "@/lib/constants/routes";
import type { CategoryKey } from "@/lib/enums/category-key";
import { FacetSource } from "@/lib/enums/facet-source";
import { RangeBound, SearchParam, SearchParamPrefix } from "@/lib/enums/search-param";
import { formatPrice } from "@/lib/format";
import type { SearchFilters } from "@/lib/schemas/search";
import { cn } from "@/lib/utils";

import type { BrandFilter, FilterFacet } from "../filter-facets";
import { CATEGORY_LABELS, LIST_MESSAGES } from "../messages";
import { buildSearchUrl, parseSearchParams } from "../search-params";

import { FacetFieldset, FIELDSET, INPUT, LEGEND, ValueCheckbox } from "./FacetFieldset";

/** Props of {@link Filters}. */
export interface FiltersProps {
  /** Filters of the current URL. */
  readonly filters: SearchFilters;
  /** Active categories, in display order (`getActiveCategories`). */
  readonly categories: readonly CategoryKey[];
  /** Attribute filters of the selected category (empty without category). */
  readonly facets: readonly FilterFacet[];
  /** Brand checkboxes, with their counts when known. */
  readonly brandFilter: BrandFilter;
  /** Origin of the facet data; `UNAVAILABLE` shows a notice when a category is selected. */
  readonly facetSource: FacetSource;
}

/** Input types that apply as soon as they change. */
const INSTANT_INPUT_TYPES: ReadonlySet<string> = new Set(["checkbox", "radio"]);

/**
 * Reads the form as filters. Category attributes are dropped when the category changed: they
 * belong to the previous category.
 *
 * @param form - The filter form.
 * @param current - Filters of the current URL.
 * @returns The filters to navigate to, first page.
 */
function readForm(form: HTMLFormElement, current: SearchFilters): SearchFilters {
  const params = new URLSearchParams();
  for (const [name, value] of new FormData(form)) {
    if (typeof value === "string") {
      params.append(name, value);
    }
  }
  const next = parseSearchParams(params);
  return next.category === current.category ? next : { ...next, attributes: {}, numericRanges: {} };
}

/**
 * Category radios, « Toutes » first, then the active categories in display order.
 *
 * @param props - Active categories and the selected one.
 * @returns The fieldset.
 */
function CategoryFieldset({
  categories,
  selected,
}: {
  readonly categories: readonly CategoryKey[];
  readonly selected: CategoryKey | undefined;
}): ReactNode {
  const options: readonly (readonly [CategoryKey | "", string])[] = [
    ["", LIST_MESSAGES.allCategories],
    ...categories.map((key) => [key, CATEGORY_LABELS[key]] as const),
  ];
  return (
    <fieldset className={FIELDSET}>
      <legend className={LEGEND}>{LIST_MESSAGES.categoryLegend}</legend>
      {options.map(([value, label]) => (
        <label key={value} className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={SearchParam.CATEGORY}
            value={value}
            defaultChecked={(selected ?? "") === value}
            className="accent-brand"
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Brand checkboxes, in two columns, with their counts when known.
 *
 * @param props - Brand filter.
 * @returns The fieldset.
 */
function BrandFieldset({ brandFilter }: { readonly brandFilter: BrandFilter }): ReactNode {
  return (
    <fieldset className={FIELDSET}>
      <legend className={LEGEND}>{LIST_MESSAGES.brandLegend}</legend>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {brandFilter.values.map((item) => (
          <ValueCheckbox key={item.value} name={SearchParam.BRAND} item={item} />
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Refuses reversed ranges (minimum above maximum) on the maximum field before submitting:
 * native validation only checks each field against its own bounds.
 *
 * @param form - The filter form.
 * @returns `true` when every range is consistent.
 */
function checkRanges(form: HTMLFormElement): boolean {
  const inputs = form.querySelectorAll<HTMLInputElement>(
    `input[name^="${SearchParamPrefix.RANGE}"][name$=".${RangeBound.MAX}"]`,
  );
  for (const maxInput of inputs) {
    const minName = maxInput.name.replace(new RegExp(`${RangeBound.MAX}$`), RangeBound.MIN);
    const minInput = form.elements.namedItem(minName);
    const isReversed =
      minInput instanceof HTMLInputElement &&
      minInput.value !== "" &&
      maxInput.value !== "" &&
      Number(minInput.value) > Number(maxInput.value);
    maxInput.setCustomValidity(isReversed ? LIST_MESSAGES.rangeReversed : "");
  }
  return form.reportValidity();
}

/**
 * Price bounds in euros; the backend cannot filter under 100 €.
 *
 * @param props - Current bounds.
 * @returns The fieldset.
 */
function PriceFieldset({ filters }: { readonly filters: SearchFilters }): ReactNode {
  return (
    <fieldset className={FIELDSET} aria-describedby="price-hint">
      <legend className={LEGEND}>{LIST_MESSAGES.priceLegend}</legend>
      <div className="flex items-center gap-2">
        <input
          type="number"
          name={SearchParam.PRICE_MIN}
          aria-label={LIST_MESSAGES.priceMinLabel}
          placeholder={LIST_MESSAGES.rangeShortMin}
          min={PRICE_MIN_EUR}
          max={PRICE_MAX_EUR}
          defaultValue={filters.priceMin}
          className={INPUT}
        />
        <input
          type="number"
          name={SearchParam.PRICE_MAX}
          aria-label={LIST_MESSAGES.priceMaxLabel}
          placeholder={LIST_MESSAGES.rangeShortMax}
          min={PRICE_MIN_EUR}
          max={PRICE_MAX_EUR}
          defaultValue={filters.priceMax}
          className={INPUT}
        />
      </div>
      <p id="price-hint" className="text-xs text-text-muted">
        {LIST_MESSAGES.priceHint(formatPrice(PRICE_MIN_EUR))}
      </p>
    </fieldset>
  );
}

/**
 * The filter form.
 *
 * @param props - Current filters, the attribute and brand filters, and the facets source.
 * @returns The form, keyed on the URL so it resets after each navigation.
 */
export function Filters({
  filters,
  categories,
  facets,
  brandFilter,
  facetSource,
}: FiltersProps): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const onSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!checkRanges(event.currentTarget)) {
      return;
    }
    const url = buildSearchUrl(readForm(event.currentTarget, filters));
    startTransition(() => {
      router.push(url);
    });
  };
  const onChange = (event: ChangeEvent<HTMLFormElement>): void => {
    if (event.target instanceof HTMLInputElement && INSTANT_INPUT_TYPES.has(event.target.type)) {
      event.currentTarget.requestSubmit();
    }
  };
  return (
    <form
      key={buildSearchUrl(filters)}
      method="get"
      action={CATALOG_PATH}
      onSubmit={onSubmit}
      onChange={onChange}
      aria-label={LIST_MESSAGES.filtersTitle}
      aria-busy={isPending}
      className="flex flex-col gap-6"
    >
      <label className="flex flex-col gap-2 text-sm">
        <span className={LEGEND}>{LIST_MESSAGES.keywordLabel}</span>
        <input
          type="search"
          name={SearchParam.KEYWORD}
          defaultValue={filters.keyword}
          placeholder={LIST_MESSAGES.keywordPlaceholder}
          className={INPUT}
        />
      </label>
      <CategoryFieldset categories={categories} selected={filters.category} />
      {filters.category !== undefined && facetSource === FacetSource.UNAVAILABLE && (
        <p role="status" className="text-xs text-text-muted">
          {LIST_MESSAGES.facetsUnavailable}
        </p>
      )}
      {facets.map((facet) => (
        <FacetFieldset key={facet.key} facet={facet} />
      ))}
      <BrandFieldset brandFilter={brandFilter} />
      <PriceFieldset filters={filters} />
      <div className="flex flex-col gap-3">
        <button type="submit" className={cn(buttonVariants(), "cta-gradient")}>
          {LIST_MESSAGES.apply}
        </button>
        <Link href={CATALOG_PATH} className={buttonVariants({ variant: "ghost" })}>
          {LIST_MESSAGES.reset}
        </Link>
      </div>
    </form>
  );
}
