/**
 * Checkout hooks (feature 003, T019): quote of the latest choice only, single placement with a
 * final quote, bounded polling of the payment status and payment retry.
 *
 * @see specs/003-account-orders/research.md R4, R9–R11
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readCheckoutDraft } from "@/features/checkout/checkout-draft";
import { useOrderStatus, useRetryPayment } from "@/features/checkout/hooks/useOrderStatus";
import { usePlaceOrder, type PlaceOrderInput } from "@/features/checkout/hooks/usePlaceOrder";
import { cartSignature, useQuote, type UseQuoteInput } from "@/features/checkout/hooks/useQuote";
import type { QuoteView } from "@/features/checkout/quote-view";
import { accountCartQueryKey } from "@/features/cart/hooks/useCart";
import {
  ORDER_STATUS_POLL_INTERVAL_MS,
  ORDER_STATUS_POLL_TIMEOUT_MS,
  RETRY_STALE_FAILURE_GRACE_MS,
} from "@/lib/constants/orders";
import { CartLineStatus, CartSource } from "@/lib/enums/cart";
import { CheckoutStep, PlaceOutcomeKind, RetryPaymentOutcomeKind } from "@/lib/enums/checkout";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { OrderStatus, PaymentType } from "@/lib/enums/order";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import type { CartView } from "@/lib/schemas/cart";

import { fakeUuids } from "../../helpers/products";
import { server } from "../../msw/server";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const [ORDER = "", PRODUCT_A = "", PRODUCT_B = ""] = fakeUuids(3);

/** Quote answered by the mocked BFF for a shipping type. */
function quoteFor(type: ShippingType, total: number): QuoteView {
  return {
    subtotal: 500,
    discount: 0,
    shippingCost: type === ShippingType.EXPRESS ? 25 : 15,
    total,
    currency: "EUR",
    discountKey: null,
    isDiscountApplied: false,
    missingAmount: null,
  };
}

/** Error body of the BFF. */
function errorBody(code: FrontErrorCode): { error: { code: FrontErrorCode; message: string } } {
  return { error: { code, message: "test" } };
}

/** Fresh providers for one test. */
function setup(): { client: QueryClient; wrapper: (props: { children: ReactNode }) => ReactNode } {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

const PLACE_INPUT: PlaceOrderInput = {
  body: {
    paymentType: PaymentType.VISA,
    shippingType: ShippingType.EXPRESS,
    shippingProvider: ShippingProvider.FEDEX,
    address: { street: "1 rue du Test", zipCode: "75001", city: "Paris", country: "France" },
    discountKey: "NO_DISCOUNT",
  },
  displayedTotal: 525,
  draft: {
    step: CheckoutStep.PAYMENT,
    shippingType: ShippingType.EXPRESS,
    shippingProvider: ShippingProvider.FEDEX,
    paymentType: PaymentType.VISA,
    hadCustomAddress: true,
  },
};

beforeEach(() => {
  replace.mockReset();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cartSignature", () => {
  it("is the same whatever the order of the lines", () => {
    const line = (productUuid: string, quantity: number): CartView["lines"][number] => ({
      productUuid,
      name: "PC",
      imageUrl: null,
      unitPrice: 1,
      quantity,
      lineTotal: quantity,
      availableStock: 9,
      status: CartLineStatus.OK,
    });
    const cart = (lines: CartView["lines"]): CartView => ({
      source: CartSource.ACCOUNT,
      cartUuid: null,
      lines,
      total: 0,
      totalIsEstimate: false,
      itemCount: 0,
    });
    expect(cartSignature(cart([line(PRODUCT_A, 1), line(PRODUCT_B, 2)]))).toBe(
      cartSignature(cart([line(PRODUCT_B, 2), line(PRODUCT_A, 1)])),
    );
    expect(cartSignature(cart([line(PRODUCT_A, 1)]))).not.toBe(
      cartSignature(cart([line(PRODUCT_A, 2)])),
    );
  });
});

describe("useQuote", () => {
  it("is idle without shipping choice", () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useQuote({ shipping: null, discountKey: null, cartSignature: "a" }),
      { wrapper },
    );
    expect(result.current.quote).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it("shows only the amounts of the latest choice when answers come out of order", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post("*/api/checkout/quote", async ({ request }) => {
        const body = (await request.json()) as { shippingType: ShippingType };
        bodies.push(body);
        // The first (standard) answer is the slowest: it must never be displayed last.
        await delay(body.shippingType === ShippingType.STANDARD ? 200 : 10);
        return HttpResponse.json(
          quoteFor(body.shippingType, body.shippingType === ShippingType.STANDARD ? 515 : 525),
        );
      }),
    );
    const { wrapper } = setup();
    const initial: UseQuoteInput = {
      shipping: { type: ShippingType.STANDARD, provider: ShippingProvider.DHL },
      discountKey: null,
      cartSignature: "a",
    };
    const { result, rerender } = renderHook((input: UseQuoteInput) => useQuote(input), {
      wrapper,
      initialProps: initial,
    });
    rerender({
      ...initial,
      shipping: { type: ShippingType.EXPRESS, provider: ShippingProvider.DHL },
    });
    await waitFor(() => {
      expect(result.current.quote?.total).toBe(525);
    });
    await delay(250);
    expect(result.current.quote?.total).toBe(525);
    expect(result.current.isStale).toBe(false);
    expect(bodies[0]).not.toHaveProperty("discountKey");
  });

  it("keeps the previous amounts flagged as stale while a new quote is on its way", async () => {
    server.use(
      http.post("*/api/checkout/quote", async ({ request }) => {
        const body = (await request.json()) as { shippingType: ShippingType };
        await delay(body.shippingType === ShippingType.EXPRESS ? 100 : 0);
        return HttpResponse.json(quoteFor(body.shippingType, 515));
      }),
    );
    const { wrapper } = setup();
    const initial: UseQuoteInput = {
      shipping: { type: ShippingType.STANDARD, provider: ShippingProvider.DHL },
      discountKey: "BLACK_FRIDAY",
      cartSignature: "a",
    };
    const { result, rerender } = renderHook((input: UseQuoteInput) => useQuote(input), {
      wrapper,
      initialProps: initial,
    });
    await waitFor(() => {
      expect(result.current.quote).toBeDefined();
    });
    rerender({
      ...initial,
      shipping: { type: ShippingType.EXPRESS, provider: ShippingProvider.DHL },
    });
    await waitFor(() => {
      expect(result.current.isStale).toBe(true);
    });
    expect(result.current.quote?.shippingCost).toBe(15);
    await waitFor(() => {
      expect(result.current.quote?.shippingCost).toBe(25);
    });
  });

  it("reports a refusal without retrying it", async () => {
    let calls = 0;
    server.use(
      http.post("*/api/checkout/quote", () => {
        calls += 1;
        return HttpResponse.json(errorBody(FrontErrorCode.DISCOUNT_INVALID), { status: 400 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(
      () =>
        useQuote({
          shipping: { type: ShippingType.STANDARD, provider: ShippingProvider.DHL },
          discountKey: "NOPE",
          cartSignature: "a",
        }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.error?.code).toBe(FrontErrorCode.DISCOUNT_INVALID);
    });
    expect(calls).toBe(1);
  });
});

describe("usePlaceOrder", () => {
  it("places once after a matching final quote, empties the cart and goes to the confirmation", async () => {
    let placements = 0;
    server.use(
      http.post("*/api/checkout/quote", () =>
        HttpResponse.json(quoteFor(ShippingType.EXPRESS, 525)),
      ),
      http.post("*/api/checkout/place", async () => {
        placements += 1;
        await delay(20);
        return HttpResponse.json(
          { orderUuid: ORDER, status: OrderStatus.AWAITING_PAYMENT },
          { status: 201 },
        );
      }),
    );
    const { client, wrapper } = setup();
    const { result } = renderHook(() => usePlaceOrder(), { wrapper });
    let outcomes: unknown[] = [];
    await act(async () => {
      outcomes = await Promise.all([
        result.current.place(PLACE_INPUT),
        result.current.place(PLACE_INPUT),
      ]);
    });
    expect(placements).toBe(1);
    expect(outcomes).toContainEqual({ kind: PlaceOutcomeKind.IGNORED });
    expect(outcomes).toContainEqual({ kind: PlaceOutcomeKind.PLACED, orderUuid: ORDER });
    expect(replace).toHaveBeenCalledWith(`/checkout/confirmation/${ORDER}`);
    expect(client.getQueryData<CartView>(accountCartQueryKey())?.lines).toEqual([]);
  });

  it("does not place when the final quote differs from the displayed total", async () => {
    let placements = 0;
    server.use(
      http.post("*/api/checkout/quote", () =>
        HttpResponse.json(quoteFor(ShippingType.EXPRESS, 700)),
      ),
      http.post("*/api/checkout/place", () => {
        placements += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlaceOrder(), { wrapper });
    const outcome = await act(() => result.current.place(PLACE_INPUT));
    expect(outcome).toMatchObject({ kind: PlaceOutcomeKind.TOTAL_CHANGED, quote: { total: 700 } });
    expect(placements).toBe(0);
    expect(result.current.isPending).toBe(false);
  });

  it.each([
    [FrontErrorCode.INSUFFICIENT_STOCK, 409, "/cart?issue=stock"],
    [FrontErrorCode.EMPTY_CART, 409, "/cart?issue=empty"],
  ])("sends %s back to the cart", async (code, status, path) => {
    server.use(
      http.post("*/api/checkout/quote", () =>
        HttpResponse.json(quoteFor(ShippingType.EXPRESS, 525)),
      ),
      http.post("*/api/checkout/place", () => HttpResponse.json(errorBody(code), { status })),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlaceOrder(), { wrapper });
    const outcome = await act(() => result.current.place(PLACE_INPUT));
    expect(outcome).toEqual({ kind: PlaceOutcomeKind.REDIRECTED });
    expect(replace).toHaveBeenCalledWith(path);
  });

  it("asks for a new quote without the key when the discount expired", async () => {
    server.use(
      http.post("*/api/checkout/quote", () =>
        HttpResponse.json(quoteFor(ShippingType.EXPRESS, 525)),
      ),
      http.post("*/api/checkout/place", () =>
        HttpResponse.json(errorBody(FrontErrorCode.DISCOUNT_INVALID), { status: 400 }),
      ),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlaceOrder(), { wrapper });
    const outcome = await act(() => result.current.place(PLACE_INPUT));
    expect(outcome).toEqual({ kind: PlaceOutcomeKind.DISCOUNT_INVALID });
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps a draft without address and never replays when the session expired", async () => {
    let placements = 0;
    server.use(
      http.post("*/api/checkout/quote", () =>
        HttpResponse.json(quoteFor(ShippingType.EXPRESS, 525)),
      ),
      http.post("*/api/checkout/place", () => {
        placements += 1;
        return HttpResponse.json(errorBody(FrontErrorCode.UNAUTHENTICATED), { status: 401 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlaceOrder(), { wrapper });
    const outcome = await act(() => result.current.place(PLACE_INPUT));
    expect(outcome).toEqual({ kind: PlaceOutcomeKind.REDIRECTED });
    expect(readCheckoutDraft(window.sessionStorage)).toEqual(PLACE_INPUT.draft);
    expect(window.sessionStorage.getItem("ct_checkout_v1")).not.toContain("rue du Test");
    expect(placements).toBe(1);
  });

  it("reports another refusal as a failure", async () => {
    server.use(
      http.post("*/api/checkout/quote", () =>
        HttpResponse.json(quoteFor(ShippingType.EXPRESS, 525)),
      ),
      http.post("*/api/checkout/place", () =>
        HttpResponse.json(errorBody(FrontErrorCode.ACCOUNT_INACTIVE), { status: 403 }),
      ),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlaceOrder(), { wrapper });
    const outcome = await act(() => result.current.place(PLACE_INPUT));
    expect(outcome).toMatchObject({ kind: PlaceOutcomeKind.FAILED });
    expect(result.current.error?.code).toBe(FrontErrorCode.ACCOUNT_INACTIVE);
  });
});

describe("useOrderStatus", () => {
  it("polls until the payment attempt is over", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const statuses = [OrderStatus.AWAITING_PAYMENT, OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID];
    let reads = 0;
    server.use(
      http.get("*/api/orders/:uuid/status", () => {
        const status = statuses[Math.min(reads, statuses.length - 1)];
        reads += 1;
        return HttpResponse.json({ uuid: ORDER, status });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useOrderStatus(ORDER), { wrapper });
    for (let tick = 0; tick < statuses.length + 2; tick += 1) {
      await act(() => vi.advanceTimersByTimeAsync(ORDER_STATUS_POLL_INTERVAL_MS));
    }
    expect(result.current.status).toBe(OrderStatus.PAID);
    expect(reads).toBe(statuses.length);
    expect(result.current.isTimedOut).toBe(false);
  });

  it("stops after the polling time and can restart", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(
      http.get("*/api/orders/:uuid/status", () =>
        HttpResponse.json({ uuid: ORDER, status: OrderStatus.AWAITING_PAYMENT }),
      ),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useOrderStatus(ORDER), { wrapper });
    await act(() =>
      vi.advanceTimersByTimeAsync(ORDER_STATUS_POLL_TIMEOUT_MS + ORDER_STATUS_POLL_INTERVAL_MS),
    );
    expect(result.current.isTimedOut).toBe(true);
    act(() => {
      result.current.restart();
    });
    expect(result.current.isTimedOut).toBe(false);
  });

  it("after a retry, reads a stale failure as pending until the payment succeeds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const statuses = [OrderStatus.PAYMENT_FAILED, OrderStatus.PAYMENT_FAILED, OrderStatus.PAID];
    let reads = 0;
    server.use(
      http.get("*/api/orders/:uuid/status", () => {
        const status = statuses[Math.min(reads, statuses.length - 1)];
        reads += 1;
        return HttpResponse.json({ uuid: ORDER, status });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useOrderStatus(ORDER), { wrapper });
    await waitFor(() => {
      expect(result.current.status).toBe(OrderStatus.PAYMENT_FAILED);
    });
    act(() => {
      result.current.restart();
    });
    await act(() => vi.advanceTimersByTimeAsync(ORDER_STATUS_POLL_INTERVAL_MS / 2));
    expect(result.current.status).toBe(OrderStatus.AWAITING_PAYMENT);
    await act(() => vi.advanceTimersByTimeAsync(statuses.length * ORDER_STATUS_POLL_INTERVAL_MS));
    expect(result.current.status).toBe(OrderStatus.PAID);
  });

  it("after a retry, shows a failure that outlasts the grace time", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(
      http.get("*/api/orders/:uuid/status", () =>
        HttpResponse.json({ uuid: ORDER, status: OrderStatus.PAYMENT_FAILED }),
      ),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useOrderStatus(ORDER), { wrapper });
    await waitFor(() => {
      expect(result.current.status).toBe(OrderStatus.PAYMENT_FAILED);
    });
    act(() => {
      result.current.restart();
    });
    await act(() =>
      vi.advanceTimersByTimeAsync(RETRY_STALE_FAILURE_GRACE_MS + 2 * ORDER_STATUS_POLL_INTERVAL_MS),
    );
    expect(result.current.status).toBe(OrderStatus.PAYMENT_FAILED);
  });

  it("stops on a missing order", async () => {
    let reads = 0;
    server.use(
      http.get("*/api/orders/:uuid/status", () => {
        reads += 1;
        return HttpResponse.json(errorBody(FrontErrorCode.NOT_FOUND), { status: 404 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useOrderStatus(ORDER), { wrapper });
    await waitFor(() => {
      expect(result.current.error?.code).toBe(FrontErrorCode.NOT_FOUND);
    });
    await delay(ORDER_STATUS_POLL_INTERVAL_MS + 100);
    expect(reads).toBe(1);
  });
});

describe("useRetryPayment", () => {
  it.each([
    [200, { uuid: ORDER, status: OrderStatus.AWAITING_PAYMENT }, RetryPaymentOutcomeKind.RESTARTED],
    [
      409,
      errorBody(FrontErrorCode.PAYMENT_ALREADY_COMPLETED),
      RetryPaymentOutcomeKind.ALREADY_PAID,
    ],
    [402, errorBody(FrontErrorCode.PAYMENT_FAILED), RetryPaymentOutcomeKind.FAILED],
  ])("answers %i as %s", async (status, body, expected) => {
    server.use(
      http.post("*/api/orders/:uuid/retry-payment", () => HttpResponse.json(body, { status })),
    );
    const onRestart = vi.fn();
    const { wrapper } = setup();
    const { result } = renderHook(() => useRetryPayment(ORDER, onRestart), { wrapper });
    const outcome = await act(() => result.current.retry());
    expect(outcome).toBe(expected);
    expect(onRestart).toHaveBeenCalledTimes(expected === RetryPaymentOutcomeKind.FAILED ? 0 : 1);
  });
});
