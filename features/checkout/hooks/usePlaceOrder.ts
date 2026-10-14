"use client";

/**
 * « Valider la commande »: one placement at most, priced by a final quote.
 *
 * The backend offers no idempotency key for `POST /order/place`, so a placement is never
 * replayed: a click while one is in progress is ignored, and after a forced sign-in the customer
 * clicks again (FR-002, FR-012). A final quote is requested first; if its total differs from the
 * displayed one (cart changed in another tab), nothing is placed and the new total is shown.
 *
 * @see specs/003-account-orders/research.md R9, R10
 * @see specs/003-account-orders/contracts/bff-routes.md §1.1
 */
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { emptyCartView } from "@/features/cart/cart-view";
import { accountCartQueryKey } from "@/features/cart/hooks/useCart";
import { type BffError, bffSend } from "@/lib/api/bff-client";
import { loginPath } from "@/lib/auth/callback-url";
import {
  CART_PATH,
  BFF_ROUTES,
  CHECKOUT_PATH,
  checkoutConfirmationPath,
} from "@/lib/constants/routes";
import { CartIssue, CartSource } from "@/lib/enums/cart";
import { PlaceOutcomeKind } from "@/lib/enums/checkout";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { type OrderPlaceBody, PlacedOrderSchema } from "@/lib/schemas/order";
import type { CheckoutDraft } from "@/lib/schemas/storage";

import { clearCheckoutDraft, writeCheckoutDraft } from "../checkout-draft";
import type { QuoteView } from "../quote-view";

import { asBffError, fetchQuote } from "./useQuote";

/** Query parameter of the cart page explaining why the checkout sent the customer back. */
const CART_ISSUE_PARAM = "issue";

/** What {@link UsePlaceOrderResult.place} needs. */
export interface PlaceOrderInput {
  /** Validated placement body (address, shipping, payment, discount key). */
  readonly body: OrderPlaceBody;
  /** Total currently displayed in the summary, compared to the final quote. */
  readonly displayedTotal: number;
  /** Non-personal draft kept if the session expired (never the address). */
  readonly draft: CheckoutDraft;
}

/** Outcome of a click on « Valider la commande ». */
export type PlaceOutcome =
  | { readonly kind: PlaceOutcomeKind.PLACED; readonly orderUuid: string }
  | { readonly kind: PlaceOutcomeKind.TOTAL_CHANGED; readonly quote: QuoteView }
  | { readonly kind: PlaceOutcomeKind.DISCOUNT_INVALID }
  | { readonly kind: PlaceOutcomeKind.REDIRECTED }
  | { readonly kind: PlaceOutcomeKind.IGNORED }
  | { readonly kind: PlaceOutcomeKind.FAILED; readonly error: BffError };

/** Result of {@link usePlaceOrder}. */
export interface UsePlaceOrderResult {
  /** Places the order once; never throws. */
  readonly place: (input: PlaceOrderInput) => Promise<PlaceOutcome>;
  readonly isPending: boolean;
  /** Error of the last failed placement, shown in the summary. */
  readonly error: BffError | null;
}

/**
 * Builds the cart path explaining a checkout issue.
 *
 * @param issue - Problem met at checkout.
 * @returns The path `/cart?issue=…`.
 */
function cartIssuePath(issue: CartIssue): string {
  return `${CART_PATH}?${new URLSearchParams({ [CART_ISSUE_PARAM]: issue }).toString()}`;
}

/**
 * Routes a refused placement (research R10).
 *
 * @param error - BFF error.
 * @param draft - Draft to keep for after the sign-in.
 * @param replace - Router replace.
 * @returns The outcome.
 */
function routeFailure(
  error: BffError,
  draft: CheckoutDraft,
  replace: (href: string) => void,
): PlaceOutcome {
  if (error.code === FrontErrorCode.UNAUTHENTICATED) {
    writeCheckoutDraft(window.sessionStorage, draft);
    window.location.assign(loginPath(CHECKOUT_PATH));
    return { kind: PlaceOutcomeKind.REDIRECTED };
  }
  if (
    error.code === FrontErrorCode.INSUFFICIENT_STOCK ||
    error.code === FrontErrorCode.EMPTY_CART
  ) {
    replace(
      cartIssuePath(error.code === FrontErrorCode.EMPTY_CART ? CartIssue.EMPTY : CartIssue.STOCK),
    );
    return { kind: PlaceOutcomeKind.REDIRECTED };
  }
  if (error.code === FrontErrorCode.DISCOUNT_INVALID) {
    return { kind: PlaceOutcomeKind.DISCOUNT_INVALID };
  }
  return { kind: PlaceOutcomeKind.FAILED, error };
}

/**
 * Final quote then placement.
 *
 * @param input - Placement input.
 * @returns The placed order UUID, or the outcome that stopped the placement.
 * @throws {BffError} When the quote or the placement fails.
 */
async function quoteThenPlace(input: PlaceOrderInput): Promise<PlaceOutcome> {
  const { body } = input;
  const quote = await fetchQuote(
    { type: body.shippingType, provider: body.shippingProvider },
    body.discountKey,
  );
  if (quote.total !== input.displayedTotal) {
    return { kind: PlaceOutcomeKind.TOTAL_CHANGED, quote };
  }
  const placed = await bffSend(BFF_ROUTES.checkoutPlace, HttpMethod.POST, PlacedOrderSchema, body);
  return { kind: PlaceOutcomeKind.PLACED, orderUuid: placed.orderUuid };
}

/**
 * Places the account cart as an order.
 *
 * @returns The place action, its pending state and its last error.
 */
export function usePlaceOrder(): UsePlaceOrderResult {
  const router = useRouter();
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<BffError | null>(null);
  const place = useCallback(
    async (input: PlaceOrderInput): Promise<PlaceOutcome> => {
      if (inFlight.current) {
        return { kind: PlaceOutcomeKind.IGNORED };
      }
      inFlight.current = true;
      setPending(true);
      setError(null);
      let outcome: PlaceOutcome;
      try {
        outcome = await quoteThenPlace(input);
      } catch (thrown) {
        outcome = routeFailure(asBffError(thrown), input.draft, (href) => {
          router.replace(href);
        });
      }
      if (outcome.kind === PlaceOutcomeKind.PLACED) {
        // The backend emptied the server cart; the browser stays locked until it navigates.
        queryClient.setQueryData(accountCartQueryKey(), emptyCartView(CartSource.ACCOUNT));
        clearCheckoutDraft(window.sessionStorage);
        router.replace(checkoutConfirmationPath(outcome.orderUuid));
        return outcome;
      }
      if (outcome.kind === PlaceOutcomeKind.FAILED) {
        setError(outcome.error);
      }
      inFlight.current = false;
      setPending(false);
      return outcome;
    },
    [queryClient, router],
  );
  return { place, isPending, error };
}
