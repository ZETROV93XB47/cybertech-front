/**
 * Product comparison selection of the tab, shared by every toggle and the bar of the page.
 *
 * `useSyncExternalStore` keeps the server render and the first client render identical (empty
 * selection, nothing ticked), then switches to the stored value without a hydration mismatch.
 * Blocked storage (private mode, disabled cookies) behaves as an empty selection: the actions
 * then do nothing instead of throwing.
 *
 * @see specs/002-catalog-refresh/research.md R8
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { COMPARE_STORAGE_KEY } from "@/lib/constants/storage-keys";
import type { CategoryKey } from "@/lib/enums/category-key";
import type { CompareSelection } from "@/lib/schemas/storage";

import {
  addToComparison,
  clearComparison,
  COMPARE_CHANGED_EVENT,
  parseCompareSelection,
  readCompareSelection,
  removeFromComparison,
  type CompareResult,
} from "../selection";

/** Browser event fired in other tabs when a storage area changes. */
const STORAGE_EVENT = "storage";

/** Selection and its bound actions. */
export interface CompareSelectionState {
  /** Current selection, `null` when empty (always `null` on the server). */
  readonly selection: CompareSelection | null;
  /** Adds a product; see {@link addToComparison}. `null` when storage is blocked. */
  readonly add: (uuid: string, category: CategoryKey) => CompareResult | null;
  /**
   * Removes products.
   *
   * @returns `true` when at least one product was actually removed.
   */
  readonly remove: (uuids: readonly string[]) => boolean;
  /** Empties the selection. */
  readonly clear: () => void;
}

/**
 * Subscribes to writes from this tab and from the other tabs.
 *
 * @param onChange - Callback of React.
 * @returns The unsubscribe function.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(STORAGE_EVENT, onChange);
  window.addEventListener(COMPARE_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener(STORAGE_EVENT, onChange);
    window.removeEventListener(COMPARE_CHANGED_EVENT, onChange);
  };
}

/**
 * Returns `sessionStorage`, or `null` when the browser blocks it.
 *
 * @returns The storage area.
 */
function sessionStorageOrNull(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Reads the raw stored string (a stable snapshot: React compares it with `Object.is`).
 *
 * @returns The stored JSON, or `null` when absent or blocked.
 */
function getSnapshot(): string | null {
  try {
    return sessionStorageOrNull()?.getItem(COMPARE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Server snapshot: nothing is selected on the server.
 *
 * @returns `null`.
 */
function getServerSnapshot(): string | null {
  return null;
}

/**
 * Runs a storage action, ignoring a blocked storage.
 *
 * @param action - Action on `sessionStorage`.
 * @returns Its result, or `null` when storage is blocked.
 */
function withStorage<TResult>(action: (storage: Storage) => TResult): TResult | null {
  const storage = sessionStorageOrNull();
  if (storage === null) {
    return null;
  }
  try {
    return action(storage);
  } catch {
    return null;
  }
}

/**
 * Adds a product to the stored selection.
 *
 * @param uuid - Product to add.
 * @param category - Its category.
 * @returns The outcome, or `null` when storage is blocked.
 */
function add(uuid: string, category: CategoryKey): CompareResult | null {
  return withStorage((storage) => addToComparison(storage, uuid, category));
}

/**
 * Removes products from the stored selection.
 *
 * @param uuids - Products to remove.
 * @returns `true` when at least one of them was selected.
 */
function remove(uuids: readonly string[]): boolean {
  return (
    withStorage((storage) => {
      const before = readCompareSelection(storage)?.uuids.length ?? 0;
      const after = removeFromComparison(storage, uuids)?.uuids.length ?? 0;
      return after < before;
    }) ?? false
  );
}

/** Empties the stored selection. */
function clear(): void {
  withStorage(clearComparison);
}

/**
 * Returns the comparison selection of the tab and its actions.
 *
 * @returns The selection state.
 */
export function useCompareSelection(): CompareSelectionState {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const selection = useMemo(() => parseCompareSelection(raw), [raw]);
  const isInvalid = raw !== null && selection === null;
  useEffect(() => {
    if (isInvalid) {
      // Reading through the storage removes the tampered value, without any visible error.
      withStorage(readCompareSelection);
    }
  }, [isInvalid]);
  return { selection, add, remove, clear };
}
