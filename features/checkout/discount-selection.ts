/**
 * Discount selection as a pure reducer: the applied key, the key being checked by a quote, and
 * the feedback to announce. A chosen key is only applied once a quote accepted it; a refused
 * key leaves the previous discount in place (FR-018); a key no longer valid is dropped (FR-020).
 *
 * @see specs/003-account-orders/research.md R7
 * @see specs/003-account-orders/spec.md US2
 */
import { assertNever } from "@/lib/assert-never";
import { DiscountActionType, DiscountFeedbackKind } from "@/lib/enums/checkout";

/** Feedback of the last choice, with the key it is about. */
export interface DiscountFeedback {
  readonly kind: DiscountFeedbackKind;
  /** Key concerned; empty for a removal. */
  readonly key: string;
}

/** State of the discount selection. */
export interface DiscountSelectionState {
  /** Key accepted by a quote and kept in the tab storage; `null` for no discount. */
  readonly appliedKey: string | null;
  /** Key waiting for its quote; `null` when nothing is being checked. */
  readonly pendingKey: string | null;
  readonly feedback: DiscountFeedback | null;
}

/** Transition of the discount selection. */
export type DiscountAction =
  | { readonly type: DiscountActionType.RESTORE; readonly key: string }
  | { readonly type: DiscountActionType.PROPOSE; readonly key: string }
  | { readonly type: DiscountActionType.MALFORMED; readonly key: string }
  | { readonly type: DiscountActionType.COMMIT }
  | { readonly type: DiscountActionType.REJECT }
  | { readonly type: DiscountActionType.EXPIRE }
  | { readonly type: DiscountActionType.REMOVE };

/** Selection before the tab storage is read. */
export const INITIAL_DISCOUNT_SELECTION: DiscountSelectionState = {
  appliedKey: null,
  pendingKey: null,
  feedback: null,
};

/**
 * Key to send to the quote: the pending one while it is checked, else the applied one.
 *
 * @param state - Selection.
 * @returns The key, or `null` for no discount.
 */
export function effectiveDiscountKey(state: DiscountSelectionState): string | null {
  return state.pendingKey ?? state.appliedKey;
}

/**
 * Applies the pending key.
 *
 * @param state - Selection with a pending key.
 * @returns The next state.
 */
function commit(state: DiscountSelectionState): DiscountSelectionState {
  if (state.pendingKey === null) {
    return state;
  }
  return {
    appliedKey: state.pendingKey,
    pendingKey: null,
    feedback: { kind: DiscountFeedbackKind.APPLIED, key: state.pendingKey },
  };
}

/**
 * Discount selection reducer.
 *
 * @param state - Current selection.
 * @param action - Transition.
 * @returns The next selection.
 */
export function discountReducer(
  state: DiscountSelectionState,
  action: DiscountAction,
): DiscountSelectionState {
  switch (action.type) {
    case DiscountActionType.RESTORE:
      return { ...state, appliedKey: action.key };
    case DiscountActionType.PROPOSE:
      return action.key === state.appliedKey
        ? { ...state, pendingKey: null }
        : { ...state, pendingKey: action.key, feedback: null };
    case DiscountActionType.MALFORMED:
      return { ...state, feedback: { kind: DiscountFeedbackKind.MALFORMED, key: action.key } };
    case DiscountActionType.COMMIT:
      return commit(state);
    case DiscountActionType.REJECT:
      return state.pendingKey === null
        ? state
        : {
            ...state,
            pendingKey: null,
            feedback: { kind: DiscountFeedbackKind.REFUSED, key: state.pendingKey },
          };
    case DiscountActionType.EXPIRE:
      return {
        appliedKey: null,
        pendingKey: null,
        feedback: { kind: DiscountFeedbackKind.EXPIRED, key: state.appliedKey ?? "" },
      };
    case DiscountActionType.REMOVE:
      return {
        appliedKey: null,
        pendingKey: null,
        feedback: { kind: DiscountFeedbackKind.REMOVED, key: "" },
      };
    default:
      return assertNever(action);
  }
}
