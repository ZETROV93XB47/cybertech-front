/**
 * Product list and search results (US1, FR-002 to FR-005, FR-010).
 *
 * The URL is parsed into filters, restricted to the facets of the selected category, and
 * redirected to its canonical form when it differs (invalid parameters, no-JavaScript form
 * submission), so every result page has exactly one URL. Facet values and counts are loaded
 * with the results and shown as filters and active-filter pills (feature 002, US1). Every
 * result card can join the product comparison, shown in the bar at the bottom (US2).
 *
 * @see specs/002-catalog-refresh/spec.md US1, US2
 */
import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { StateIllustration } from "@/components/effects/StateIllustration";
import { buttonVariants } from "@/components/ui/button";
import { ActiveFilters } from "@/features/catalog/components/ActiveFilters";
import { Filters } from "@/features/catalog/components/Filters";
import { Pagination } from "@/features/catalog/components/Pagination";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { buildBrandFilter, buildFilterFacets } from "@/features/catalog/filter-facets";
import { CompareBar } from "@/features/compare/components/CompareBar";
import { LIST_MESSAGES } from "@/features/catalog/messages";
import {
  buildSearchQuery,
  buildSearchUrl,
  parseSearchParams,
  restrictToFacets,
  type SearchParamsInput,
} from "@/features/catalog/search-params";
import { getCategorySchema } from "@/lib/api/endpoints/categories";
import { getFacets } from "@/lib/api/endpoints/facets";
import { searchProducts } from "@/lib/api/endpoints/products";
import { CATALOG_PATH } from "@/lib/constants/routes";
import type { ParsedCategorySchema } from "@/lib/schemas/category";
import { hasActiveFilters, type SearchFilters } from "@/lib/schemas/search";

/** Props given by Next.js to the page. */
interface ProductsPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Category schema used when no category is selected. */
const NO_CATEGORY: ParsedCategorySchema = { facets: [], labels: {} };

/**
 * Writes the received query string in its original order, to compare it with the canonical one.
 *
 * @param input - Page search params.
 * @returns The query string without `?`.
 */
function receivedQuery(input: Readonly<Record<string, string | string[] | undefined>>): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(input)) {
    for (const item of typeof value === "string" ? [value] : (value ?? [])) {
      params.append(name, item);
    }
  }
  return params.toString();
}

/**
 * Parses the URL and loads the category facets.
 *
 * @param input - Page search params.
 * @returns Canonical filters and the category schema.
 */
async function resolveFilters(
  input: SearchParamsInput,
): Promise<{ filters: SearchFilters; schema: ParsedCategorySchema }> {
  const parsed = parseSearchParams(input);
  const schema = parsed.category ? await getCategorySchema(parsed.category) : NO_CATEGORY;
  return { filters: restrictToFacets(parsed, schema.facets), schema };
}

/**
 * Title of the page: the keyword when there is one.
 *
 * @param props - Page props.
 * @returns The metadata.
 */
export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const { keyword } = parseSearchParams(await searchParams);
  return { title: keyword ? LIST_MESSAGES.searchTitle(keyword) : LIST_MESSAGES.title };
}

/**
 * Explicit empty state with a way out (FR-005).
 *
 * @param props - Whether filters are set (the reset link is useless otherwise).
 * @returns The message.
 */
function EmptyResults({ canReset }: { readonly canReset: boolean }): ReactNode {
  return (
    <div className="glass flex flex-col items-start gap-4 rounded-card p-8">
      <StateIllustration icon={<SearchX className="size-10" />} />
      <h2 className="text-xl">{LIST_MESSAGES.emptyTitle}</h2>
      <p className="max-w-prose text-text-muted">{LIST_MESSAGES.emptyBody}</p>
      {canReset && (
        <Link href={CATALOG_PATH} className={buttonVariants()}>
          {LIST_MESSAGES.reset}
        </Link>
      )}
    </div>
  );
}

/**
 * Product list page.
 *
 * @param props - Page props.
 * @returns Filters, results grid and pagination.
 */
export default async function ProductsPage({
  searchParams,
}: ProductsPageProps): Promise<ReactNode> {
  const input = await searchParams;
  const { filters, schema } = await resolveFilters(input);
  if (buildSearchQuery(filters) !== receivedQuery(input)) {
    redirect(buildSearchUrl(filters));
  }
  const [results, facetData] = await Promise.all([searchProducts(filters), getFacets(filters)]);
  const { totalPages, totalElements } = results.page;
  if (totalPages > 0 && filters.page >= totalPages) {
    redirect(buildSearchUrl({ ...filters, page: totalPages - 1 }));
  }
  const facets = buildFilterFacets(schema, facetData, filters);
  return (
    <div className="mx-auto grid w-full max-w-site gap-10 px-6 py-10 lg:grid-cols-4">
      <aside className="lg:col-span-1">
        <Filters
          filters={filters}
          facets={facets}
          brandFilter={buildBrandFilter(facetData, filters)}
          facetSource={facetData.source}
        />
      </aside>
      <section aria-labelledby="results-title" className="flex flex-col gap-8 lg:col-span-3">
        <header className="flex items-baseline justify-between gap-4">
          <h1 id="results-title" className="text-3xl">
            {filters.keyword ? LIST_MESSAGES.searchTitle(filters.keyword) : LIST_MESSAGES.title}
          </h1>
          <p className="text-sm text-text-muted" aria-live="polite">
            {LIST_MESSAGES.resultCount(totalElements)}
          </p>
        </header>
        <ActiveFilters filters={filters} facets={facets} />
        {results.content.length === 0 ? (
          <EmptyResults canReset={hasActiveFilters(filters)} />
        ) : (
          <ProductGrid
            products={results.content}
            label={LIST_MESSAGES.gridLabel}
            eager
            comparable
          />
        )}
        <Pagination filters={filters} totalPages={totalPages} />
        <CompareBar />
      </section>
    </div>
  );
}
