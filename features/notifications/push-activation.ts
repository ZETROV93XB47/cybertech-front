/**
 * Turning notifications on and off (feature 005, research R4 and R5, FR-008): the permission
 * request, the subscription and the BFF calls, with the resulting state written to the shared
 * store.
 *
 * The permission is requested FIRST, while the click is still the current user gesture: Safari
 * and Firefox ignore a request made after network calls (FR-001).
 *
 * @see specs/005-web-push-notifications/data-model.md §1 (transitions)
 */
import { BffError } from "@/lib/api/bff-client";
import { FrontErrorCode } from "@/lib/enums/error-code";
import {
  NOTIFICATION_PERMISSION_DENIED,
  NOTIFICATION_PERMISSION_GRANTED,
} from "@/lib/constants/push";
import { PushState } from "@/lib/enums/push";

import { PUSH_MESSAGES } from "./messages";
import {
  ensureSubscription,
  fetchPublicKey,
  logPushFailure,
  registerServiceWorker,
  removeSubscription,
  sendSubscription,
  unsubscribeBrowser,
  unsubscribeQuietly,
} from "./push-client";
import {
  clearPushRecord,
  clearSyncedThisTab,
  markSyncedThisTab,
  readPushRecord,
  writePushRecord,
} from "./push-record";
import { setPushStatus, type PushStatus } from "./push-store";

/**
 * State after a failed activation.
 *
 * @param error - Thrown value (BFF error, or a browser error of `subscribe`).
 * @returns The state to show.
 */
export function failureStatus(error: unknown): PushStatus {
  if (!(error instanceof BffError)) {
    // A browser refusal while subscribing (blocked in the settings meanwhile).
    const isDenied = Notification.permission === NOTIFICATION_PERMISSION_DENIED;
    return isDenied ? { state: PushState.DENIED } : { state: PushState.ERROR };
  }
  if (error.code === FrontErrorCode.UNAVAILABLE) {
    return { state: PushState.UNAVAILABLE };
  }
  if (error.code === FrontErrorCode.CONFLICT) {
    return { state: PushState.CONFLICT };
  }
  if (error.code === FrontErrorCode.UNAUTHENTICATED) {
    return { state: PushState.ERROR, message: PUSH_MESSAGES.sessionExpired };
  }
  return { state: PushState.ERROR };
}

/**
 * Subscribes the browser and saves the subscription for the account. A failure after the
 * browser subscribed drops the browser subscription, so that none is left that the backend does
 * not know (FR-003).
 *
 * @param isFresh - Forces a new browser subscription (reclaim after a conflict).
 */
async function subscribeAndSave(isFresh: boolean): Promise<void> {
  const registration = await registerServiceWorker();
  const publicKey = await fetchPublicKey();
  const subscription = await ensureSubscription(registration, publicKey, isFresh);
  try {
    writePushRecord(await sendSubscription(subscription));
    markSyncedThisTab();
  } catch (error) {
    await unsubscribeQuietly(subscription);
    throw error;
  }
}

/**
 * Turns notifications on, from a click (« Activer les notifications » or the profile switch).
 * Closing the browser prompt without answering goes back to the button, without a message.
 */
export async function enablePush(): Promise<void> {
  setPushStatus({ state: PushState.PENDING });
  const permission = await Notification.requestPermission();
  if (permission !== NOTIFICATION_PERMISSION_GRANTED) {
    setPushStatus({
      state: permission === NOTIFICATION_PERMISSION_DENIED ? PushState.DENIED : PushState.IDLE,
    });
    return;
  }
  await runActivation(false);
}

/**
 * Turns notifications on for this account on a browser linked to another one (409): a new
 * browser subscription gets a new endpoint, which the backend accepts (research R5).
 */
export async function reclaimPush(): Promise<void> {
  if (Notification.permission !== NOTIFICATION_PERMISSION_GRANTED) {
    await enablePush();
    return;
  }
  setPushStatus({ state: PushState.PENDING });
  await runActivation(true);
}

/**
 * Turns notifications off for this browser, from the profile switch (FR-008): deletes the
 * subscription on the backend with the stored UUID, then drops the browser subscription and the
 * local record. A failed deletion changes nothing: notifications stay on and the switch says so.
 * Without a record (site data cleared), only the browser subscription is dropped.
 */
export async function disablePush(): Promise<void> {
  setPushStatus({ state: PushState.PENDING });
  const record = readPushRecord();
  try {
    if (record !== null) {
      await removeSubscription(record.subscriptionUuid);
    }
  } catch (error) {
    logPushFailure("Push deactivation failed", error);
    setPushStatus({ state: PushState.ENABLED, message: PUSH_MESSAGES.disableError });
    return;
  }
  await unsubscribeBrowser();
  clearPushRecord();
  clearSyncedThisTab();
  setPushStatus({ state: PushState.IDLE });
}

/**
 * Runs the subscription and writes the resulting state.
 *
 * @param isFresh - Forces a new browser subscription.
 */
async function runActivation(isFresh: boolean): Promise<void> {
  try {
    await subscribeAndSave(isFresh);
    setPushStatus({ state: PushState.ENABLED });
  } catch (error) {
    logPushFailure("Push activation failed", error);
    setPushStatus(failureStatus(error));
  }
}
