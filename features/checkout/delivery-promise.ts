/**
 * Delivery promise of a shipping choice, shared by the shipping step and the checkout summary
 * (feature 003 T072), so that the summary repeats exactly what the chosen card says.
 *
 * @see specs/003-account-orders/spec.md FR-008, Clarifications (Q2)
 */
import { DELIVERY_MESSAGES } from "@/features/catalog/messages";
import type { QuoteShipping } from "@/lib/constants/checkout";
import { EXPRESS_CUTOFF_HOUR } from "@/lib/constants/shipping";
import { ShippingChoiceKind } from "@/lib/enums/checkout";
import { ExpressPromise } from "@/lib/enums/shipping";

import { CHECKOUT_MESSAGES } from "./messages";
import type { CarrierChoice, ShippingChoice } from "./shipping-choices";

/**
 * Delay line of a carrier choice: the express promise, the backend delay, or the estimate.
 *
 * @param choice - Carrier choice.
 * @returns The sentence (French).
 */
export function delayText(choice: CarrierChoice): string {
  if (choice.expressPromise === ExpressPromise.TOMORROW) {
    return DELIVERY_MESSAGES.expressTomorrow(EXPRESS_CUTOFF_HOUR);
  }
  if (choice.expressPromise === ExpressPromise.NEXT_BUSINESS_DAY) {
    return DELIVERY_MESSAGES.expressNextBusinessDay;
  }
  return CHECKOUT_MESSAGES.shippingDelay(choice.delay.minDays, choice.delay.maxDays);
}

/**
 * Delay of the chosen shipping.
 *
 * @param choices - Shipping choices of the checkout.
 * @param shipping - Chosen speed and carrier, `null` before the choice.
 * @returns The delay sentence, or `null` when nothing (or an unknown pair) is chosen.
 */
export function chosenDelayText(
  choices: readonly ShippingChoice[],
  shipping: QuoteShipping | null,
): string | null {
  if (shipping === null) {
    return null;
  }
  const chosen = choices.find(
    (choice): choice is CarrierChoice =>
      choice.kind === ShippingChoiceKind.CARRIER &&
      choice.type === shipping.type &&
      choice.provider === shipping.provider,
  );
  return chosen === undefined ? null : delayText(chosen);
}
