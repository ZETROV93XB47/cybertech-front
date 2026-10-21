"use client";

/**
 * « Trier par » selector above the catalog results: relevance, name, price up or down, best
 * rated. Choosing an order navigates to the canonical URL with that order, back to the first
 * page, keeping every filter.
 *
 * Without JavaScript it is a small `GET` form: the current filters ride along in hidden fields
 * and a « Trier » button submits it. The order is applied by the backend to the whole result
 * (`docs/backend/backend-prompts-lot2.md` §16), never to the page shown only.
 *
 * @see lib/enums/product-sort.ts
 */
import { useRouter } from "next/navigation";
import { useId, useTransition, type ChangeEvent, type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { CATALOG_PATH } from "@/lib/constants/routes";
import { ProductSort } from "@/lib/enums/product-sort";
import { SearchParam } from "@/lib/enums/search-param";
import { SearchFiltersSchema, type SearchFilters } from "@/lib/schemas/search";
import { cn } from "@/lib/utils";

import { LIST_MESSAGES, SORT_LABELS } from "../messages";
import { buildSearchQuery, buildSearchUrl } from "../search-params";

import { INPUT } from "./FacetFieldset";

/** Orders offered, in display order. */
const SORT_OPTIONS: readonly ProductSort[] = Object.values(ProductSort);

/** Props of {@link SortSelect}. */
export interface SortSelectProps {
  /** Current filters and order. */
  readonly filters: SearchFilters;
}

/**
 * Filters of the URL, without the order and the page, as hidden fields of the no-JavaScript form.
 *
 * @param props - Current filters.
 * @returns The hidden inputs.
 */
function HiddenFilters({ filters }: SortSelectProps): ReactNode {
  const params = new URLSearchParams(buildSearchQuery({ ...filters, sort: undefined, page: 0 }));
  return [...params].map(([name, value], index) => (
    <input key={`${name}-${index}`} type="hidden" name={name} value={value} />
  ));
}

/**
 * Sort selector.
 *
 * @param props - Current filters and order.
 * @returns The labelled select.
 */
export function SortSelect({ filters }: SortSelectProps): ReactNode {
  const router = useRouter();
  const selectId = useId();
  const [isPending, startTransition] = useTransition();
  const onChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const sort = SearchFiltersSchema.shape.sort.safeParse(event.target.value).data;
    startTransition(() => {
      router.push(buildSearchUrl({ ...filters, sort, page: 0 }));
    });
  };
  return (
    <form
      method="get"
      action={CATALOG_PATH}
      aria-busy={isPending}
      className="flex items-center gap-3 text-sm"
    >
      <HiddenFilters filters={filters} />
      <label htmlFor={selectId} className="shrink-0 text-text-muted">
        {LIST_MESSAGES.sortLabel}
      </label>
      <select
        id={selectId}
        name={SearchParam.SORT}
        value={filters.sort ?? ProductSort.RELEVANCE}
        onChange={onChange}
        className={cn(INPUT, "w-auto pr-8")}
      >
        {SORT_OPTIONS.map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {LIST_MESSAGES.sortSubmit}
        </button>
      </noscript>
    </form>
  );
}
