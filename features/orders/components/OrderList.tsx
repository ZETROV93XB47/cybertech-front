/**
 * Rows of « Mes commandes »: number and date, status, item count and total; each row links to
 * the order detail. Server Component.
 *
 * @see specs/003-account-orders/spec.md US3 scenario 1, FR-022
 */
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { orderPath } from "@/lib/constants/routes";
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
 * @param props - Row.
 * @returns The list item.
 */
function OrderRow({ row }: { readonly row: OrderSummaryRow }): ReactNode {
  const day = formatFullDay(row.createdAt);
  return (
    <li>
      <Link
        href={orderPath(row.uuid)}
        className="glass group grid items-center gap-4 rounded-card p-5 transition-colors duration-(--duration-fast) hover:border-brand-text sm:grid-cols-12"
      >
        <span className="flex flex-col gap-1 sm:col-span-4">
          <span className="font-medium">
            {ORDERS_MESSAGES.orderNumber(shortOrderNumber(row.uuid))}
          </span>
          {day && <span className="text-sm text-text-muted">{ORDERS_MESSAGES.placedOn(day)}</span>}
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
      {rows.map((row) => (
        <OrderRow key={row.uuid} row={row} />
      ))}
    </ul>
  );
}
