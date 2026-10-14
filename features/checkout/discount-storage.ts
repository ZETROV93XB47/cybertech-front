/**
 * Discount key chosen by the customer, kept in `sessionStorage` (`ct_discount_v1`) for the tab
 * only, so that a key applied on the cart is already applied in the checkout (US2-5).
 *
 * The key is not sensitive (constitution IV); it is validated by `DiscountKeySchema` on every
 * read and write, and removed when the stored value was tampered with. The backend stays the
 * only judge of its validity (`DISCOUNT_TYPE_NOT_ACTIVE`). A blocked storage is treated as empty.
 *
 * @see specs/003-account-orders/research.md R7
 */
import { DISCOUNT_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { DiscountKeySchema, type DiscountKey } from "@/lib/schemas/discount";

/**
 * Removes the stored key.
 *
 * @param storage - `sessionStorage` (injected for tests).
 */
export function clearDiscountKey(storage: Storage): void {
  try {
    storage.removeItem(DISCOUNT_STORAGE_KEY);
  } catch {
    // Blocked storage: nothing stored either.
  }
}

/**
 * Reads the stored key.
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @returns The normalised key, or `null` when absent, invalid (then removed) or storage is
 *   blocked.
 */
export function readDiscountKey(storage: Storage): DiscountKey | null {
  let raw: string | null;
  try {
    raw = storage.getItem(DISCOUNT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }
  const parsed = DiscountKeySchema.safeParse(raw);
  if (!parsed.success) {
    clearDiscountKey(storage);
    return null;
  }
  return parsed.data;
}

/**
 * Stores a key (replaces any previous one), normalised to upper case.
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @param key - Key typed or chosen by the customer.
 * @returns The stored key, or `null` when the key is malformed or storage is blocked.
 */
export function writeDiscountKey(storage: Storage, key: string): DiscountKey | null {
  const parsed = DiscountKeySchema.safeParse(key);
  if (!parsed.success) {
    return null;
  }
  try {
    storage.setItem(DISCOUNT_STORAGE_KEY, parsed.data);
    return parsed.data;
  } catch {
    return null;
  }
}
