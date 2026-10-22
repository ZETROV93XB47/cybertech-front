/**
 * Feature 004, Polish (T064) — the new effects of the feature at every effects level: the
 * « Catalogue » panel drop, the home carousel cross-fade and autoplay, and the campaign card tilt.
 * Only the full level without `prefers-reduced-motion` animates; every other situation gives the
 * static version (constitution IX, FR-010).
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MainNav } from "@/components/layout/MainNav";
import { HomeCarousel } from "@/features/home/components/HomeCarousel";
import { buildHomeSlides } from "@/features/home/home-slides";
import { toCampaignView } from "@/features/promotions/campaign-view";
import { CampaignCard } from "@/features/promotions/components/CampaignCard";
import { CATEGORY_ORDER } from "@/lib/constants/categories";
import { CategoryKey } from "@/lib/enums/category-key";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { CarouselPlayback, SlideTransition } from "@/lib/enums/home";
import { EffectsLevel } from "@/lib/enums/theme";
import type { ActiveDiscount } from "@/lib/schemas/discount";

import { renderWithProviders, type ProviderOptions } from "../../helpers/providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

/** Whether a situation runs the animated version of the effects. */
enum Motion {
  ANIMATED = "animated",
  STATIC = "static",
}

/** Every effects situation, with the version it must give. */
const LEVELS: readonly (readonly [string, ProviderOptions, Motion])[] = [
  ["FULL", { effects: EffectsLevel.FULL }, Motion.ANIMATED],
  ["REDUCED", { effects: EffectsLevel.REDUCED }, Motion.STATIC],
  ["OFF", { effects: EffectsLevel.OFF }, Motion.STATIC],
  [
    "FULL with system reduced motion",
    { effects: EffectsLevel.FULL, reducedMotion: true },
    Motion.STATIC,
  ],
];

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

/** Five categories and BLACK_FRIDAY: six slides. */
const SLIDES = buildHomeSlides(CATEGORY_ORDER, {}, [BLACK_FRIDAY]);

/** The carousel slide groups, in order. */
function slideGroups(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[aria-roledescription="diapositive"]')];
}

describe.each(LEVELS)("effects %s", (_label, options, motion) => {
  const isAnimated = motion === Motion.ANIMATED;

  it(`the « Catalogue » panel opens ${motion}`, async () => {
    renderWithProviders(<MainNav categories={[CategoryKey.COMPUTER]} counts={{}} />, options);
    await userEvent.setup().click(screen.getByRole("button", { name: "Catalogue" }));
    const list = await screen.findByRole("list", { name: "Catégories du catalogue" });
    expect(list.closest("[data-entrance]")).toHaveAttribute(
      "data-entrance",
      isAnimated ? EntranceMode.MOVE : EntranceMode.FADE,
    );
  });

  it(`the carousel slides switch ${motion}`, () => {
    renderWithProviders(<HomeCarousel slides={SLIDES} />, options);
    const expected = isAnimated ? SlideTransition.FADE : SlideTransition.INSTANT;
    expect(slideGroups().every((group) => group.dataset.transition === expected)).toBe(true);
  });

  it(`the carousel ${isAnimated ? "rotates by itself" : "never rotates by itself"}`, () => {
    renderWithProviders(<HomeCarousel slides={SLIDES} />, options);
    const carousel = screen.getByRole("region", { name: "À la une" });
    expect(carousel).toHaveAttribute(
      "data-playback",
      isAnimated ? CarouselPlayback.PLAYING : CarouselPlayback.DISABLED,
    );
  });

  it(`the campaign card ${isAnimated ? "tilts" : "stays flat"} under the pointer`, () => {
    const { container } = renderWithProviders(
      <CampaignCard campaign={toCampaignView(BLACK_FRIDAY)} />,
      options,
    );
    expect(container.querySelector("[data-tilt]") !== null).toBe(isAnimated);
  });
});
