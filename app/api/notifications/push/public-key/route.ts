/**
 * `GET /api/notifications/push/public-key` — public VAPID key the browser subscribes with
 * (public). Never cached: when the backend key changes, the browsers re-subscribe at their next
 * visit (research R7).
 *
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §1
 * @see PushNotificationController#getPublicKey (backend)
 */
import type { NextResponse } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/bff-response";
import { getPushPublicKey } from "@/lib/api/endpoints/push";

/**
 * Reads the public key.
 *
 * @returns `200 { publicKey }`, or `503 unavailable` when the backend has no VAPID key pair.
 */
export async function GET(): Promise<NextResponse> {
  try {
    return jsonOk({ publicKey: await getPushPublicKey() });
  } catch (error) {
    return jsonError(error);
  }
}
