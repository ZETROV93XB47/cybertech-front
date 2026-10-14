"use client";

/**
 * Backend quote of the account cart, refreshed on every change of shipping, discount or cart.
 *
 * The quote key holds the three choices and a signature of the cart: a change of any of them is
 * a new query, TanStack Query aborts the outdated request through its `signal`, and only the
 * amounts of the latest choice can be displayed (FR-011). While the new quote is on its way, the
 * previous amounts stay on screen flagged as stale (`placeholderData`).
 *
 * @see specs/003-account-orders/research.md R4
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { BffError, bffSend } from "@/lib/api/bff-client";
import type { QuoteShipping } from "@/lib/constants/checkout";
import { NO_DISCOUNT_KEY } from "@/lib/constants/discount";
import { BFF_ROUTES } from "@/lib/constants/routes";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { QueryKey } from "@/lib/enums/query-key";
import type { CartView } from "@/lib/schemas/cart";

import { QuoteViewSchema, type QuoteView } from "../quote-view";

/** Separator between a product and its quantity in a cart signature. */
const LINE_SEPARATOR = ":";

/** Separator between the lines of a cart signature. */
const LINES_SEPARATOR = ",";

/** Choices priced by {@link useQuote}. */
export interface UseQuoteInput {
  /** Shipping choice; `null` while none is chosen (no quote requested). */
  readonly shipping: QuoteShipping | null;
  /** Discount campaign key; `null` for no discount. */
  readonly discountKey: string | null;
  /** Signature of the cart priced, from {@link cartSignature}. */
  readonly cartSignature: string;
}

/** Result of {@link useQuote}. */
export interface UseQuoteResult {
  /** Latest quote received, possibly for a previous choice while {@link isStale}. */
  readonly quote: QuoteView | undefined;
  /** The displayed amounts are being replaced by a newer quote. */
  readonly isStale: boolean;
  readonly isFetching: boolean;
  /** Error of the latest request, if it failed. */
  readonly error: BffError | null;
  /** Requests the quote again (« Réessayer »). */
  readonly refetch: () => void;
}

/**
 * Signature of a cart: product and quantity of every line, sorted. Two carts with the same
 * signature are priced the same way, so the signature is part of the quote key.
 *
 * @param cart - Displayed cart.
 * @returns The signature.
 */
export function cartSignature(cart: CartView): string {
  return cart.lines
    .map((line) => `${line.productUuid}${LINE_SEPARATOR}${line.quantity}`)
    .sort()
    .join(LINES_SEPARATOR);
}

/**
 * Turns any thrown value into a {@link BffError}, the only error the checkout UI reads.
 *
 * @param error - Thrown value.
 * @returns The BFF error.
 */
export function asBffError(error: unknown): BffError {
  if (error instanceof BffError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new BffError(FrontErrorCode.UNKNOWN, 0, message);
}

/**
 * Requests a quote from the BFF.
 *
 * @param shipping - Shipping choice.
 * @param discountKey - Campaign key, `null` for none (the key is then omitted, never `null`).
 * @param signal - Abort signal of the query.
 * @returns The displayed quote.
 * @throws {BffError} When the BFF refuses or cannot price the cart.
 */
export async function fetchQuote(
  shipping: QuoteShipping,
  discountKey: string | null,
  signal?: AbortSignal,
): Promise<QuoteView> {
  const body = {
    shippingType: shipping.type,
    shippingProvider: shipping.provider,
    ...(discountKey === null || discountKey === NO_DISCOUNT_KEY ? {} : { discountKey }),
  };
  return bffSend(BFF_ROUTES.checkoutQuote, HttpMethod.POST, QuoteViewSchema, body, signal);
}

/**
 * Quote of the account cart for the current choices.
 *
 * @param input - Shipping, discount key and cart signature.
 * @returns The quote, its stale flag and its error.
 */
export function useQuote({ shipping, discountKey, cartSignature }: UseQuoteInput): UseQuoteResult {
  const query = useQuery({
    queryKey: [QueryKey.QUOTE, shipping?.type, shipping?.provider, discountKey, cartSignature],
    queryFn: ({ signal }): Promise<QuoteView> =>
      shipping === null
        ? Promise.reject(new Error("No shipping"))
        : fetchQuote(shipping, discountKey, signal),
    enabled: shipping !== null,
    staleTime: 0,
    // The BFF already retries a backend read once; a 4xx is an answer, not an outage.
    retry: false,
    placeholderData: keepPreviousData,
  });
  return {
    quote: query.data,
    isStale: query.isFetching || query.isPlaceholderData,
    isFetching: query.isFetching,
    error: query.error === null ? null : asBffError(query.error),
    refetch: () => void query.refetch(),
  };
}
