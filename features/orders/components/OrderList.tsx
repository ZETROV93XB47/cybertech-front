/**
 * Rows of « Mes commandes »: number, date and what the order contains, status, item count and
 * total; each row links to the order detail. The rows enter one after the other (CSS cascade of
 * the theme, a plain fade with reduced effects; capped so long pages never lag). Server
 * Component.
 *
 * @see specs/003-account-orders/spec.md US3 scenario 1, FR-022
 * @see specs/003-account-orders/tasks.md T072, T074
 */
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { enterStyle } from "@/components/effects/Enter";
import { orderPath } from "@/lib/constants/routes";
import { EnterAnimation } from "@/lib/enums/enter-animation";
import { formatFullDay, formatPrice } from "@/lib/format";

import { ORDERS_MESSAGES } from "../messages";
import { shortOrderNumber, type OrderSummaryRow } from "../order-view";

import { OrderStatusBadge } from "./OrderStatusBadge";

/** Props of {@link OrderList}. */
export interface OrderListProps {
  readonly rows: readonly OrderSummaryRow[];
}

/**
 * One order of the list.
 *
 * @param props - Row and its position in the cascade.
 * @returns The list item.
 */
function OrderRow({
  row,
  index,
}: {
  readonly row: OrderSummaryRow;
  readonly index: number;
}): ReactNode {
  const day = formatFullDay(row.createdAt);
  return (
    <li className={EnterAnimation.RISE} style={enterStyle(index)}>
      <Link
        href={orderPath(row.uuid)}
        className="glass group grid items-center gap-4 rounded-card p-5 transition-colors duration-(--duration-fast) hover:border-brand-text sm:grid-cols-12"
      >
        <span className="flex flex-col gap-1 sm:col-span-4">
          <span className="font-medium">
            {ORDERS_MESSAGES.orderNumber(shortOrderNumber(row.uuid))}
          </span>
          {day && <span className="text-sm text-text-muted">{ORDERS_MESSAGES.placedOn(day)}</span>}
          <span className="line-clamp-1 text-xs text-text-muted">
            {ORDERS_MESSAGES.productsPreview(row.firstProductName, row.otherProductCount)}
          </span>
        </span>
        <span className="sm:col-span-3">
          <OrderStatusBadge status={row.status} tone={row.statusTone} />
        </span>
        <span className="text-sm text-text-muted sm:col-span-2">
          {ORDERS_MESSAGES.itemCount(row.itemCount)}
        </span>
        <span className="flex items-center justify-end gap-3 sm:col-span-3">
          <span className="sr-only">{ORDERS_MESSAGES.total}</span>
          <span className="price text-lg">{formatPrice(row.total)}</span>
          <ChevronRight
            aria-hidden
            className="size-4 text-text-muted transition-transform duration-(--duration-fast) group-hover:translate-x-1"
          />
        </span>
      </Link>
    </li>
  );
}

/**
 * List of orders.
 *
 * @param props - Rows, newest first.
 * @returns The list.
 */
export function OrderList({ rows }: OrderListProps): ReactNode {
  return (
    <ul aria-label={ORDERS_MESSAGES.listLabel} className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <OrderRow key={row.uuid} row={row} index={index} />
      ))}
    </ul>
  );
}
