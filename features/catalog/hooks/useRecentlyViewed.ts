/**
 * Recently viewed product UUIDs, read from `localStorage` and kept in sync across tabs.
 *
 * `useSyncExternalStore` keeps the server render and the first client render identical (no
 * stored data on the server), then switches to the stored value without a hydration mismatch.
 */
import { useMemo, useSyncExternalStore } from "react";

import { RECENTLY_VIEWED_STORAGE_KEY } from "@/lib/constants/storage-keys";

import { parseRecentlyViewed, RECENTLY_VIEWED_EVENT } from "../recently-viewed";

/** Browser event fired in other tabs when `localStorage` changes. */
const STORAGE_EVENT = "storage";

/**
 * Subscribes to writes from this tab and from the other tabs.
 *
 * @param onChange - Callback of React.
 * @returns The unsubscribe function.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(STORAGE_EVENT, onChange);
  window.addEventListener(RECENTLY_VIEWED_EVENT, onChange);
  return () => {
    window.removeEventListener(STORAGE_EVENT, onChange);
    window.removeEventListener(RECENTLY_VIEWED_EVENT, onChange);
  };
}

/**
 * Reads the raw stored string (a stable snapshot: React compares it with `Object.is`).
 *
 * @returns The stored JSON, or `null` when absent or when storage is blocked.
 */
function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Server snapshot: nothing is stored on the server.
 *
 * @returns `null`.
 */
function getServerSnapshot(): string | null {
  return null;
}

/**
 * Returns the recently viewed product UUIDs, most recent first.
 *
 * @returns The UUIDs; empty on the server, before hydration and when nothing is stored.
 */
export function useRecentlyViewed(): readonly string[] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => parseRecentlyViewed(raw), [raw]);
}
