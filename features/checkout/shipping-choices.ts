/**
 * Entries of the shipping step of the checkout: one choice per (speed, carrier) pair returned by
 * the backend, with its real price and its delay, followed by the greyed store-pickup entry.
 *
 * Delays come from the backend when it sends them (fixed values from its configuration, shown
 * as they are, with no business-day or holiday computation); otherwise the front estimates of
 * `SHIPPING_DELAYS` are used and labelled as estimates. The express promise of the product page
 * (« livré demain ») is reused.
 *
 * @see specs/003-account-orders/data-model.md §4.2
 * @see specs/003-account-orders/research.md R8
 * @see features/catalog/delivery.ts
 */
import { expressPromise } from "@/features/catalog/delivery";
import { SHIPPING_DELAYS } from "@/lib/constants/shipping";
import { DelaySource, ShippingChoiceKind } from "@/lib/enums/checkout";
import { ExpressPromise, ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import type { ShippingOption } from "@/lib/schemas/shipping";

/** Delivery delay of a choice, in days. */
export interface ChoiceDelay {
  readonly minDays: number;
  readonly maxDays: number;
}

/** A (speed, carrier) pair the customer can pick, priced by the backend. */
export interface CarrierChoice {
  readonly kind: ShippingChoiceKind.CARRIER;
  readonly type: ShippingType;
  readonly provider: ShippingProvider;
  /** Fee charged for this pair: exactly the `shippingCost` of the quote. */
  readonly cost: number;
  /** ISO 4217 code of `cost`. */
  readonly currency: string;
  readonly delay: ChoiceDelay;
  /** Whether `delay` comes from the backend or is a front estimate. */
  readonly delaySource: DelaySource;
  /** Promise of the moment for an express choice, `null` for standard. */
  readonly expressPromise: ExpressPromise | null;
}

/**
 * Store pickup, displayed greyed out with « Bientôt disponible » and never selectable: the
 * backend has no such option (clarification Q2), so it is never sent.
 */
export interface PickupPlaceholderChoice {
  readonly kind: ShippingChoiceKind.PICKUP_PLACEHOLDER;
  readonly isDisabled: true;
}

/** One entry of the shipping step. */
export type ShippingChoice = CarrierChoice | PickupPlaceholderChoice;

/**
 * The store-pickup entry, always last. Purely visual: no price, no delay, no backend value.
 *
 * @see specs/003-account-orders/spec.md FR-008
 */
export const PICKUP_PLACEHOLDER: PickupPlaceholderChoice = {
  kind: ShippingChoiceKind.PICKUP_PLACEHOLDER,
  isDisabled: true,
};

/** Display order of the speeds: standard first. */
const TYPE_ORDER: readonly ShippingType[] = Object.values(ShippingType);

/** Display order of the carriers: enum order. */
const PROVIDER_ORDER: readonly ShippingProvider[] = Object.values(ShippingProvider);

/**
 * Delay of an option: the backend one when both bounds are present, else the front estimate.
 *
 * @param option - Backend option.
 * @returns The delay and its source.
 */
function delayOf(option: ShippingOption): Pick<CarrierChoice, "delay" | "delaySource"> {
  const { minDeliveryDays, maxDeliveryDays } = option;
  if (minDeliveryDays !== undefined && maxDeliveryDays !== undefined) {
    return {
      delay: { minDays: minDeliveryDays, maxDays: maxDeliveryDays },
      delaySource: DelaySource.BACKEND,
    };
  }
  const estimate = SHIPPING_DELAYS[option.type];
  return {
    delay: { minDays: estimate.minBusinessDays, maxDays: estimate.maxBusinessDays },
    delaySource: DelaySource.ESTIMATE,
  };
}

/**
 * Turns one backend option into a carrier choice.
 *
 * @param option - Backend option.
 * @param promise - Express promise of the moment.
 * @returns The choice.
 */
function toCarrierChoice(option: ShippingOption, promise: ExpressPromise): CarrierChoice {
  return {
    kind: ShippingChoiceKind.CARRIER,
    type: option.type,
    provider: option.provider,
    cost: option.cost,
    currency: option.currency,
    ...delayOf(option),
    expressPromise: option.type === ShippingType.EXPRESS ? promise : null,
  };
}

/**
 * Sort key comparison: speed first, then carrier.
 *
 * @param left - First choice.
 * @param right - Second choice.
 * @returns A negative number when `left` comes first.
 */
function compareChoices(left: CarrierChoice, right: CarrierChoice): number {
  const byType = TYPE_ORDER.indexOf(left.type) - TYPE_ORDER.indexOf(right.type);
  return byType !== 0
    ? byType
    : PROVIDER_ORDER.indexOf(left.provider) - PROVIDER_ORDER.indexOf(right.provider);
}

/**
 * Builds the entries of the shipping step.
 *
 * @param options - Options of `GET /shipping/options`, `null` when they could not be read.
 * @param now - Current time, for the express promise.
 * @returns One carrier choice per backend pair (standard then express, carriers in enum order)
 *   followed by {@link PICKUP_PLACEHOLDER}; an empty list when the options are unavailable, in
 *   which case the order cannot be placed.
 */
export function buildShippingChoices(
  options: readonly ShippingOption[] | null,
  now: Date,
): readonly ShippingChoice[] {
  if (options === null) {
    return [];
  }
  const promise = expressPromise(now);
  const carriers = options.map((option) => toCarrierChoice(option, promise)).sort(compareChoices);
  return [...carriers, PICKUP_PLACEHOLDER];
}
