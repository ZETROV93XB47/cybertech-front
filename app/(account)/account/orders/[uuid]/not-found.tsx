/**
 * « Commande introuvable »: an unknown order UUID, or an order of another user (the backend 403
 * is rendered as a 404 so its existence is never revealed).
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §1.1
 */
import { PackageX } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/layout/EmptyState";
import { ORDER_DETAIL_MESSAGES, ORDERS_MESSAGES } from "@/features/orders/messages";
import { ACCOUNT_PATHS } from "@/lib/constants/routes";

/**
 * Order not found.
 *
 * The page keeps a level-1 heading (visually hidden: the illustrated state carries the visible
 * title) so that screen-reader users land on the section they are in.
 *
 * @returns The illustrated state with the way back to the orders.
 */
export default function OrderNotFound(): ReactNode {
  return (
    <>
      <h1 className="sr-only">{ORDERS_MESSAGES.pageTitle}</h1>
      <EmptyState
        icon={<PackageX className="size-10" />}
        title={ORDER_DETAIL_MESSAGES.notFoundTitle}
        body={ORDER_DETAIL_MESSAGES.notFoundBody}
        action={{ href: ACCOUNT_PATHS.orders, label: ORDER_DETAIL_MESSAGES.backToOrders }}
      />
    </>
  );
}
