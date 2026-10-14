/**
 * State of the single-page checkout as a pure reducer: which step is open, which ones are
 * validated, and the choices made. Kept out of the component so every transition is tested.
 *
 * @see specs/003-account-orders/spec.md FR-006
 * @see specs/003-account-orders/research.md R3, R9
 */
import type { ParsedAddress } from "@/lib/address";
import { assertNever } from "@/lib/assert-never";
import type { QuoteShipping } from "@/lib/constants/checkout";
import { CheckoutStep } from "@/lib/enums/checkout";
import {
  type AddressField,
  CheckoutActionType,
  CheckoutStepState,
} from "@/lib/enums/checkout-step-state";
import type { PaymentType } from "@/lib/enums/order";
import type { CheckoutDraft } from "@/lib/schemas/storage";

import { type AddressErrors, validateAddress } from "./address-form";
import { CHECKOUT_MESSAGES } from "./messages";

/** Steps in display order. */
export const CHECKOUT_STEPS: readonly CheckoutStep[] = Object.values(CheckoutStep);

/** State of the checkout. */
export interface CheckoutState {
  /** Step whose form is shown; `null` once every step is validated. */
  readonly openStep: CheckoutStep | null;
  readonly validated: readonly CheckoutStep[];
  readonly address: ParsedAddress;
  readonly addressErrors: AddressErrors;
  /** Whether the customer changed the prefilled address (kept in the draft as a flag only). */
  readonly addressEdited: boolean;
  /** Shown above the address after a re-login that reset an edited address. */
  readonly addressNotice: string | null;
  readonly shipping: QuoteShipping | null;
  readonly payment: PaymentType | null;
  /** Error of the open choice step (nothing chosen). */
  readonly stepError: string | null;
}

/** Transition of the checkout. */
export type CheckoutAction =
  | {
      readonly type: CheckoutActionType.CHANGE_ADDRESS;
      readonly field: AddressField;
      readonly value: string;
    }
  | { readonly type: CheckoutActionType.SUBMIT_ADDRESS }
  | { readonly type: CheckoutActionType.SELECT_SHIPPING; readonly value: QuoteShipping }
  | { readonly type: CheckoutActionType.SUBMIT_SHIPPING }
  | { readonly type: CheckoutActionType.SELECT_PAYMENT; readonly value: PaymentType }
  | { readonly type: CheckoutActionType.SUBMIT_PAYMENT }
  | { readonly type: CheckoutActionType.REOPEN; readonly step: CheckoutStep }
  | { readonly type: CheckoutActionType.RESTORE_DRAFT; readonly draft: CheckoutDraft };

/**
 * Builds the first state, before any draft is read (the server render knows no draft).
 *
 * @param address - Profile address, split into fields.
 * @returns The initial state.
 */
export function initCheckoutState(address: ParsedAddress): CheckoutState {
  return {
    openStep: CheckoutStep.ADDRESS,
    validated: [],
    address,
    addressErrors: {},
    addressEdited: false,
    addressNotice: null,
    shipping: null,
    payment: null,
    stepError: null,
  };
}

/**
 * Restores a draft kept across a forced re-login (research R9): the shipping and payment
 * choices come back, the address stays the profile one, with a notice if it had been edited.
 *
 * @param state - Initial state.
 * @param draft - Draft read from `sessionStorage`.
 * @returns The restored state.
 */
function restoreDraft(state: CheckoutState, draft: CheckoutDraft): CheckoutState {
  const shipping =
    draft.shippingType && draft.shippingProvider
      ? { type: draft.shippingType, provider: draft.shippingProvider }
      : state.shipping;
  return {
    ...state,
    shipping,
    payment: draft.paymentType ?? state.payment,
    addressNotice: draft.hadCustomAddress ? CHECKOUT_MESSAGES.addressReset : null,
  };
}

/**
 * Validates a step and opens the next one not validated yet.
 *
 * @param state - Current state.
 * @param step - Step just validated.
 * @returns The next state.
 */
function completeStep(state: CheckoutState, step: CheckoutStep): CheckoutState {
  const validated = state.validated.includes(step) ? state.validated : [...state.validated, step];
  const next = CHECKOUT_STEPS.find((candidate) => !validated.includes(candidate)) ?? null;
  return { ...state, validated, openStep: next, stepError: null };
}

/**
 * Validates the address step.
 *
 * @param state - Current state.
 * @returns The next state, with the errors when a field is wrong.
 */
function submitAddress(state: CheckoutState): CheckoutState {
  const result = validateAddress(state.address);
  if (!result.ok) {
    return { ...state, addressErrors: result.errors };
  }
  return completeStep(
    { ...state, address: result.address, addressErrors: {} },
    CheckoutStep.ADDRESS,
  );
}

/**
 * Validates a choice step, or asks for a choice.
 *
 * @param state - Current state.
 * @param step - Step submitted.
 * @param isChosen - Whether something is selected.
 * @returns The next state.
 */
function submitChoice(state: CheckoutState, step: CheckoutStep, isChosen: boolean): CheckoutState {
  return isChosen
    ? completeStep(state, step)
    : { ...state, stepError: CHECKOUT_MESSAGES.chooseOption };
}

/**
 * Checkout reducer.
 *
 * @param state - Current state.
 * @param action - Transition.
 * @returns The next state.
 */
export function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case CheckoutActionType.CHANGE_ADDRESS:
      return {
        ...state,
        address: { ...state.address, [action.field]: action.value },
        addressEdited: true,
        addressErrors: { ...state.addressErrors, [action.field]: undefined },
      };
    case CheckoutActionType.SUBMIT_ADDRESS:
      return submitAddress(state);
    case CheckoutActionType.SELECT_SHIPPING:
      return { ...state, shipping: action.value, stepError: null };
    case CheckoutActionType.SUBMIT_SHIPPING:
      return submitChoice(state, CheckoutStep.SHIPPING, state.shipping !== null);
    case CheckoutActionType.SELECT_PAYMENT:
      return { ...state, payment: action.value, stepError: null };
    case CheckoutActionType.SUBMIT_PAYMENT:
      return submitChoice(state, CheckoutStep.PAYMENT, state.payment !== null);
    case CheckoutActionType.REOPEN:
      return { ...state, openStep: action.step, stepError: null };
    case CheckoutActionType.RESTORE_DRAFT:
      return restoreDraft(state, action.draft);
    default:
      return assertNever(action);
  }
}

/**
 * Display state of a step.
 *
 * @param state - Checkout state.
 * @param step - Step.
 * @returns Done, current or upcoming.
 */
export function stepStateOf(state: CheckoutState, step: CheckoutStep): CheckoutStepState {
  if (state.openStep === step) {
    return CheckoutStepState.CURRENT;
  }
  return state.validated.includes(step) ? CheckoutStepState.DONE : CheckoutStepState.UPCOMING;
}

/**
 * Whether every step is validated and none is being edited.
 *
 * @param state - Checkout state.
 * @returns `true` when the order can be placed (given an up-to-date quote).
 */
export function areStepsComplete(state: CheckoutState): boolean {
  return state.openStep === null && CHECKOUT_STEPS.every((step) => state.validated.includes(step));
}

/**
 * Draft kept in `sessionStorage` before a forced re-login: choices only, never the address.
 *
 * @param state - Checkout state.
 * @returns The draft.
 */
export function toCheckoutDraft(state: CheckoutState): CheckoutDraft {
  return {
    step: state.openStep ?? CheckoutStep.PAYMENT,
    ...(state.shipping
      ? { shippingType: state.shipping.type, shippingProvider: state.shipping.provider }
      : {}),
    ...(state.payment ? { paymentType: state.payment } : {}),
    hadCustomAddress: state.addressEdited,
  };
}
