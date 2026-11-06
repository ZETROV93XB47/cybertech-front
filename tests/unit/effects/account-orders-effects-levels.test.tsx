/**
 * Feature 003, Phase 8 (T077) — the new effects of the account and order pages at every effects
 * level: the checkout step unfolding, the cross-fade of the checkout total, the animated success
 * check, the tilting line photos, and the CSS cascades of the order list and of the timeline.
 * Only the full level without `prefers-reduced-motion` moves; every other situation keeps a plain
 * fade or a still element (constitution IX).
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CheckoutStepPanel } from "@/features/checkout/components/CheckoutStepPanel";
import { CheckoutSummary } from "@/features/checkout/components/CheckoutSummary";
import type { QuoteView } from "@/features/checkout/quote-view";
import { EditSavedPanel } from "@/features/orders/components/EditSavedPanel";
import { LineThumbnail } from "@/features/orders/components/LineThumbnail";
import { OrderList } from "@/features/orders/components/OrderList";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import { buildOrderTimeline } from "@/features/orders/order-timeline";
import { toOrderSummaryRow } from "@/features/orders/order-view";
import { CartLineStatus, CartSource } from "@/lib/enums/cart";
import { CheckoutStep } from "@/lib/enums/checkout";
import { CheckoutStepState } from "@/lib/enums/checkout-step-state";
import { EnterAnimation } from "@/lib/enums/enter-animation";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { OrderChangeKind, OrderStatus } from "@/lib/enums/order";
import { EffectsLevel } from "@/lib/enums/theme";
import type { CartView } from "@/lib/schemas/cart";

import { renderWithProviders, type ProviderOptions } from "../../helpers/providers";
import { RECENT_ORDER } from "../orders/fixtures";

vi.mock("next/navigation", () => ({
  usePathname: () => "/checkout",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

/** Every effects situation, with the entrance it must give. */
const LEVELS: readonly (readonly [string, ProviderOptions, EntranceMode])[] = [
  ["FULL", { effects: EffectsLevel.FULL }, EntranceMode.MOVE],
  ["REDUCED", { effects: EffectsLevel.REDUCED }, EntranceMode.FADE],
  ["OFF", { effects: EffectsLevel.OFF }, EntranceMode.FADE],
  [
    "FULL with system reduced motion",
    { effects: EffectsLevel.FULL, reducedMotion: true },
    EntranceMode.FADE,
  ],
];

/** Quote shown by the summary. */
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

/** Cart of one line, with a photo. */
const CART: CartView = {
  source: CartSource.ACCOUNT,
  cartUuid: null,
  lines: [
    {
      productUuid: "0190a1b2-0000-7000-8000-000000000001",
      name: "Écran 27 pouces",
      imageUrl: null,
      unitPrice: 500,
      quantity: 1,
      lineTotal: 500,
      status: CartLineStatus.OK,
      availableStock: 5,
      category: "MONITOR",
    },
  ],
  total: 500,
  totalIsEstimate: false,
  itemCount: 1,
};

describe.each(LEVELS)("effects %s", (_label, options, expected) => {
  const isMove = expected === EntranceMode.MOVE;

  it(`the open checkout step unfolds in ${expected} mode`, () => {
    renderWithProviders(
      <CheckoutStepPanel
        step={CheckoutStep.ADDRESS}
        position={1}
        total={3}
        state={CheckoutStepState.CURRENT}
        summary={null}
        onEdit={vi.fn()}
      >
        <p>Formulaire</p>
      </CheckoutStepPanel>,
      options,
    );
    expect(screen.getByText("Formulaire").closest("[data-entrance]")).toHaveAttribute(
      "data-entrance",
      expected,
    );
  });

  it(`the checkout total cross-fades in ${expected} mode`, () => {
    renderWithProviders(
      <CheckoutSummary
        cart={CART}
        quote={QUOTE}
        showShipping
        deliveryPromise={null}
        discountBlock={null}
        needsCard={false}
        isStale={false}
        quoteError={null}
        onRetry={vi.fn()}
        canPlace
        isPlacing={false}
        onPlace={vi.fn()}
        message={null}
      />,
      options,
    );
    const total = screen.getByTestId("checkout-total");
    expect(total.querySelector("[data-entrance]")).toHaveAttribute("data-entrance", expected);
  });

  it(`the success check of a saved edit appears in ${expected} mode`, () => {
    const { container } = renderWithProviders(
      <EditSavedPanel
        orderUuid={RECENT_ORDER.uuid}
        saved={{
          previousTotal: 425,
          newTotal: 425,
          change: OrderChangeKind.UNCHANGED,
          refunded: 0,
        }}
      />,
      options,
    );
    expect(container.querySelector("[data-success-mark]")).toHaveAttribute(
      "data-entrance",
      expected,
    );
  });

  it(`a line photo ${isMove ? "tilts" : "stays flat"} under the pointer`, () => {
    const { container } = renderWithProviders(
      <LineThumbnail src={null} category="MONITOR" />,
      options,
    );
    expect(container.querySelector("[data-tilt]") !== null).toBe(isMove);
  });

  it("the order rows and the timeline steps enter through the CSS cascade", () => {
    renderWithProviders(<OrderList rows={[toOrderSummaryRow(RECENT_ORDER)]} />, options);
    renderWithProviders(
      <OrderTimeline timeline={buildOrderTimeline(OrderStatus.SHIPPED)} />,
      options,
    );
    const row = screen.getByRole("list", { name: "Liste de tes commandes" }).firstElementChild;
    const steps = screen.getByRole("list", { name: "Étapes de la commande" }).children;
    // The CSS keeps the rise at full effects and turns it into a fade otherwise (globals.css).
    expect(row).toHaveClass(EnterAnimation.RISE);
    expect([...steps].every((step) => step.classList.contains(EnterAnimation.RISE))).toBe(true);
  });
});
