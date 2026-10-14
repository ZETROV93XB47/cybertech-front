import { describe, expect, it } from "vitest";

import { DISCOUNT_KEY_MAX_LENGTH } from "@/lib/constants/discount";
import { DiscountKeySchema } from "@/lib/schemas/discount";

describe("DiscountKeySchema", () => {
  it("trims and upper-cases a typed key", () => {
    expect(DiscountKeySchema.parse("  black_friday ")).toBe("BLACK_FRIDAY");
  });

  it("refuses an empty key, a too long key and forbidden characters", () => {
    expect(DiscountKeySchema.safeParse("   ").success).toBe(false);
    expect(DiscountKeySchema.safeParse("A".repeat(DISCOUNT_KEY_MAX_LENGTH + 1)).success).toBe(
      false,
    );
    expect(DiscountKeySchema.safeParse("BLACK-FRIDAY").success).toBe(false);
    expect(DiscountKeySchema.safeParse("<script>").success).toBe(false);
  });

  it("accepts the longest allowed key", () => {
    expect(DiscountKeySchema.safeParse("A".repeat(DISCOUNT_KEY_MAX_LENGTH)).success).toBe(true);
  });
});
