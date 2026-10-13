/**
 * Product comparison selection, kept in `sessionStorage` (`ct_compare_v1`) for the tab only.
 *
 * Pure functions on an injected `Storage`: the value is validated by Zod on every read and
 * removed silently when invalid (tampered or outdated), since browser data is never trusted
 * (constitution IV). Every write dispatches {@link COMPARE_CHANGED_EVENT} so that every toggle
 * and the bar of the page re-render (`storage` events only reach the other tabs).
 *
 * @see specs/002-catalog-refresh/data-model.md §5
 * @see specs/002-catalog-refresh/research.md R8
 */
import { COMPARE_MAX_PRODUCTS } from "@/lib/constants/compare";
import { COMPARE_STORAGE_KEY } from "@/lib/constants/storage-keys";
import type { CategoryKey } from "@/lib/enums/category-key";
import { CompareRefusal } from "@/lib/enums/compare-refusal";
import { CompareSelectionSchema, type CompareSelection } from "@/lib/schemas/storage";

/** Event dispatched on `window` in the current tab after every write of the selection. */
export const COMPARE_CHANGED_EVENT = "ct:compare-changed";

/** Outcome of {@link addToComparison}. */
export type CompareResult =
  | { readonly ok: true; readonly selection: CompareSelection }
  | { readonly ok: false; readonly refusal: CompareRefusal };

/** Tells the components of this tab that the selection changed. */
function notifyChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMPARE_CHANGED_EVENT));
  }
}

/**
 * Writes the selection, or removes the key when it is empty.
 *
 * @param storage - `sessionStorage`.
 * @param selection - New selection; `null` when empty.
 * @returns The written selection.
 */
function writeSelection(
  storage: Storage,
  selection: CompareSelection | null,
): CompareSelection | null {
  if (selection === null) {
    storage.removeItem(COMPARE_STORAGE_KEY);
  } else {
    storage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(selection));
  }
  notifyChange();
  return selection;
}

/**
 * Parses a raw stored value.
 *
 * @param raw - Stored JSON, or `null`.
 * @param storage - When given, an invalid value is removed from it.
 * @returns The selection, or `null` when absent or invalid.
 */
export function parseCompareSelection(
  raw: string | null,
  storage?: Storage,
): CompareSelection | null {
  if (raw === null) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  const parsed = CompareSelectionSchema.safeParse(value);
  if (!parsed.success) {
    storage?.removeItem(COMPARE_STORAGE_KEY);
    return null;
  }
  return parsed.data;
}

/**
 * Reads the stored selection.
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @returns The selection, or `null` when empty or invalid (an invalid value is removed).
 */
export function readCompareSelection(storage: Storage): CompareSelection | null {
  return parseCompareSelection(storage.getItem(COMPARE_STORAGE_KEY), storage);
}

/**
 * Tells why a product cannot join the selection.
 *
 * @param selection - Current selection, `null` when empty.
 * @param uuid - Product to add.
 * @param category - Its category.
 * @returns The refusal, or `null` when the product can be added (or is already selected).
 */
export function canAdd(
  selection: CompareSelection | null,
  uuid: string,
  category: CategoryKey,
): CompareRefusal | null {
  if (selection === null || selection.uuids.includes(uuid)) {
    return null;
  }
  if (selection.category !== category) {
    return CompareRefusal.OTHER_CATEGORY;
  }
  return selection.uuids.length >= COMPARE_MAX_PRODUCTS ? CompareRefusal.FULL : null;
}

/**
 * Adds a product at the end of the selection; the first product sets the category.
 *
 * @param storage - `sessionStorage`.
 * @param uuid - Product to add.
 * @param category - Its category.
 * @returns The new selection, or the refusal (the selection is then left unchanged).
 */
export function addToComparison(
  storage: Storage,
  uuid: string,
  category: CategoryKey,
): CompareResult {
  const selection = readCompareSelection(storage);
  const refusal = canAdd(selection, uuid, category);
  if (refusal !== null) {
    return { ok: false, refusal };
  }
  if (selection?.uuids.includes(uuid)) {
    return { ok: true, selection };
  }
  const next: CompareSelection = selection
    ? { category: selection.category, uuids: [...selection.uuids, uuid] }
    : { category, uuids: [uuid] };
  writeSelection(storage, next);
  return { ok: true, selection: next };
}

/**
 * Removes products from the selection; removing the last one deletes the key.
 *
 * @param storage - `sessionStorage`.
 * @param uuids - Products to remove.
 * @returns The new selection, `null` when empty.
 */
export function removeFromComparison(
  storage: Storage,
  uuids: readonly string[],
): CompareSelection | null {
  const selection = readCompareSelection(storage);
  if (selection === null) {
    return null;
  }
  const kept = selection.uuids.filter((uuid) => !uuids.includes(uuid));
  if (kept.length === selection.uuids.length) {
    return selection;
  }
  return writeSelection(storage, kept.length > 0 ? { ...selection, uuids: kept } : null);
}

/**
 * Empties the selection.
 *
 * @param storage - `sessionStorage`.
 */
export function clearComparison(storage: Storage): void {
  writeSelection(storage, null);
}
