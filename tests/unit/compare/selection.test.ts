import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addToComparison,
  canAdd,
  clearComparison,
  COMPARE_CHANGED_EVENT,
  readCompareSelection,
  removeFromComparison,
} from "@/features/compare/selection";
import { CategoryKey } from "@/lib/enums/category-key";
import { CompareRefusal } from "@/lib/enums/compare-refusal";
import { StorageKey } from "@/lib/enums/storage-key";

import { fakeUuids } from "../../helpers/products";

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

const [A = "", B = "", C = "", D = ""] = fakeUuids(4);

describe("compare selection", () => {
  let storage: MemoryStorage;
  const onChange = vi.fn();

  beforeEach(() => {
    storage = new MemoryStorage();
    window.addEventListener(COMPARE_CHANGED_EVENT, onChange);
  });

  afterEach(() => {
    window.removeEventListener(COMPARE_CHANGED_EVENT, onChange);
    onChange.mockClear();
  });

  it("starts empty", () => {
    expect(readCompareSelection(storage)).toBeNull();
  });

  it("creates the selection with the category of the first product", () => {
    const result = addToComparison(storage, A, CategoryKey.COMPUTER);
    expect(result).toEqual({ ok: true, selection: { category: CategoryKey.COMPUTER, uuids: [A] } });
    expect(readCompareSelection(storage)).toEqual({ category: CategoryKey.COMPUTER, uuids: [A] });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("appends in insertion order, without duplicates", () => {
    addToComparison(storage, A, CategoryKey.COMPUTER);
    addToComparison(storage, B, CategoryKey.COMPUTER);
    addToComparison(storage, A, CategoryKey.COMPUTER);
    expect(readCompareSelection(storage)?.uuids).toEqual([A, B]);
  });

  it("refuses a fourth product with FULL", () => {
    for (const uuid of [A, B, C]) {
      addToComparison(storage, uuid, CategoryKey.COMPUTER);
    }
    onChange.mockClear();
    expect(addToComparison(storage, D, CategoryKey.COMPUTER)).toEqual({
      ok: false,
      refusal: CompareRefusal.FULL,
    });
    expect(readCompareSelection(storage)?.uuids).toEqual([A, B, C]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("refuses a product of another category with OTHER_CATEGORY", () => {
    addToComparison(storage, A, CategoryKey.COMPUTER);
    expect(addToComparison(storage, B, CategoryKey.MONITOR)).toEqual({
      ok: false,
      refusal: CompareRefusal.OTHER_CATEGORY,
    });
  });

  it("tells why a product cannot be added, and accepts one already selected", () => {
    const full = { category: CategoryKey.COMPUTER, uuids: [A, B, C] };
    expect(canAdd(null, A, CategoryKey.MONITOR)).toBeNull();
    expect(canAdd(full, D, CategoryKey.COMPUTER)).toBe(CompareRefusal.FULL);
    expect(canAdd(full, D, CategoryKey.MONITOR)).toBe(CompareRefusal.OTHER_CATEGORY);
    expect(canAdd(full, A, CategoryKey.COMPUTER)).toBeNull();
  });

  it("removes products and deletes the key once the selection is empty", () => {
    addToComparison(storage, A, CategoryKey.COMPUTER);
    addToComparison(storage, B, CategoryKey.COMPUTER);
    onChange.mockClear();
    expect(removeFromComparison(storage, [A])).toEqual({
      category: CategoryKey.COMPUTER,
      uuids: [B],
    });
    expect(removeFromComparison(storage, [B])).toBeNull();
    expect(storage.getItem(StorageKey.COMPARE)).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("clears the selection", () => {
    addToComparison(storage, A, CategoryKey.COMPUTER);
    clearComparison(storage);
    expect(storage.getItem(StorageKey.COMPARE)).toBeNull();
    expect(readCompareSelection(storage)).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["broken JSON", "{"],
    ["4 UUIDs", JSON.stringify({ category: CategoryKey.COMPUTER, uuids: [A, B, C, D] })],
    ["an unknown category", JSON.stringify({ category: "PHONE", uuids: [A] })],
    ["an invalid UUID", JSON.stringify({ category: CategoryKey.COMPUTER, uuids: ["nope"] })],
    ["a duplicate", JSON.stringify({ category: CategoryKey.COMPUTER, uuids: [A, A] })],
  ])("removes a stored value with %s and reads it as empty", (_, raw) => {
    storage.setItem(StorageKey.COMPARE, raw);
    expect(readCompareSelection(storage)).toBeNull();
    expect(storage.getItem(StorageKey.COMPARE)).toBeNull();
  });
});
