"use client";

/**
 * Product search of the order edit form: a debounced keyword search through the existing
 * `GET /api/search` route, and one « Ajouter » button per result (reachable with Tab, activated
 * with Enter or Space).
 *
 * @see specs/003-account-orders/spec.md US3 scenario 9, FR-025
 * @see specs/003-account-orders/research.md R14
 */
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { bffGet } from "@/lib/api/bff-client";
import { ORDER_EDIT_SEARCH_DEBOUNCE_MS, ORDER_EDIT_SEARCH_SIZE } from "@/lib/constants/orders";
import { BFF_ROUTES } from "@/lib/constants/routes";
import { QueryKey } from "@/lib/enums/query-key";
import { SearchParam } from "@/lib/enums/search-param";
import { formatPrice } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { ProductCardSchema, type ProductCard } from "@/lib/schemas/product";

import { ORDER_EDIT_MESSAGES } from "../messages";
import type { PickedProduct } from "../order-edit";

/** Body of `GET /api/search`. */
const SearchResponseSchema = z.object({ results: z.array(ProductCardSchema) });

/** Props of {@link ProductPicker}. */
export interface ProductPickerProps {
  readonly onPick: (product: PickedProduct) => void;
  readonly disabled: boolean;
}

/**
 * Searches the products of a keyword.
 *
 * @param keyword - Debounced keyword, empty when nothing is typed.
 * @returns The query of the results.
 */
function useProductSearch(keyword: string): ReturnType<typeof useQuery<ProductCard[]>> {
  return useQuery({
    queryKey: [QueryKey.ORDER_SEARCH, keyword],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ [SearchParam.KEYWORD]: keyword });
      const body = await bffGet(BFF_ROUTES.search, params, SearchResponseSchema, signal);
      return body.results.slice(0, ORDER_EDIT_SEARCH_SIZE);
    },
    enabled: keyword !== "",
  });
}

/**
 * Message shown instead of results.
 *
 * @param props - Keyword and query state.
 * @returns The message, or `null` when there are results.
 */
function SearchStatus({
  keyword,
  query,
}: {
  readonly keyword: string;
  readonly query: ReturnType<typeof useProductSearch>;
}): ReactNode {
  if (keyword === "") {
    return ORDER_EDIT_MESSAGES.searchIdle;
  }
  if (query.isPending) {
    return ORDER_EDIT_MESSAGES.searchLoading;
  }
  if (query.isError) {
    return ORDER_EDIT_MESSAGES.searchError;
  }
  return query.data.length === 0 ? ORDER_EDIT_MESSAGES.searchEmpty : null;
}

/**
 * Product picker.
 *
 * @param props - Pick handler and disabled state.
 * @returns The search field and its results.
 */
export function ProductPicker({ onPick, disabled }: ProductPickerProps): ReactNode {
  const id = useId();
  const [input, setInput] = useState("");
  const keyword = useDebouncedValue(input.trim(), ORDER_EDIT_SEARCH_DEBOUNCE_MS);
  const query = useProductSearch(keyword);
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-sm font-medium">
        {ORDER_EDIT_MESSAGES.searchLabel}
      </label>
      <div className="relative">
        <Search
          aria-hidden
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
        />
        <Input
          id={id}
          type="search"
          value={input}
          placeholder={ORDER_EDIT_MESSAGES.searchPlaceholder}
          className="pl-9"
          onChange={(event) => {
            setInput(event.currentTarget.value);
          }}
        />
      </div>
      <p role="status" className="min-h-5 text-sm text-text-muted">
        <SearchStatus keyword={keyword} query={query} />
      </p>
      {query.data && query.data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {query.data.map((product) => (
            <li
              key={product.uuid}
              className="flex items-center justify-between gap-3 rounded-card border border-border p-3"
            >
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-1 text-sm">{product.name}</span>
                <span className="price text-sm">{formatPrice(product.price)}</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                aria-label={ORDER_EDIT_MESSAGES.addProduct(product.name)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-button border border-border text-brand-text transition-colors duration-(--duration-fast) hover:border-brand-text disabled:opacity-40"
                onClick={() => {
                  onPick({
                    productUuid: product.uuid,
                    productName: product.name,
                    unitPrice: product.price,
                  });
                }}
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
