"use client";

/**
 * Follow-up of the payment of a placed order: bounded polling of its status, and payment retry.
 *
 * `POST /order/place` never answers 402: the outcome of the server-side payment is only visible
 * in the status (api-map §E 26). The status is read every `ORDER_STATUS_POLL_INTERVAL_MS` until
 * the payment attempt is over, for `ORDER_STATUS_POLL_TIMEOUT_MS` at most, and not while the tab
 * is hidden.
 *
 * @see specs/003-account-orders/research.md R11
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { type BffError, bffGet, bffSend } from "@/lib/api/bff-client";
import {
  CONFIRMATION_TERMINAL_STATUSES,
  ORDER_STATUS_POLL_INTERVAL_MS,
  ORDER_STATUS_POLL_TIMEOUT_MS,
} from "@/lib/constants/orders";
import { orderRoute } from "@/lib/constants/routes";
import { RetryPaymentOutcomeKind } from "@/lib/enums/checkout";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { type OrderStatus, OrderRouteAction } from "@/lib/enums/order";
import { QueryKey } from "@/lib/enums/query-key";
import { OrderStatusSchema, type OrderStatusResult } from "@/lib/schemas/order";

import { asBffError } from "./useQuote";

/** Result of {@link useOrderStatus}. */
export interface UseOrderStatusResult {
  /** Latest status read, `undefined` before the first answer. */
  readonly status: OrderStatus | undefined;
  /** The payment is still running after `ORDER_STATUS_POLL_TIMEOUT_MS`: polling stopped. */
  readonly isTimedOut: boolean;
  /** Error that stopped the polling, if any. */
  readonly error: BffError | null;
  /** Starts a new bounded polling (after a payment retry). */
  readonly restart: () => void;
}

/** Result of {@link useRetryPayment}. */
export interface UseRetryPaymentResult {
  /** Retries the payment; never throws. */
  readonly retry: () => Promise<RetryPaymentOutcomeKind>;
  readonly isPending: boolean;
  /** Error of the last failed retry. */
  readonly error: BffError | null;
}

/** Part of the status query read to decide on the next poll. */
interface PolledQuery {
  readonly state: { readonly data?: OrderStatusResult | undefined; readonly error: Error | null };
}

/**
 * Whether the polling should go on after the last answer.
 *
 * @param query - Status query.
 * @param isTimedOut - The polling time is over.
 * @returns The next interval, or `false` to stop.
 */
function nextPoll(query: PolledQuery, isTimedOut: boolean): number | false {
  const { data, error } = query.state;
  if (isTimedOut || (data && CONFIRMATION_TERMINAL_STATUSES.has(data.status))) {
    return false;
  }
  // An outage is retried at the next tick; any other error (404, 401…) ends the polling.
  if (error && asBffError(error).code !== FrontErrorCode.UNAVAILABLE) {
    return false;
  }
  return ORDER_STATUS_POLL_INTERVAL_MS;
}

/**
 * Polls the status of an order until its payment attempt is over.
 *
 * @param uuid - Order UUID.
 * @returns The latest status, the timeout flag, the error and a restart action.
 */
export function useOrderStatus(uuid: string): UseOrderStatusResult {
  const [round, setRound] = useState(0);
  const [isTimedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, ORDER_STATUS_POLL_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [round]);
  const query = useQuery({
    queryKey: [QueryKey.ORDER_STATUS, uuid, round],
    queryFn: ({ signal }) =>
      bffGet(
        orderRoute(uuid, OrderRouteAction.STATUS),
        new URLSearchParams(),
        OrderStatusSchema,
        signal,
      ),
    refetchInterval: (current) => nextPoll(current, isTimedOut),
    refetchIntervalInBackground: false,
    retry: false,
  });
  const restart = useCallback(() => {
    setTimedOut(false);
    setRound((value) => value + 1);
  }, []);
  const status = query.data?.status;
  const isOver = status !== undefined && CONFIRMATION_TERMINAL_STATUSES.has(status);
  return {
    status,
    isTimedOut: isTimedOut && !isOver,
    error: query.error === null ? null : asBffError(query.error),
    restart,
  };
}

/**
 * Retries the payment of an order after a refusal.
 *
 * @param uuid - Order UUID.
 * @param onRestart - Called when the retry was accepted, to poll the status again.
 * @returns The retry action, its pending state and its last error.
 */
export function useRetryPayment(uuid: string, onRestart: () => void): UseRetryPaymentResult {
  const mutation = useMutation({
    mutationFn: () =>
      bffSend(orderRoute(uuid, OrderRouteAction.RETRY_PAYMENT), HttpMethod.POST, OrderStatusSchema),
    retry: false,
  });
  const { mutateAsync } = mutation;
  const retry = useCallback(async (): Promise<RetryPaymentOutcomeKind> => {
    try {
      await mutateAsync();
      onRestart();
      return RetryPaymentOutcomeKind.RESTARTED;
    } catch (thrown) {
      if (asBffError(thrown).code === FrontErrorCode.PAYMENT_ALREADY_COMPLETED) {
        onRestart();
        return RetryPaymentOutcomeKind.ALREADY_PAID;
      }
      return RetryPaymentOutcomeKind.FAILED;
    }
  }, [mutateAsync, onRestart]);
  const error = mutation.error === null ? null : asBffError(mutation.error);
  const isAlreadyPaid = error?.code === FrontErrorCode.PAYMENT_ALREADY_COMPLETED;
  return { retry, isPending: mutation.isPending, error: isAlreadyPaid ? null : error };
}
