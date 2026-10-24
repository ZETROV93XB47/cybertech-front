/**
 * Browser push subscriptions: the backend public key, the subscription a browser gives
 * (`PushSubscription.toJSON()`), the saved subscription answered by the backend, and the record
 * this browser keeps to delete it later.
 *
 * The endpoint of a subscription identifies a device: it is validated here, sent to the backend,
 * and never logged (only its host, `maskPushEndpoint`) nor stored by the site outside of the
 * browser's own push manager.
 *
 * @see specs/005-web-push-notifications/data-model.md §2
 * @see PushSubscriptionRequestDto, PushSubscriptionResponseDto, PushPublicKeyResponseDto (backend)
 */
import { z } from "zod";

import { PUSH_ENDPOINT_MAX_LENGTH, PUSH_KEY_MAX_LENGTH } from "@/lib/constants/push";

/** Base64url alphabet without padding (VAPID keys and subscription keys). */
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Only protocol a push service endpoint may use. */
const HTTPS_PROTOCOL = /^https$/;

/** A non-empty base64url key, bounded. */
const Base64UrlKeySchema = z.string().min(1).max(PUSH_KEY_MAX_LENGTH).regex(BASE64_URL_PATTERN);

/** `PushPublicKeyResponseDto` and `GET /api/notifications/push/public-key`. */
export const PushPublicKeySchema = z.object({
  publicKey: z.string().min(1).regex(BASE64_URL_PATTERN),
});

/**
 * `PushSubscription.toJSON()` as posted by the browser to the BFF. Strict: any extra field (a
 * user identifier, say) is refused, the backend only trusts the JWT subject.
 */
export const PushSubscriptionBodySchema = z
  .object({
    endpoint: z.url({ protocol: HTTPS_PROTOCOL }).max(PUSH_ENDPOINT_MAX_LENGTH),
    expirationTime: z.number().int().nonnegative().nullable(),
    keys: z.object({ p256dh: Base64UrlKeySchema, auth: Base64UrlKeySchema }).strict(),
  })
  .strict();

/** Validated subscription posted by the browser. */
export type PushSubscriptionBody = z.infer<typeof PushSubscriptionBodySchema>;

/** Subscription in the shape of the backend `PushSubscriptionRequestDto`. */
export interface BackendPushSubscription {
  readonly endpoint: string;
  readonly keys: { readonly p256dh: string; readonly auth: string };
  readonly expirationTime?: number;
}

/**
 * Converts the browser subscription to the backend DTO: `expirationTime: null` (the usual value)
 * is dropped, the backend expects an `int64` or nothing.
 *
 * @param body - Validated browser subscription.
 * @returns The backend request body.
 */
export function toBackendSubscription(body: PushSubscriptionBody): BackendPushSubscription {
  const { endpoint, keys, expirationTime } = body;
  return expirationTime === null ? { endpoint, keys } : { endpoint, keys, expirationTime };
}

/**
 * `PushSubscriptionResponseDto` and the BFF answer: the `uuid` is optional in the OpenAPI but
 * always sent; it is required here so that a contract drift fails loudly.
 */
export const PushSubscriptionSavedSchema = z.object({ uuid: z.uuid() });

/** Saved subscription. */
export type PushSubscriptionSaved = z.infer<typeof PushSubscriptionSavedSchema>;

/** Subscription UUID in a route parameter or in the sign-out form. */
export const PushSubscriptionUuidParamSchema = z.uuid();

/**
 * Content of `ct_push_v1`: only the subscription UUID, re-validated at every read.
 *
 * @see specs/005-web-push-notifications/research.md R6
 */
export const PushRecordSchema = z.object({ subscriptionUuid: z.uuid() });

/** Record of the push subscription of this browser. */
export type PushRecord = z.infer<typeof PushRecordSchema>;
