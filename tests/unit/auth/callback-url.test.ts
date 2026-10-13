import { describe, expect, it } from "vitest";

import { loginPath, safeCallbackPath } from "@/lib/auth/callback-url";

const ORIGIN = "http://localhost:3000";

describe("safeCallbackPath", () => {
  it.each([
    ["/cart", "/cart"],
    ["/products?brand=LENOVO#top", "/products?brand=LENOVO#top"],
    [`${ORIGIN}/products/abc?photo=1`, "/products/abc?photo=1"],
  ])("keeps the same-origin target %s", (raw, expected) => {
    expect(safeCallbackPath(raw, ORIGIN)).toBe(expected);
  });

  it.each([
    [null],
    [""],
    ["https://evil.example/cart"],
    ["//evil.example/cart"],
    ["/\\evil.example"],
    ["javascript:alert(1)"],
    ["/login?callbackUrl=/cart"],
  ])("falls back to the home page for %s", (raw) => {
    expect(safeCallbackPath(raw, ORIGIN)).toBe("/");
  });
});

describe("loginPath", () => {
  it("encodes the page to come back to", () => {
    expect(loginPath("/products?brand=HP")).toBe("/login?callbackUrl=%2Fproducts%3Fbrand%3DHP");
  });
});
