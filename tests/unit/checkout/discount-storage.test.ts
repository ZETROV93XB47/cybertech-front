/**
 * Discount key storage and campaign descriptions (feature 003, T034).
 *
 * @see specs/003-account-orders/research.md R7
 * @see specs/003-account-orders/spec.md FR-017
 */
import { beforeEach, describe, expect, it } from "vitest";

import { describeDiscountOffer } from "@/features/checkout/discount-offer";
import {
  clearDiscountKey,
  readDiscountKey,
  writeDiscountKey,
} from "@/features/checkout/discount-storage";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import { StorageKey } from "@/lib/enums/storage-key";
import { formatDay, formatPrice } from "@/lib/format";
import { isDisplayableDiscount, type ActiveDiscount } from "@/lib/schemas/discount";

/** In-memory `Storage`, so each test starts from an empty tab. */
class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();

  public get length(): number {
    return this.items.size;
  }

  public clear(): void {
    this.items.clear();
  }

  public getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.items.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

/** `Storage` whose every access throws, like a browser with storage blocked. */
class BlockedStorage extends MemoryStorage {
  public override getItem(): string | null {
    throw new Error("blocked");
  }

  public override removeItem(): void {
    throw new Error("blocked");
  }

  public override setItem(): void {
    throw new Error("blocked");
  }
}

/** Campaign without any condition. */
const BASE: ActiveDiscount = {
  discountKey: "BLACK_FRIDAY",
  calculationType: DiscountCalculationType.PERCENTAGE,
  percentage: 20,
  fixedAmount: null,
  minOrderAmount: null,
  maxDiscountAmount: null,
  startsAt: null,
  endsAt: null,
};

describe("discount key storage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("writes, reads and clears the key under StorageKey.DISCOUNT", () => {
    expect(writeDiscountKey(storage, "BLACK_FRIDAY")).toBe("BLACK_FRIDAY");
    expect(storage.getItem(StorageKey.DISCOUNT)).toBe("BLACK_FRIDAY");
    expect(readDiscountKey(storage)).toBe("BLACK_FRIDAY");
    clearDiscountKey(storage);
    expect(readDiscountKey(storage)).toBeNull();
  });

  it("normalises a lower-case key typed by the customer", () => {
    expect(writeDiscountKey(storage, "  black_friday ")).toBe("BLACK_FRIDAY");
    expect(readDiscountKey(storage)).toBe("BLACK_FRIDAY");
  });

  it("refuses a malformed key without storing it", () => {
    expect(writeDiscountKey(storage, "NO-PE!")).toBeNull();
    expect(storage.getItem(StorageKey.DISCOUNT)).toBeNull();
  });

  it("removes a tampered value", () => {
    storage.setItem(StorageKey.DISCOUNT, "<script>");
    expect(readDiscountKey(storage)).toBeNull();
    expect(storage.getItem(StorageKey.DISCOUNT)).toBeNull();
  });

  it("treats a blocked storage as empty", () => {
    const blocked = new BlockedStorage();
    expect(readDiscountKey(blocked)).toBeNull();
    expect(writeDiscountKey(blocked, "BLACK_FRIDAY")).toBeNull();
    expect(() => {
      clearDiscountKey(blocked);
    }).not.toThrow();
  });
});

describe("describeDiscountOffer", () => {
  it("describes a percentage", () => {
    expect(describeDiscountOffer(BASE)).toEqual({
      key: "BLACK_FRIDAY",
      advantage: "−20 %",
      conditions: [],
    });
  });

  it("describes a fixed amount", () => {
    const offer = describeDiscountOffer({
      ...BASE,
      calculationType: DiscountCalculationType.FIXED_AMOUNT,
      percentage: null,
      fixedAmount: 10,
    });
    expect(offer.advantage).toBe(`−${formatPrice(10)}`);
  });

  it("describes a buy one get one free campaign", () => {
    const offer = describeDiscountOffer({
      ...BASE,
      calculationType: DiscountCalculationType.BUY_ONE_GET_ONE_FREE,
      percentage: null,
    });
    expect(offer.advantage).toBe("1 acheté = 1 offert");
  });

  it("lists the minimum, the cap and the end date when present", () => {
    const offer = describeDiscountOffer({
      ...BASE,
      minOrderAmount: 300,
      maxDiscountAmount: 100,
      endsAt: "2026-11-30T23:59:00",
    });
    expect(offer.conditions).toEqual([
      `Dès ${formatPrice(300)} d'achat`,
      `Remise plafonnée à ${formatPrice(100)}`,
      `Jusqu'au ${formatDay("2026-11-30T23:59:00") ?? ""}`,
    ]);
  });

  it("leaves out an unreadable end date", () => {
    expect(describeDiscountOffer({ ...BASE, endsAt: "not a date" }).conditions).toEqual([]);
  });

  it("is never offered for NO_DISCOUNT (isDisplayableDiscount)", () => {
    expect(
      isDisplayableDiscount({
        ...BASE,
        discountKey: "NO_DISCOUNT",
        calculationType: DiscountCalculationType.NONE,
        percentage: null,
      }),
    ).toBe(false);
    expect(isDisplayableDiscount(BASE)).toBe(true);
  });
});
