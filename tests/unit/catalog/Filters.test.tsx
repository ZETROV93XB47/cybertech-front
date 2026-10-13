import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

import { Filters } from "@/features/catalog/components/Filters";
import { buildBrandFilter, buildFilterFacets } from "@/features/catalog/filter-facets";
import { CategoryKey } from "@/lib/enums/category-key";
import { FacetKind } from "@/lib/enums/facet-kind";
import { FacetSource } from "@/lib/enums/facet-source";
import type { ParsedCategorySchema } from "@/lib/schemas/category";
import type { FacetData } from "@/lib/schemas/facets";
import { EMPTY_SEARCH_FILTERS, type SearchFilters } from "@/lib/schemas/search";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const SCHEMA: ParsedCategorySchema = {
  facets: [
    { kind: FacetKind.TEXT, key: "gpu", label: "Gpu" },
    { kind: FacetKind.RANGE, key: "ram", label: "Ram", minimum: 8 },
  ],
  labels: {},
};

const GPUS = ["RTX 4060", "RTX 4070", "RTX 5060", "RTX 5070", "Arc", "Radeon", "UHD", "Iris"];

const DATA: FacetData = {
  source: FacetSource.BACKEND,
  hasCounts: true,
  totalHits: 30,
  brandCounts: { LENOVO: 12 },
  values: { gpu: GPUS.map((value, index) => ({ value, count: index === 2 ? 0 : 12 - index })) },
  ranges: { ram: { min: 8, max: 64 } },
};

const COMPUTERS: SearchFilters = { ...EMPTY_SEARCH_FILTERS, category: CategoryKey.COMPUTER };

/**
 * Renders the filters for some data and filters.
 *
 * @param data - Facet data.
 * @param filters - Current filters.
 * @returns The render result.
 */
function renderFilters(
  data: FacetData,
  filters: SearchFilters = COMPUTERS,
): ReturnType<typeof render> {
  return render(
    <Filters
      filters={filters}
      facets={buildFilterFacets(SCHEMA, data, filters)}
      brandFilter={buildBrandFilter(data, filters)}
      facetSource={data.source}
    />,
  );
}

describe("Filters", () => {
  it("shows text values with their counts and disables a value at 0", () => {
    renderFilters(DATA);
    const gpu = screen.getByRole("group", { name: "Carte graphique" });
    expect(within(gpu).getByRole("checkbox", { name: "RTX 4060 (12)" })).toBeEnabled();
    expect(within(gpu).getByRole("checkbox", { name: "RTX 5060 (0)" })).toBeDisabled();
  });

  it("shows brand counts and disables a brand at 0", () => {
    renderFilters(DATA);
    const brands = screen.getByRole("group", { name: "Marques" });
    expect(within(brands).getByRole("checkbox", { name: "Lenovo (12)" })).toBeEnabled();
    expect(within(brands).getByRole("checkbox", { name: "Dell (0)" })).toBeDisabled();
  });

  it("folds the values beyond 6 under a closed « Voir tout », open when a hidden one is ticked", () => {
    const { container, unmount } = renderFilters(DATA);
    expect(screen.getByText("Voir tout (8)")).toBeInTheDocument();
    expect(container.querySelector("details")).not.toHaveAttribute("open");
    unmount();
    const ticked = renderFilters(DATA, { ...COMPUTERS, attributes: { gpu: ["Iris"] } });
    expect(ticked.container.querySelector("details")).toHaveAttribute("open");
  });

  it("bounds the range inputs and describes the bounds", () => {
    renderFilters(DATA);
    const min = screen.getByRole("spinbutton", { name: "Mémoire vive (Go) minimum" });
    expect(min).toHaveAttribute("min", "8");
    expect(min).toHaveAttribute("max", "64");
    expect(min).toHaveAccessibleDescription("De 8 Go à 64 Go.");
  });

  it("warns when the filter values are unavailable", () => {
    renderFilters({ ...DATA, source: FacetSource.UNAVAILABLE, values: {}, brandCounts: null });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Certains filtres sont momentanément indisponibles.",
    );
  });

  it("has no accessibility violation", async () => {
    const { container } = renderFilters(DATA);
    expect(await axe(container)).toHaveNoViolations();
  });
});
