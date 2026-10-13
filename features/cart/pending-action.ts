/**
 * Cart action kept aside while the user signs in again (`sessionStorage`, `ct_pending_action_v1`).
 *
 * When an account cart change fails because the session can no longer be renewed, the action is
 * stored, the user is sent to the sign-in page, and the action is replayed once on return (after
 * the guest cart merge). `sessionStorage` keeps it in this tab only and drops it when the tab
 * closes; it holds a product UUID and a quantity, nothing sensitive.
 *
 * @see specs/001-catalog-auth-cart/research.md R14
 * @see specs/001-catalog-auth-cart/spec.md US3 scenario 1, FR-018
 */
import { assertNever } from "@/lib/assert-never";
import { PENDING_ACTION_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { CartAction, PendingActionType } from "@/lib/enums/cart";
import { PendingActionSchema, type PendingAction } from "@/lib/schemas/storage";

import type { CartViewChange } from "./cart-view";

/**
 * Converts a cart change into a storable action.
 *
 * @param change - Change that failed.
 * @returns The action, or `null` for « vider le panier » (not replayed: too destructive to
 * repeat after a delay).
 */
export function toPendingAction(change: CartViewChange): PendingAction | null {
  switch (change.action) {
    case CartAction.ADD:
      return {
        type: PendingActionType.ADD,
        productUuid: change.productUuid,
        quantity: change.quantity,
      };
    case CartAction.SET:
      return {
        type: PendingActionType.SET,
        productUuid: change.productUuid,
        quantity: change.quantity,
      };
    case CartAction.REMOVE:
      return { type: PendingActionType.REMOVE, productUuid: change.productUuid };
    case CartAction.CLEAR:
      return null;
    default:
      return assertNever(change);
  }
}

/**
 * Converts a stored action back into a cart change.
 *
 * @param action - Stored action.
 * @returns The change, or `null` when an add or set has no quantity.
 */
export function toCartChange(action: PendingAction): CartViewChange | null {
  switch (action.type) {
    case PendingActionType.ADD:
      return action.quantity === undefined
        ? null
        : { action: CartAction.ADD, productUuid: action.productUuid, quantity: action.quantity };
    case PendingActionType.SET:
      return action.quantity === undefined
        ? null
        : { action: CartAction.SET, productUuid: action.productUuid, quantity: action.quantity };
    case PendingActionType.REMOVE:
      return { action: CartAction.REMOVE, productUuid: action.productUuid };
    default:
      return assertNever(action.type);
  }
}

/**
 * Stores the action to replay (replaces any previous one: a single action is kept).
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @param action - Action to replay.
 * @returns `false` when storage is blocked.
 */
export function storePendingAction(storage: Storage, action: PendingAction): boolean {
  try {
    storage.setItem(PENDING_ACTION_STORAGE_KEY, JSON.stringify(action));
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes the stored action.
 *
 * @param storage - `sessionStorage` (injected for tests).
 */
export function clearPendingAction(storage: Storage): void {
  try {
    storage.removeItem(PENDING_ACTION_STORAGE_KEY);
  } catch {
    // Blocked storage: nothing stored either.
  }
}

/**
 * Reads and removes the stored action, so it is replayed at most once.
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @returns The action, or `null` when absent or invalid (an invalid value is removed too).
 */
export function takePendingAction(storage: Storage): PendingAction | null {
  let raw: string | null;
  try {
    raw = storage.getItem(PENDING_ACTION_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }
  clearPendingAction(storage);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = PendingActionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
