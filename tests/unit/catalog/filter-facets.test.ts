// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildBrandFilter, buildFilterFacets } from "@/features/catalog/filter-facets";
import { Brand } from "@/lib/enums/brand";
import { CategoryKey } from "@/lib/enums/category-key";
import { FacetKind } from "@/lib/enums/facet-kind";
import { FacetSource } from "@/lib/enums/facet-source";
import type { ParsedCategorySchema } from "@/lib/schemas/category";
import type { FacetData } from "@/lib/schemas/facets";
import { EMPTY_SEARCH_FILTERS, type SearchFilters } from "@/lib/schemas/search";

/** COMPUTER schema as parsed from the backend (schema order kept). */
const COMPUTER_SCHEMA: ParsedCategorySchema = {
  facets: [
    { kind: FacetKind.TEXT, key: "cpu", label: "Cpu" },
    { kind: FacetKind.TEXT, key: "gpu", label: "Gpu" },
    { kind: FacetKind.RANGE, key: "ram", label: "Ram", minimum: 8 },
    { kind: FacetKind.TEXT, key: "connectivity", label: "Connectivity" },
    { kind: FacetKind.ENUM, key: "panel", label: "Dalle", options: ["IPS", "OLED"] },
    { kind: FacetKind.BOOLEAN, key: "touch", label: "Touch" },
    { kind: FacetKind.TEXT, key: "newKey", label: "New key" },
  ],
  labels: {},
};

const WITH_COUNTS: FacetData = {
  source: FacetSource.BACKEND,
  hasCounts: true,
  totalHits: 20,
  brandCounts: { LENOVO: 12, HP: 0 },
  values: {
    cpu: ["A", "B", "C", "D", "E", "F", "G"].map((value, index) => ({
      value,
      count: index === 1 ? 0 : 10 - index,
    })),
    gpu: [],
    connectivity: [{ value: "Wi-Fi 6E, Bluetooth 5.3", count: 4 }],
    panel: [{ value: "OLED", count: 3 }],
    newKey: [{ value: "x", count: 1 }],
  },
  ranges: { ram: { min: 4, max: 64 } },
};

const WITHOUT_COUNTS: FacetData = {
  ...WITH_COUNTS,
  source: FacetSource.FALLBACK,
  hasCounts: false,
  brandCounts: null,
  values: { cpu: [{ value: "A", count: null }] },
  ranges: {},
};

/**
 * Filters of the COMPUTER category with some ticked values.
 *
 * @param attributes - Ticked attribute values.
 * @returns The filters.
 */
function computers(attributes: SearchFilters["attributes"] = {}): SearchFilters {
  return { ...EMPTY_SEARCH_FILTERS, category: CategoryKey.COMPUTER, attributes };
}

describe("buildFilterFacets", () => {
  it("keeps the schema order, drops connectivity and empty text filters", () => {
    const facets = buildFilterFacets(COMPUTER_SCHEMA, WITH_COUNTS, computers());
    expect(facets.map(({ key }) => key)).toEqual(["cpu", "ram", "panel", "touch", "newKey"]);
  });

  it("labels known attributes in French with their unit, unknown ones from the schema", () => {
    const facets = buildFilterFacets(COMPUTER_SCHEMA, WITH_COUNTS, computers());
    expect(facets.find(({ key }) => key === "cpu")).toMatchObject({
      label: "Processeur",
      unit: undefined,
    });
    expect(facets.find(({ key }) => key === "ram")).toMatchObject({
      label: "Mémoire vive",
      unit: "Go",
    });
    expect(facets.find(({ key }) => key === "newKey")).toMatchObject({ label: "New key" });
  });

  it("disables a value at 0 unless it is ticked, and splits the list after 6 values", () => {
    const [cpu] = buildFilterFacets(COMPUTER_SCHEMA, WITH_COUNTS, computers());
    expect(cpu).toMatchObject({ kind: FacetKind.TEXT, visibleCount: 6, isExpanded: false });
    expect(cpu?.kind === FacetKind.TEXT && cpu.values[1]).toEqual({
      value: "B",
      label: "B",
      count: 0,
      isChecked: false,
      isDisabled: true,
    });
    const ticked = buildFilterFacets(COMPUTER_SCHEMA, WITH_COUNTS, computers({ cpu: ["B"] }))[0];
    expect(ticked?.kind === FacetKind.TEXT && ticked.values[1]?.isDisabled).toBe(false);
  });

  it("opens the disclosure when a hidden value is ticked", () => {
    const [cpu] = buildFilterFacets(COMPUTER_SCHEMA, WITH_COUNTS, computers({ cpu: ["G"] }));
    expect(cpu).toMatchObject({ isExpanded: true });
  });

  it("keeps a ticked value missing from the data, with 0 (counts) or null (no counts)", () => {
    const [cpu] = buildFilterFacets(COMPUTER_SCHEMA, WITH_COUNTS, computers({ cpu: ["Z"] }));
    expect(cpu?.kind === FacetKind.TEXT && cpu.values.at(-1)).toMatchObject({
      value: "Z",
      count: 0,
      isChecked: true,
      isDisabled: false,
    });
    const fallback = buildFilterFacets(COMPUTER_SCHEMA, WITHOUT_COUNTS, computers({ gpu: ["Z"] }));
    const gpu = fallback.find(({ key }) => key === "gpu");
    expect(gpu?.kind === FacetKind.TEXT && gpu.values).toEqual([
      { value: "Z", label: "Z", count: null, isChecked: true, isDisabled: false },
    ]);
  });

  it("gives enum options their counts, 0 when absent with counts", () => {
    const panel = buildFilterFacets(COMPUTER_SCHEMA, WITH_COUNTS, computers()).find(
      ({ key }) => key === "panel",
    );
    expect(panel?.kind === FacetKind.ENUM && panel.values.map(({ count }) => count)).toEqual([
      0, 3,
    ]);
  });

  it("bounds a range by the schema minimum and the observed values", () => {
    const ram = buildFilterFacets(COMPUTER_SCHEMA, WITH_COUNTS, {
      ...computers(),
      numericRanges: { ram: { min: 16 } },
    }).find(({ key }) => key === "ram");
    expect(ram).toMatchObject({ lower: 8, upper: 64, selected: { min: 16 } });
    const noObserved = buildFilterFacets(COMPUTER_SCHEMA, WITHOUT_COUNTS, computers()).find(
      ({ key }) => key === "ram",
    );
    expect(noObserved).toMatchObject({ lower: 8, upper: undefined });
  });

  it("widens the bounds to keep a range chosen outside the observed values", () => {
    const ram = buildFilterFacets(COMPUTER_SCHEMA, WITH_COUNTS, {
      ...computers(),
      numericRanges: { ram: { min: 2, max: 128 } },
    }).find(({ key }) => key === "ram");
    expect(ram).toMatchObject({ lower: 2, upper: 128 });
  });

  it("returns nothing without a category schema", () => {
    expect(buildFilterFacets({ facets: [], labels: {} }, WITH_COUNTS, computers())).toEqual([]);
  });
});

describe("buildBrandFilter", () => {
  it("lists every brand in enum order with its count, 0 when absent", () => {
    const { values } = buildBrandFilter(WITH_COUNTS, {
      ...EMPTY_SEARCH_FILTERS,
      brands: [Brand.HP],
    });
    expect(values.map(({ value }) => value)).toEqual(Object.values(Brand));
    expect(values[Object.values(Brand).indexOf(Brand.LENOVO)]).toMatchObject({
      count: 12,
      isDisabled: false,
    });
    expect(values[Object.values(Brand).indexOf(Brand.HP)]).toMatchObject({
      count: 0,
      isChecked: true,
      isDisabled: false,
    });
    expect(values[Object.values(Brand).indexOf(Brand.DELL)]).toMatchObject({
      count: 0,
      isDisabled: true,
    });
  });

  it("has no counts without the facets endpoint", () => {
    const { values } = buildBrandFilter(WITHOUT_COUNTS, EMPTY_SEARCH_FILTERS);
    expect(values.every(({ count, isDisabled }) => count === null && !isDisabled)).toBe(true);
  });
});
