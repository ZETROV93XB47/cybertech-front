"use client";

/**
 * Client island of the single-page checkout: the three steps unfolding one after the other
 * (reducer of `checkout-state.ts`), the summary priced by the backend quote with the discount
 * chosen on the cart or here, the saved card that will be charged, and the placement.
 *
 * Before a shipping is chosen, the quote is priced with `CART_QUOTE_SHIPPING` so that the
 * subtotal and the discount are known; the summary only shows shipping and total once the
 * customer chose a shipping.
 *
 * A draft kept across a forced re-login is restored after the first render (the server render
 * cannot read `sessionStorage`), then removed. The order is never placed without a new click.
 *
 * @see specs/003-account-orders/spec.md US1, US2, FR-002, FR-006 to FR-020
 * @see specs/003-account-orders/research.md R3, R4, R5, R7, R9, R10, R21
 */
import { useEffect, useReducer, useState, type Dispatch, type ReactNode } from "react";

import { useCart } from "@/features/cart/hooks/useCart";
import type { ParsedAddress } from "@/lib/address";
import type { BffError } from "@/lib/api/bff-client";
import { assertNever } from "@/lib/assert-never";
import { CART_QUOTE_SHIPPING } from "@/lib/constants/checkout";
import { NO_DISCOUNT_KEY } from "@/lib/constants/discount";
import { DiscountBlockMode, PlaceOutcomeKind, SavedCardKind } from "@/lib/enums/checkout";
import { CheckoutActionType } from "@/lib/enums/checkout-step-state";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { formatPrice } from "@/lib/format";
import type { ActiveDiscount } from "@/lib/schemas/discount";

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
import { useDiscountedQuote, type UseDiscountedQuoteResult } from "../hooks/useDiscountedQuote";
import { usePlaceOrder, type PlaceOutcome } from "../hooks/usePlaceOrder";
import { cartSignature } from "../hooks/useQuote";
import { CHECKOUT_ERROR_MESSAGES, CHECKOUT_MESSAGES, CHECKOUT_SUMMARY_MESSAGES } from "../messages";
import type { SavedCard } from "../saved-card";
import type { ShippingChoice } from "../shipping-choices";

import { CheckoutStepPanel } from "./CheckoutStepPanel";
import { CheckoutStepForm, stepSummary } from "./CheckoutStepForm";
import { CheckoutSummary } from "./CheckoutSummary";
import { DiscountBlock } from "./DiscountBlock";

/** Props of {@link CheckoutFlow}. */
export interface CheckoutFlowProps {
  /** Profile address, split into fields, to prefill the address step. */
  readonly initialAddress: ParsedAddress;
  /** Shipping choices with their real prices (empty when unavailable). */
  readonly choices: readonly ShippingChoice[];
  /** Card that will be charged, or its absence (FR-009). */
  readonly savedCard: SavedCard;
  /** Displayable discount campaigns, read on the server. */
  readonly campaigns: readonly ActiveDiscount[];
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
 * Error of the quote shown in the summary. A refused discount key is not one: the discount
 * block explains it and the previous key is quoted again (FR-018).
 *
 * @param error - Error of the latest quote.
 * @returns The message, or `null`.
 */
function quoteErrorMessage(error: BffError | null): string | null {
  return error === null || error.code === FrontErrorCode.DISCOUNT_INVALID
    ? null
    : checkoutErrorMessage(error);
}

/**
 * Steps column.
 *
 * @param props - State, dispatcher, shipping choices and saved card.
 * @returns The three step panels.
 */
function CheckoutSteps({
  state,
  dispatch,
  choices,
  savedCard,
}: {
  readonly state: CheckoutState;
  readonly dispatch: Dispatch<CheckoutAction>;
  readonly choices: readonly ShippingChoice[];
  readonly savedCard: SavedCard;
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
            <CheckoutStepForm
              step={step}
              state={state}
              dispatch={dispatch}
              choices={choices}
              savedCard={savedCard}
            />
          </CheckoutStepPanel>
        </li>
      ))}
    </ol>
  );
}

/** Result of {@link useCheckoutPlacement}. */
interface CheckoutPlacement {
  readonly onPlace: () => void;
  readonly isPending: boolean;
  /** Outcome of the last click (French), if any. */
  readonly message: string | null;
  /** No saved card, known from the page or from a `no-saved-card` refusal. */
  readonly needsCard: boolean;
}

/**
 * « Valider la commande »: places with the quoted discount, then reacts to the outcome — new
 * quote on a changed total, discount dropped when no longer valid (FR-020), « Ajouter une
 * carte » when the backend finds no saved card (FR-009).
 *
 * @param state - Checkout state.
 * @param discount - Discount selection and quote.
 * @param savedCard - Saved card read by the page.
 * @returns The place handler and its state.
 */
function useCheckoutPlacement(
  state: CheckoutState,
  discount: UseDiscountedQuoteResult,
  savedCard: SavedCard,
): CheckoutPlacement {
  const { place, isPending } = usePlaceOrder();
  const [message, setMessage] = useState<string | null>(null);
  const [cardRefused, setCardRefused] = useState(false);
  const onPlace = async (): Promise<void> => {
    const quote = discount.quote.quote;
    if (!quote || !state.shipping || !state.payment) {
      return;
    }
    setMessage(null);
    const outcome = await place({
      body: {
        paymentType: state.payment,
        shippingType: state.shipping.type,
        shippingProvider: state.shipping.provider,
        address: { ...state.address },
        discountKey: quote.discountKey ?? NO_DISCOUNT_KEY,
      },
      displayedTotal: quote.total,
      draft: toCheckoutDraft(state),
    });
    setMessage(outcomeMessage(outcome));
    if (outcome.kind === PlaceOutcomeKind.TOTAL_CHANGED) {
      discount.quote.refetch();
    } else if (outcome.kind === PlaceOutcomeKind.DISCOUNT_INVALID) {
      discount.expire();
    } else if (outcome.kind === PlaceOutcomeKind.FAILED) {
      setCardRefused(outcome.error.code === FrontErrorCode.NO_SAVED_CARD);
    }
  };
  const needsCard = savedCard.kind === SavedCardKind.ABSENT || cardRefused;
  return { onPlace: () => void onPlace(), isPending, message, needsCard };
}

/**
 * Single-page checkout.
 *
 * @param props - Prefill, shipping choices, saved card and discount campaigns.
 * @returns Steps and summary.
 */
export function CheckoutFlow({
  initialAddress,
  choices,
  savedCard,
  campaigns,
}: CheckoutFlowProps): ReactNode {
  const [state, dispatch] = useReducer(checkoutReducer, initialAddress, initCheckoutState);
  useRestoredDraft(dispatch);
  const { cart } = useCart();
  const discount = useDiscountedQuote({
    shipping: state.shipping ?? CART_QUOTE_SHIPPING,
    cartSignature: cart ? cartSignature(cart) : "",
  });
  const { quote } = discount;
  const placement = useCheckoutPlacement(state, discount, savedCard);
  return (
    <div className="grid items-start gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <CheckoutSteps state={state} dispatch={dispatch} choices={choices} savedCard={savedCard} />
      </div>
      <div className="lg:col-span-5">
        <CheckoutSummary
          cart={cart}
          quote={quote.quote}
          showShipping={state.shipping !== null}
          isStale={quote.isStale}
          quoteError={quoteErrorMessage(quote.error)}
          onRetry={quote.refetch}
          canPlace={areStepsComplete(state) && quote.quote !== undefined && !quote.isStale}
          isPlacing={placement.isPending}
          onPlace={placement.onPlace}
          message={placement.message}
          needsCard={placement.needsCard}
          discountBlock={
            <DiscountBlock
              mode={DiscountBlockMode.CHECKOUT}
              campaigns={campaigns}
              discount={discount}
            />
          }
        />
      </div>
    </div>
  );
}
