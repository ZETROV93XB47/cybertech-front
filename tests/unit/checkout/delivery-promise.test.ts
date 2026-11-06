/**
 * Feature 003, Phase 8 (T072) — the delivery promise repeated in the checkout summary, and the
 * contents shown on a row of « Mes commandes ».
 */
import { describe, expect, it } from "vitest";

import { chosenDelayText } from "@/features/checkout/delivery-promise";
import { buildShippingChoices } from "@/features/checkout/shipping-choices";
import { ORDERS_MESSAGES } from "@/features/orders/messages";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";

/** Standard DHL (front estimate) and express FedEx, on a weekday morning. */
const CHOICES = buildShippingChoices(
  [
    { provider: ShippingProvider.DHL, type: ShippingType.STANDARD, cost: 15, currency: "EUR" },
    { provider: ShippingProvider.FEDEX, type: ShippingType.EXPRESS, cost: 25, currency: "EUR" },
  ],
  new Date("2026-10-14T10:00:00Z"),
);

describe("chosenDelayText", () => {
  it("gives nothing before a shipping is chosen", () => {
    expect(chosenDelayText(CHOICES, null)).toBeNull();
  });

  it("repeats the delay of the chosen card", () => {
    expect(
      chosenDelayText(CHOICES, { type: ShippingType.STANDARD, provider: ShippingProvider.DHL }),
    ).toMatch(/jours/);
    expect(
      chosenDelayText(CHOICES, { type: ShippingType.EXPRESS, provider: ShippingProvider.FEDEX }),
    ).not.toBeNull();
  });

  it("gives nothing for a pair the backend does not offer", () => {
    expect(
      chosenDelayText(CHOICES, { type: ShippingType.EXPRESS, provider: ShippingProvider.DHL }),
    ).toBeNull();
  });
});

describe("ORDERS_MESSAGES.productsPreview", () => {
  it("names the first product and counts the others", () => {
    expect(ORDERS_MESSAGES.productsPreview("Écran", 0)).toBe("Écran");
    expect(ORDERS_MESSAGES.productsPreview("Écran", 1)).toBe("Écran et 1 autre produit");
    expect(ORDERS_MESSAGES.productsPreview("Écran", 2)).toBe("Écran et 2 autres produits");
  });
});
