import { describe, expect, it } from "vitest";

import { resolveNavCategory, resolveNavSection } from "@/components/layout/nav-section";
import { CategoryKey } from "@/lib/enums/category-key";
import { NavSection } from "@/lib/enums/nav-section";

const PRODUCT_PATH = "/products/0193a2b4-1111-7222-8333-000000000001";

const params = (query = ""): URLSearchParams => new URLSearchParams(query);

describe("resolveNavSection", () => {
  it.each([
    ["/", NavSection.HOME],
    ["/products", NavSection.CATALOG],
    [PRODUCT_PATH, NavSection.CATALOG],
    ["/promotions", NavSection.PROMOTIONS],
    ["/promotions/BLACK_FRIDAY", NavSection.PROMOTIONS],
    ["/promotionsx", NavSection.NONE],
    ["/cart", NavSection.NONE],
    ["/register", NavSection.NONE],
    ["/login", NavSection.NONE],
    ["/account/orders", NavSection.ACCOUNT],
    ["/account/reviews", NavSection.ACCOUNT],
    ["/checkout", NavSection.ACCOUNT],
    ["/accounts", NavSection.NONE],
  ])("%s gives %s", (pathname, expected) => {
    expect(resolveNavSection(pathname)).toBe(expected);
  });
});

describe("resolveNavCategory", () => {
  it.each([
    ["/products", "category=SMARTWATCH", null, CategoryKey.SMARTWATCH],
    ["/products", "category=DESKTOP&brand=DELL", null, CategoryKey.DESKTOP],
    ["/products", "", null, null],
    ["/products", "category=TABLET", null, null],
    [PRODUCT_PATH, "", CategoryKey.SMARTPHONE, CategoryKey.SMARTPHONE],
    [PRODUCT_PATH, "", null, null],
    ["/", "category=COMPUTER", null, null],
  ])("%s?%s with product category %s gives %s", (pathname, query, category, expected) => {
    expect(resolveNavCategory(pathname, params(query), category)).toBe(expected);
  });

  it("ignores a product category published outside a product page", () => {
    expect(resolveNavCategory("/cart", params(), CategoryKey.COMPUTER)).toBeNull();
  });
});
