/**
 * « Passer commande » of the cart summary and checkout issue banner (feature 003, T032).
 */
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

import { CartIssueBanner } from "@/features/cart/components/CartIssueBanner";
import { CartSummary } from "@/features/cart/components/CartSummary";
import { CartIssue, CartLineStatus, CartSource } from "@/lib/enums/cart";
import type { CartLine, CartView } from "@/lib/schemas/cart";

import { fakeUuids } from "../../helpers/products";

const [UUID = ""] = fakeUuids(1);

// The discount block has its own tests (`tests/unit/checkout/discount-block.test.tsx`).
vi.mock("@/features/checkout/components/CartDiscountBlock", () => ({
  CartDiscountBlock: () => null,
}));

/**
 * Builds a cart with one line.
 *
 * @param source - Guest or account cart.
 * @param status - Status of the line.
 * @returns The cart view.
 */
function cartOf(source: CartSource, status: CartLineStatus = CartLineStatus.OK): CartView {
  const line: CartLine = {
    productUuid: UUID,
    name: "PC",
    imageUrl: null,
    unitPrice: 999,
    quantity: 1,
    lineTotal: 999,
    availableStock: 5,
    status,
  };
  return {
    source,
    cartUuid: null,
    lines: [line],
    total: 999,
    totalIsEstimate: source === CartSource.GUEST,
    itemCount: 1,
  };
}

describe("CartSummary — Passer commande", () => {
  it("leads a signed-in user to the checkout", async () => {
    const { container } = render(
      <CartSummary
        cart={cartOf(CartSource.ACCOUNT)}
        campaigns={[]}
        disabled={false}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: "Passer commande" })).toHaveAttribute(
      "href",
      "/checkout",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("leads a visitor to the sign-in page coming back to the checkout", () => {
    render(
      <CartSummary
        cart={cartOf(CartSource.GUEST)}
        campaigns={[]}
        disabled={false}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: "Passer commande" })).toHaveAttribute(
      "href",
      "/login?callbackUrl=%2Fcheckout",
    );
  });

  it("is disabled with a hint while a line is out of stock", () => {
    render(
      <CartSummary
        cart={cartOf(CartSource.ACCOUNT, CartLineStatus.INSUFFICIENT_STOCK)}
        campaigns={[]}
        disabled={false}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Passer commande" })).toBeDisabled();
    expect(screen.getByText(/Ajuste les articles signalés/)).toBeInTheDocument();
  });
});

describe("CartIssueBanner", () => {
  it.each([
    [CartIssue.STOCK, /plus assez de stock/],
    [CartIssue.EMPTY, /vidé entre-temps/],
  ])("explains %s as an alert", (issue, text) => {
    render(<CartIssueBanner issue={issue} />);
    expect(screen.getByRole("alert")).toHaveTextContent(text);
  });
});
