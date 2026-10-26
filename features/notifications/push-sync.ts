/**
 * Keeps the push subscription of this browser right (feature 005, US3, research R7): at session
 * start, and when the service worker reports that the browser renewed the subscription, the
 * current subscription is sent again to the backend — renewed first when the backend key changed.
 *
 * Only a browser where a customer turned notifications on (local record present) is ever synced:
 * without that record, nothing is sent and the next person signing in on a shared browser is never
 * subscribed without a click. Every failure is silent (`clientLogger` only).
 *
 * @see specs/005-web-push-notifications/spec.md FR-010 to FR-012
 * @see specs/005-web-push-notifications/research.md R7, R9
 */
import { BffError } from "@/lib/api/bff-client";
import { NOTIFICATION_PERMISSION_GRANTED } from "@/lib/constants/push";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { PushState, PushSupport } from "@/lib/enums/push";

import {
  ensureSubscription,
  fetchPublicKey,
  logPushFailure,
  registerServiceWorker,
  sendSubscription,
} from "./push-client";
import {
  clearPushRecord,
  hasSyncedThisTab,
  markSyncedThisTab,
  readPushRecord,
  writePushRecord,
} from "./push-record";
import { setPushStatus } from "./push-store";
import { detectPushSupport } from "./push-support";

/**
 * Whether this browser should send its subscription again: push supported, permission granted,
 * notifications turned on here (record), and not already sent for this tab unless forced.
 *
 * @param isForced - The browser renewed the subscription: send it even if already sent.
 * @returns `true` when {@link syncPushSubscription} should run.
 */
export function shouldSyncPush(isForced: boolean): boolean {
  if (detectPushSupport() !== PushSupport.SUPPORTED) {
    return false;
  }
  if (Notification.permission !== NOTIFICATION_PERMISSION_GRANTED || readPushRecord() === null) {
    return false;
  }
  return isForced || !hasSyncedThisTab();
}

/**
 * Sends the current subscription to the backend: the existing one when made with the backend key,
 * else a new one made silently (the permission is already granted, no prompt). Stores the UUID
 * answered and marks the tab as synced. A conflict (the browser now belongs to another account)
 * forgets the record: notifications are off for this account.
 */
export async function syncPushSubscription(): Promise<void> {
  try {
    const registration = await registerServiceWorker();
    const publicKey = await fetchPublicKey();
    const subscription = await ensureSubscription(registration, publicKey, false);
    writePushRecord(await sendSubscription(subscription));
    markSyncedThisTab();
    setPushStatus({ state: PushState.ENABLED });
  } catch (error) {
    logPushFailure("Push subscription sync failed", error);
    if (error instanceof BffError && error.code === FrontErrorCode.CONFLICT) {
      clearPushRecord();
      setPushStatus({ state: PushState.IDLE });
    }
  }
}
