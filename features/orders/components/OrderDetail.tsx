/**
 * Body of the order detail: status and actions, payment retry after a refusal, timeline, lines
 * (linked to the product only while it is still in the catalog), delivery address and shipping,
 * and the amounts. Server Component; the actions and the payment follow-up are client islands.
 *
 * @see specs/003-account-orders/spec.md US3, FR-023 to FR-027
 * @see specs/003-account-orders/data-model.md §4.5
 */
import { MapPin, Truck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CategoryTag } from "@/features/catalog/components/CategoryTag";
import { PaymentTracker } from "@/features/checkout/components/PaymentTracker";
import { DELIVERY_MESSAGES } from "@/features/catalog/messages";
import { productPath } from "@/lib/constants/routes";
import { formatPrice } from "@/lib/format";

import { ORDER_DETAIL_MESSAGES } from "../messages";
import type { OrderLineView, OrderView } from "../order-view";

import { OrderActions } from "./OrderActions";
import { OrderBreakdown } from "./OrderBreakdown";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderTimeline } from "./OrderTimeline";

/** Props of {@link OrderDetail}. */
export interface OrderDetailProps {
  readonly order: OrderView;
}

/**
 * One line of the order.
 *
 * @param props - Line.
 * @returns The list item.
 */
function OrderLine({ line }: { readonly line: OrderLineView }): ReactNode {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="flex min-w-0 flex-col gap-0.5">
        {line.isInCatalog ? (
          <Link href={productPath(line.productUuid)} className="hover:text-brand-text">
            {line.productName}
          </Link>
        ) : (
          <span>
            {line.productName}{" "}
            <span className="text-xs text-text-muted">
              ({ORDER_DETAIL_MESSAGES.removedFromCatalog})
            </span>
          </span>
        )}
        <CategoryTag category={line.category} />
        <span className="text-xs text-text-muted">
          {`${ORDER_DETAIL_MESSAGES.quantity(line.quantity)} · ${ORDER_DETAIL_MESSAGES.unitPrice(formatPrice(line.unitPrice))}`}
        </span>
      </span>
      <span className="shrink-0">{formatPrice(line.lineTotal)}</span>
    </li>
  );
}

/**
 * Lines block.
 *
 * @param props - Order lines.
 * @returns The section.
 */
function OrderLines({ lines }: { readonly lines: readonly OrderLineView[] }): ReactNode {
  return (
    <section aria-labelledby="order-lines" className="glass flex flex-col gap-2 rounded-card p-6">
      <h2 id="order-lines" className="text-lg">
        {ORDER_DETAIL_MESSAGES.linesTitle}
      </h2>
      <ul>
        {lines.map((line) => (
          <OrderLine key={line.productUuid} line={line} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Delivery address and shipping.
 *
 * @param props - Order.
 * @returns The section.
 */
function OrderDelivery({ order }: { readonly order: OrderView }): ReactNode {
  return (
    <section
      aria-labelledby="order-delivery"
      className="glass flex flex-col gap-3 rounded-card p-6"
    >
      <h2 id="order-delivery" className="text-lg">
        {ORDER_DETAIL_MESSAGES.addressTitle}
      </h2>
      <p className="flex items-start gap-3 text-sm">
        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-text" />
        <span>{order.address.raw}</span>
      </p>
      <p className="flex items-start gap-3 text-sm">
        <Truck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-text" />
        <span>
          {ORDER_DETAIL_MESSAGES.shippingLine(
            DELIVERY_MESSAGES.typeLabels[order.shipping.type],
            DELIVERY_MESSAGES.providerLabels[order.shipping.provider],
          )}
        </span>
      </p>
    </section>
  );
}

/**
 * Status, retry and actions block.
 *
 * @param props - Order.
 * @returns The section.
 */
function OrderStatusPanel({ order }: { readonly order: OrderView }): ReactNode {
  return (
    <section aria-labelledby="order-status" className="glass flex flex-col gap-4 rounded-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="order-status" className="text-lg">
          {ORDER_DETAIL_MESSAGES.statusLabel}
        </h2>
        <OrderStatusBadge status={order.status} tone={order.statusTone} />
      </div>
      {order.canRetryPayment && <PaymentTracker orderUuid={order.uuid} withLinks={false} />}
      <OrderActions orderUuid={order.uuid} canEdit={order.canEdit} canCancel={order.canCancel} />
    </section>
  );
}

/**
 * Order detail.
 *
 * @param props - Order view.
 * @returns The two columns of the detail.
 */
export function OrderDetail({ order }: OrderDetailProps): ReactNode {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-12">
      <div className="flex flex-col gap-6 xl:col-span-7">
        <OrderStatusPanel order={order} />
        <OrderLines lines={order.lines} />
        <OrderDelivery order={order} />
      </div>
      <div className="flex flex-col gap-6 xl:col-span-5">
        <OrderBreakdown breakdown={order.breakdown} total={order.total} refunded={order.refunded} />
        <OrderTimeline timeline={order.timeline} />
      </div>
    </div>
  );
}
