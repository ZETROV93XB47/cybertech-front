import { describe, expect, it } from "vitest";

import { AvailabilityLevel } from "@/lib/enums/availability-level";
import { Brand } from "@/lib/enums/brand";
import {
  ProductAvailabilitySchema,
  ProductSchema,
  toAvailabilityLevel,
  toProductCard,
} from "@/lib/schemas/product";

const UUID = "0193a2b4-1111-7222-8333-444455556666";

const PRODUCT = {
  uuid: UUID,
  name: "ThinkPad X1",
  price: 1499.9,
  brand: "LENOVO",
  category: "COMPUTER",
  photoUrls: ["http://localhost:4566/cybertech-products/x1.jpg"],
  description: "Ultrabook",
  attributes: { cpu: "i7", ram: 16 },
};

describe("ProductSchema", () => {
  it("accepts a backend product", () => {
    const product = ProductSchema.parse(PRODUCT);
    expect(product.brand).toBe(Brand.LENOVO);
  });

  it("rejects an unknown brand, a negative price and a non-UUID id", () => {
    expect(ProductSchema.safeParse({ ...PRODUCT, brand: "APPLE" }).success).toBe(false);
    expect(ProductSchema.safeParse({ ...PRODUCT, price: -1 }).success).toBe(false);
    expect(ProductSchema.safeParse({ ...PRODUCT, uuid: "42" }).success).toBe(false);
  });

  it("accepts a product without photo", () => {
    const card = toProductCard(ProductSchema.parse({ ...PRODUCT, photoUrls: [] }));
    expect(card.imageUrl).toBeNull();
  });
});

describe("toAvailabilityLevel", () => {
  const availability = (availableStock: number, inStock = availableStock > 0) =>
    ProductAvailabilitySchema.parse({ productUuid: UUID, availableStock, inStock });

  it.each([
    [0, AvailabilityLevel.OUT],
    [1, AvailabilityLevel.LOW],
    [5, AvailabilityLevel.LOW],
    [6, AvailabilityLevel.IN],
    [100, AvailabilityLevel.IN],
  ])("stock %i → %s", (stock, level) => {
    expect(toAvailabilityLevel(availability(stock))).toBe(level);
  });

  it("is OUT when the backend says not in stock", () => {
    expect(toAvailabilityLevel(availability(3, false))).toBe(AvailabilityLevel.OUT);
  });

  it("rejects a negative stock", () => {
    expect(
      ProductAvailabilitySchema.safeParse({ productUuid: UUID, availableStock: -1, inStock: false })
        .success,
    ).toBe(false);
  });
});
