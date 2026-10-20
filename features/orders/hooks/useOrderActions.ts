"use client";

/**
 * Order writes from the browser: edit and cancellation through the BFF.
 *
 * Neither is ever replayed: a click while one is in progress is ignored, and after a forced
 * sign-in the customer clicks again (no idempotency key on the backend, FR-002). On success the
 * page reads the order again with `router.refresh()`.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1, §1.1
 * @see specs/003-account-orders/research.md R14, R15
 */
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { asBffError } from "@/features/checkout/hooks/useQuote";
import { type BffError, bffSend } from "@/lib/api/bff-client";
import { loginPath } from "@/lib/auth/callback-url";
import { orderEditPath, orderPath, orderRoute } from "@/lib/constants/routes";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { OrderActionOutcomeKind, OrderRouteAction } from "@/lib/enums/order";
import {
  OrderChangeResultSchema,
  type OrderChangeResult,
  type OrderUpdateBody,
} from "@/lib/schemas/order";
import type { OrderEditDraft } from "@/lib/schemas/storage";

import { writeOrderEditDraft } from "../order-edit-draft";

/** Outcome of an order write. */
export type OrderActionOutcome =
  | { readonly kind: OrderActionOutcomeKind.DONE; readonly result: OrderChangeResult }
  | { readonly kind: OrderActionOutcomeKind.FAILED; readonly error: BffError }
  | { readonly kind: OrderActionOutcomeKind.REDIRECTED }
  | { readonly kind: OrderActionOutcomeKind.IGNORED };

/** Result of the order action hooks. */
export interface UseOrderActionResult<TInput> {
  /** Runs the write once; never throws. */
  readonly run: (input: TInput) => Promise<OrderActionOutcome>;
  readonly isPending: boolean;
}

/**
 * Shared single-flight wrapper of the order writes.
 *
 * @param send - The BFF call.
 * @param onUnauthenticated - What to do when the session expired (store, then sign in).
 * @returns The guarded action and its pending state.
 */
function useSingleFlight<TInput>(
  send: (input: TInput) => Promise<OrderChangeResult>,
  onUnauthenticated: (input: TInput) => void,
): UseOrderActionResult<TInput> {
  const router = useRouter();
  const inFlight = useRef(false);
  const [isPending, setPending] = useState(false);
  const run = useCallback(
    async (input: TInput): Promise<OrderActionOutcome> => {
      if (inFlight.current) {
        return { kind: OrderActionOutcomeKind.IGNORED };
      }
      inFlight.current = true;
      setPending(true);
      let outcome: OrderActionOutcome;
      try {
        outcome = { kind: OrderActionOutcomeKind.DONE, result: await send(input) };
        router.refresh();
      } catch (thrown) {
        const error = asBffError(thrown);
        if (error.code === FrontErrorCode.UNAUTHENTICATED) {
          onUnauthenticated(input);
          return { kind: OrderActionOutcomeKind.REDIRECTED };
        }
        outcome = { kind: OrderActionOutcomeKind.FAILED, error };
      }
      inFlight.current = false;
      setPending(false);
      return outcome;
    },
    [onUnauthenticated, router, send],
  );
  return { run, isPending };
}

/** What {@link useUpdateOrder} sends. */
export interface UpdateOrderInput {
  readonly body: OrderUpdateBody;
  /** Changes kept if the session expired (never the address). */
  readonly draft: OrderEditDraft;
}

/**
 * Edit of one order.
 *
 * @param uuid - Order UUID.
 * @returns The save action and its pending state.
 */
export function useUpdateOrder(uuid: string): UseOrderActionResult<UpdateOrderInput> {
  const send = useCallback(
    (input: UpdateOrderInput) =>
      bffSend(orderRoute(uuid), HttpMethod.POST, OrderChangeResultSchema, input.body),
    [uuid],
  );
  const onUnauthenticated = useCallback(
    (input: UpdateOrderInput) => {
      writeOrderEditDraft(window.sessionStorage, input.draft);
      window.location.assign(loginPath(orderEditPath(uuid)));
    },
    [uuid],
  );
  return useSingleFlight(send, onUnauthenticated);
}

/**
 * Cancellation of one order.
 *
 * @param uuid - Order UUID.
 * @returns The cancel action and its pending state.
 */
export function useCancelOrder(uuid: string): UseOrderActionResult<void> {
  const send = useCallback(
    () =>
      bffSend(orderRoute(uuid, OrderRouteAction.CANCEL), HttpMethod.POST, OrderChangeResultSchema),
    [uuid],
  );
  const onUnauthenticated = useCallback(() => {
    window.location.assign(loginPath(orderPath(uuid)));
  }, [uuid]);
  return useSingleFlight(send, onUnauthenticated);
}
