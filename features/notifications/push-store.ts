/**
 * State of the notifications in this tab, shared by the confirmation opt-in, the profile switch
 * and `PushSync` through `useSyncExternalStore` (feature 005, research R14).
 *
 * The state is computed on first read in the browser; the server snapshot is `UNSUPPORTED`, so a
 * server render shows nothing and the real state appears after hydration.
 *
 * @see specs/005-web-push-notifications/data-model.md §1
 */
import { PushState, PushSupport } from "@/lib/enums/push";

import { readPushRecord } from "./push-record";
import { detectPushSupport } from "./push-support";

/** State shown to the customer, with the text of an error when there is one. */
export interface PushStatus {
  readonly state: PushState;
  /**
   * Text of an error, when it differs from the default one: expired session (`ERROR`), failed
   * deactivation (`ENABLED`, notifications still on).
   */
  readonly message?: string | undefined;
}

/** Snapshot of the server render: nothing is shown before hydration. */
const SERVER_STATUS: PushStatus = { state: PushState.UNSUPPORTED };

/** Current state; `null` until first read in the browser. */
let current: PushStatus | null = null;

/** Components subscribed to the state. */
const listeners = new Set<() => void>();

/**
 * Computes the state of a page that just loaded, from the browser support, the permission and
 * the local record.
 *
 * @returns The initial state.
 */
export function initialPushStatus(): PushStatus {
  const support = detectPushSupport();
  if (support === PushSupport.UNSUPPORTED) {
    return { state: PushState.UNSUPPORTED };
  }
  if (support === PushSupport.INSTALL_REQUIRED) {
    return { state: PushState.INSTALL_REQUIRED };
  }
  if (Notification.permission === "denied") {
    return { state: PushState.DENIED };
  }
  const isEnabled = Notification.permission === "granted" && readPushRecord() !== null;
  return { state: isEnabled ? PushState.ENABLED : PushState.IDLE };
}

/**
 * Current state (computed on first read).
 *
 * @returns The state, the same object until it changes.
 */
export function getPushStatus(): PushStatus {
  current ??= initialPushStatus();
  return current;
}

/**
 * State of the server render.
 *
 * @returns `UNSUPPORTED`.
 */
export function getServerPushStatus(): PushStatus {
  return SERVER_STATUS;
}

/**
 * Changes the state and notifies the subscribed components.
 *
 * @param next - New state.
 */
export function setPushStatus(next: PushStatus): void {
  current = next;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Subscribes to the state changes.
 *
 * @param listener - Called after every change.
 * @returns The unsubscribe function.
 */
export function subscribePushStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Forgets the state, so that the next read recomputes it (tests, sign-out). */
export function resetPushStatus(): void {
  current = null;
}
