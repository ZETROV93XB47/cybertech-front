/**
 * Feature 004, US3 (T040) — home carousel: WAI-ARIA carousel pattern, controls, dots, live region,
 * links of the shown slide, inert hidden slides, broken photo and transition per effects level.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import { HomeCarousel } from "@/features/home/components/HomeCarousel";
import { buildHomeSlides } from "@/features/home/home-slides";
import { CATEGORY_ORDER } from "@/lib/constants/categories";
import { CategoryKey } from "@/lib/enums/category-key";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import { SlideTransition } from "@/lib/enums/home";
import { EffectsLevel } from "@/lib/enums/theme";

import { renderWithProviders, type ProviderOptions } from "../../helpers/providers";

/** Five categories and BLACK_FRIDAY: six slides, the campaign second. */
const SLIDES = buildHomeSlides(CATEGORY_ORDER, { [CategoryKey.COMPUTER]: 576 }, [
  {
    discountKey: "BLACK_FRIDAY",
    calculationType: DiscountCalculationType.PERCENTAGE,
    percentage: 20,
    fixedAmount: null,
    minOrderAmount: null,
    maxDiscountAmount: null,
    startsAt: null,
    endsAt: null,
  },
]);

/**
 * Renders the carousel.
 *
 * @param options - Effects level and system setting.
 * @param slides - Slides to show.
 * @returns The render result.
 */
function renderCarousel(options: ProviderOptions = {}, slides = SLIDES) {
  return renderWithProviders(<HomeCarousel slides={slides} />, options);
}

/** The slide groups, in order. */
function slideGroups(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[aria-roledescription="diapositive"]')];
}

describe("HomeCarousel", () => {
  it("follows the carousel pattern", async () => {
    const { container } = renderCarousel();
    const carousel = screen.getByRole("region", { name: "À la une" });
    expect(carousel).toHaveAttribute("aria-roledescription", "carrousel");
    expect(slideGroups().map((group) => group.getAttribute("aria-label"))).toEqual(
      SLIDES.map((_, index) => `${index + 1} sur ${SLIDES.length}`),
    );
    expect(slideGroups().every((group) => group.getAttribute("role") === "group")).toBe(true);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("puts the pause button first in the tab order", async () => {
    renderCarousel();
    await userEvent.setup().tab();
    expect(document.activeElement).toHaveAccessibleName("Mettre en pause le défilement");
  });

  it("toggles the pause button label and makes the live region polite", async () => {
    const user = userEvent.setup();
    renderCarousel();
    const live = slideGroups()[0]?.parentElement;
    expect(live).toHaveAttribute("aria-live", "off");
    await user.click(screen.getByRole("button", { name: "Mettre en pause le défilement" }));
    expect(screen.getByRole("button", { name: "Lancer le défilement" })).toBeVisible();
    expect(live).toHaveAttribute("aria-live", "polite");
  });

  it("moves with previous, next and the dots, marking the current dot", async () => {
    const user = userEvent.setup();
    renderCarousel();
    await user.click(screen.getByRole("button", { name: "Diapositive suivante" }));
    expect(screen.getByRole("button", { name: "Aller à la diapositive 2" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Diapositive précédente" }));
    await user.click(screen.getByRole("button", { name: "Aller à la diapositive 4" }));
    const current = screen.getAllByRole("button", { current: true });
    expect(current.map((dot) => dot.getAttribute("aria-label"))).toEqual([
      "Aller à la diapositive 4",
    ]);
  });

  it("links the image and the CTA of the shown slide; the others are inert", async () => {
    const user = userEvent.setup();
    renderCarousel();
    await user.click(screen.getByRole("button", { name: "Diapositive suivante" }));
    const [first, campaign] = slideGroups();
    expect(first).toHaveAttribute("inert");
    expect(campaign).not.toHaveAttribute("inert");
    const links = within(campaign!).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/promotions/BLACK_FRIDAY",
      "/promotions/BLACK_FRIDAY",
    ]);
    expect(within(campaign!).getByRole("link", { name: "Voir la promotion" })).toBe(links[1]);
  });

  it("shows the title, tagline, count and CTA of a category slide", () => {
    renderCarousel();
    const first = slideGroups()[0]!;
    expect(within(first).getByRole("heading", { name: "Ordinateurs portables" })).toBeVisible();
    expect(first).toHaveTextContent("576 produits");
    expect(
      within(first).getByRole("link", { name: "Voir les ordinateurs portables" }),
    ).toHaveAttribute("href", "/products?category=COMPUTER");
  });

  it("keeps the title and the link when the photo fails to load", () => {
    renderCarousel();
    const first = slideGroups()[0]!;
    fireEvent.error(within(first).getByRole("img"));
    expect(within(first).queryByRole("img")).not.toBeInTheDocument();
    expect(within(first).getByRole("heading", { name: "Ordinateurs portables" })).toBeVisible();
    expect(within(first).getAllByRole("link")).toHaveLength(2);
  });

  it("has no dots nor controls with a single slide", () => {
    renderCarousel({}, SLIDES.slice(0, 1));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(slideGroups()).toHaveLength(1);
  });

  it.each([
    ["FULL", { effects: EffectsLevel.FULL }, SlideTransition.FADE, true],
    ["REDUCED", { effects: EffectsLevel.REDUCED }, SlideTransition.INSTANT, false],
    ["OFF", { effects: EffectsLevel.OFF }, SlideTransition.INSTANT, false],
    ["FULL with reduced motion", { reducedMotion: true }, SlideTransition.INSTANT, false],
  ] as const)("%s: %s switch, pause button %s", (_label, options, transition, hasPause) => {
    renderCarousel(options);
    expect(slideGroups().every((group) => group.dataset.transition === transition)).toBe(true);
    expect(screen.queryByRole("button", { name: "Mettre en pause le défilement" }) !== null).toBe(
      hasPause,
    );
    expect(screen.getByRole("button", { name: "Diapositive suivante" })).toBeEnabled();
  });
});
