"use client";

/**
 * Hidden field of the « Se déconnecter » form carrying the push subscription UUID of this browser
 * (feature 005, US3), so that the sign-out Server Action deletes it on the backend before closing
 * the session. Empty without a record, during the server render and without JavaScript: the
 * sign-out then simply deletes nothing.
 *
 * @see specs/005-web-push-notifications/research.md R8
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §4
 */
import { useSyncExternalStore, type ReactNode } from "react";

import { PUSH_SIGN_OUT_FIELD } from "@/lib/constants/push";

import { readPushRecord } from "../push-record";

/** Value of the field without a record. */
const NO_SUBSCRIPTION = "";

/**
 * The record is only read: nothing to subscribe to (the field is rendered while the menu is open).
 *
 * @returns The (no-op) unsubscribe function.
 */
function subscribeNothing(): () => void {
  return () => undefined;
}

/**
 * Reads the stored subscription UUID.
 *
 * @returns The UUID, or an empty string.
 */
function readSubscriptionUuid(): string {
  return readPushRecord()?.subscriptionUuid ?? NO_SUBSCRIPTION;
}

/**
 * Reads nothing on the server.
 *
 * @returns An empty string.
 */
function readNothing(): string {
  return NO_SUBSCRIPTION;
}

/**
 * Hidden input of the sign-out form.
 *
 * @returns The input.
 */
export function PushSignOutField(): ReactNode {
  const uuid = useSyncExternalStore(subscribeNothing, readSubscriptionUuid, readNothing);
  return <input type="hidden" name={PUSH_SIGN_OUT_FIELD} value={uuid} />;
}
