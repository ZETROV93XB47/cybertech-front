/**
 * Checkout components (feature 003, T020): single-page steps, shipping and payment choices,
 * summary priced by the quote, payment follow-up. Hooks are mocked: their own behaviour is
 * covered by `checkout-hooks.test.tsx`.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutFlow } from "@/features/checkout/components/CheckoutFlow";
import { CheckoutSummary } from "@/features/checkout/components/CheckoutSummary";
import { PaymentTracker } from "@/features/checkout/components/PaymentTracker";
import type { QuoteView } from "@/features/checkout/quote-view";
import { buildShippingChoices } from "@/features/checkout/shipping-choices";
import type { PlaceOrderInput, PlaceOutcome } from "@/features/checkout/hooks/usePlaceOrder";
import { toSavedCard } from "@/features/checkout/saved-card";
import { BffError } from "@/lib/api/bff-client";
import { BankCardType } from "@/lib/enums/bank-card";
import { CartLineStatus, CartSource } from "@/lib/enums/cart";
import { PlaceOutcomeKind } from "@/lib/enums/checkout";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { OrderStatus } from "@/lib/enums/order";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import type { CartView } from "@/lib/schemas/cart";

import { fakeUuids } from "../../helpers/products";

const [PRODUCT = "", ORDER = ""] = fakeUuids(2);

const CART: CartView = {
  source: CartSource.ACCOUNT,
  cartUuid: null,
  lines: [
    {
      productUuid: PRODUCT,
      name: "PC Portable",
      imageUrl: null,
      unitPrice: 500,
      quantity: 1,
      lineTotal: 500,
      availableStock: 5,
      status: CartLineStatus.OK,
    },
  ],
  total: 500,
  totalIsEstimate: false,
  itemCount: 1,
};

const QUOTE: QuoteView = {
  subtotal: 500,
  discount: 0,
  shippingCost: 25,
  total: 525,
  currency: "EUR",
  discountKey: null,
  isDiscountApplied: false,
  missingAmount: null,
};

const quoteState = { quote: undefined as QuoteView | undefined, isStale: false };
const placeMock = vi.fn<() => Promise<PlaceOutcome>>();
const statusState = { status: undefined as OrderStatus | undefined, isTimedOut: false };

vi.mock("@/features/cart/hooks/useCart", () => ({ useCart: () => ({ cart: CART }) }));
vi.mock("@/features/checkout/hooks/useQuote", () => ({
  cartSignature: () => "signature",
  useQuote: () => ({ ...quoteState, isFetching: false, error: null, refetch: vi.fn() }),
}));
vi.mock("@/features/checkout/hooks/usePlaceOrder", () => ({
  usePlaceOrder: () => ({ place: placeMock, isPending: false, error: null }),
}));
vi.mock("@/features/checkout/hooks/useOrderStatus", () => ({
  useOrderStatus: () => ({ ...statusState, error: null, restart: vi.fn() }),
  useRetryPayment: () => ({ retry: vi.fn(), isPending: false, error: null }),
}));

const ADDRESS = { street: "1 rue du Test", zipCode: "75001", city: "Paris", country: "France" };

/** Saved Visa card ending in 4242. */
const VISA_CARD = toSavedCard({
  uuid: ORDER,
  cardHolderName: "Jean Test",
  maskedNumber: "**** **** **** 4242",
  expiryDate: "12/2030",
  cardType: BankCardType.VISA,
});

/** No saved card. */
const NO_CARD = toSavedCard(null);

const CHOICES = buildShippingChoices(
  [
    { provider: ShippingProvider.DHL, type: ShippingType.STANDARD, cost: 15, currency: "EUR" },
    { provider: ShippingProvider.FEDEX, type: ShippingType.EXPRESS, cost: 25, currency: "EUR" },
  ],
  new Date("2026-10-14T10:00:00Z"),
);

beforeEach(() => {
  quoteState.quote = undefined;
  quoteState.isStale = false;
  placeMock.mockReset();
  statusState.status = undefined;
  statusState.isTimedOut = false;
  window.sessionStorage.clear();
});

describe("CheckoutFlow", () => {
  it("unfolds the steps one at a time and keeps the choices when a step is reopened", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CheckoutFlow
        initialAddress={ADDRESS}
        choices={CHOICES}
        savedCard={VISA_CARD}
        campaigns={[]}
      />,
    );
    expect(screen.getByLabelText("Ville")).toHaveValue("Paris");
    expect(screen.queryByRole("radio", { name: /Livraison express/ })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Continuer" }));
    await user.click(screen.getByRole("radio", { name: /Livraison express — FedEx/ }));
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("Livraison express — FedEx")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Modifier : Livraison" }));
    expect(screen.getByRole("radio", { name: /Livraison express — FedEx/ })).toBeChecked();
  });

  it("links the error of an empty address field to it", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutFlow
        initialAddress={{ ...ADDRESS, city: "" }}
        choices={CHOICES}
        savedCard={VISA_CARD}
        campaigns={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    const city = screen.getByLabelText("Ville");
    expect(city).toHaveAttribute("aria-invalid", "true");
    expect(city).toHaveAccessibleDescription("Ce champ est obligatoire.");
  });

  it("shows real prices, the estimate label and store pickup disabled", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutFlow
        initialAddress={ADDRESS}
        choices={CHOICES}
        savedCard={VISA_CARD}
        campaigns={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    const standard = screen.getByRole("radio", { name: /Livraison standard — DHL/ });
    expect(standard.closest("label")).toHaveTextContent("15,00");
    expect(standard.closest("label")).toHaveTextContent("Délai estimatif");
    const pickup = screen.getByRole("radio", { name: /Retrait en magasin/ });
    expect(pickup).toBeDisabled();
    expect(pickup.closest("label")).toHaveTextContent("Bientôt disponible");
  });

  it("offers the four payment methods and never a card number field", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutFlow
        initialAddress={ADDRESS}
        choices={CHOICES}
        savedCard={VISA_CARD}
        campaigns={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    await user.click(screen.getByRole("radio", { name: /Livraison standard — DHL/ }));
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    for (const name of ["Mastercard", "Visa", "Apple Pay", "Google Pay"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/Paiement de test/)).toBeInTheDocument();
    expect(screen.getByTestId("saved-card")).toHaveTextContent("Visa se terminant par 4242");
    expect(screen.getByTestId("saved-card")).toHaveTextContent("Expire fin 12/2030");
    expect(screen.queryByLabelText(/carte/i)).toBeNull();
    expect(document.querySelector('input[autocomplete^="cc-"]')).toBeNull();
  });

  it("restores the choices of a draft kept across a re-login", () => {
    window.sessionStorage.setItem(
      "ct_checkout_v1",
      JSON.stringify({
        step: "payment",
        shippingType: ShippingType.EXPRESS,
        shippingProvider: ShippingProvider.FEDEX,
        paymentType: "VISA",
        hadCustomAddress: true,
      }),
    );
    render(
      <CheckoutFlow
        initialAddress={ADDRESS}
        choices={CHOICES}
        savedCard={VISA_CARD}
        campaigns={[]}
      />,
    );
    expect(screen.getByText(/ton adresse a été reprise/)).toBeInTheDocument();
    expect(window.sessionStorage.getItem("ct_checkout_v1")).toBeNull();
  });
});

describe("CheckoutFlow — saved card (T083)", () => {
  /**
   * Validates the three steps with Standard DHL and Visa.
   *
   * @param user - User event instance.
   */
  async function completeSteps(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    await user.click(screen.getByRole("radio", { name: /Livraison standard — DHL/ }));
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    await user.click(screen.getByRole("radio", { name: "Visa" }));
    await user.click(screen.getByRole("button", { name: "Continuer" }));
  }

  it("blocks placing without a saved card and offers « Ajouter une carte »", async () => {
    const user = userEvent.setup();
    quoteState.quote = QUOTE;
    render(
      <CheckoutFlow
        initialAddress={ADDRESS}
        choices={CHOICES}
        savedCard={NO_CARD}
        campaigns={[]}
      />,
    );
    await completeSteps(user);
    expect(screen.getByRole("button", { name: "Valider la commande" })).toBeDisabled();
    for (const link of screen.getAllByRole("link", { name: "Ajouter une carte" })) {
      expect(link).toHaveAttribute("href", "/account/card?returnTo=%2Fcheckout");
    }
  });

  it("shows « Ajouter une carte » when the placement finds no saved card", async () => {
    const user = userEvent.setup();
    quoteState.quote = QUOTE;
    placeMock.mockResolvedValue({
      kind: PlaceOutcomeKind.FAILED,
      error: new BffError(FrontErrorCode.NO_SAVED_CARD, 404, "test"),
    });
    render(
      <CheckoutFlow
        initialAddress={ADDRESS}
        choices={CHOICES}
        savedCard={VISA_CARD}
        campaigns={[]}
      />,
    );
    await completeSteps(user);
    expect(screen.queryByRole("link", { name: "Ajouter une carte" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Valider la commande" }));
    expect(screen.getByRole("alert")).toHaveTextContent("ajoute d'abord une carte");
    expect(screen.getByRole("link", { name: "Ajouter une carte" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Valider la commande" })).toBeDisabled();
  });

  it("drops a discount that expired before the placement and asks for a new click", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem("ct_discount_v1", "BLACK_FRIDAY");
    quoteState.quote = {
      ...QUOTE,
      discount: 100,
      discountKey: "BLACK_FRIDAY",
      isDiscountApplied: true,
    };
    placeMock.mockResolvedValue({ kind: PlaceOutcomeKind.DISCOUNT_INVALID });
    render(
      <CheckoutFlow
        initialAddress={ADDRESS}
        choices={CHOICES}
        savedCard={VISA_CARD}
        campaigns={[]}
      />,
    );
    await completeSteps(user);
    await user.click(screen.getByRole("button", { name: "Valider la commande" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Cette réduction n'est plus valable");
    expect(window.sessionStorage.getItem("ct_discount_v1")).toBeNull();
    expect(placeMock).toHaveBeenCalledTimes(1);
  });

  it("sends the quoted discount key with the order", async () => {
    const user = userEvent.setup();
    quoteState.quote = {
      ...QUOTE,
      discount: 100,
      discountKey: "BLACK_FRIDAY",
      isDiscountApplied: true,
    };
    placeMock.mockResolvedValue({ kind: PlaceOutcomeKind.IGNORED });
    render(
      <CheckoutFlow
        initialAddress={ADDRESS}
        choices={CHOICES}
        savedCard={VISA_CARD}
        campaigns={[]}
      />,
    );
    await completeSteps(user);
    await user.click(screen.getByRole("button", { name: "Valider la commande" }));
    const [input] = placeMock.mock.calls[0] as unknown as [PlaceOrderInput];
    expect(input.body.discountKey).toBe("BLACK_FRIDAY");
  });
});

describe("CheckoutSummary", () => {
  const props = {
    cart: CART,
    showShipping: true,
    discountBlock: null,
    needsCard: false,
    quoteError: null,
    onRetry: vi.fn(),
    isPlacing: false,
    onPlace: vi.fn(),
    message: null,
  };

  it("shows the quote amounts and enables placing", async () => {
    const { container } = render(
      <CheckoutSummary {...props} quote={QUOTE} isStale={false} canPlace />,
    );
    const total = screen.getByTestId("checkout-total");
    expect(total).toHaveTextContent("525,00");
    expect(total).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("button", { name: "Valider la commande" })).toBeEnabled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows only the subtotal and the discount before a shipping is chosen", () => {
    render(
      <CheckoutSummary
        {...props}
        showShipping={false}
        quote={{ ...QUOTE, discount: 100, discountKey: "BLACK_FRIDAY" }}
        isStale={false}
        canPlace={false}
      />,
    );
    expect(screen.getByText("Remise BLACK_FRIDAY")).toBeInTheDocument();
    expect(screen.queryByTestId("checkout-total")).toBeNull();
    expect(screen.getByText("Livraison et total calculés à l'étape suivante.")).toBeInTheDocument();
  });

  it("disables placing and offers « Ajouter une carte » without a saved card", () => {
    render(<CheckoutSummary {...props} quote={QUOTE} isStale={false} canPlace needsCard />);
    expect(screen.getByRole("button", { name: "Valider la commande" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Ajouter une carte" })).toHaveAttribute(
      "href",
      "/account/card?returnTo=%2Fcheckout",
    );
  });

  it("marks stale amounts as updating and waits before placing", () => {
    render(<CheckoutSummary {...props} quote={QUOTE} isStale canPlace={false} />);
    expect(screen.getByTestId("checkout-total")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Mise à jour des montants…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Valider la commande" })).toBeDisabled();
  });

  it("shows no amount without a quote, and the error with a retry", () => {
    const { rerender } = render(
      <CheckoutSummary {...props} quote={undefined} isStale={false} canPlace={false} />,
    );
    expect(screen.queryByTestId("checkout-total")).toBeNull();
    rerender(
      <CheckoutSummary
        {...props}
        quote={undefined}
        isStale={false}
        canPlace={false}
        quoteError="Le service ne répond pas."
      />,
    );
    const alert = screen.getByRole("alert");
    expect(within(alert).getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });
});

describe("PaymentTracker", () => {
  it.each([
    [undefined, false, "Paiement en cours…"],
    [OrderStatus.PAID, false, "Paiement accepté"],
    [OrderStatus.AWAITING_PAYMENT, true, "plus de temps que prévu"],
  ])("status %s (timed out: %s) → %s", (status, isTimedOut, text) => {
    statusState.status = status;
    statusState.isTimedOut = isTimedOut;
    render(<PaymentTracker orderUuid={ORDER} />);
    expect(screen.getByRole("status")).toHaveTextContent(text);
    expect(screen.queryByRole("button", { name: "Relancer le paiement" })).toBeNull();
  });

  it("offers a retry after a refused payment", async () => {
    statusState.status = OrderStatus.PAYMENT_FAILED;
    const { container } = render(<PaymentTracker orderUuid={ORDER} />);
    expect(screen.getByRole("status")).toHaveTextContent("refusé");
    expect(screen.getByRole("button", { name: "Relancer le paiement" })).toBeEnabled();
    expect(await axe(container)).toHaveNoViolations();
  });
});
