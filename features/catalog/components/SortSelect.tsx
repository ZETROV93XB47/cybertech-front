"use client";

/**
 * « Trier par » selector above the catalog results: relevance, name, price up or down, best
 * rated. Choosing an order navigates to the canonical URL with that order, back to the first
 * page, keeping every filter.
 *
 * Built on the Radix `Select` (listbox pattern: arrows, Enter, Escape, typeahead) so the list
 * can look and open like the header menus: the chevron sits right after the order, turns when
 * the list is open, and the list drops in at full effects (`DropPanel`). Without JavaScript the
 * custom trigger is hidden and a small `GET` form takes its place: a native select, the current
 * filters in hidden fields and a « Trier » button. The order is applied by the backend to the
 * whole result (`docs/backend/backend-prompts-lot2.md` §16), never to the page shown only.
 *
 * @see lib/enums/product-sort.ts
 * @see specs/004-catalog-promos-reviews/research.md R3
 */
import { useRouter } from "next/navigation";
import { Select } from "radix-ui";
import { useId, useState, useTransition, type ReactNode } from "react";

import { DropPanel, PanelOrigin } from "@/components/effects/DropPanel";
import { buttonVariants } from "@/components/ui/button";
import { LISTBOX_OFFSET_PX, ListboxChevron, ListboxItem } from "@/components/ui/listbox";
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

/** Style of the trigger: the field look of the filters, sized to its text. */
const TRIGGER_CLASS =
  "inline-flex h-10 items-center gap-2 rounded-field border border-border bg-surface-2 px-3 text-sm text-text transition-colors duration-(--duration-fast) outline-none hover:border-brand-text focus-visible:border-brand-text noscript:hidden";

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
 * Native fallback shown only without JavaScript: select and submit button of the `GET` form.
 *
 * @param props - Order shown.
 * @returns The `noscript` block.
 */
function NoScriptSort({ current }: { readonly current: ProductSort }): ReactNode {
  const selectId = useId();
  return (
    <noscript>
      <label htmlFor={selectId} className="shrink-0 text-text-muted">
        {LIST_MESSAGES.sortLabel}
      </label>
      <select
        id={selectId}
        name={SearchParam.SORT}
        defaultValue={current}
        className={cn(INPUT, "w-auto")}
      >
        {SORT_OPTIONS.map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </option>
        ))}
      </select>
      <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        {LIST_MESSAGES.sortSubmit}
      </button>
    </noscript>
  );
}

/**
 * Sort selector.
 *
 * @param props - Current filters and order.
 * @returns The labelled selector, with its no-JavaScript form.
 */
export function SortSelect({ filters }: SortSelectProps): ReactNode {
  const router = useRouter();
  const triggerId = useId();
  const [isOpen, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const current = filters.sort ?? ProductSort.RELEVANCE;
  const onValueChange = (value: string): void => {
    const sort = SearchFiltersSchema.shape.sort.safeParse(value).data;
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
      <label htmlFor={triggerId} className="shrink-0 text-text-muted noscript:hidden">
        {LIST_MESSAGES.sortLabel}
      </label>
      <Select.Root
        value={current}
        onValueChange={onValueChange}
        open={isOpen}
        onOpenChange={setOpen}
      >
        <Select.Trigger id={triggerId} className={TRIGGER_CLASS}>
          <Select.Value />
          <ListboxChevron isOpen={isOpen} />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            align="start"
            sideOffset={LISTBOX_OFFSET_PX}
            className="z-50"
          >
            <DropPanel origin={PanelOrigin.TOP_LEFT} className="min-w-56">
              <Select.Viewport>
                {SORT_OPTIONS.map((sort) => (
                  <ListboxItem
                    key={sort}
                    value={sort}
                    label={SORT_LABELS[sort]}
                    isCurrent={sort === current}
                  />
                ))}
              </Select.Viewport>
            </DropPanel>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <NoScriptSort current={current} />
    </form>
  );
}
