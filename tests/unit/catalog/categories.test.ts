// @vitest-environment node
/**
 * Feature 004 US1 (T011): the category reference table and the list of active categories read
 * from `GET /product-category-schemas`.
 *
 * @see specs/004-catalog-promos-reviews/research.md R1
 */
import { Laptop, Package, PcCase, Smartphone, Watch } from "lucide-react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CATEGORY_ICONS,
  categoryIcon,
  categoryLabel,
  GENERIC_CATEGORY_ICON,
} from "@/features/catalog/category-icons";
import { CATEGORY_LABELS, GENERIC_CATEGORY_LABEL } from "@/features/catalog/messages";
import { CATEGORY_ORDER } from "@/lib/constants/categories";
import { CategoryKey } from "@/lib/enums/category-key";
import { CategorySummariesSchema, CategorySummarySchema } from "@/lib/schemas/category";

import { TEST_BACKEND_URL } from "../../helpers/test-env";
import { allLoggedText, testLogger } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const CATEGORIES_URL = `${TEST_BACKEND_URL}/api/v1/services/product-category-schemas`;

/** Body of `GET /product-category-schemas` for the given keys, as the backend sorts it. */
function categoriesBody(keys: readonly string[]): { categoryKey: string; label: string }[] {
  return [...keys].sort().map((categoryKey) => ({ categoryKey, label: `${categoryKey} label` }));
}

/**
 * Loads a fresh copy of the endpoint module (no memoised state between tests).
 *
 * @returns The module exports.
 */
async function loadCategoriesModule(): Promise<typeof import("@/lib/api/endpoints/categories")> {
  vi.resetModules();
  return import("@/lib/api/endpoints/categories");
}

describe("category reference table", () => {
  it("names and illustrates every known category", () => {
    for (const key of Object.values(CategoryKey)) {
      expect(CATEGORY_LABELS[key]).toBeTruthy();
      expect(CATEGORY_ICONS[key]).toBeDefined();
    }
    expect(CATEGORY_ORDER).toHaveLength(Object.values(CategoryKey).length);
    expect(new Set(CATEGORY_ORDER).size).toBe(CATEGORY_ORDER.length);
  });

  it.each([
    [CategoryKey.COMPUTER, "Ordinateurs portables", Laptop],
    [CategoryKey.DESKTOP, "Ordinateurs de bureau", PcCase],
    [CategoryKey.SMARTPHONE, "Smartphones", Smartphone],
    [CategoryKey.SMARTWATCH, "Montres connectées", Watch],
  ])("reads the raw category %s", (raw, label, icon) => {
    expect(categoryLabel(raw)).toBe(label);
    expect(categoryIcon(raw)).toBe(icon);
  });

  it.each([["TABLET"], [""], [null], [undefined]])(
    "falls back to the generic name and icon for %s",
    (raw) => {
      expect(categoryLabel(raw)).toBe(GENERIC_CATEGORY_LABEL);
      expect(categoryIcon(raw)).toBe(GENERIC_CATEGORY_ICON);
      expect(GENERIC_CATEGORY_ICON).toBe(Package);
    },
  );
});

describe("CategorySummarySchema", () => {
  it("accepts a ProductCategoryResponseDto and refuses an empty key", () => {
    expect(
      CategorySummarySchema.parse({ categoryKey: "SMARTWATCH", label: "Smartwatches" }),
    ).toEqual({ categoryKey: "SMARTWATCH", label: "Smartwatches" });
    expect(CategorySummariesSchema.safeParse([{ categoryKey: "", label: "x" }]).success).toBe(
      false,
    );
  });
});

describe("getActiveCategories", () => {
  beforeEach(() => {
    testLogger.warn.mockClear();
  });

  it("returns the active categories in display order", async () => {
    server.use(http.get(CATEGORIES_URL, () => HttpResponse.json(categoriesBody(CATEGORY_ORDER))));
    const { getActiveCategories } = await loadCategoriesModule();
    expect(await getActiveCategories()).toEqual(CATEGORY_ORDER);
    expect(testLogger.warn).not.toHaveBeenCalled();
  });

  it("leaves out an inactive category", async () => {
    const active = CATEGORY_ORDER.filter((key) => key !== CategoryKey.DESKTOP);
    server.use(http.get(CATEGORIES_URL, () => HttpResponse.json(categoriesBody(active))));
    const { getActiveCategories } = await loadCategoriesModule();
    expect(await getActiveCategories()).toEqual(active);
  });

  it("ignores a key the front does not know, with one warning", async () => {
    server.use(
      http.get(CATEGORIES_URL, () =>
        HttpResponse.json(categoriesBody([CategoryKey.MONITOR, "TABLET", CategoryKey.COMPUTER])),
      ),
    );
    const { getActiveCategories } = await loadCategoriesModule();
    expect(await getActiveCategories()).toEqual([CategoryKey.COMPUTER, CategoryKey.MONITOR]);
    expect(testLogger.warn).toHaveBeenCalledTimes(1);
    expect(allLoggedText()).toContain("TABLET");
  });

  it("falls back to every known category when the backend fails", async () => {
    server.use(http.get(CATEGORIES_URL, () => new HttpResponse(null, { status: 503 })));
    const { getActiveCategories } = await loadCategoriesModule();
    expect(await getActiveCategories()).toEqual(CATEGORY_ORDER);
    expect(testLogger.warn).toHaveBeenCalled();
  });
});
