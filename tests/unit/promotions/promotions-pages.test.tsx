/**
 * Feature 004, US4 (T028) — promotions pages: campaign card, list without the `NONE` campaign,
 * empty state, campaign details and the « campagne introuvable » page.
 */
import { screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import CampaignPage from "@/app/(shop)/promotions/[key]/page";
import CampaignNotFound from "@/app/(shop)/promotions/[key]/not-found";
import PromotionsPage from "@/app/(shop)/promotions/page";
import { toCampaignView } from "@/features/promotions/campaign-view";
import { CampaignCard } from "@/features/promotions/components/CampaignCard";
import { CampaignDetail } from "@/features/promotions/components/CampaignDetail";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import type { ActiveDiscount } from "@/lib/schemas/discount";

import { API } from "../../helpers/cart";
import { renderWithProviders } from "../../helpers/providers";
import { server } from "../../msw/server";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
vi.mock("next/navigation", () => ({ notFound }));

/** BLACK_FRIDAY as the backend sends it: −20 %, no condition. */
const BLACK_FRIDAY: ActiveDiscount = {
  discountKey: "BLACK_FRIDAY",
  calculationType: DiscountCalculationType.PERCENTAGE,
  percentage: 20,
  fixedAmount: null,
  minOrderAmount: null,
  maxDiscountAmount: null,
  startsAt: null,
  endsAt: null,
};

/** The « aucune remise » campaign the backend also returns. */
const NO_DISCOUNT: ActiveDiscount = {
  ...BLACK_FRIDAY,
  discountKey: "NO_DISCOUNT",
  calculationType: DiscountCalculationType.NONE,
  percentage: null,
};

/** A fixed amount with every condition. */
const WINTER_SALES: ActiveDiscount = {
  ...BLACK_FRIDAY,
  discountKey: "WINTER_SALES",
  calculationType: DiscountCalculationType.FIXED_AMOUNT,
  percentage: null,
  fixedAmount: 10,
  minOrderAmount: 100,
  maxDiscountAmount: 50,
  endsAt: "2027-02-28T23:59:59",
};

/**
 * Serves the active campaigns.
 *
 * @param discounts - Campaigns returned by `GET /discounts/active`.
 */
function serveDiscounts(discounts: readonly ActiveDiscount[]): void {
  server.use(http.get(`${API}/discounts/active`, () => HttpResponse.json(discounts)));
}

describe("CampaignCard", () => {
  it("shows the photo, name, benefit and conditions, and links to the campaign page", async () => {
    const { container } = renderWithProviders(
      <CampaignCard campaign={toCampaignView(WINTER_SALES)} />,
    );
    const card = screen.getByRole("article");
    expect(within(card).getByRole("img")).toHaveAccessibleName(/enneigée/);
    expect(within(card).getByRole("link", { name: "Soldes d'hiver" })).toHaveAttribute(
      "href",
      "/promotions/WINTER_SALES",
    );
    expect(within(card).getByTestId("campaign-benefit")).toHaveTextContent(/^−10,00\s€$/);
    expect(within(card).getAllByRole("listitem")).toHaveLength(3);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("PromotionsPage", () => {
  it("lists the campaigns without « aucune remise »", async () => {
    serveDiscounts([BLACK_FRIDAY, NO_DISCOUNT, WINTER_SALES]);
    const { container } = renderWithProviders(<>{await PromotionsPage()}</>);
    const list = screen.getByRole("list", { name: "Campagnes en cours" });
    expect(
      within(list)
        .getAllByRole("heading")
        .map((heading) => heading.textContent),
    ).toEqual(["Black Friday", "Soldes d'hiver"]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the illustrated empty state with « Parcourir le catalogue »", async () => {
    serveDiscounts([NO_DISCOUNT]);
    renderWithProviders(<>{await PromotionsPage()}</>);
    expect(screen.getByRole("heading", { name: "Aucune promotion en ce moment" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Parcourir le catalogue" })).toHaveAttribute(
      "href",
      "/products",
    );
  });
});

describe("CampaignDetail", () => {
  it("shows the benefit, the minimum, the cap, the end date and both actions", async () => {
    const { container } = renderWithProviders(
      <CampaignDetail campaign={toCampaignView(WINTER_SALES)} />,
    );
    expect(screen.getByTestId("campaign-benefit")).toHaveTextContent(/^−10,00\s€$/);
    const conditions = screen.getByRole("region", { name: "Conditions" });
    expect(
      within(conditions)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringMatching(/^Dès 100,00\s€ d'achat$/),
      expect.stringMatching(/^Remise plafonnée à 50,00\s€$/),
      "Jusqu'au 28 février",
    ]);
    expect(screen.getByRole("button", { name: "Appliquer à mon panier" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Voir le catalogue" })).toHaveAttribute(
      "href",
      "/products",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says « Sans date de fin » for a campaign without end", () => {
    renderWithProviders(<CampaignDetail campaign={toCampaignView(BLACK_FRIDAY)} />);
    expect(screen.getByText("Sans date de fin")).toBeVisible();
    expect(screen.getByTestId("campaign-benefit")).toHaveTextContent("−20 %");
  });
});

describe("CampaignPage", () => {
  it("finds an active campaign by its key", async () => {
    serveDiscounts([BLACK_FRIDAY]);
    renderWithProviders(
      <>{await CampaignPage({ params: Promise.resolve({ key: "BLACK_FRIDAY" }) })}</>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Black Friday" })).toBeVisible();
  });

  it.each(["INCONNUE", "black friday!", "NO_DISCOUNT"])(
    "answers « introuvable » for %s",
    async (key) => {
      serveDiscounts([BLACK_FRIDAY, NO_DISCOUNT]);
      await expect(CampaignPage({ params: Promise.resolve({ key }) })).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
    },
  );

  it("has a « campagne introuvable ou terminée » page linking to the promotions", async () => {
    const { container } = renderWithProviders(<CampaignNotFound />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Campagne introuvable ou terminée" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Voir les promotions en cours" })).toHaveAttribute(
      "href",
      "/promotions",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
