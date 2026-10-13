/**
 * Delivery block of the product page: each speed with its fee (backend), its indicative delay
 * and, for express, the promise of the moment (« Commande avant 15 h, tu es livré demain »).
 *
 * Store pickup is not shown: the backend offers no such option (decision of 2026-10-13).
 *
 * @see features/catalog/delivery.ts
 * @see docs/backend/api-map.md §7b
 */
import { Truck, Zap } from "lucide-react";
import type { ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import { EXPRESS_CUTOFF_HOUR } from "@/lib/constants/shipping";
import { ExpressPromise, ShippingType } from "@/lib/enums/shipping";
import { formatPrice } from "@/lib/format";

import type { DeliveryLine } from "../delivery";
import { DELIVERY_MESSAGES } from "../messages";

/** Props of {@link DeliveryInfo}. */
export interface DeliveryInfoProps {
  readonly lines: readonly DeliveryLine[];
  /** What an express order placed now can promise. */
  readonly promise: ExpressPromise;
}

/**
 * Icon of a speed.
 *
 * @param props - Shipping speed.
 * @returns The icon.
 */
function SpeedIcon({ type }: { readonly type: ShippingType }): ReactNode {
  switch (type) {
    case ShippingType.STANDARD:
      return <Truck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-text" />;
    case ShippingType.EXPRESS:
      return <Zap aria-hidden className="mt-0.5 size-5 shrink-0 text-gold" />;
    default:
      return assertNever(type);
  }
}

/**
 * Text of the express promise.
 *
 * @param promise - Promise of the moment.
 * @returns The sentence.
 */
function promiseText(promise: ExpressPromise): string {
  switch (promise) {
    case ExpressPromise.TOMORROW:
      return DELIVERY_MESSAGES.expressTomorrow(EXPRESS_CUTOFF_HOUR);
    case ExpressPromise.NEXT_BUSINESS_DAY:
      return DELIVERY_MESSAGES.expressNextBusinessDay;
    default:
      return assertNever(promise);
  }
}

/**
 * Fee of a speed, « dès » when the carriers charge different fees.
 *
 * @param line - Delivery line.
 * @returns The fee text, or `null` when unknown.
 */
function costText(line: DeliveryLine): string | null {
  if (line.fromCost === null) {
    return null;
  }
  const amount = formatPrice(line.fromCost);
  return line.isSingleCost ? amount : DELIVERY_MESSAGES.fromCost(amount);
}

/**
 * One speed of the block.
 *
 * @param props - The line and the express promise.
 * @returns The list item.
 */
function DeliveryRow({
  line,
  promise,
}: {
  readonly line: DeliveryLine;
  readonly promise: ExpressPromise;
}): ReactNode {
  const cost = costText(line);
  return (
    <li className="flex items-start gap-3">
      <SpeedIcon type={line.type} />
      <div className="flex flex-1 flex-col gap-0.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-text">{DELIVERY_MESSAGES.typeLabels[line.type]}</span>
          {cost && <span className="price">{cost}</span>}
        </div>
        {line.type === ShippingType.EXPRESS ? (
          <span className="text-success">{promiseText(promise)}</span>
        ) : (
          <span className="text-text-muted">
            {DELIVERY_MESSAGES.delay(line.delay.minBusinessDays, line.delay.maxBusinessDays)}
          </span>
        )}
        <span className="text-xs text-text-muted">
          {DELIVERY_MESSAGES.carriers(
            line.providers.map((provider) => DELIVERY_MESSAGES.providerLabels[provider]),
          )}
        </span>
      </div>
    </li>
  );
}

/**
 * Delivery block.
 *
 * @param props - Speeds and express promise.
 * @returns The section.
 */
export function DeliveryInfo({ lines, promise }: DeliveryInfoProps): ReactNode {
  const feesUnknown = lines.every((line) => line.fromCost === null);
  return (
    <section
      aria-labelledby="delivery-title"
      className="glass flex flex-col gap-4 rounded-card p-5"
    >
      <h2 id="delivery-title" className="text-lg">
        {DELIVERY_MESSAGES.title}
      </h2>
      <ul className="flex flex-col gap-4">
        {lines.map((line) => (
          <DeliveryRow key={line.type} line={line} promise={promise} />
        ))}
      </ul>
      {feesUnknown && (
        <p className="text-sm text-text-muted">{DELIVERY_MESSAGES.feesUnavailable}</p>
      )}
      <p className="text-xs text-text-muted">{DELIVERY_MESSAGES.indicative}</p>
    </section>
  );
}
