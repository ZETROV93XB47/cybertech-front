/**
 * Status filter of « Mes commandes »: a GET form with one checkbox per status, so the filter
 * works without JavaScript and lands in the address of the page (FR-022). Server Component.
 *
 * @see specs/003-account-orders/research.md R12
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { ORDERS_STATUS_PARAM } from "@/lib/constants/orders";
import { ACCOUNT_PATHS } from "@/lib/constants/routes";
import { OrderStatus } from "@/lib/enums/order";

import { ORDERS_MESSAGES } from "../messages";

/** Props of {@link OrderStatusFilter}. */
export interface OrderStatusFilterProps {
  /** Statuses currently filtered. */
  readonly selected: readonly OrderStatus[];
}

/** Every status, in lifecycle order. */
const STATUSES: readonly OrderStatus[] = Object.values(OrderStatus);

/**
 * Status filter form.
 *
 * @param props - Selected statuses.
 * @returns The form.
 */
export function OrderStatusFilter({ selected }: OrderStatusFilterProps): ReactNode {
  return (
    <form
      method="get"
      action={ACCOUNT_PATHS.orders}
      className="glass flex flex-col gap-4 rounded-card p-5"
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">{ORDERS_MESSAGES.filterLegend}</legend>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <label
              key={status}
              className="flex cursor-pointer items-center gap-2 rounded-button border border-border px-3 py-1.5 text-sm transition-colors duration-(--duration-fast) has-checked:border-brand-text has-checked:text-brand-text"
            >
              <input
                type="checkbox"
                name={ORDERS_STATUS_PARAM}
                value={status}
                defaultChecked={selected.includes(status)}
                className="accent-brand"
              />
              {ORDERS_MESSAGES.statusLabels[status]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-4">
        <button type="submit" className="cta-gradient h-10 rounded-button px-5 text-sm font-medium">
          {ORDERS_MESSAGES.filterApply}
        </button>
        {selected.length > 0 && (
          <Link
            href={ACCOUNT_PATHS.orders}
            className="text-sm text-text-muted underline-offset-4 hover:text-text hover:underline"
          >
            {ORDERS_MESSAGES.filterReset}
          </Link>
        )}
      </div>
    </form>
  );
}
