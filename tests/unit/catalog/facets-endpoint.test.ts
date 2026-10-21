// @vitest-environment node
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryKey } from "@/lib/enums/category-key";
import { FacetSource } from "@/lib/enums/facet-source";
import { EMPTY_SEARCH_FILTERS, type SearchFilters } from "@/lib/schemas/search";

import { backendPage, backendProduct, fakeUuids } from "../../helpers/products";
import { TEST_BACKEND_URL } from "../../helpers/test-env";
import { testLogger } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const API = `${TEST_BACKEND_URL}/api/v1/services`;
const FACETS_URL = `${API}/product/search/facets`;
const SEARCH_URL = `${API}/product/search`;

const COMPUTERS: SearchFilters = {
  ...EMPTY_SEARCH_FILTERS,
  category: CategoryKey.COMPUTER,
  brands: [],
  attributes: { cpu: ["AMD Ryzen 7"] },
  page: 2,
};

const FACETS_BODY = {
  totalHits: 42,
  brands: [
    { value: "LENOVO", count: 12 },
    { value: "UNKNOWN_BRAND", count: 3 },
  ],
  price: { min: 349, max: 3299 },
  attributes: { cpu: [{ value: "AMD Ryzen 7", count: 5 }] },
  numericAttributes: { ram: { min: 8, max: 64 } },
};

const [UUID_A = "", UUID_B = "", UUID_C = ""] = fakeUuids(3);

/** Scan page of the fallback: three computers, one breaking the contract. */
function scanPage(): Record<string, unknown> {
  return backendPage([
    backendProduct({ uuid: UUID_A, attributes: { cpu: "Intel Core Ultra 7", ram: 16 } }),
    backendProduct({ uuid: UUID_B, attributes: { cpu: " AMD Ryzen 7 ", ram: 32, os: "" } }),
    backendProduct({ uuid: UUID_C, price: "free" }),
  ]);
}

/**
 * Loads a fresh copy of the module, so the « endpoint missing » warning state starts clean.
 *
 * @returns The module exports.
 */
async function loadFacetsModule(): Promise<typeof import("@/lib/api/endpoints/facets")> {
  vi.resetModules();
  return import("@/lib/api/endpoints/facets");
}

describe("getFacets", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("posts the search body without pagination and normalises the backend facets", async () => {
    let body: unknown;
    server.use(
      http.post(FACETS_URL, async ({ request }) => {
        body = await request.json();
        expect(request.headers.get("Authorization")).toBeNull();
        return HttpResponse.json(FACETS_BODY);
      }),
    );
    const { getFacets } = await loadFacetsModule();
    const data = await getFacets(COMPUTERS);
    expect(body).toEqual({ category: "COMPUTER", attributes: { cpu: ["AMD Ryzen 7"] } });
    expect(data).toEqual({
      source: FacetSource.BACKEND,
      hasCounts: true,
      totalHits: 42,
      brandCounts: { LENOVO: 12 },
      values: { cpu: [{ value: "AMD Ryzen 7", count: 5 }] },
      ranges: { ram: { min: 8, max: 64 } },
    });
    expect(testLogger.warn).toHaveBeenCalledWith(
      { brand: "UNKNOWN_BRAND" },
      "Unknown brand in facets, ignored",
    );
  });

  it("falls back to a category scan without counts when the endpoint is missing", async () => {
    let scanBody: unknown;
    server.use(
      http.post(FACETS_URL, () =>
        HttpResponse.json({ errorCode: "RESOURCE_NOT_FOUND" }, { status: 404 }),
      ),
      http.post(SEARCH_URL, async ({ request }) => {
        scanBody = await request.json();
        return HttpResponse.json(scanPage());
      }),
    );
    const { getFacets } = await loadFacetsModule();
    const data = await getFacets(COMPUTERS);
    await getFacets(COMPUTERS);
    expect(scanBody).toEqual({ category: "COMPUTER", page: 0, size: 1000 });
    expect(data).toEqual({
      source: FacetSource.FALLBACK,
      hasCounts: false,
      totalHits: 3,
      brandCounts: null,
      values: {
        cpu: [
          { value: "AMD Ryzen 7", count: null },
          { value: "Intel Core Ultra 7", count: null },
        ],
      },
      ranges: { ram: { min: 16, max: 32 } },
    });
    const missingWarnings = testLogger.warn.mock.calls.filter(
      ([, message]) => message === "Facets endpoint missing, using fallback",
    );
    expect(missingWarnings).toHaveLength(1);
    expect(testLogger.warn).toHaveBeenCalledWith(
      { dropped: 1 },
      "Fallback scan dropped invalid products",
    );
  });

  it("falls back when the facets payload does not match the contract", async () => {
    server.use(
      http.post(FACETS_URL, () => HttpResponse.json({ totalHits: "many" })),
      http.post(SEARCH_URL, () => HttpResponse.json(scanPage())),
    );
    const { getFacets } = await loadFacetsModule();
    expect((await getFacets(COMPUTERS)).source).toBe(FacetSource.FALLBACK);
  });

  it("is unavailable when the fallback fails or answers off-contract", async () => {
    server.use(
      http.post(FACETS_URL, () => new HttpResponse(null, { status: 500 })),
      http.post(SEARCH_URL, () => HttpResponse.json({ content: "nope" })),
    );
    const { getFacets } = await loadFacetsModule();
    const data = await getFacets(COMPUTERS);
    expect(data).toEqual({
      source: FacetSource.UNAVAILABLE,
      hasCounts: false,
      totalHits: null,
      brandCounts: null,
      values: {},
      ranges: {},
    });
    expect(testLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ category: "COMPUTER" }),
      "Fallback facets unavailable",
    );
  });

  it("does not scan without a category", async () => {
    const scan = vi.fn();
    server.use(
      http.post(FACETS_URL, () => new HttpResponse(null, { status: 503 })),
      http.post(SEARCH_URL, () => {
        scan();
        return HttpResponse.json(scanPage());
      }),
    );
    const { getFacets } = await loadFacetsModule();
    expect((await getFacets(EMPTY_SEARCH_FILTERS)).source).toBe(FacetSource.UNAVAILABLE);
    expect(scan).not.toHaveBeenCalled();
  });
});

describe("getCategoryCounts", () => {
  it("returns the total of each given category, null when its facets are unavailable", async () => {
    const asked: string[] = [];
    server.use(
      http.post(FACETS_URL, async ({ request }) => {
        const { category } = (await request.json()) as { category?: string };
        asked.push(category ?? "");
        if (category === CategoryKey.COMPUTER) {
          return HttpResponse.json({ ...FACETS_BODY, totalHits: 531 });
        }
        if (category === CategoryKey.SMARTWATCH) {
          return HttpResponse.json({ ...FACETS_BODY, totalHits: 315 });
        }
        return HttpResponse.error();
      }),
      http.post(SEARCH_URL, () => HttpResponse.error()),
    );
    const { getCategoryCounts } = await loadFacetsModule();
    const counts = await getCategoryCounts([
      CategoryKey.COMPUTER,
      CategoryKey.MONITOR,
      CategoryKey.SMARTWATCH,
    ]);
    expect(counts).toEqual({
      [CategoryKey.COMPUTER]: 531,
      [CategoryKey.MONITOR]: null,
      [CategoryKey.SMARTWATCH]: 315,
    });
    expect(asked.sort()).toEqual(
      [CategoryKey.COMPUTER, CategoryKey.MONITOR, CategoryKey.SMARTWATCH].sort(),
    );
  });

  it("asks nothing without category", async () => {
    const { getCategoryCounts } = await loadFacetsModule();
    expect(await getCategoryCounts([])).toEqual({});
  });
});
