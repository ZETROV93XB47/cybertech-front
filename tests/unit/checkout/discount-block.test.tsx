/**
 * « Appliquer une réduction » block (feature 003, T035): campaigns and key field, key checked by
 * the quote (MSW), refusal keeping the previous key, minimum not reached, cart-mode amounts and
 * sign-in invitation for a visitor.
 *
 * @see specs/003-account-orders/spec.md US2, FR-016 to FR-021
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { CartDiscountBlock } from "@/features/checkout/components/CartDiscountBlock";
import type { QuoteView } from "@/features/checkout/quote-view";
import { CartLineStatus, CartSource } from "@/lib/enums/cart";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { StorageKey } from "@/lib/enums/storage-key";
import type { CartView } from "@/lib/schemas/cart";
import type { ActiveDiscount } from "@/lib/schemas/discount";

import { fakeUuids } from "../../helpers/products";
import { server } from "../../msw/server";

const [PRODUCT = ""] = fakeUuids(1);

/** Valid campaign key of the mocked backend. */
const BLACK_FRIDAY = "BLACK_FRIDAY";

/** Campaign whose minimum is never reached by the mocked cart. */
const BIG_SPENDER = "BIG_SPENDER";

const CAMPAIGNS: readonly ActiveDiscount[] = [
  {
    discountKey: BLACK_FRIDAY,
    calculationType: DiscountCalculationType.PERCENTAGE,
    percentage: 20,
    fixedAmount: null,
    minOrderAmount: null,
    maxDiscountAmount: 150,
    startsAt: null,
    endsAt: "2026-11-30T23:59:00",
  },
  {
    discountKey: BIG_SPENDER,
    calculationType: DiscountCalculationType.FIXED_AMOUNT,
    percentage: null,
    fixedAmount: 50,
    minOrderAmount: 532.1,
    maxDiscountAmount: null,
    startsAt: null,
    endsAt: null,
  },
];

/**
 * Builds a one-line cart.
 *
 * @param source - Guest or account cart.
 * @returns The cart view.
 */
function cartOf(source: CartSource): CartView {
  return {
    source,
    cartUuid: null,
    lines: [
      {
        productUuid: PRODUCT,
        name: "PC",
        imageUrl: null,
        unitPrice: 500,
        quantity: 1,
        lineTotal: 500,
        availableStock: 5,
        status: CartLineStatus.OK,
      },
    ],
    total: 500,
    totalIsEstimate: source === CartSource.GUEST,
    itemCount: 1,
  };
}

/**
 * Quote answered by the mocked BFF for a key.
 *
 * @param key - Requested key, `undefined` for none.
 * @returns The quote.
 */
function quoteFor(key: string | undefined): QuoteView {
  const base = {
    subtotal: 500,
    shippingCost: 15,
    currency: "EUR",
    discount: 0,
    total: 515,
    discountKey: key ?? null,
    isDiscountApplied: false,
    missingAmount: null,
  };
  if (key === BLACK_FRIDAY) {
    return { ...base, discount: 100, total: 415, isDiscountApplied: true };
  }
  return key === BIG_SPENDER ? { ...base, missingAmount: 32.1 } : base;
}

/** Keys received by the mocked quote route. */
let requestedKeys: (string | undefined)[] = [];

beforeEach(() => {
  requestedKeys = [];
  window.sessionStorage.clear();
  server.use(
    http.post("*/api/checkout/quote", async ({ request }) => {
      const { discountKey } = (await request.json()) as { discountKey?: string };
      requestedKeys.push(discountKey);
      if (
        discountKey !== undefined &&
        discountKey !== BLACK_FRIDAY &&
        discountKey !== BIG_SPENDER
      ) {
        return HttpResponse.json(
          { error: { code: FrontErrorCode.DISCOUNT_INVALID, message: "test" } },
          { status: 400 },
        );
      }
      return HttpResponse.json(quoteFor(discountKey));
    }),
  );
});

/**
 * Renders the cart block in a fresh query client.
 *
 * @param source - Guest or account cart.
 * @param campaigns - Campaigns offered.
 * @returns The render result.
 */
function renderBlock(
  source: CartSource,
  campaigns: readonly ActiveDiscount[] = CAMPAIGNS,
): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<CartDiscountBlock cart={cartOf(source)} campaigns={campaigns} />, { wrapper });
}

/**
 * Opens the chooser.
 *
 * @param user - User event instance.
 */
async function open(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: "Appliquer une réduction" }));
}

describe("DiscountBlock — cart mode", () => {
  it("lists the campaigns with their advantage and conditions", async () => {
    const user = userEvent.setup();
    const { container } = renderBlock(CartSource.ACCOUNT);
    await open(user);
    const list = screen.getByRole("list", { name: "Réductions en cours" });
    const items = within(list).getAllByRole("button");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("−20 %");
    expect(items[0]).toHaveTextContent(/Remise plafonnée à 150,00/);
    expect(items[0]).toHaveTextContent(/Jusqu'au 30 novembre/);
    expect(items[1]).toHaveTextContent(/Dès 532,10/);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("offers only the key field when there is no campaign", async () => {
    const user = userEvent.setup();
    renderBlock(CartSource.ACCOUNT, []);
    await open(user);
    expect(screen.queryByRole("list", { name: "Réductions en cours" })).toBeNull();
    expect(screen.getByLabelText("Tu as une clé de réduction ?")).toBeInTheDocument();
  });

  it("applies a campaign: the discount only, then the next-step notice", async () => {
    const user = userEvent.setup();
    renderBlock(CartSource.ACCOUNT);
    await open(user);
    await user.click(screen.getByRole("button", { name: /BLACK_FRIDAY/ }));
    expect(await screen.findByTestId("discount-amount")).toHaveTextContent("100,00");
    expect(screen.getByText("Remise BLACK_FRIDAY")).toBeInTheDocument();
    expect(screen.getByText("Livraison et total calculés à l'étape suivante.")).toBeInTheDocument();
    expect(screen.queryByText("Total")).toBeNull();
    expect(screen.queryByText(/15,00/)).toBeNull();
    await waitFor(() => {
      expect(window.sessionStorage.getItem(StorageKey.DISCOUNT)).toBe(BLACK_FRIDAY);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Réduction BLACK_FRIDAY sélectionnée.");
    expect(screen.getByRole("button", { name: /BLACK_FRIDAY/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("refuses an unknown key and keeps the previous discount", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(StorageKey.DISCOUNT, BLACK_FRIDAY);
    renderBlock(CartSource.ACCOUNT);
    expect(await screen.findByText("Réduction choisie : BLACK_FRIDAY")).toBeInTheDocument();
    await open(user);
    await user.type(screen.getByLabelText("Tu as une clé de réduction ?"), "nope");
    await user.click(screen.getByRole("button", { name: "Tester la clé" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La clé NOPE n'existe pas ou n'est plus active",
    );
    expect(screen.getByLabelText("Tu as une clé de réduction ?")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Réduction choisie : BLACK_FRIDAY")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(StorageKey.DISCOUNT)).toBe(BLACK_FRIDAY);
    expect(await screen.findByTestId("discount-amount")).toHaveTextContent("100,00");
  });

  it("refuses a malformed key without asking the backend", async () => {
    const user = userEvent.setup();
    renderBlock(CartSource.ACCOUNT);
    await open(user);
    await waitFor(() => {
      expect(requestedKeys).toHaveLength(1);
    });
    await user.type(screen.getByLabelText("Tu as une clé de réduction ?"), "NO-PE!");
    await user.click(screen.getByRole("button", { name: "Tester la clé" }));
    expect(screen.getByRole("alert")).toHaveTextContent("lettres, des chiffres et des tirets bas");
    expect(requestedKeys).toEqual([undefined]);
  });

  it("says what is missing for a minimum not reached and keeps the key selected", async () => {
    const user = userEvent.setup();
    renderBlock(CartSource.ACCOUNT);
    await open(user);
    await user.click(screen.getByRole("button", { name: /BIG_SPENDER/ }));
    expect(
      await screen.findByText(/Il te manque 32,10\s€ pour profiter de BIG_SPENDER\./),
    ).toBeInTheDocument();
    expect(screen.getByText("Réduction choisie : BIG_SPENDER")).toBeInTheDocument();
    expect(screen.queryByTestId("discount-amount")).toBeNull();
  });

  it("drops a stored key the backend no longer accepts", async () => {
    window.sessionStorage.setItem(StorageKey.DISCOUNT, "EXPIRED_SALE");
    renderBlock(CartSource.ACCOUNT);
    expect(await screen.findByText(/La réduction EXPIRED_SALE n'est plus valable/)).toBeVisible();
    expect(window.sessionStorage.getItem(StorageKey.DISCOUNT)).toBeNull();
  });

  it("removes the applied discount", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(StorageKey.DISCOUNT, BLACK_FRIDAY);
    renderBlock(CartSource.ACCOUNT);
    await user.click(await screen.findByRole("button", { name: "Retirer la réduction" }));
    expect(screen.queryByText("Réduction choisie : BLACK_FRIDAY")).toBeNull();
    expect(window.sessionStorage.getItem(StorageKey.DISCOUNT)).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Réduction retirée.");
  });
});

describe("DiscountBlock — visitor", () => {
  it("invites to sign in without requesting a quote", async () => {
    const { container } = renderBlock(CartSource.GUEST);
    expect(screen.getByText(/Connecte-toi pour appliquer une réduction/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
      "href",
      "/login?callbackUrl=%2Fcart",
    );
    expect(await axe(container)).toHaveNoViolations();
    expect(requestedKeys).toEqual([]);
  });
});
