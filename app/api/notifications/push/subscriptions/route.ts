/**
 * `POST /api/notifications/push/subscriptions` — registers this browser's push subscription for
 * the signed-in user (USER). The body is exactly `PushSubscription.toJSON()`, validated by a strict
 * schema before any backend call; the endpoint and the keys are never logged.
 *
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §2
 * @see PushNotificationController#subscribe (backend)
 */
import type { NextResponse } from "next/server";

import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { savePushSubscription } from "@/lib/api/endpoints/push";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { HTTP_STATUS } from "@/lib/constants/http";
import { PushSubscriptionBodySchema } from "@/lib/schemas/push";

/**
 * Saves the subscription. The same endpoint sent again updates it (same UUID).
 *
 * @param request - Request carrying the browser subscription.
 * @returns `201 { uuid }`, or an error (`invalid`, `unauthenticated`, `conflict` when the browser
 *   belongs to another account, `unavailable`).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = await parseJsonBody(request, PushSubscriptionBodySchema);
  if (!body.ok) {
    return body.response;
  }
  try {
    const saved = await savePushSubscription(body.data, await getAccessTokenOrThrow());
    return jsonOk(saved, HTTP_STATUS.CREATED);
  } catch (error) {
    return jsonError(error);
  }
}
