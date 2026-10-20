/**
 * Amounts of an order: the breakdown of the total (subtotal, discount with its campaign key,
 * shipping) when the backend stored it, otherwise the total only with a short explanation —
 * never an empty value nor a misleading zero (FR-023, SC-006). Server Component.
 *
 * @see specs/003-account-orders/data-model.md §4.5
 */
import type { ReactNode } from "react";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ORDER_DETAIL_MESSAGES } from "../messages";
import type { OrderBreakdownView } from "../order-view";

/** Props of {@link OrderBreakdown}. */
export interface OrderBreakdownProps {
  readonly breakdown: OrderBreakdownView | null;
  readonly total: number;
  /** Refunded so far; shown only when positive. */
  readonly refunded: number;
}

/**
 * One amount row.
 *
 * @param props - Label, amount and extra classes.
 * @returns The row.
 */
function AmountRow({
  label,
  amount,
  className,
}: {
  readonly label: string;
  readonly amount: string;
  readonly className?: string;
}): ReactNode {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 text-sm", className)}>
      <dt className="text-text-muted">{label}</dt>
      <dd>{amount}</dd>
    </div>
  );
}

/**
 * Breakdown rows.
 *
 * @param props - Breakdown.
 * @returns The rows.
 */
function BreakdownRows({ breakdown }: { readonly breakdown: OrderBreakdownView }): ReactNode {
  return (
    <>
      <AmountRow label={ORDER_DETAIL_MESSAGES.subtotal} amount={formatPrice(breakdown.subtotal)} />
      {breakdown.discount > 0 && (
        <AmountRow
          label={
            breakdown.discountKey === null
              ? ORDER_DETAIL_MESSAGES.discount
              : ORDER_DETAIL_MESSAGES.discountWithKey(breakdown.discountKey)
          }
          amount={`− ${formatPrice(breakdown.discount)}`}
          className="text-gold"
        />
      )}
      <AmountRow
        label={ORDER_DETAIL_MESSAGES.shipping}
        amount={formatPrice(breakdown.shippingCost)}
      />
    </>
  );
}

/**
 * Amounts block.
 *
 * @param props - Breakdown, total and refunded amount.
 * @returns The section.
 */
export function OrderBreakdown({ breakdown, total, refunded }: OrderBreakdownProps): ReactNode {
  return (
    <section aria-labelledby="order-amounts" className="glass flex flex-col gap-4 rounded-card p-6">
      <h2 id="order-amounts" className="text-lg">
        {ORDER_DETAIL_MESSAGES.breakdownTitle}
      </h2>
      {breakdown === null && (
        <p className="text-sm text-text-muted">{ORDER_DETAIL_MESSAGES.totalOnly}</p>
      )}
      <dl className="flex flex-col gap-2">
        {breakdown !== null && <BreakdownRows breakdown={breakdown} />}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt>{ORDER_DETAIL_MESSAGES.total}</dt>
          <dd className="price text-2xl" data-testid="order-total">
            {formatPrice(total)}
          </dd>
        </div>
        {refunded > 0 && (
          <AmountRow
            label={ORDER_DETAIL_MESSAGES.refunded}
            amount={formatPrice(refunded)}
            className="text-success"
          />
        )}
      </dl>
    </section>
  );
}
