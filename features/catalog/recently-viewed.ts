/**
 * Recently viewed products, kept in `localStorage` (`ct_recent_v1`).
 *
 * Only product UUIDs are stored (no personal data). The content can be edited by the user, so it
 * is validated on every read; anything invalid is removed and treated as empty.
 *
 * @see specs/001-catalog-auth-cart/data-model.md §3
 * @see docs/backend/api-map.md (« Derniers produits consultés » workaround)
 */
import { RECENTLY_VIEWED_MAX } from "@/lib/constants/catalog";
import { RECENTLY_VIEWED_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { RecentlyViewedSchema } from "@/lib/schemas/storage";

/** Name of the event dispatched in the current tab after a write (`storage` only fires in others). */
export const RECENTLY_VIEWED_EVENT = "ct:recently-viewed";

/**
 * Reads the stored list.
 *
 * @param storage - `localStorage` (injected for tests).
 * @returns UUIDs, most recent first; empty when absent or invalid (the invalid value is removed).
 */
export function readRecentlyViewed(storage: Storage): readonly string[] {
  const raw = storage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
  return parseRecentlyViewed(raw, storage);
}

/**
 * Parses a raw stored value.
 *
 * @param raw - Stored JSON, or `null`.
 * @param storage - When given, an invalid value is removed from it.
 * @returns UUIDs, most recent first; empty when absent or invalid.
 */
export function parseRecentlyViewed(raw: string | null, storage?: Storage): readonly string[] {
  if (raw === null) {
    return [];
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  const parsed = RecentlyViewedSchema.safeParse(value);
  if (!parsed.success) {
    storage?.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
    return [];
  }
  return parsed.data.uuids;
}

/**
 * Records a product view: moves it to the front, without duplicate, keeping
 * {@link RECENTLY_VIEWED_MAX} entries.
 *
 * @param storage - `localStorage`.
 * @param uuid - Viewed product.
 * @returns The new list.
 */
export function recordRecentlyViewed(storage: Storage, uuid: string): readonly string[] {
  const uuids = [uuid, ...readRecentlyViewed(storage).filter((item) => item !== uuid)].slice(
    0,
    RECENTLY_VIEWED_MAX,
  );
  storage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify({ uuids }));
  return uuids;
}
