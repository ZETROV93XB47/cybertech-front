/**
 * Components of « Mes commandes » (feature 003, T044): list, filter, breakdown, timeline,
 * actions and cancellation dialog, edit form and product search, account navigation, and the
 * link of the payment follow-up to the order detail.
 *
 * @see specs/003-account-orders/spec.md US3
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountNav } from "@/features/account/components/AccountNav";
import { PaymentTracker } from "@/features/checkout/components/PaymentTracker";
import { buildShippingChoices } from "@/features/checkout/shipping-choices";
import { OrderActions } from "@/features/orders/components/OrderActions";
import { OrderBreakdown } from "@/features/orders/components/OrderBreakdown";
import { OrderEditForm } from "@/features/orders/components/OrderEditForm";
import { OrderList } from "@/features/orders/components/OrderList";
import { OrderStatusFilter } from "@/features/orders/components/OrderStatusFilter";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import type { OrderActionOutcome, UpdateOrderInput } from "@/features/orders/hooks/useOrderActions";
import { buildOrderTimeline } from "@/features/orders/order-timeline";
import { toOrderSummaryRow, toOrderView } from "@/features/orders/order-view";
import { parseFlatAddress } from "@/lib/address";
import { BffError } from "@/lib/api/bff-client";
import { ACCOUNT_PATHS, orderEditPath, orderPath } from "@/lib/constants/routes";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { OrderActionOutcomeKind, OrderStatus } from "@/lib/enums/order";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import type { OrderChangeResult } from "@/lib/schemas/order";

import { renderWithProviders } from "../../helpers/providers";
import { renderWithQuery } from "../../helpers/render";
import { server } from "../../msw/server";

import {
  FLAT_ADDRESS,
  OLD_ORDER,
  ORDER_UUID,
  PRODUCT_A,
  PRODUCT_B,
  PRODUCT_C,
  RECENT_ORDER,
} from "./fixtures";

const refresh = vi.fn();
const navigation = vi.hoisted(() => ({ pathname: "/account/orders" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
  usePathname: () => navigation.pathname,
}));

const actions = vi.hoisted(() => ({
  cancel: vi.fn<() => Promise<OrderActionOutcome>>(),
  update: vi.fn<(input: UpdateOrderInput) => Promise<OrderActionOutcome>>(),
}));
vi.mock("@/features/orders/hooks/useOrderActions", () => ({
  useCancelOrder: () => ({ run: actions.cancel, isPending: false }),
  useUpdateOrder: () => ({ run: actions.update, isPending: false }),
}));
vi.mock("@/features/checkout/hooks/useOrderStatus", () => ({
  useOrderStatus: () => ({
    status: OrderStatus.PAID,
    isTimedOut: false,
    error: null,
    restart: vi.fn(),
  }),
  useRetryPayment: () => ({ retry: vi.fn(), isPending: false, error: null }),
}));

const CHOICES = buildShippingChoices(
  [
    { type: ShippingType.STANDARD, provider: ShippingProvider.DHL, cost: 5, currency: "EUR" },
    { type: ShippingType.EXPRESS, provider: ShippingProvider.FEDEX, cost: 25, currency: "EUR" },
  ],
  new Date("2026-10-14T08:00:00Z"),
);

/** Result of a successful edit. */
const EDITED: OrderChangeResult = {
  uuid: ORDER_UUID,
  status: OrderStatus.PAID,
  total: 525,
  refunded: 0,
};

beforeEach(() => {
  refresh.mockReset();
  actions.cancel.mockReset();
  actions.update.mockReset();
});

describe("OrderList and OrderStatusFilter", () => {
  it("lists date, status, item count and total, linked to the detail", async () => {
    const { container } = render(<OrderList rows={[toOrderSummaryRow(RECENT_ORDER)]} />);
    const row = screen.getByRole("link", { name: /Commande n° 00000000/ });
    expect(row).toHaveAttribute("href", orderPath(ORDER_UUID));
    expect(row).toHaveTextContent("Passée le 14 octobre 2026");
    expect(row).toHaveTextContent("Payée");
    expect(row).toHaveTextContent("3 articles");
    expect(row).toHaveTextContent(/425,00/);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("filters through a GET form that works without JavaScript", async () => {
    const { container } = render(<OrderStatusFilter selected={[OrderStatus.PAID]} />);
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", ACCOUNT_PATHS.orders);
    expect(screen.getByRole("checkbox", { name: "Payée" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Livrée" })).not.toBeChecked();
    expect(screen.getByRole("link", { name: "Tout afficher" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("OrderBreakdown", () => {
  it("shows subtotal, discount with its key and shipping", () => {
    const view = toOrderView(RECENT_ORDER, null);
    render(<OrderBreakdown breakdown={view.breakdown} total={view.total} refunded={0} />);
    expect(screen.getByText("Remise BLACK_FRIDAY")).toBeInTheDocument();
    expect(screen.getByText("Sous-total")).toBeInTheDocument();
    expect(screen.getByTestId("order-total")).toHaveTextContent(/425,00/);
    expect(screen.queryByText("Remboursé")).not.toBeInTheDocument();
  });

  it("shows only the total of an old order, without empty values nor zeros", () => {
    render(<OrderBreakdown breakdown={null} total={250} refunded={100} />);
    expect(screen.queryByText("Sous-total")).not.toBeInTheDocument();
    expect(screen.queryByText("Livraison")).not.toBeInTheDocument();
    expect(screen.getByText(/seul le total payé est connu/)).toBeInTheDocument();
    expect(screen.getByText("Remboursé")).toBeInTheDocument();
    expect(screen.queryByText(/^0,00\s€$/)).not.toBeInTheDocument();
  });
});

describe("OrderTimeline", () => {
  it("marks the current step for screen readers", async () => {
    const { container } = renderWithProviders(
      <OrderTimeline timeline={buildOrderTimeline(OrderStatus.SHIPPED)} />,
    );
    const current = screen.getByRole("listitem", { current: "step" });
    expect(current).toHaveTextContent("Expédiée");
    expect(current).toHaveTextContent("étape actuelle");
    expect(screen.queryByTestId("order-outcome")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("announces an outcome as an outcome, not as a step", () => {
    renderWithProviders(<OrderTimeline timeline={buildOrderTimeline(OrderStatus.CANCELED)} />);
    expect(screen.getByTestId("order-outcome")).toHaveTextContent("Issue : Commande annulée");
    const list = screen.getByRole("list", { name: "Étapes de la commande" });
    expect(within(list).queryByText(/annulée/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("listitem", { current: "step" })).not.toBeInTheDocument();
  });
});

describe("OrderActions and CancelOrderDialog", () => {
  it("offers only the allowed actions", () => {
    const { rerender } = render(<OrderActions orderUuid={ORDER_UUID} canEdit canCancel={false} />);
    expect(screen.getByRole("link", { name: "Modifier la commande" })).toHaveAttribute(
      "href",
      orderEditPath(ORDER_UUID),
    );
    expect(screen.queryByRole("button", { name: "Annuler la commande" })).not.toBeInTheDocument();
    rerender(<OrderActions orderUuid={ORDER_UUID} canEdit={false} canCancel={false} />);
    expect(screen.getByText(/ne peut plus être modifiée ni annulée/)).toBeInTheDocument();
  });

  it("cancels after confirmation", async () => {
    actions.cancel.mockResolvedValue({ kind: OrderActionOutcomeKind.DONE, result: EDITED });
    render(<OrderActions orderUuid={ORDER_UUID} canEdit={false} canCancel />);
    await userEvent.click(screen.getByRole("button", { name: "Annuler la commande" }));
    const dialog = await screen.findByRole("dialog");
    expect(await axe(dialog)).toHaveNoViolations();
    await userEvent.click(within(dialog).getByRole("button", { name: "Oui, annuler" }));
    expect(actions.cancel).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Ta commande est annulée.")).toBeInTheDocument();
  });

  it("keeps the order and returns the focus when the dialog is dismissed", async () => {
    render(<OrderActions orderUuid={ORDER_UUID} canEdit={false} canCancel />);
    const trigger = screen.getByRole("button", { name: "Annuler la commande" });
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("button", { name: "Garder ma commande" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
    expect(actions.cancel).not.toHaveBeenCalled();
  });

  it("explains a refused refund and reads the order again", async () => {
    actions.cancel.mockResolvedValue({
      kind: OrderActionOutcomeKind.FAILED,
      error: new BffError(FrontErrorCode.REFUND_FAILED, 409, "refund"),
    });
    render(<OrderActions orderUuid={ORDER_UUID} canEdit={false} canCancel />);
    await userEvent.click(screen.getByRole("button", { name: "Annuler la commande" }));
    await userEvent.click(await screen.findByRole("button", { name: "Oui, annuler" }));
    expect(await screen.findByText(/remboursement n'a pas abouti/)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });
});

/**
 * Renders the edit form of an order.
 *
 * @param order - Order to edit.
 * @returns The render result.
 */
function renderEditForm(order = RECENT_ORDER): ReturnType<typeof renderWithQuery> {
  return renderWithQuery(
    <OrderEditForm
      order={order}
      address={parseFlatAddress(FLAT_ADDRESS)}
      choices={CHOICES}
      discountKey="BLACK_FRIDAY"
    />,
  );
}

describe("OrderEditForm", () => {
  it("says the original discount is kept and refuses to save without a payment method", async () => {
    const { container } = renderEditForm();
    expect(
      screen.getByText("La réduction d'origine (BLACK_FRIDAY) est conservée."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));
    expect(screen.getByText(/Choisis le moyen de paiement/)).toBeInTheDocument();
    expect(actions.update).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("cannot remove the last line and points to the cancellation", () => {
    renderEditForm({ ...RECENT_ORDER, orderItems: RECENT_ORDER.orderItems.slice(0, 1) });
    expect(screen.getByRole("button", { name: "Retirer Portable" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Annuler la commande" })).toHaveAttribute(
      "href",
      orderPath(ORDER_UUID),
    );
  });

  it("saves the lines and shows the old and new totals", async () => {
    actions.update.mockResolvedValue({ kind: OrderActionOutcomeKind.DONE, result: EDITED });
    renderEditForm();
    await userEvent.click(screen.getByRole("radio", { name: "Visa" }));
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));
    const [input] = actions.update.mock.calls[0] ?? [];
    expect(input?.body.items).toEqual([
      { productUuid: PRODUCT_A, quantity: 2 },
      { productUuid: PRODUCT_B, quantity: 1 },
    ]);
    expect(await screen.findByTestId("edit-previous-total")).toHaveTextContent(/425,00/);
    expect(screen.getByTestId("edit-new-total")).toHaveTextContent(/525,00/);
    expect(screen.getByText(/La différence est débitée/)).toBeInTheDocument();
  });

  it("flags the increased line on a stock refusal and keeps the other changes", async () => {
    actions.update.mockResolvedValue({
      kind: OrderActionOutcomeKind.FAILED,
      error: new BffError(FrontErrorCode.INSUFFICIENT_STOCK, 409, "stock"),
    });
    renderEditForm();
    await userEvent.click(screen.getByRole("radio", { name: "Visa" }));
    const increase = screen.getAllByRole("button", { name: "Ajouter une unité" })[1];
    if (increase) {
      await userEvent.click(increase);
    }
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));
    expect(await screen.findByText("Stock insuffisant pour cette quantité.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Visa" })).toBeChecked();
    expect(screen.getByRole("alert")).toHaveTextContent(/plus assez de stock/);
  });
});

describe("ProductPicker", () => {
  it("adds a product found by search, with the keyboard", async () => {
    server.use(
      http.get("*/api/search", () =>
        HttpResponse.json({
          results: [
            {
              uuid: PRODUCT_C,
              name: "Souris sans fil",
              brand: "ASUS",
              category: "COMPUTER",
              price: 30,
              imageUrl: null,
            },
          ],
        }),
      ),
    );
    renderEditForm();
    await userEvent.type(screen.getByLabelText("Ajouter un produit"), "souris");
    const add = await screen.findByRole("button", { name: "Ajouter Souris sans fil" });
    add.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("button", { name: "Retirer Souris sans fil" })).toBeEnabled();
    expect(screen.getByText(/^Ajouté/)).toBeInTheDocument();
  });
});

describe("account navigation and payment follow-up", () => {
  it("marks the current account section", async () => {
    navigation.pathname = "/account/orders/abc";
    const { container } = render(<AccountNav />);
    expect(screen.getByRole("link", { name: "Mes commandes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Ma wishlist" })).not.toHaveAttribute("aria-current");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("links the confirmation to the order detail", () => {
    renderWithQuery(<PaymentTracker orderUuid={ORDER_UUID} />);
    expect(screen.getByRole("link", { name: "Voir ma commande" })).toHaveAttribute(
      "href",
      orderPath(ORDER_UUID),
    );
  });

  it("hides the links inside the order detail", () => {
    renderWithQuery(<PaymentTracker orderUuid={ORDER_UUID} withLinks={false} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the old order view without a breakdown", () => {
    expect(toOrderView(OLD_ORDER, null).breakdown).toBeNull();
  });
});
