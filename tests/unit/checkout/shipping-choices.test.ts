import { describe, expect, it } from "vitest";

import {
  PICKUP_PLACEHOLDER,
  buildShippingChoices,
  type CarrierChoice,
} from "@/features/checkout/shipping-choices";
import { SHIPPING_DELAYS } from "@/lib/constants/shipping";
import { DelaySource, ShippingChoiceKind } from "@/lib/enums/checkout";
import { ExpressPromise, ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import { ShippingOptionSchema, type ShippingOption } from "@/lib/schemas/shipping";

/** Monday 2026-10-12, 10:00 in Paris: express promises « tomorrow ». */
const MONDAY_MORNING = new Date("2026-10-12T08:00:00Z");

/** Friday 2026-10-16, 18:00 in Paris: express promises the next business day. */
const FRIDAY_EVENING = new Date("2026-10-16T16:00:00Z");

/** Options of the backend, deliberately out of order. */
const OPTIONS: readonly ShippingOption[] = [
  { provider: ShippingProvider.FEDEX, type: ShippingType.EXPRESS, cost: 25, currency: "EUR" },
  { provider: ShippingProvider.DHL, type: ShippingType.EXPRESS, cost: 24, currency: "EUR" },
  { provider: ShippingProvider.FEDEX, type: ShippingType.STANDARD, cost: 15, currency: "EUR" },
  { provider: ShippingProvider.DHL, type: ShippingType.STANDARD, cost: 14, currency: "EUR" },
];

/**
 * Carrier choices of a result, in order.
 *
 * @param options - Backend options.
 * @param now - Current time.
 * @returns The carrier entries only.
 */
function carriers(options: readonly ShippingOption[], now = MONDAY_MORNING): CarrierChoice[] {
  return buildShippingChoices(options, now).filter(
    (choice): choice is CarrierChoice => choice.kind === ShippingChoiceKind.CARRIER,
  );
}

describe("buildShippingChoices", () => {
  it("gives one carrier choice per backend pair, with its real cost", () => {
    const result = carriers(OPTIONS);
    expect(result).toHaveLength(OPTIONS.length);
    expect(result.find((choice) => choice.provider === ShippingProvider.DHL)).toMatchObject({
      type: ShippingType.STANDARD,
      cost: 14,
      currency: "EUR",
    });
  });

  it("orders STANDARD before EXPRESS, then carriers in enum order", () => {
    expect(carriers(OPTIONS).map(({ type, provider }) => `${type}/${provider}`)).toEqual([
      "STANDARD/DHL",
      "STANDARD/FEDEX",
      "EXPRESS/DHL",
      "EXPRESS/FEDEX",
    ]);
  });

  it("uses the front estimate when the backend sends no delay", () => {
    const [standard] = carriers(OPTIONS);
    expect(standard).toMatchObject({
      delaySource: DelaySource.ESTIMATE,
      delay: {
        minDays: SHIPPING_DELAYS[ShippingType.STANDARD].minBusinessDays,
        maxDays: SHIPPING_DELAYS[ShippingType.STANDARD].maxBusinessDays,
      },
    });
  });

  it("uses the backend delay as is when present", () => {
    const [standard] = carriers([
      {
        provider: ShippingProvider.DHL,
        type: ShippingType.STANDARD,
        cost: 15,
        currency: "EUR",
        minDeliveryDays: 2,
        maxDeliveryDays: 4,
      },
    ]);
    expect(standard).toMatchObject({
      delaySource: DelaySource.BACKEND,
      delay: { minDays: 2, maxDays: 4 },
    });
  });

  it("gives an express promise to express choices only", () => {
    const result = carriers(OPTIONS);
    const standards = result.filter(({ type }) => type === ShippingType.STANDARD);
    expect(standards.every(({ expressPromise }) => expressPromise === null)).toBe(true);
    expect(result.find(({ type }) => type === ShippingType.EXPRESS)?.expressPromise).toBe(
      ExpressPromise.TOMORROW,
    );
    expect(
      carriers(OPTIONS, FRIDAY_EVENING).find(({ type }) => type === ShippingType.EXPRESS)
        ?.expressPromise,
    ).toBe(ExpressPromise.NEXT_BUSINESS_DAY);
  });

  it("always ends with the disabled store pickup placeholder", () => {
    const result = buildShippingChoices(OPTIONS, MONDAY_MORNING);
    expect(result.at(-1)).toBe(PICKUP_PLACEHOLDER);
    expect(PICKUP_PLACEHOLDER).toMatchObject({
      kind: ShippingChoiceKind.PICKUP_PLACEHOLDER,
      isDisabled: true,
    });
    expect(
      result.filter(({ kind }) => kind === ShippingChoiceKind.PICKUP_PLACEHOLDER),
    ).toHaveLength(1);
  });

  it("gives an empty list when the options are unavailable", () => {
    expect(buildShippingChoices(null, MONDAY_MORNING)).toEqual([]);
  });
});

describe("ShippingOptionSchema delay fields", () => {
  const BASE = { provider: "DHL", type: "STANDARD", cost: 15, currency: "EUR" };

  it("accepts an option without delay (current backend)", () => {
    expect(ShippingOptionSchema.safeParse(BASE).success).toBe(true);
  });

  it("accepts a fixed delay and refuses max below min or negative days", () => {
    expect(
      ShippingOptionSchema.safeParse({ ...BASE, minDeliveryDays: 1, maxDeliveryDays: 1 }).success,
    ).toBe(true);
    expect(
      ShippingOptionSchema.safeParse({ ...BASE, minDeliveryDays: 4, maxDeliveryDays: 2 }).success,
    ).toBe(false);
    expect(ShippingOptionSchema.safeParse({ ...BASE, minDeliveryDays: -1 }).success).toBe(false);
  });
});
