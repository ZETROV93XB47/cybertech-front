/**
 * Feature 004, Polish (T063) — « Offres en cours » strip of the home page: campaigns named as on
 * the « Promotions » page and linked to their page.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DiscountBanner, describeDiscount } from "@/features/catalog/components/DiscountBanner";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import type { ActiveDiscount } from "@/lib/schemas/discount";

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

describe("DiscountBanner", () => {
  it("names a known campaign in French, never by its key", () => {
    expect(describeDiscount(BLACK_FRIDAY)).toBe("Black Friday : 20 % de remise sur ta commande");
    expect(
      describeDiscount({
        ...BLACK_FRIDAY,
        discountKey: "SUMMER_DEALS",
        calculationType: DiscountCalculationType.BUY_ONE_GET_ONE_FREE,
        percentage: null,
      }),
    ).toBe("Summer deals : un article acheté, le second offert");
  });

  it("links every campaign to its page", () => {
    render(<DiscountBanner discounts={[BLACK_FRIDAY]} />);
    expect(screen.getByRole("link", { name: /^Black Friday/ })).toHaveAttribute(
      "href",
      "/promotions/BLACK_FRIDAY",
    );
  });
});
