/**
 * Guest cart kept in `localStorage` (`ct_guest_cart_v1`): product UUIDs and quantities only,
 * never a price, a token or personal data.
 *
 * The content can be edited by the user, so it is validated by Zod on every read; anything
 * invalid is removed and treated as an empty cart. Every access is wrapped in `try/catch`:
 * storage can be blocked (private mode, quota), and the cart must then simply be empty.
 *
 * @see docs/guest-cart.md §2
 */
import { GUEST_CART_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { GuestCartStorageSchema, type GuestLine } from "@/lib/schemas/storage";

/** Event dispatched in the current tab after a write (`storage` only fires in the other tabs). */
export const GUEST_CART_EVENT = "ct:guest-cart";

/** Browser event fired in the other tabs when `localStorage` changes. */
const STORAGE_EVENT = "storage";

/** Storage key as a plain string, to compare it with `StorageEvent.key`. */
const GUEST_CART_KEY: string = GUEST_CART_STORAGE_KEY;

/**
 * Parses a raw stored value.
 *
 * @param raw - Stored JSON, or `null`.
 * @param storage - When given, an invalid value is removed from it.
 * @returns The lines; empty when absent or invalid.
 */
export function parseGuestCart(raw: string | null, storage?: Storage): readonly GuestLine[] {
  if (raw === null) {
    return [];
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  const parsed = GuestCartStorageSchema.safeParse(value);
  if (!parsed.success) {
    try {
      storage?.removeItem(GUEST_CART_STORAGE_KEY);
    } catch {
      // Blocked storage: nothing to clean.
    }
    return [];
  }
  return parsed.data.items;
}

/**
 * Reads the raw stored string.
 *
 * @param storage - `localStorage` (injected for tests).
 * @returns The stored JSON, or `null` when absent or when storage is blocked.
 */
export function readGuestCartRaw(storage: Storage): string | null {
  try {
    return storage.getItem(GUEST_CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Reads the guest cart.
 *
 * @param storage - `localStorage` (injected for tests).
 * @returns The lines; empty when absent, invalid (then removed) or when storage is blocked.
 */
export function readGuestCart(storage: Storage): readonly GuestLine[] {
  return parseGuestCart(readGuestCartRaw(storage), storage);
}

/**
 * Notifies the current tab that the guest cart changed.
 */
function notifyCurrentTab(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GUEST_CART_EVENT));
  }
}

/**
 * Writes the guest cart; an empty list removes the key.
 *
 * @param storage - `localStorage` (injected for tests).
 * @param lines - New lines.
 * @returns `false` when the lines break the limits (more than `GUEST_CART_MAX_LINES`,
 * quantity outside 1–99) or storage is blocked; nothing is written then.
 */
export function writeGuestCart(storage: Storage, lines: readonly GuestLine[]): boolean {
  const parsed = GuestCartStorageSchema.safeParse({
    items: lines,
    updatedAt: new Date().toISOString(),
  });
  if (!parsed.success) {
    return false;
  }
  try {
    if (parsed.data.items.length === 0) {
      storage.removeItem(GUEST_CART_STORAGE_KEY);
    } else {
      storage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(parsed.data));
    }
  } catch {
    return false;
  }
  notifyCurrentTab();
  return true;
}

/**
 * Empties the guest cart.
 *
 * @param storage - `localStorage` (injected for tests).
 * @returns `false` when storage is blocked.
 */
export function clearGuestCart(storage: Storage): boolean {
  return writeGuestCart(storage, []);
}

/**
 * Subscribes to changes of the guest cart, in this tab and in the other tabs.
 *
 * @param callback - Called after every change.
 * @returns The unsubscribe function.
 */
export function subscribeToGuestCart(callback: () => void): () => void {
  const onStorage = (event: Event): void => {
    const key = event instanceof StorageEvent ? event.key : null;
    if (key === null || key === GUEST_CART_KEY) {
      callback();
    }
  };
  window.addEventListener(STORAGE_EVENT, onStorage);
  window.addEventListener(GUEST_CART_EVENT, callback);
  return () => {
    window.removeEventListener(STORAGE_EVENT, onStorage);
    window.removeEventListener(GUEST_CART_EVENT, callback);
  };
}
