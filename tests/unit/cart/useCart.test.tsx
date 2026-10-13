import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse, delay } from "msw";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildGuestCartView } from "@/features/cart/cart-view";
import { useCart } from "@/features/cart/hooks/useCart";
import { readGuestCart } from "@/features/cart/guest-storage";
import { Brand } from "@/lib/enums/brand";
import { CartLineStatus, CartSource } from "@/lib/enums/cart";
import type { CartView, GuestLine } from "@/lib/schemas/cart";

import { PRODUCT_A, PRODUCT_B } from "../../helpers/cart";
import { server } from "../../msw/server";

interface FakeSession {
  data: { user: { name: string } } | null;
  status: string;
}

const session = vi.hoisted((): { value: FakeSession } => ({
  value: { data: null, status: "unauthenticated" },
}));

vi.mock("next-auth/react", () => ({ useSession: () => session.value }));

/** Stock seen by the mocked preview route. */
let stock: Record<string, number> = {};

function previewOf(lines: readonly GuestLine[]): CartView {
  return buildGuestCartView(lines, {
    products: new Map(
      lines.map((line) => [
        line.productUuid,
        {
          uuid: line.productUuid,
          name: `Produit ${line.productUuid.slice(-1).toUpperCase()}`,
          brand: Brand.DELL,
          category: "COMPUTER",
          price: 100,
          imageUrl: null,
        },
      ]),
    ),
    stock: new Map(
      Object.entries(stock).map(([uuid, available]) => [
        uuid,
        { productUuid: uuid, availableStock: available, inStock: available > 0 },
      ]),
    ),
  });
}

function accountView(quantity: number): CartView {
  return {
    ...previewOf(quantity > 0 ? [{ productUuid: PRODUCT_A, quantity }] : []),
    source: CartSource.ACCOUNT,
    cartUuid: null,
    totalIsEstimate: false,
  };
}

function wrapper(): {
  Wrapper: (props: { children: ReactNode }) => ReactNode;
  client: QueryClient;
} {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    Wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  stock = { [PRODUCT_A]: 10, [PRODUCT_B]: 2 };
  server.use(
    http.post("*/api/cart/preview", async ({ request }) => {
      const body = (await request.json()) as { items: GuestLine[] };
      return HttpResponse.json(previewOf(body.items));
    }),
  );
});

afterEach(() => {
  window.localStorage.clear();
  session.value = { data: null, status: "unauthenticated" };
});

describe("useCart — guest", () => {
  it("reads an empty guest cart without calling the BFF", async () => {
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.cart).toBeDefined();
    });
    expect(result.current.source).toBe(CartSource.GUEST);
    expect(result.current.cart?.itemCount).toBe(0);
  });

  it("adds after a stock check, writes the storage and announces it", async () => {
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.add(PRODUCT_A, 1);
    });
    await act(async () => {
      await result.current.add(PRODUCT_A, 2);
    });
    expect(readGuestCart(window.localStorage)).toEqual([{ productUuid: PRODUCT_A, quantity: 3 }]);
    await waitFor(() => {
      expect(result.current.cart?.itemCount).toBe(3);
    });
    expect(result.current.announcement).toBe("Produit A ajouté à ton panier (2 unités).");
  });

  it("refuses an add above the stock and leaves the storage unchanged", async () => {
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    let outcome: Awaited<ReturnType<typeof result.current.add>> | undefined;
    await act(async () => {
      outcome = await result.current.add(PRODUCT_B, 3);
    });
    expect(outcome).toMatchObject({ ok: false, message: "Il n'en reste que 2." });
    expect(readGuestCart(window.localStorage)).toEqual([]);
    expect(result.current.announcement).toBe("Il n'en reste que 2.");
  });

  it("follows a change made in another tab", async () => {
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    act(() => {
      window.localStorage.setItem(
        "ct_guest_cart_v1",
        JSON.stringify({
          items: [{ productUuid: PRODUCT_A, quantity: 4 }],
          updatedAt: "2026-10-13T10:00:00Z",
        }),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: "ct_guest_cart_v1" }));
    });
    await waitFor(() => {
      expect(result.current.cart?.itemCount).toBe(4);
    });
    expect(result.current.cart?.lines[0]?.status).toBe(CartLineStatus.OK);
  });
});

describe("useCart — account", () => {
  beforeEach(() => {
    session.value = { data: { user: { name: "Camille" } }, status: "authenticated" };
  });

  it("reads the account cart from the BFF", async () => {
    server.use(http.get("*/api/cart", () => HttpResponse.json(accountView(2))));
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.cart?.itemCount).toBe(2);
    });
    expect(result.current.source).toBe(CartSource.ACCOUNT);
  });

  it("updates optimistically, then replaces the view with the server one", async () => {
    server.use(
      http.get("*/api/cart", () => HttpResponse.json(accountView(2))),
      http.patch("*/api/cart/items/:uuid", async () => {
        await delay(50);
        return HttpResponse.json(accountView(5));
      }),
    );
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.cart?.itemCount).toBe(2);
    });
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.setQuantity(PRODUCT_A, 4);
    });
    await waitFor(() => {
      expect(result.current.cart?.itemCount).toBe(4);
    });
    await act(async () => {
      await pending;
    });
    expect(result.current.cart?.itemCount).toBe(5);
  });

  it("rolls back on error and explains the stock problem", async () => {
    server.use(
      http.get("*/api/cart", () => HttpResponse.json(accountView(2))),
      http.patch("*/api/cart/items/:uuid", () =>
        HttpResponse.json(
          { error: { code: "insufficient-stock", message: "x", availableStock: 3 } },
          { status: 409 },
        ),
      ),
    );
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useCart(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.cart?.itemCount).toBe(2);
    });
    await act(async () => {
      await result.current.setQuantity(PRODUCT_A, 9);
    });
    expect(result.current.cart?.itemCount).toBe(2);
    expect(result.current.announcement).toBe("Il n'en reste que 3.");
  });
});
