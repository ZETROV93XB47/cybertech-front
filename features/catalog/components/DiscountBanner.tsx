/**
 * « Offres en cours » strip of the home page: the active discount campaigns.
 */
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { assertNever } from "@/lib/assert-never";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import { formatDay, formatPrice } from "@/lib/format";
import type { ActiveDiscount } from "@/lib/schemas/discount";

import { HOME_MESSAGES } from "../messages";

/** Props of {@link DiscountBanner}. */
export interface DiscountBannerProps {
  /** Displayable campaigns (the `NONE` campaign already removed). */
  readonly discounts: readonly ActiveDiscount[];
}

/**
 * Main sentence of a campaign.
 *
 * @param discount - Campaign.
 * @returns « BLACK_FRIDAY : 20 % de remise sur ta commande ».
 */
export function describeDiscount(discount: ActiveDiscount): string {
  const { discountKey: key } = discount;
  switch (discount.calculationType) {
    case DiscountCalculationType.PERCENTAGE:
      return HOME_MESSAGES.discountPercentage(key, discount.percentage ?? 0);
    case DiscountCalculationType.FIXED_AMOUNT:
      return HOME_MESSAGES.discountFixed(key, formatPrice(discount.fixedAmount ?? 0));
    case DiscountCalculationType.BUY_ONE_GET_ONE_FREE:
      return HOME_MESSAGES.discountBuyOneGetOne(key);
    case DiscountCalculationType.NONE:
      return key;
    default:
      return assertNever(discount.calculationType);
  }
}

/**
 * Conditions of a campaign: minimum order and end date, when set.
 *
 * @param discount - Campaign.
 * @returns The conditions, comma-separated, or an empty string.
 */
function conditions(discount: ActiveDiscount): string {
  const parts: string[] = [];
  if (discount.minOrderAmount !== null) {
    parts.push(HOME_MESSAGES.discountMinOrder(formatPrice(discount.minOrderAmount)));
  }
  const endsOn = discount.endsAt === null ? null : formatDay(discount.endsAt);
  if (endsOn !== null) {
    parts.push(HOME_MESSAGES.discountUntil(endsOn));
  }
  return parts.join(", ");
}

/**
 * The campaigns, or nothing when there is none.
 *
 * @param props - Campaigns.
 * @returns The strip, or `null`.
 */
export function DiscountBanner({ discounts }: DiscountBannerProps): ReactNode {
  if (discounts.length === 0) {
    return null;
  }
  return (
    <aside aria-label={HOME_MESSAGES.discountsLabel} className="glass flex gap-4 rounded-card p-5">
      <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-gold" />
      <div className="flex flex-col gap-2">
        <ul className="flex flex-col gap-1">
          {discounts.map((discount) => {
            const details = conditions(discount);
            return (
              <li key={discount.discountKey} className="text-sm text-text">
                {describeDiscount(discount)}
                {details && <span className="text-text-muted"> ({details})</span>}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-text-muted">{HOME_MESSAGES.discountHint}</p>
      </div>
    </aside>
  );
}
