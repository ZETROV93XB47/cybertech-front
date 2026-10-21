/**
 * Feature 004, US4 (T033) — view of a discount campaign: name, benefit, conditions, photo and
 * address, for each calculation type and each condition present or absent.
 */
import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_IMAGES,
  GENERIC_CAMPAIGN_IMAGE,
  campaignImage,
} from "@/features/promotions/campaign-images";
import { formatCampaignKey, toCampaignView } from "@/features/promotions/campaign-view";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import { CampaignImageKey } from "@/lib/enums/promotions";
import { formatPrice } from "@/lib/format";
import type { ActiveDiscount } from "@/lib/schemas/discount";

/** A campaign without any condition. */
const BASE: ActiveDiscount = {
  discountKey: "BLACK_FRIDAY",
  calculationType: DiscountCalculationType.PERCENTAGE,
  percentage: 20,
  fixedAmount: null,
  minOrderAmount: null,
  maxDiscountAmount: null,
  startsAt: null,
  endsAt: null,
};

describe("toCampaignView", () => {
  it("names a known campaign, links to its page and uses its photo", () => {
    const view = toCampaignView(BASE);
    expect(view.name).toBe("Black Friday");
    expect(view.key).toBe("BLACK_FRIDAY");
    expect(view.href).toBe("/promotions/BLACK_FRIDAY");
    expect(view.image).toBe(CAMPAIGN_IMAGES[CampaignImageKey.BLACK_FRIDAY]);
    expect(view.imageAlt).not.toBe("");
  });

  it.each([
    [{ calculationType: DiscountCalculationType.PERCENTAGE, percentage: 20 }, "−20 %"],
    [
      {
        calculationType: DiscountCalculationType.FIXED_AMOUNT,
        percentage: null,
        fixedAmount: 10,
      },
      `−${formatPrice(10)}`,
    ],
    [
      { calculationType: DiscountCalculationType.BUY_ONE_GET_ONE_FREE, percentage: null },
      "1 acheté = 1 offert",
    ],
  ] as const)("words the benefit of %o as %s", (change, benefit) => {
    expect(toCampaignView({ ...BASE, ...change }).benefit).toBe(benefit);
  });

  it("says « Sans date de fin » when the campaign has no condition", () => {
    expect(toCampaignView(BASE).conditions).toEqual(["Sans date de fin"]);
  });

  it("lists the minimum, the cap and the end date, in this order", () => {
    const view = toCampaignView({
      ...BASE,
      minOrderAmount: 100,
      maxDiscountAmount: 50,
      endsAt: "2026-11-30T23:59:59",
    });
    expect(view.conditions).toEqual([
      `Dès ${formatPrice(100)} d'achat`,
      `Remise plafonnée à ${formatPrice(50)}`,
      "Jusqu'au 30 novembre",
    ]);
  });

  it("gives an unknown campaign its key in words and the generic photo", () => {
    const view = toCampaignView({ ...BASE, discountKey: "CYBER_MONDAY" });
    expect(view.name).toBe("Cyber monday");
    expect(view.image).toBe(GENERIC_CAMPAIGN_IMAGE);
  });
});

describe("campaign helpers", () => {
  it("puts a key in words", () => {
    expect(formatCampaignKey("SPRING_SALES")).toBe("Spring sales");
    expect(formatCampaignKey("PROMO")).toBe("Promo");
  });

  it.each(Object.values(CampaignImageKey))("has a dedicated photo for %s", (key) => {
    expect(campaignImage(key).src).toBe(CAMPAIGN_IMAGES[key]);
  });
});
