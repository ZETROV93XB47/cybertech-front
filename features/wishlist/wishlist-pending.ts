/**
 * Wishlist add kept aside while a visitor signs in (`sessionStorage`, `ct_wishlist_pending_v1`).
 *
 * A visitor who clicks a heart is sent to the sign-in page; the product UUID is stored here and
 * the add is replayed once on return by `WishlistPendingReplayer` (FR-038). `sessionStorage`
 * keeps it in this tab only; it holds a product UUID, nothing personal.
 *
 * Pure functions on an injected `Storage`: the value is validated by Zod on every read and a
 * blocked storage is treated as empty (constitution IV).
 *
 * @see specs/003-account-orders/research.md R22
 */
import { WISHLIST_PENDING_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { WishlistPendingSchema, type WishlistPending } from "@/lib/schemas/wishlist";

/**
 * Stores the add to replay (replaces any previous one).
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @param pending - Product to add.
 * @returns `false` when storage is blocked.
 */
export function storeWishlistPending(storage: Storage, pending: WishlistPending): boolean {
  try {
    storage.setItem(WISHLIST_PENDING_STORAGE_KEY, JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes the stored add.
 *
 * @param storage - `sessionStorage` (injected for tests).
 */
export function clearWishlistPending(storage: Storage): void {
  try {
    storage.removeItem(WISHLIST_PENDING_STORAGE_KEY);
  } catch {
    // Blocked storage: nothing stored either.
  }
}

/**
 * Reads and removes the stored add, so that it is replayed at most once.
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @returns The add, or `null` when absent, invalid or storage is blocked.
 */
export function takeWishlistPending(storage: Storage): WishlistPending | null {
  let raw: string | null;
  try {
    raw = storage.getItem(WISHLIST_PENDING_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }
  clearWishlistPending(storage);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = WishlistPendingSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
