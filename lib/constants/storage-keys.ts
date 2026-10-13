/**
 * Named aliases of the browser storage keys.
 *
 * The key strings are written once, in the `StorageKey` enum; these constants exist for call
 * sites that read better with a dedicated name.
 *
 * @see lib/enums/storage-key.ts
 */
import { StorageKey } from "@/lib/enums/storage-key";

/** `localStorage` key of the guest cart. */
export const GUEST_CART_STORAGE_KEY = StorageKey.GUEST_CART;

/** `localStorage` key of the recently viewed product UUIDs. */
export const RECENTLY_VIEWED_STORAGE_KEY = StorageKey.RECENTLY_VIEWED;

/** `sessionStorage` key of the cart action to replay after a forced sign-in. */
export const PENDING_ACTION_STORAGE_KEY = StorageKey.PENDING_ACTION;

/** `sessionStorage` key of the product comparison selection. */
export const COMPARE_STORAGE_KEY = StorageKey.COMPARE;
