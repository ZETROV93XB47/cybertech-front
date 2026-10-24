/**
 * The subscription sent to the backend matches the generated `PushSubscriptionRequestDto`
 * (constitution V: the contract is the source of truth).
 *
 * @see specs/005-web-push-notifications/data-model.md §2
 */
import { expectTypeOf, test } from "vitest";

import type { components } from "@/lib/api/schema";
import { type BackendPushSubscription, type PushSubscriptionBody } from "@/lib/schemas/push";

type RequestDto = components["schemas"]["PushSubscriptionRequestDto"];

test("the converted body is assignable to PushSubscriptionRequestDto", () => {
  expectTypeOf<BackendPushSubscription>().toExtend<RequestDto>();
});

test("the browser body carries the same endpoint and keys", () => {
  expectTypeOf<PushSubscriptionBody["endpoint"]>().toEqualTypeOf<RequestDto["endpoint"]>();
  expectTypeOf<PushSubscriptionBody["keys"]>().toExtend<RequestDto["keys"]>();
});
