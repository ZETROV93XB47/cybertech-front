import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import { DeliveryInfo } from "@/features/catalog/components/DeliveryInfo";
import { ProductReviewsSection } from "@/features/catalog/components/ProductReviews";
import { buildDeliveryLines, expressPromise } from "@/features/catalog/delivery";
import { NO_REVIEWS, type ProductReviews } from "@/features/catalog/reviews";
import { ExpressPromise, ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import type { ShippingOption } from "@/lib/schemas/shipping";

/** Options of the backend on 2026-10-13: 15 € standard, 25 € express, both carriers. */
const OPTIONS: readonly ShippingOption[] = [
  { provider: ShippingProvider.DHL, type: ShippingType.STANDARD, cost: 15, currency: "EUR" },
  { provider: ShippingProvider.DHL, type: ShippingType.EXPRESS, cost: 25, currency: "EUR" },
  { provider: ShippingProvider.FEDEX, type: ShippingType.STANDARD, cost: 15, currency: "EUR" },
  { provider: ShippingProvider.FEDEX, type: ShippingType.EXPRESS, cost: 25, currency: "EUR" },
];

describe("buildDeliveryLines", () => {
  it("gives one line per speed with its fee, carriers and indicative delay", () => {
    const [standard, express] = buildDeliveryLines(OPTIONS);
    expect(standard).toMatchObject({
      type: ShippingType.STANDARD,
      fromCost: 15,
      isSingleCost: true,
      providers: [ShippingProvider.DHL, ShippingProvider.FEDEX],
      delay: { minBusinessDays: 3, maxBusinessDays: 5 },
    });
    expect(express).toMatchObject({ type: ShippingType.EXPRESS, fromCost: 25 });
  });

  it("keeps the lowest fee when the carriers differ, and drops a speed nobody offers", () => {
    const lines = buildDeliveryLines([
      { provider: ShippingProvider.DHL, type: ShippingType.STANDARD, cost: 18, currency: "EUR" },
      { provider: ShippingProvider.FEDEX, type: ShippingType.STANDARD, cost: 12, currency: "EUR" },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ fromCost: 12, isSingleCost: false });
  });

  it("lists both speeds without fee when the options are unknown", () => {
    const lines = buildDeliveryLines(null);
    expect(lines.map((line) => line.type)).toEqual([ShippingType.STANDARD, ShippingType.EXPRESS]);
    expect(lines.every((line) => line.fromCost === null)).toBe(true);
  });
});

describe("expressPromise", () => {
  it.each([
    ["Monday 10:00 in Paris", "2027-01-04T09:00:00Z", ExpressPromise.TOMORROW],
    ["Thursday 14:59 in Paris", "2027-01-07T13:59:00Z", ExpressPromise.TOMORROW],
    ["Monday 15:30 in Paris", "2027-01-04T14:30:00Z", ExpressPromise.NEXT_BUSINESS_DAY],
    ["Friday 10:00 in Paris", "2027-01-08T09:00:00Z", ExpressPromise.NEXT_BUSINESS_DAY],
    ["Sunday 10:00 in Paris", "2027-01-10T09:00:00Z", ExpressPromise.NEXT_BUSINESS_DAY],
  ])("%s", (_label, iso, expected) => {
    expect(expressPromise(new Date(iso))).toBe(expected);
  });
});

describe("DeliveryInfo", () => {
  it("shows each speed, its fee, the delay and the express promise", async () => {
    const { container } = render(
      <DeliveryInfo lines={buildDeliveryLines(OPTIONS)} promise={ExpressPromise.TOMORROW} />,
    );
    const section = screen.getByRole("region", { name: "Livraison" });
    const items = within(section).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Livraison standard");
    expect(items[0]).toHaveTextContent("15,00");
    expect(items[0]).toHaveTextContent("Livré en 3 à 5 jours ouvrés");
    expect(items[0]).toHaveTextContent("avec DHL ou FedEx");
    expect(items[1]).toHaveTextContent("Commande avant 15 h, tu es livré demain");
    expect(screen.getByText("Délais indicatifs, en jours ouvrés.")).toBeInTheDocument();
    expect(screen.queryByText(/retrait/i)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says when the fees are unknown", () => {
    render(
      <DeliveryInfo lines={buildDeliveryLines(null)} promise={ExpressPromise.NEXT_BUSINESS_DAY} />,
    );
    expect(
      screen.getByText("Les frais de port s'afficheront au moment de la commande."),
    ).toBeInTheDocument();
  });
});

describe("ProductReviewsSection", () => {
  it("invites to write the first review when there is none", async () => {
    const { container } = render(
      <ProductReviewsSection
        productUuid="0193a2b4-1111-7222-8333-000000000001"
        reviews={NO_REVIEWS}
      />,
    );
    expect(screen.getByRole("region", { name: "Avis clients" })).toBeInTheDocument();
    expect(screen.getByText("Aucun avis pour l'instant")).toBeInTheDocument();
    expect(screen.getByText("Sois le premier à donner ton avis")).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Répartition des notes" })).getAllByRole("listitem"),
    ).toHaveLength(5);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the average, the distribution and the reviews", () => {
    const reviews: ProductReviews = {
      average: 4.5,
      count: 2,
      distribution: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
      items: [
        {
          uuid: "a",
          rating: 5,
          comment: "Très bon écran.",
          authorFirstName: "Camille",
          createdAt: "2026-10-14",
        },
        { uuid: "b", rating: 4, comment: null, authorFirstName: null, createdAt: "2026-10-12" },
      ],
      page: 0,
      hasMore: false,
    };
    render(
      <ProductReviewsSection
        productUuid="0193a2b4-1111-7222-8333-000000000001"
        reviews={reviews}
      />,
    );
    expect(screen.getByText("4,5 sur 5")).toBeInTheDocument();
    expect(screen.getByText("2 avis")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Avis des clients" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByRole("img", { name: "Note : 5 sur 5" })).toBeInTheDocument();
  });
});
