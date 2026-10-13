// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildSearchUrl, parseSearchParams } from "@/features/catalog/search-params";
import { Brand } from "@/lib/enums/brand";
import { CategoryKey } from "@/lib/enums/category-key";
import { EMPTY_SEARCH_FILTERS, toProductSearchRequest } from "@/lib/schemas/search";

const parse = (query: string) => parseSearchParams(new URLSearchParams(query));

describe("parseSearchParams", () => {
  it("returns empty filters for an empty URL", () => {
    expect(parse("")).toEqual(EMPTY_SEARCH_FILTERS);
  });

  it("trims the keyword and cuts it to 100 characters", () => {
    expect(parse("q=%20%20lenvo%20").keyword).toBe("lenvo");
    expect(parse(`q=${"a".repeat(150)}`).keyword).toHaveLength(100);
    expect(parse("q=%20%20").keyword).toBeUndefined();
  });

  it("keeps a known category only", () => {
    expect(parse("category=MONITOR").category).toBe(CategoryKey.MONITOR);
    expect(parse("category=TOASTER").category).toBeUndefined();
  });

  it("keeps known brands once each, sorted", () => {
    expect(parse("brand=LENOVO&brand=FOO&brand=LENOVO&brand=HP").brands).toEqual([
      Brand.HP,
      Brand.LENOVO,
    ]);
  });

  it("omits a minimum price under 100 €", () => {
    expect(parse("min=99").priceMin).toBeUndefined();
    expect(parse("min=100").priceMin).toBe(100);
    expect(parse("min=abc").priceMin).toBeUndefined();
    expect(parse("min=150.5").priceMin).toBeUndefined();
  });

  it("keeps a maximum price up to 1 000 000 € and not under the minimum", () => {
    expect(parse("max=1000000").priceMax).toBe(1_000_000);
    expect(parse("max=1000001").priceMax).toBeUndefined();
    expect(parse("min=500&max=400").priceMax).toBeUndefined();
    expect(parse("min=500&max=400").priceMin).toBe(500);
  });

  it("reads category attributes and ranges only when a category is set", () => {
    expect(parse("a.displayType=OLED&r.ram=8-32")).toMatchObject({
      attributes: {},
      numericRanges: {},
    });
    expect(
      parse("category=COMPUTER&a.displayType=OLED&a.displayType=LED&r.ram=8-32"),
    ).toMatchObject({
      attributes: { displayType: ["LED", "OLED"] },
      numericRanges: { ram: { min: 8, max: 32 } },
    });
  });

  it("accepts open ranges and ignores reversed or malformed ones", () => {
    const filters = parse(
      "category=COMPUTER&r.ram=16-&r.memory=-512&r.bad=32-8&r.worse=a-b&r.x=1-2-3",
    );
    expect(filters.numericRanges).toEqual({ ram: { min: 16 }, memory: { max: 512 } });
  });

  it("reads the range inputs of the no-JavaScript form", () => {
    const filters = parse("category=COMPUTER&r.ram.min=8&r.ram.max=&r.memory.min=&r.memory.max=");
    expect(filters.numericRanges).toEqual({ ram: { min: 8 } });
  });

  it("ignores attribute keys that are not property names", () => {
    expect(parse("category=COMPUTER&a.__proto__x=1&a.1abc=2&a.ok=").attributes).toEqual({});
  });

  it("turns the one-based page into a zero-based page", () => {
    expect(parse("page=3").page).toBe(2);
    expect(parse("page=1").page).toBe(0);
    expect(parse("page=0").page).toBe(0);
    expect(parse("page=-2").page).toBe(0);
    expect(parse("page=two").page).toBe(0);
  });

  it("reads Next.js search params objects with repeated values", () => {
    const filters = parseSearchParams({ q: "dell", brand: ["DELL", "HP"], page: undefined });
    expect(filters).toMatchObject({ keyword: "dell", brands: [Brand.DELL, Brand.HP], page: 0 });
  });
});

describe("buildSearchUrl", () => {
  it("returns the bare catalog path without filters", () => {
    expect(buildSearchUrl(EMPTY_SEARCH_FILTERS)).toBe("/products");
  });

  it("writes a canonical, sorted URL that parses back to the same filters", () => {
    const query =
      "page=2&r.ram=8-&brand=HP&a.displayType=OLED&category=COMPUTER&brand=DELL&q=portable&max=2000&min=300";
    const filters = parse(query);
    const url = buildSearchUrl(filters);
    expect(url).toBe(
      "/products?q=portable&category=COMPUTER&brand=DELL&brand=HP&min=300&max=2000&a.displayType=OLED&r.ram=8-&page=2",
    );
    expect(parse(url.split("?")[1] ?? "")).toEqual(filters);
  });
});

describe("toProductSearchRequest", () => {
  it("maps the filters to the backend body with the page size", () => {
    const filters = parse("q=lenvo&category=COMPUTER&brand=LENOVO&min=100&r.ram=16-&page=2");
    expect(toProductSearchRequest(filters)).toEqual({
      keyword: "lenvo",
      category: "COMPUTER",
      brands: ["LENOVO"],
      priceMin: 100,
      numericRanges: { ram: { min: 16 } },
      page: 1,
      size: 24,
    });
  });

  it("sends only the page and size for an empty search", () => {
    expect(toProductSearchRequest(EMPTY_SEARCH_FILTERS, 6)).toEqual({ page: 0, size: 6 });
  });
});
