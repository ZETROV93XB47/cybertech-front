/**
 * Product list and search results (US1, FR-002 to FR-005, FR-010).
 *
 * The URL is parsed into filters, restricted to the facets of the selected category, and
 * redirected to its canonical form when it differs (invalid parameters, no-JavaScript form
 * submission), so every result page has exactly one URL. Facet values and counts are loaded
 * with the results and shown as filters and active-filter pills (feature 002, US1). Every
 * result card can join the product comparison, shown in the bar at the bottom (US2). The page
 * uses the template shared with the home page: breadcrumb, living title, result count (US4).
 *
 * @see specs/002-catalog-refresh/spec.md US1, US2, US4
 */
import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { EmptyState } from "@/components/layout/EmptyState";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { ActiveFilters } from "@/features/catalog/components/ActiveFilters";
import { CatalogBreadcrumb } from "@/features/catalog/components/CatalogBreadcrumb";
import { Filters } from "@/features/catalog/components/Filters";
import { Pagination } from "@/features/catalog/components/Pagination";
import { SortSelect } from "@/features/catalog/components/SortSelect";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { buildBrandFilter, buildFilterFacets } from "@/features/catalog/filter-facets";
import { CompareBar } from "@/features/compare/components/CompareBar";
import { CATEGORY_LABELS, LIST_MESSAGES } from "@/features/catalog/messages";
import {
  buildSearchQuery,
  buildSearchUrl,
  parseSearchParams,
  restrictToFacets,
  type SearchParamsInput,
} from "@/features/catalog/search-params";
import { getActiveCategories, getCategorySchema } from "@/lib/api/endpoints/categories";
import { getFacets } from "@/lib/api/endpoints/facets";
import { searchProducts } from "@/lib/api/endpoints/products";
import { CATALOG_PATH } from "@/lib/constants/routes";
import type { CategoryKey } from "@/lib/enums/category-key";
import { PageWidth } from "@/lib/enums/page-width";
import { createModuleLogger } from "@/lib/logger";
import type { ParsedCategorySchema } from "@/lib/schemas/category";
import { hasActiveFilters, type SearchFilters } from "@/lib/schemas/search";

const log = createModuleLogger("catalog.list");

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
 * Loads the schema of the selected category; a backend outage only hides its attribute filters
 * (the filter column then shows its « filtres indisponibles » notice), it never fails the page.
 *
 * @param category - Selected category.
 * @returns Its parsed schema, or no facet.
 */
async function loadCategorySchema(category: CategoryKey): Promise<ParsedCategorySchema> {
  try {
    return await getCategorySchema(category);
  } catch {
    log.warn({ category }, "Category schema unavailable; attribute filters hidden");
    return NO_CATEGORY;
  }
}

/**
 * Parses the URL and loads the category facets. A category that is not active (or unknown)
 * falls back to the whole catalog.
 *
 * @param input - Page search params.
 * @param categories - Active categories.
 * @returns Canonical filters and the category schema.
 */
async function resolveFilters(
  input: SearchParamsInput,
  categories: readonly CategoryKey[],
): Promise<{ filters: SearchFilters; schema: ParsedCategorySchema }> {
  const parsed = parseSearchParams(input);
  const { category, ...rest } = parsed;
  const isActive = category !== undefined && categories.includes(category);
  const kept: SearchFilters = isActive ? parsed : { ...rest, attributes: {}, numericRanges: {} };
  const schema = isActive ? await loadCategorySchema(category) : NO_CATEGORY;
  return { filters: restrictToFacets(kept, schema.facets), schema };
}

/**
 * Heading of the list: the keyword, else the selected category, else « Catalogue ».
 *
 * @param filters - Canonical filters.
 * @returns The title.
 */
function pageTitle(filters: SearchFilters): string {
  if (filters.keyword) {
    return LIST_MESSAGES.searchTitle(filters.keyword);
  }
  return filters.category ? CATEGORY_LABELS[filters.category] : LIST_MESSAGES.title;
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
 * Product list page.
 *
 * @param props - Page props.
 * @returns Filters, results grid and pagination.
 */
export default async function ProductsPage({
  searchParams,
}: ProductsPageProps): Promise<ReactNode> {
  const input = await searchParams;
  const categories = await getActiveCategories();
  const { filters, schema } = await resolveFilters(input, categories);
  if (buildSearchQuery(filters) !== receivedQuery(input)) {
    redirect(buildSearchUrl(filters));
  }
  const [results, facetData] = await Promise.all([searchProducts(filters), getFacets(filters)]);
  const { totalPages, totalElements } = results.page;
  if (totalPages > 0 && filters.page >= totalPages) {
    redirect(buildSearchUrl({ ...filters, page: totalPages - 1 }));
  }
  const facets = buildFilterFacets(schema, facetData, filters);
  const title = pageTitle(filters);
  return (
    <PageShell width={PageWidth.CATALOG}>
      <PageHeader
        breadcrumb={<CatalogBreadcrumb category={filters.category} />}
        title={<LiveTitle text={title} className={PAGE_TITLE_CLASS} />}
        live={LIST_MESSAGES.resultCount(totalElements)}
      />
      <div className="flex flex-col gap-10 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <Filters
            filters={filters}
            categories={categories}
            facets={facets}
            brandFilter={buildBrandFilter(facetData, filters)}
            facetSource={facetData.source}
          />
        </aside>
        <section
          aria-label={LIST_MESSAGES.gridLabel}
          className="flex min-w-0 flex-1 flex-col gap-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <ActiveFilters filters={filters} facets={facets} />
            <div className="ml-auto">
              <SortSelect filters={filters} />
            </div>
          </div>
          {results.content.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-10" />}
              title={LIST_MESSAGES.emptyTitle}
              body={LIST_MESSAGES.emptyBody}
              action={
                hasActiveFilters(filters)
                  ? { href: CATALOG_PATH, label: LIST_MESSAGES.reset }
                  : undefined
              }
            />
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
    </PageShell>
  );
}
