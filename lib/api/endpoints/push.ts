/**
 * Browser push notifications: the backend public key, and the subscriptions of the signed-in
 * user (save, delete). Never cached: the key may change and subscriptions are private.
 *
 * Logs carry the push service host (`maskPushEndpoint`) and the masked subscription UUID only:
 * never the endpoint path nor the browser keys (SC-006).
 *
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §5
 * @see docs/web-push.md (backend)
 * @see PushNotificationController (backend)
 */
import "server-only";

import { z } from "zod";

import { backendFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { BACKEND_PATHS, pushSubscriptionPath } from "@/lib/constants/api";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { maskPushEndpoint, maskUuid } from "@/lib/log-safety";
import { createModuleLogger } from "@/lib/logger";
import {
  PushPublicKeySchema,
  PushSubscriptionSavedSchema,
  toBackendSubscription,
  type PushSubscriptionBody,
  type PushSubscriptionSaved,
} from "@/lib/schemas/push";

const log = createModuleLogger("notifications.push");

/** Options of {@link deletePushSubscription}. */
export interface DeletePushSubscriptionOptions {
  /** Shorter timeout, used by the sign-out so that it is never held up (research R8). */
  readonly timeoutMs?: number;
}

/**
 * Reads the public VAPID key the browser subscribes with.
 *
 * @returns The key, base64url.
 * @throws {ApiError} `UNAVAILABLE` (`503 PUSH_SERVICE_NOT_CONFIGURED`, backend down, bad body).
 */
export async function getPushPublicKey(): Promise<string> {
  const { publicKey } = await backendFetch(BACKEND_PATHS.pushPublicKey, {
    schema: PushPublicKeySchema,
  });
  log.debug("Push public key read");
  return publicKey;
}

/**
 * Registers this browser's subscription for the user, or updates it when the backend already
 * knows the endpoint (same UUID). A sixth browser silently replaces the oldest one.
 *
 * @param body - Validated browser subscription; the endpoint and keys are never logged.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The subscription UUID.
 * @throws {ApiError} `INVALID`, `UNAUTHENTICATED`, `CONFLICT` (endpoint owned by another
 *   account) or `UNAVAILABLE`.
 */
export async function savePushSubscription(
  body: PushSubscriptionBody,
  accessToken: string,
): Promise<PushSubscriptionSaved> {
  const saved = await backendFetch(BACKEND_PATHS.pushSubscriptions, {
    method: HttpMethod.POST,
    schema: PushSubscriptionSavedSchema,
    body: toBackendSubscription(body),
    accessToken,
  });
  log.info(
    { pushHost: maskPushEndpoint(body.endpoint), subscription: maskUuid(saved.uuid) },
    "Push subscription saved",
  );
  return saved;
}

/**
 * Deletes one subscription of the user. A subscription already gone (deleted, or replaced by a
 * newer browser) counts as deleted.
 *
 * @param uuid - Subscription UUID.
 * @param accessToken - Keycloak access token; never logged.
 * @param options - Optional shorter timeout.
 * @throws {ApiError} `UNAUTHENTICATED`, `FORBIDDEN` (another user's subscription) or
 *   `UNAVAILABLE`.
 */
export async function deletePushSubscription(
  uuid: string,
  accessToken: string,
  options: DeletePushSubscriptionOptions = {},
): Promise<void> {
  try {
    await backendFetch(pushSubscriptionPath(uuid), {
      method: HttpMethod.DELETE,
      schema: z.undefined(),
      accessToken,
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    });
    log.info({ subscription: maskUuid(uuid) }, "Push subscription deleted");
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.NOT_FOUND) {
      log.info({ subscription: maskUuid(uuid) }, "Push subscription already gone");
      return;
    }
    throw error;
  }
}
