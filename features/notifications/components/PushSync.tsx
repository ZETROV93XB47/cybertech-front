"use client";

/**
 * Invisible guard of the push subscription (feature 005, US3), mounted once in the providers:
 * once the session is authenticated, sends the subscription of this browser again (once per tab),
 * and again whenever the service worker reports that the browser renewed it.
 *
 * @see specs/005-web-push-notifications/research.md R7, R9
 */
import { useSession } from "next-auth/react";
import { useEffect, type ReactNode } from "react";

import { PushSwMessageType } from "@/lib/enums/push";

import { shouldSyncPush, syncPushSubscription } from "../push-sync";

/** `useSession().status` of a signed-in visitor. */
const AUTHENTICATED_STATUS = "authenticated";

/**
 * Runs the sync when the guards allow it.
 *
 * @param isForced - The browser renewed the subscription.
 */
function syncIfNeeded(isForced: boolean): void {
  if (shouldSyncPush(isForced)) {
    void syncPushSubscription();
  }
}

/**
 * Whether a service worker message reports a renewed subscription.
 *
 * @param event - Message from the service worker.
 * @returns `true` for `{ type: "push-subscription-changed" }`.
 */
function isSubscriptionChanged(event: MessageEvent): boolean {
  const data: unknown = event.data;
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { readonly type?: unknown }).type === PushSwMessageType.SUBSCRIPTION_CHANGED
  );
}

/**
 * Sync of the push subscription.
 *
 * @returns Nothing visible.
 */
export function PushSync(): ReactNode {
  const isAuthenticated = useSession().status === AUTHENTICATED_STATUS;
  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }
    syncIfNeeded(false);
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return undefined;
    }
    const onMessage = (event: MessageEvent): void => {
      if (isSubscriptionChanged(event)) {
        syncIfNeeded(true);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [isAuthenticated]);
  return null;
}
