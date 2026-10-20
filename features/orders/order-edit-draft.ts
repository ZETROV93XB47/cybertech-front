/**
 * Order edit draft, kept in `sessionStorage` (`ct_order_edit_v1`) for the tab only.
 *
 * When the session expires while saving an order edit, the lines, shipping and payment are
 * stored here before the sign-in redirect and restored on the edit page of the same order; the
 * customer saves again by hand (FR-002). The address is never stored.
 *
 * Pure functions on an injected `Storage`: the value is validated by Zod on every read and
 * removed when invalid; a blocked storage is treated as empty (constitution IV).
 *
 * @see specs/003-account-orders/tasks.md T053
 */
import { ORDER_EDIT_DRAFT_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { OrderEditDraftSchema, type OrderEditDraft } from "@/lib/schemas/storage";

/**
 * Parses a raw stored value without throwing.
 *
 * @param raw - Stored JSON.
 * @returns The draft, or `null` when the value is not a valid draft.
 */
function parseDraft(raw: string): OrderEditDraft | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = OrderEditDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Removes the stored draft.
 *
 * @param storage - `sessionStorage` (injected for tests).
 */
export function clearOrderEditDraft(storage: Storage): void {
  try {
    storage.removeItem(ORDER_EDIT_DRAFT_STORAGE_KEY);
  } catch {
    // Blocked storage: nothing stored either.
  }
}

/**
 * Reads the stored draft of one order.
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @param orderUuid - Order shown by the edit page.
 * @returns The draft of that order, or `null` (absent, invalid then removed, other order, or
 *   blocked storage).
 */
export function readOrderEditDraft(storage: Storage, orderUuid: string): OrderEditDraft | null {
  let raw: string | null;
  try {
    raw = storage.getItem(ORDER_EDIT_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }
  const draft = parseDraft(raw);
  if (draft === null) {
    clearOrderEditDraft(storage);
    return null;
  }
  return draft.orderUuid === orderUuid ? draft : null;
}

/**
 * Stores the draft (replaces any previous one).
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @param draft - Changes to keep; never an address.
 * @returns `false` when storage is blocked.
 */
export function writeOrderEditDraft(storage: Storage, draft: OrderEditDraft): boolean {
  try {
    storage.setItem(ORDER_EDIT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
