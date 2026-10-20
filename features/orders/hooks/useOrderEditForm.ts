"use client";

/**
 * State and save flow of the order edit form: the pure reducer of `order-edit.ts`, the draft
 * restored after a forced re-login, and the save that turns every backend answer into a
 * message, a flagged line, or the old and new totals.
 *
 * @see specs/003-account-orders/spec.md FR-002, FR-025
 * @see specs/003-account-orders/research.md R14
 */
import { useEffect, useReducer, useState, type Dispatch } from "react";

import type { ParsedAddress } from "@/lib/address";
import { assertNever } from "@/lib/assert-never";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { OrderActionOutcomeKind, OrderChangeKind, OrderEditActionType } from "@/lib/enums/order";
import type { OrderResponse } from "@/lib/schemas/order";

import { ORDER_EDIT_MESSAGES } from "../messages";
import {
  buildOrderUpdateBody,
  initOrderEditState,
  orderEditReducer,
  toOrderEditDraft,
  type OrderEditAction,
  type OrderEditState,
} from "../order-edit";
import { clearOrderEditDraft, readOrderEditDraft } from "../order-edit-draft";
import { orderErrorMessage } from "../order-errors";
import { describeOrderChange, type OrderAmounts } from "../order-view";

import { type OrderActionOutcome, useUpdateOrder } from "./useOrderActions";

/** What the form shows after a successful save. */
export interface SavedEdit {
  readonly previousTotal: number;
  readonly newTotal: number;
  readonly change: OrderChangeKind;
  /** Refunded so far on the order, for the refund message. */
  readonly refunded: number;
}

/** Result of {@link useOrderEditForm}. */
export interface UseOrderEditFormResult {
  readonly state: OrderEditState;
  readonly dispatch: Dispatch<OrderEditAction>;
  readonly save: () => Promise<void>;
  readonly isSaving: boolean;
  /** Error or notice (French), `null` when there is nothing to say. */
  readonly message: string | null;
  /** The payment method is missing (shown on its fieldset). */
  readonly isPaymentMissing: boolean;
  readonly saved: SavedEdit | null;
}

/**
 * Restores the draft of a forced re-login once, after hydration.
 *
 * @param orderUuid - Edited order.
 * @param dispatch - Reducer dispatcher.
 * @param notify - Shows the « restored » notice.
 */
function useRestoredDraft(
  orderUuid: string,
  dispatch: Dispatch<OrderEditAction>,
  notify: (message: string) => void,
): void {
  useEffect(() => {
    const draft = readOrderEditDraft(window.sessionStorage, orderUuid);
    if (draft !== null) {
      dispatch({ type: OrderEditActionType.RESTORE_DRAFT, draft });
      clearOrderEditDraft(window.sessionStorage);
      notify(ORDER_EDIT_MESSAGES.draftRestored);
    }
  }, [dispatch, notify, orderUuid]);
}

/**
 * Message of a failed save, flagging the lines a stock refusal can be about.
 *
 * @param outcome - Failed outcome.
 * @param dispatch - Reducer dispatcher.
 * @returns The message.
 */
function failureMessage(
  outcome: Extract<OrderActionOutcome, { kind: OrderActionOutcomeKind.FAILED }>,
  dispatch: Dispatch<OrderEditAction>,
): string {
  if (outcome.error.code === FrontErrorCode.INSUFFICIENT_STOCK) {
    dispatch({ type: OrderEditActionType.FLAG_STOCK });
  }
  return orderErrorMessage(outcome.error);
}

/**
 * Turns a save outcome into the form feedback.
 *
 * @param outcome - Outcome of the save.
 * @param before - Amounts of the order before the save.
 * @param dispatch - Reducer dispatcher.
 * @returns The message and the saved summary.
 */
function feedbackOf(
  outcome: OrderActionOutcome,
  before: OrderAmounts,
  dispatch: Dispatch<OrderEditAction>,
): { readonly message: string | null; readonly saved: SavedEdit | null } {
  switch (outcome.kind) {
    case OrderActionOutcomeKind.DONE:
      return {
        message: null,
        saved: {
          previousTotal: before.total,
          newTotal: outcome.result.total,
          change: describeOrderChange(before, outcome.result),
          refunded: outcome.result.refunded,
        },
      };
    case OrderActionOutcomeKind.FAILED:
      return { message: failureMessage(outcome, dispatch), saved: null };
    case OrderActionOutcomeKind.REDIRECTED:
      return { message: ORDER_EDIT_MESSAGES.sessionExpired, saved: null };
    case OrderActionOutcomeKind.IGNORED:
      return { message: null, saved: null };
    default:
      return assertNever(outcome);
  }
}

/**
 * Order edit form state and save.
 *
 * @param order - Order being edited.
 * @param address - Its address, split into fields.
 * @returns The state, its dispatcher, the save action and the feedback.
 */
export function useOrderEditForm(
  order: OrderResponse,
  address: ParsedAddress,
): UseOrderEditFormResult {
  const [state, dispatch] = useReducer(orderEditReducer, undefined, () =>
    initOrderEditState(order, address),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPaymentMissing, setPaymentMissing] = useState(false);
  const [saved, setSaved] = useState<SavedEdit | null>(null);
  const [before, setBefore] = useState<OrderAmounts>({
    total: order.totalAmount,
    refunded: order.refundedAmount,
  });
  useRestoredDraft(order.uuid, dispatch, setMessage);
  const { run, isPending } = useUpdateOrder(order.uuid);
  const save = async (): Promise<void> => {
    const built = buildOrderUpdateBody(state);
    setPaymentMissing(!built.ok && state.payment === null);
    if (!built.ok) {
      dispatch({ type: OrderEditActionType.SET_ADDRESS_ERRORS, errors: built.addressErrors });
      setMessage(ORDER_EDIT_MESSAGES.fixFields);
      return;
    }
    setMessage(null);
    const outcome = await run({ body: built.body, draft: toOrderEditDraft(order.uuid, state) });
    const feedback = feedbackOf(outcome, before, dispatch);
    setMessage(feedback.message);
    setSaved(feedback.saved);
    if (feedback.saved !== null) {
      setBefore({ total: feedback.saved.newTotal, refunded: feedback.saved.refunded });
    }
  };
  return { state, dispatch, save, isSaving: isPending, message, isPaymentMissing, saved };
}
