"use client";

/**
 * Notifications of this browser for the confirmation opt-in and the profile switch: the shared
 * state and the actions. The actions are only ever called from a click (FR-001).
 *
 * @see specs/005-web-push-notifications/research.md R4, R14
 */
import { useSyncExternalStore } from "react";

import { disablePush, enablePush, reclaimPush } from "../push-activation";
import {
  getPushStatus,
  getServerPushStatus,
  subscribePushStatus,
  type PushStatus,
} from "../push-store";

/** Result of {@link usePushNotifications}. */
export interface UsePushNotificationsResult {
  /** Current state (`UNSUPPORTED` during the server render). */
  readonly status: PushStatus;
  /** Asks the permission, subscribes and saves the subscription. */
  readonly enable: () => Promise<void>;
  /** Subscribes again with a new endpoint, after a conflict with another account. */
  readonly reclaim: () => Promise<void>;
  /** Deletes the subscription and unsubscribes this browser (profile switch). */
  readonly disable: () => Promise<void>;
}

/**
 * Reads the notification state of this tab and offers the actions.
 *
 * @returns The state and the actions.
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const status = useSyncExternalStore(subscribePushStatus, getPushStatus, getServerPushStatus);
  return { status, enable: enablePush, reclaim: reclaimPush, disable: disablePush };
}
