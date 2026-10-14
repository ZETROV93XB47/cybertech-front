/**
 * Checkout draft, kept in `sessionStorage` (`ct_checkout_v1`) for the tab only.
 *
 * When the session expires during the checkout, the non-personal choices (step, shipping,
 * payment) are stored here before the sign-in redirect and restored on the way back, so the
 * customer only has to validate again: the order itself is never replayed automatically, since
 * the backend offers no idempotency key (FR-002, research R9). The address is never stored.
 *
 * Pure functions on an injected `Storage`: the value is validated by Zod on every read and
 * removed when invalid; a blocked storage is treated as empty (constitution IV).
 *
 * @see specs/003-account-orders/data-model.md §4.3
 * @see specs/003-account-orders/research.md R9
 */
import { CHECKOUT_DRAFT_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { CheckoutDraftSchema, type CheckoutDraft } from "@/lib/schemas/storage";

/**
 * Parses a raw stored value without throwing.
 *
 * @param raw - Stored JSON.
 * @returns The draft, or `null` when the value is not a valid draft.
 */
function parseDraft(raw: string): CheckoutDraft | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = CheckoutDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Removes the stored draft.
 *
 * @param storage - `sessionStorage` (injected for tests).
 */
export function clearCheckoutDraft(storage: Storage): void {
  try {
    storage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
  } catch {
    // Blocked storage: nothing stored either.
  }
}

/**
 * Reads the stored draft.
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @returns The draft, or `null` when absent, invalid (then removed) or storage is blocked.
 */
export function readCheckoutDraft(storage: Storage): CheckoutDraft | null {
  let raw: string | null;
  try {
    raw = storage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }
  const draft = parseDraft(raw);
  if (draft === null) {
    clearCheckoutDraft(storage);
  }
  return draft;
}

/**
 * Stores the draft (replaces any previous one).
 *
 * @param storage - `sessionStorage` (injected for tests).
 * @param draft - Choices to keep; never an address.
 * @returns `false` when storage is blocked.
 */
export function writeCheckoutDraft(storage: Storage, draft: CheckoutDraft): boolean {
  try {
    storage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
