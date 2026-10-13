import { describe, expect, it } from "vitest";

import { PendingActionType } from "@/lib/enums/cart";
import {
  GuestCartStorageSchema,
  PendingActionSchema,
  RecentlyViewedSchema,
} from "@/lib/schemas/storage";

const uuid = (index: number): string =>
  `0193a2b4-1111-7222-8333-${index.toString().padStart(12, "0")}`;

const line = (index: number, quantity = 1) => ({ productUuid: uuid(index), quantity });

const NOW = "2026-10-13T10:00:00Z";

describe("GuestCartStorageSchema", () => {
  it.each([1, 99])("accepts quantity %i", (quantity) => {
    expect(
      GuestCartStorageSchema.safeParse({ items: [line(1, quantity)], updatedAt: NOW }).success,
    ).toBe(true);
  });

  it.each([0, 100, 1.5])("rejects quantity %s", (quantity) => {
    expect(
      GuestCartStorageSchema.safeParse({ items: [line(1, quantity)], updatedAt: NOW }).success,
    ).toBe(false);
  });

  it("accepts 50 lines and rejects 51", () => {
    const lines = (count: number) => Array.from({ length: count }, (_, index) => line(index));
    expect(GuestCartStorageSchema.safeParse({ items: lines(50), updatedAt: NOW }).success).toBe(
      true,
    );
    expect(GuestCartStorageSchema.safeParse({ items: lines(51), updatedAt: NOW }).success).toBe(
      false,
    );
  });

  it("rejects a non-UUID product and a missing date", () => {
    expect(
      GuestCartStorageSchema.safeParse({
        items: [{ productUuid: "x", quantity: 1 }],
        updatedAt: NOW,
      }).success,
    ).toBe(false);
    expect(GuestCartStorageSchema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe("RecentlyViewedSchema", () => {
  it("accepts up to 8 distinct UUIDs", () => {
    expect(
      RecentlyViewedSchema.safeParse({ uuids: [0, 1, 2, 3, 4, 5, 6, 7].map(uuid) }).success,
    ).toBe(true);
  });

  it("rejects 9 UUIDs and duplicates", () => {
    expect(
      RecentlyViewedSchema.safeParse({ uuids: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(uuid) }).success,
    ).toBe(false);
    expect(RecentlyViewedSchema.safeParse({ uuids: [uuid(1), uuid(1)] }).success).toBe(false);
  });
});

describe("PendingActionSchema", () => {
  it("accepts a known action and rejects an unknown one", () => {
    expect(
      PendingActionSchema.safeParse({
        type: PendingActionType.ADD,
        productUuid: uuid(1),
        quantity: 2,
      }).success,
    ).toBe(true);
    expect(PendingActionSchema.safeParse({ type: "buy", productUuid: uuid(1) }).success).toBe(
      false,
    );
  });
});
