"use client";

/**
 * Instant search palette, opened with ⌘K / Ctrl+K or the header button (FR-009).
 *
 * The keyword is debounced ({@link COMMAND_PALETTE_DEBOUNCE_MS}); an outdated request is
 * aborted by TanStack Query through its `AbortSignal`. cmdk handles the keyboard (arrows, Enter)
 * and Radix the focus trap and Escape. Results are filtered by the backend (typo-tolerant), so
 * cmdk's own filtering is disabled.
 */
import { useQuery } from "@tanstack/react-query";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { HEADER_CONTROL_CLASS, HEADER_ICON_CLASS } from "@/components/layout/header-controls";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { bffGet } from "@/lib/api/bff-client";
import { COMMAND_PALETTE_DEBOUNCE_MS } from "@/lib/constants/catalog";
import { BFF_ROUTES, productPath } from "@/lib/constants/routes";
import { QueryKey } from "@/lib/enums/query-key";
import { SearchParam } from "@/lib/enums/search-param";
import { formatPrice } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { ProductCardSchema, type ProductCard } from "@/lib/schemas/product";
import { EMPTY_SEARCH_FILTERS } from "@/lib/schemas/search";

import { PALETTE_MESSAGES } from "../messages";
import { buildSearchUrl } from "../search-params";
import { cn } from "@/lib/utils";

/** Body of `GET /api/search`. */
const SearchResponseSchema = z.object({ results: z.array(ProductCardSchema) });

/** cmdk value of the « see all results » item; prefixed so it never equals a product UUID. */
const SEE_ALL_VALUE_PREFIX = "all:";

/** Key that opens the palette together with ⌘ or Ctrl. */
const SHORTCUT_KEY = "k";

/**
 * Toggles the palette on ⌘K / Ctrl+K anywhere on the page.
 *
 * @param toggle - Called on each shortcut press.
 */
function useShortcut(toggle: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() === SHORTCUT_KEY && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [toggle]);
}

/**
 * Searches the products of a keyword through the BFF.
 *
 * @param keyword - Debounced keyword, empty when nothing is typed.
 * @returns The query of the results.
 */
function usePaletteSearch(
  keyword: string,
): ReturnType<typeof useQuery<{ results: ProductCard[] }>> {
  return useQuery({
    queryKey: [QueryKey.SEARCH, keyword],
    queryFn: ({ signal }) =>
      bffGet(
        BFF_ROUTES.search,
        new URLSearchParams({ [SearchParam.KEYWORD]: keyword }),
        SearchResponseSchema,
        signal,
      ),
    enabled: keyword !== "",
  });
}

/**
 * Message shown instead of results (idle, loading, error or no result).
 *
 * @param props - Keyword and query state.
 * @returns The message, or `null` when results are listed.
 */
function PaletteStatus({
  keyword,
  query,
}: {
  readonly keyword: string;
  readonly query: ReturnType<typeof usePaletteSearch>;
}): ReactNode {
  if (keyword === "") {
    return <p className="px-4 py-6 text-sm text-text-muted">{PALETTE_MESSAGES.idle}</p>;
  }
  if (query.isPending) {
    return (
      <CommandPrimitive.Loading className="px-4 py-6 text-sm text-text-muted">
        {PALETTE_MESSAGES.loading}
      </CommandPrimitive.Loading>
    );
  }
  if (query.isError) {
    return <p className="px-4 py-6 text-sm text-rose">{PALETTE_MESSAGES.error}</p>;
  }
  return (
    <CommandEmpty className="px-4 py-6 text-sm text-text-muted">
      {PALETTE_MESSAGES.empty}
    </CommandEmpty>
  );
}

/**
 * Header button and search dialog.
 *
 * @returns The trigger and the palette.
 */
export function CommandPalette(): ReactNode {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const keyword = useDebouncedValue(input.trim(), COMMAND_PALETTE_DEBOUNCE_MS);
  const query = usePaletteSearch(keyword);
  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);
  useShortcut(toggle);
  const onOpenChange = (next: boolean): void => {
    setOpen(next);
    if (!next) setInput("");
  };
  const go = (href: string): void => {
    onOpenChange(false);
    router.push(href);
  };
  const results = keyword === "" ? [] : (query.data?.results ?? []);
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-keyshortcuts="Control+K Meta+K"
        className={cn(HEADER_CONTROL_CLASS, "border border-border bg-surface-2")}
      >
        <Search aria-hidden className={HEADER_ICON_CLASS} />
        {PALETTE_MESSAGES.trigger}
        <kbd className="ml-4 text-xs text-text-muted">{PALETTE_MESSAGES.shortcutHint}</kbd>
      </button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="glass overflow-hidden rounded-card p-0">
          <DialogTitle className="sr-only">{PALETTE_MESSAGES.title}</DialogTitle>
          <DialogDescription className="sr-only">{PALETTE_MESSAGES.description}</DialogDescription>
          <Command shouldFilter={false} label={PALETTE_MESSAGES.title} className="bg-transparent">
            <CommandInput
              value={input}
              onValueChange={setInput}
              placeholder={PALETTE_MESSAGES.placeholder}
            />
            <CommandList>
              {results.length === 0 && <PaletteStatus keyword={keyword} query={query} />}
              {results.length > 0 && (
                <CommandGroup heading={PALETTE_MESSAGES.resultsHeading}>
                  {results.map((product) => (
                    <CommandItem
                      key={product.uuid}
                      value={product.uuid}
                      onSelect={() => {
                        go(productPath(product.uuid));
                      }}
                    >
                      <span className="flex-1 truncate">{product.name}</span>
                      <span className="price text-sm">{formatPrice(product.price)}</span>
                    </CommandItem>
                  ))}
                  <CommandItem
                    value={`${SEE_ALL_VALUE_PREFIX}${keyword}`}
                    onSelect={() => {
                      go(buildSearchUrl({ ...EMPTY_SEARCH_FILTERS, keyword }));
                    }}
                  >
                    {PALETTE_MESSAGES.seeAll(keyword)}
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
