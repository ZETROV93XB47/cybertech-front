/**
 * Wishlist hooks (feature 003 US6, T091): shared read, optimistic change and rollback.
 *
 * @see specs/003-account-orders/research.md R22
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useToggleWishlist,
  useWishlistIds,
  wishlistQueryKey,
} from "@/features/wishlist/hooks/useWishlist";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { PRODUCT_A, PRODUCT_B } from "../../helpers/cart";
import { server } from "../../msw/server";

interface FakeSession {
  data: { user: { name: string }; error?: string } | null;
  status: string;
}

const session = vi.hoisted((): { value: FakeSession } => ({
  value: { data: null, status: "unauthenticated" },
}));

vi.mock("next-auth/react", () => ({ useSession: () => session.value }));

/**
 * Builds a query client wrapper.
 *
 * @returns The wrapper and its client.
 */
function wrapper(): {
  Wrapper: (props: { children: ReactNode }) => ReactNode;
  client: QueryClient;
} {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    Wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

/** Signs the fake session in. */
function signIn(): void {
  session.value = { data: { user: { name: "Ada" } }, status: "authenticated" };
}

beforeEach(() => {
  session.value = { data: null, status: "unauthenticated" };
});

describe("useWishlistIds", () => {
  it("never calls the BFF for a visitor", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/wishlist/ids", () => {
        calls += 1;
        return HttpResponse.json({ productUuids: [PRODUCT_A] });
      }),
    );
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useWishlistIds(), { wrapper: Wrapper });
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.has(PRODUCT_A)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toBe(0);
  });

  it("reads the UUIDs once for several hearts", async () => {
    signIn();
    let calls = 0;
    server.use(
      http.get("*/api/wishlist/ids", () => {
        calls += 1;
        return HttpResponse.json({ productUuids: [PRODUCT_A] });
      }),
    );
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => [useWishlistIds(), useWishlistIds()] as const, {
      wrapper: Wrapper,
    });
    await waitFor(() => {
      expect(result.current[0].has(PRODUCT_A)).toBe(true);
    });
    expect(result.current[1].has(PRODUCT_A)).toBe(true);
    expect(result.current[0].has(PRODUCT_B)).toBe(false);
    expect(calls).toBe(1);
  });
});

describe("useToggleWishlist", () => {
  it("adds optimistically and keeps the add on success", async () => {
    signIn();
    server.use(
      http.put(`*/api/wishlist/${PRODUCT_B}`, () =>
        HttpResponse.json({ productUuid: PRODUCT_B, isInWishlist: true }),
      ),
    );
    const { Wrapper, client } = wrapper();
    client.setQueryData(wishlistQueryKey(), [PRODUCT_A]);
    const { result } = renderHook(() => useToggleWishlist(), { wrapper: Wrapper });
    let outcome: Awaited<ReturnType<typeof result.current>> | undefined;
    await act(async () => {
      outcome = await result.current(PRODUCT_B, true);
    });
    expect(outcome).toEqual({ ok: true });
    expect(client.getQueryData(wishlistQueryKey())).toEqual([PRODUCT_B, PRODUCT_A]);
  });

  it("rolls back and reports the code when the BFF refuses", async () => {
    signIn();
    server.use(
      http.put(`*/api/wishlist/${PRODUCT_B}`, () =>
        HttpResponse.json(
          { error: { code: FrontErrorCode.UNAVAILABLE, message: "down" } },
          { status: 503 },
        ),
      ),
    );
    const { Wrapper, client } = wrapper();
    client.setQueryData(wishlistQueryKey(), [PRODUCT_A]);
    const { result } = renderHook(() => useToggleWishlist(), { wrapper: Wrapper });
    let outcome: Awaited<ReturnType<typeof result.current>> | undefined;
    await act(async () => {
      outcome = await result.current(PRODUCT_B, true);
    });
    expect(outcome).toEqual({ ok: false, code: FrontErrorCode.UNAVAILABLE });
    expect(client.getQueryData(wishlistQueryKey())).toEqual([PRODUCT_A]);
  });

  it("removes optimistically", async () => {
    signIn();
    server.use(
      http.delete(`*/api/wishlist/${PRODUCT_A}`, () =>
        HttpResponse.json({ productUuid: PRODUCT_A, isInWishlist: false }),
      ),
    );
    const { Wrapper, client } = wrapper();
    client.setQueryData(wishlistQueryKey(), [PRODUCT_A, PRODUCT_B]);
    const { result } = renderHook(() => useToggleWishlist(), { wrapper: Wrapper });
    await act(async () => {
      await result.current(PRODUCT_A, false);
    });
    expect(client.getQueryData(wishlistQueryKey())).toEqual([PRODUCT_B]);
  });
});
