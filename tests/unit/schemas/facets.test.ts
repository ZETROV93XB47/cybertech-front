// @vitest-environment node
import { describe, expect, it } from "vitest";

import { ProductFacetsResponseSchema } from "@/lib/schemas/facets";

/** Payload shaped like the backend `ProductFacetsResponseDto` with a category. */
const WITH_CATEGORY = {
  totalHits: 42,
  brands: [
    { value: "LENOVO", count: 12 },
    { value: "HP", count: 0 },
  ],
  price: { min: 349, max: 3299 },
  attributes: { cpu: [{ value: "AMD Ryzen 7", count: 5 }], os: [] },
  numericAttributes: { ram: { min: 8, max: 64 } },
};

describe("ProductFacetsResponseSchema", () => {
  it("accepts a response with category facets", () => {
    expect(ProductFacetsResponseSchema.parse(WITH_CATEGORY)).toEqual(WITH_CATEGORY);
  });

  it("accepts a response without category (no attribute sections)", () => {
    const withoutCategory = {
      totalHits: WITH_CATEGORY.totalHits,
      brands: WITH_CATEGORY.brands,
      price: WITH_CATEGORY.price,
    };
    expect(ProductFacetsResponseSchema.safeParse(withoutCategory).success).toBe(true);
  });

  it("accepts null bounds when no product matches", () => {
    const empty = { ...WITH_CATEGORY, totalHits: 0, price: { min: null, max: null } };
    expect(ProductFacetsResponseSchema.safeParse(empty).success).toBe(true);
  });

  it("rejects an empty value or a negative count", () => {
    const emptyValue = { ...WITH_CATEGORY, brands: [{ value: "", count: 1 }] };
    const negativeCount = { ...WITH_CATEGORY, attributes: { cpu: [{ value: "x", count: -1 }] } };
    expect(ProductFacetsResponseSchema.safeParse(emptyValue).success).toBe(false);
    expect(ProductFacetsResponseSchema.safeParse(negativeCount).success).toBe(false);
  });
});
