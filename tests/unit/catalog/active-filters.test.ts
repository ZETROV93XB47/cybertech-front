// @vitest-environment node
import { describe, expect, it } from "vitest";

import { clearAllHref, describeActiveFilters } from "@/features/catalog/active-filters";
import { parseSearchParams } from "@/features/catalog/search-params";
import { ActiveFilterKind } from "@/lib/enums/active-filter-kind";
import { formatPrice } from "@/lib/format";

/** Price label as written by the app (Intl inserts narrow no-break spaces). */
const PRICE_LABEL = `Prix : ${formatPrice(500)} – ${formatPrice(1500)}`;

/** Filters with every kind of criterion. */
const FILTERS = parseSearchParams(
  new URLSearchParams(
    "q=gaming&category=COMPUTER&brand=LENOVO&brand=HP&min=500&max=1500&a.cpu=AMD Ryzen 7&a.cpu=Intel Core Ultra 7&r.ram=16-32&page=3",
  ),
);

describe("describeActiveFilters", () => {
  it("describes every criterion with a French label, in a stable order", () => {
    const pills = describeActiveFilters(FILTERS, []);
    expect(pills.map(({ kind, label }) => [kind, label])).toEqual([
      [ActiveFilterKind.KEYWORD, "Recherche : « gaming »"],
      [ActiveFilterKind.CATEGORY, "Catégorie : Ordinateurs portables"],
      [ActiveFilterKind.BRAND, "Marque : HP"],
      [ActiveFilterKind.BRAND, "Marque : Lenovo"],
      [ActiveFilterKind.PRICE, PRICE_LABEL],
      [ActiveFilterKind.ATTRIBUTE, "Processeur : AMD Ryzen 7"],
      [ActiveFilterKind.ATTRIBUTE, "Processeur : Intel Core Ultra 7"],
      [ActiveFilterKind.RANGE, "Mémoire vive : 16 Go – 32 Go"],
    ]);
  });

  it("links each pill to the first page without that criterion only", () => {
    const pills = describeActiveFilters(FILTERS, []);
    const href = (label: string): URLSearchParams =>
      new URL(pills.find((pill) => pill.label === label)?.removeHref ?? "", "http://x")
        .searchParams;
    const withoutAmd = href("Processeur : AMD Ryzen 7");
    expect(withoutAmd.getAll("a.cpu")).toEqual(["Intel Core Ultra 7"]);
    expect(withoutAmd.get("q")).toBe("gaming");
    expect(withoutAmd.get("page")).toBeNull();
    expect(href("Marque : HP").getAll("brand")).toEqual(["LENOVO"]);
    expect(href("Mémoire vive : 16 Go – 32 Go").get("r.ram")).toBeNull();
    const withoutPrice = href(PRICE_LABEL);
    expect([withoutPrice.get("min"), withoutPrice.get("max")]).toEqual([null, null]);
  });

  it("drops the attribute filters together with the category (FR-011)", () => {
    const pill = describeActiveFilters(FILTERS, []).find(
      ({ kind }) => kind === ActiveFilterKind.CATEGORY,
    );
    const params = new URL(pill?.removeHref ?? "", "http://x").searchParams;
    expect(params.get("category")).toBeNull();
    expect(params.getAll("a.cpu")).toEqual([]);
    expect(params.get("r.ram")).toBeNull();
    expect(params.getAll("brand")).toEqual(["HP", "LENOVO"]);
  });

  it("writes open-ended ranges and takes labels from the displayed filters", () => {
    const filters = parseSearchParams(
      new URLSearchParams("category=MONITOR&r.refreshRate=144-&max=900"),
    );
    const pills = describeActiveFilters(filters, []);
    expect(pills.map(({ label }) => label)).toContain(
      "Fréquence de rafraîchissement : à partir de 144 Hz",
    );
    expect(pills.map(({ label }) => label)).toContain(`Prix : jusqu'à ${formatPrice(900)}`);
  });

  it("returns nothing without active filter", () => {
    expect(describeActiveFilters(parseSearchParams(new URLSearchParams()), [])).toEqual([]);
  });
});

describe("clearAllHref", () => {
  it("keeps only the keyword (FR-009)", () => {
    expect(clearAllHref(FILTERS)).toBe("/products?q=gaming");
    expect(clearAllHref(parseSearchParams(new URLSearchParams("category=COMPUTER")))).toBe(
      "/products",
    );
  });
});
