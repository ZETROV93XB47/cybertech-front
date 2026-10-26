/**
 * `DELETE /api/notifications/push/subscriptions/[uuid]` — deletes one push subscription of the
 * signed-in user (USER), when notifications are turned off from the profile switch. A
 * subscription already gone on the backend side counts as deleted.
 *
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §3
 * @see PushNotificationController#delete (backend)
 */
import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/bff-response";
import { deletePushSubscription } from "@/lib/api/endpoints/push";
import { parseQueryValue } from "@/lib/api/query-validation";
import { getAccessTokenOrThrow } from "@/lib/auth/guards";
import { HTTP_STATUS } from "@/lib/constants/http";
import { PushSubscriptionUuidParamSchema } from "@/lib/schemas/push";

/** Name of the dynamic segment, reported in `fieldErrors`. */
const SUBSCRIPTION_UUID_PARAM = "uuid";

/** Context given by Next.js to the handler. */
interface PushSubscriptionContext {
  readonly params: Promise<{ uuid: string }>;
}

/**
 * Deletes the subscription.
 *
 * @param _request - Unused request.
 * @param context - Route parameters.
 * @returns `204` with an empty body (also when the subscription was already gone), or an error
 *   (`invalid`, `unauthenticated`, `forbidden` for another user's subscription, `unavailable`).
 */
export async function DELETE(
  _request: Request,
  context: PushSubscriptionContext,
): Promise<NextResponse> {
  const uuid = parseQueryValue(
    (await context.params).uuid,
    PushSubscriptionUuidParamSchema,
    SUBSCRIPTION_UUID_PARAM,
  );
  if (!uuid.ok) {
    return uuid.response;
  }
  try {
    await deletePushSubscription(uuid.data, await getAccessTokenOrThrow());
    return new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT });
  } catch (error) {
    return jsonError(error);
  }
}
