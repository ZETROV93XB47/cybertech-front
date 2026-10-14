"use client";

/**
 * Quote of the account cart with the discount chosen by the customer, shared by the discount
 * block of the cart page and by the checkout.
 *
 * The chosen key is first sent to the quote as a pending key: accepted, it becomes the applied
 * key and is kept in the tab storage (`ct_discount_v1`) so the checkout starts with it; refused
 * (`discount-invalid`), the previous key is restored (FR-018). An applied key that the quote no
 * longer accepts is dropped with a message (FR-020).
 *
 * @see specs/003-account-orders/research.md R5, R7
 * @see specs/003-account-orders/spec.md US2
 */
import { useCallback, useEffect, useReducer, type Dispatch } from "react";

import type { QuoteShipping } from "@/lib/constants/checkout";
import { DiscountActionType } from "@/lib/enums/checkout";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { DiscountKeySchema } from "@/lib/schemas/discount";

import {
  INITIAL_DISCOUNT_SELECTION,
  discountReducer,
  effectiveDiscountKey,
  type DiscountAction,
  type DiscountSelectionState,
} from "../discount-selection";
import { clearDiscountKey, readDiscountKey, writeDiscountKey } from "../discount-storage";

import { useQuote, type UseQuoteResult } from "./useQuote";

/** Input of {@link useDiscountedQuote}. */
export interface UseDiscountedQuoteInput {
  /** Shipping priced; `null` disables the quote. */
  readonly shipping: QuoteShipping | null;
  /** Signature of the cart, from `cartSignature`. */
  readonly cartSignature: string;
}

/** Result of {@link useDiscountedQuote}. */
export interface UseDiscountedQuoteResult {
  readonly quote: UseQuoteResult;
  readonly selection: DiscountSelectionState;
  /** Checks a campaign key, typed or chosen; a malformed key is refused without a request. */
  readonly propose: (key: string) => void;
  /** Removes the applied discount. */
  readonly remove: () => void;
  /** Drops the applied discount after the placement found it no longer valid (FR-020). */
  readonly expire: () => void;
}

/** Action settling the selection from a quote. */
type SettleType = DiscountActionType.COMMIT | DiscountActionType.REJECT | DiscountActionType.EXPIRE;

/**
 * Settles the pending or applied key from the latest quote.
 *
 * @param selection - Current selection.
 * @param quote - Quote of the effective key.
 * @returns The action to dispatch, or `null` when nothing is settled yet.
 */
function settle(selection: DiscountSelectionState, quote: UseQuoteResult): SettleType | null {
  const isRefused = quote.error?.code === FrontErrorCode.DISCOUNT_INVALID;
  if (selection.pendingKey !== null) {
    if (isRefused) {
      return DiscountActionType.REJECT;
    }
    const isSettled = quote.quote !== undefined && !quote.isStale && quote.error === null;
    return isSettled ? DiscountActionType.COMMIT : null;
  }
  return isRefused && selection.appliedKey !== null ? DiscountActionType.EXPIRE : null;
}

/**
 * Reads the key kept in the tab storage once, after hydration.
 *
 * @param dispatch - Selection dispatcher.
 */
function useStoredKey(dispatch: Dispatch<DiscountAction>): void {
  useEffect(() => {
    const stored = readDiscountKey(window.sessionStorage);
    if (stored !== null) {
      dispatch({ type: DiscountActionType.RESTORE, key: stored });
    }
  }, [dispatch]);
}

/**
 * Applies the settling action, keeping the tab storage in step.
 *
 * @param action - Action computed by {@link settle}.
 * @param pendingKey - Key being checked.
 * @param dispatch - Selection dispatcher.
 */
function useSettlement(
  action: SettleType | null,
  pendingKey: string | null,
  dispatch: Dispatch<DiscountAction>,
): void {
  useEffect(() => {
    if (action === null) {
      return;
    }
    if (action === DiscountActionType.COMMIT && pendingKey !== null) {
      writeDiscountKey(window.sessionStorage, pendingKey);
    }
    if (action === DiscountActionType.EXPIRE) {
      clearDiscountKey(window.sessionStorage);
    }
    dispatch({ type: action });
  }, [action, pendingKey, dispatch]);
}

/**
 * Discount selection and the quote that checks it.
 *
 * @param input - Shipping and cart signature.
 * @returns The quote, the selection and its actions.
 */
export function useDiscountedQuote(input: UseDiscountedQuoteInput): UseDiscountedQuoteResult {
  const [selection, dispatch] = useReducer(discountReducer, INITIAL_DISCOUNT_SELECTION);
  useStoredKey(dispatch);
  const quote = useQuote({ ...input, discountKey: effectiveDiscountKey(selection) });
  useSettlement(settle(selection, quote), selection.pendingKey, dispatch);
  const propose = useCallback((key: string): void => {
    const parsed = DiscountKeySchema.safeParse(key);
    dispatch(
      parsed.success
        ? { type: DiscountActionType.PROPOSE, key: parsed.data }
        : { type: DiscountActionType.MALFORMED, key: key.trim() },
    );
  }, []);
  const remove = useCallback((): void => {
    clearDiscountKey(window.sessionStorage);
    dispatch({ type: DiscountActionType.REMOVE });
  }, []);
  const expire = useCallback((): void => {
    clearDiscountKey(window.sessionStorage);
    dispatch({ type: DiscountActionType.EXPIRE });
  }, []);
  return { quote, selection, propose, remove, expire };
}
