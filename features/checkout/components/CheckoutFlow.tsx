"use client";

/**
 * Client island of the single-page checkout: the three steps unfolding one after the other
 * (reducer of `checkout-state.ts`), the summary priced by the backend quote, and the placement.
 *
 * A draft kept across a forced re-login is restored after the first render (the server render
 * cannot read `sessionStorage`), then removed. The order is never placed without a new click.
 *
 * @see specs/003-account-orders/spec.md US1, FR-002, FR-006 to FR-015
 * @see specs/003-account-orders/research.md R3, R4, R9, R10
 */
import { useEffect, useReducer, useState, type Dispatch, type ReactNode } from "react";

import { useCart } from "@/features/cart/hooks/useCart";
import type { ParsedAddress } from "@/lib/address";
import { assertNever } from "@/lib/assert-never";
import { NO_DISCOUNT_KEY } from "@/lib/constants/discount";
import { PlaceOutcomeKind } from "@/lib/enums/checkout";
import { CheckoutActionType } from "@/lib/enums/checkout-step-state";
import { formatPrice } from "@/lib/format";

import { checkoutErrorMessage } from "../checkout-errors";
import { clearCheckoutDraft, readCheckoutDraft } from "../checkout-draft";
import {
  CHECKOUT_STEPS,
  areStepsComplete,
  checkoutReducer,
  initCheckoutState,
  stepStateOf,
  toCheckoutDraft,
  type CheckoutAction,
  type CheckoutState,
} from "../checkout-state";
import { cartSignature, useQuote } from "../hooks/useQuote";
import { usePlaceOrder, type PlaceOutcome } from "../hooks/usePlaceOrder";
import { CHECKOUT_ERROR_MESSAGES, CHECKOUT_MESSAGES, CHECKOUT_SUMMARY_MESSAGES } from "../messages";
import type { ShippingChoice } from "../shipping-choices";

import { CheckoutStepPanel } from "./CheckoutStepPanel";
import { CheckoutStepForm, stepSummary } from "./CheckoutStepForm";
import { CheckoutSummary } from "./CheckoutSummary";

/** Props of {@link CheckoutFlow}. */
export interface CheckoutFlowProps {
  /** Profile address, split into fields, to prefill the address step. */
  readonly initialAddress: ParsedAddress;
  /** Shipping choices with their real prices (empty when unavailable). */
  readonly choices: readonly ShippingChoice[];
}

/**
 * Restores the draft of a forced re-login once, after hydration.
 *
 * @param dispatch - Checkout dispatcher.
 */
function useRestoredDraft(dispatch: Dispatch<CheckoutAction>): void {
  useEffect(() => {
    const draft = readCheckoutDraft(window.sessionStorage);
    if (draft !== null) {
      dispatch({ type: CheckoutActionType.RESTORE_DRAFT, draft });
      clearCheckoutDraft(window.sessionStorage);
    }
  }, [dispatch]);
}

/**
 * Message of a placement outcome that keeps the customer on the page.
 *
 * @param outcome - Outcome of the click.
 * @returns The message, or `null` when nothing is to be said.
 */
function outcomeMessage(outcome: PlaceOutcome): string | null {
  switch (outcome.kind) {
    case PlaceOutcomeKind.TOTAL_CHANGED:
      return CHECKOUT_SUMMARY_MESSAGES.totalChanged(formatPrice(outcome.quote.total));
    case PlaceOutcomeKind.DISCOUNT_INVALID:
      return CHECKOUT_ERROR_MESSAGES.discountInvalid;
    case PlaceOutcomeKind.FAILED:
      return checkoutErrorMessage(outcome.error);
    case PlaceOutcomeKind.PLACED:
    case PlaceOutcomeKind.REDIRECTED:
    case PlaceOutcomeKind.IGNORED:
      return null;
    default:
      return assertNever(outcome);
  }
}

/**
 * Steps column.
 *
 * @param props - State, dispatcher and shipping choices.
 * @returns The three step panels.
 */
function CheckoutSteps({
  state,
  dispatch,
  choices,
}: {
  readonly state: CheckoutState;
  readonly dispatch: Dispatch<CheckoutAction>;
  readonly choices: readonly ShippingChoice[];
}): ReactNode {
  return (
    <ol aria-label={CHECKOUT_MESSAGES.stepsLabel} className="flex flex-col gap-4">
      {CHECKOUT_STEPS.map((step, index) => (
        <li key={step}>
          <CheckoutStepPanel
            step={step}
            position={index + 1}
            total={CHECKOUT_STEPS.length}
            state={stepStateOf(state, step)}
            summary={stepSummary(step, state)}
            onEdit={() => {
              dispatch({ type: CheckoutActionType.REOPEN, step });
            }}
          >
            <CheckoutStepForm step={step} state={state} dispatch={dispatch} choices={choices} />
          </CheckoutStepPanel>
        </li>
      ))}
    </ol>
  );
}

/**
 * Single-page checkout.
 *
 * @param props - Prefill and shipping choices.
 * @returns Steps and summary.
 */
export function CheckoutFlow({ initialAddress, choices }: CheckoutFlowProps): ReactNode {
  const [state, dispatch] = useReducer(checkoutReducer, initialAddress, initCheckoutState);
  useRestoredDraft(dispatch);
  const { cart } = useCart();
  const quote = useQuote({
    shipping: state.shipping,
    discountKey: null,
    cartSignature: cart ? cartSignature(cart) : "",
  });
  const { place, isPending } = usePlaceOrder();
  const [message, setMessage] = useState<string | null>(null);
  const isComplete = areStepsComplete(state);
  const onPlace = async (): Promise<void> => {
    if (!quote.quote || !state.shipping || !state.payment) {
      return;
    }
    setMessage(null);
    const outcome = await place({
      body: {
        paymentType: state.payment,
        shippingType: state.shipping.type,
        shippingProvider: state.shipping.provider,
        address: { ...state.address },
        discountKey: quote.quote.discountKey ?? NO_DISCOUNT_KEY,
      },
      displayedTotal: quote.quote.total,
      draft: toCheckoutDraft(state),
    });
    setMessage(outcomeMessage(outcome));
    if (outcome.kind === PlaceOutcomeKind.TOTAL_CHANGED) {
      quote.refetch();
    }
  };
  return (
    <div className="grid items-start gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <CheckoutSteps state={state} dispatch={dispatch} choices={choices} />
      </div>
      <div className="lg:col-span-5">
        <CheckoutSummary
          cart={cart}
          quote={quote.quote}
          isStale={quote.isStale}
          quoteError={quote.error ? checkoutErrorMessage(quote.error) : null}
          onRetry={quote.refetch}
          canPlace={isComplete && quote.quote !== undefined && !quote.isStale}
          isPlacing={isPending}
          onPlace={() => void onPlace()}
          message={message}
        />
      </div>
    </div>
  );
}
