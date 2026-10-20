import { describe, expect, it } from "vitest";

import { resolveNavSection } from "@/components/layout/nav-section";
import { CategoryKey } from "@/lib/enums/category-key";
import { NavSection } from "@/lib/enums/nav-section";

const PRODUCT_PATH = "/products/0193a2b4-1111-7222-8333-000000000001";

const params = (query = ""): URLSearchParams => new URLSearchParams(query);

describe("resolveNavSection", () => {
  it.each([
    ["/", "", null, NavSection.HOME],
    ["/products", "category=COMPUTER", null, NavSection.COMPUTER],
    ["/products", "category=MONITOR&brand=DELL", null, NavSection.MONITOR],
    ["/products", "", null, NavSection.CATALOG],
    ["/products", "category=PHONE", null, NavSection.CATALOG],
    ["/products", "q=lenovo", null, NavSection.CATALOG],
    [PRODUCT_PATH, "", CategoryKey.COMPUTER, NavSection.COMPUTER],
    [PRODUCT_PATH, "", CategoryKey.MONITOR, NavSection.MONITOR],
    [PRODUCT_PATH, "", null, NavSection.CATALOG],
    ["/cart", "", null, NavSection.NONE],
    ["/register", "", null, NavSection.NONE],
    ["/login", "callbackUrl=%2F", null, NavSection.NONE],
    ["/account/orders", "", null, NavSection.ACCOUNT],
    ["/account/wishlist", "page=2", null, NavSection.ACCOUNT],
    ["/checkout", "", null, NavSection.ACCOUNT],
    ["/accounts", "", null, NavSection.NONE],
  ])("%s?%s with product category %s gives %s", (pathname, query, category, expected) => {
    expect(resolveNavSection(pathname, params(query), category)).toBe(expected);
  });

  it("ignores a product category published outside a product page", () => {
    expect(resolveNavSection("/cart", params(), CategoryKey.COMPUTER)).toBe(NavSection.NONE);
  });
});
