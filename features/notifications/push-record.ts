/**
 * What this browser remembers about its push subscription (feature 005, research R6):
 * - `ct_push_v1` (`localStorage`): `{ subscriptionUuid }`, to delete the subscription later. Its
 *   presence proves a customer turned notifications on here; without it, nothing is ever sent
 *   automatically, so the next person signing in on a shared browser is never subscribed
 *   without a click. The sign-out removes it.
 * - `ct_push_sync_v1` (`sessionStorage`): the subscription was already sent for this tab.
 *
 * Never the endpoint nor the keys: the browser keeps those in its push manager. Every read is
 * validated by Zod; a tampered value is removed; a blocked storage counts as empty.
 *
 * @see specs/005-web-push-notifications/research.md R6, R7
 */
import { StorageKey } from "@/lib/enums/storage-key";
import { PushRecordSchema, type PushRecord } from "@/lib/schemas/push";

/** Value stored by {@link markSyncedThisTab}. */
const SYNCED_FLAG = "1";

/** Which browser storage a key lives in. */
type StorageArea = "localStorage" | "sessionStorage";

/**
 * Returns a browser storage, or `null` when unavailable (server, blocked site data).
 *
 * @param area - Storage to read.
 * @returns The storage, or `null`.
 */
function storageOf(area: StorageArea): Storage | null {
  try {
    return typeof window === "undefined" ? null : window[area];
  } catch {
    return null;
  }
}

/**
 * Removes a key, ignoring a blocked storage.
 *
 * @param area - Storage holding the key.
 * @param key - Key to remove.
 */
function removeKey(area: StorageArea, key: StorageKey): void {
  try {
    storageOf(area)?.removeItem(key);
  } catch {
    // Blocked storage: nothing stored either.
  }
}

/**
 * Parses a stored record.
 *
 * @param raw - Stored JSON.
 * @returns The record, or `null` when the JSON or its shape is invalid.
 */
function parseRecord(raw: string): PushRecord | null {
  try {
    const parsed = PushRecordSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Reads the subscription record of this browser.
 *
 * @returns The record, or `null` when absent, invalid (then removed) or the storage is blocked.
 */
export function readPushRecord(): PushRecord | null {
  let raw: string | null;
  try {
    raw = storageOf("localStorage")?.getItem(StorageKey.PUSH) ?? null;
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }
  const record = parseRecord(raw);
  if (record === null) {
    clearPushRecord();
  }
  return record;
}

/**
 * Remembers the subscription UUID answered by the backend.
 *
 * @param subscriptionUuid - UUID of the saved subscription.
 */
export function writePushRecord(subscriptionUuid: string): void {
  const record: PushRecord = { subscriptionUuid };
  try {
    storageOf("localStorage")?.setItem(StorageKey.PUSH, JSON.stringify(record));
  } catch {
    // Blocked storage: the subscription works, it only cannot be resynchronised automatically.
  }
}

/** Forgets the subscription of this browser (disable, sign-out, conflict). */
export function clearPushRecord(): void {
  removeKey("localStorage", StorageKey.PUSH);
}

/**
 * Whether the subscription was already sent to the backend for this tab.
 *
 * @returns `true` once {@link markSyncedThisTab} ran in this tab.
 */
export function hasSyncedThisTab(): boolean {
  try {
    return storageOf("sessionStorage")?.getItem(StorageKey.PUSH_SYNC) === SYNCED_FLAG;
  } catch {
    return false;
  }
}

/** Marks the subscription as sent for this tab. */
export function markSyncedThisTab(): void {
  try {
    storageOf("sessionStorage")?.setItem(StorageKey.PUSH_SYNC, SYNCED_FLAG);
  } catch {
    // Blocked storage: the next page will simply send it again (idempotent).
  }
}

/** Forgets that the subscription was sent for this tab (sign-out). */
export function clearSyncedThisTab(): void {
  removeKey("sessionStorage", StorageKey.PUSH_SYNC);
}
