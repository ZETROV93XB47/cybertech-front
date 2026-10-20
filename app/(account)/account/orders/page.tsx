/**
 * « Mes commandes » (feature 003 US3): the user's orders, newest first, one page at a time,
 * filtered by status through the address (`?status=PAID&status=SHIPPED&page=2`). Read on the
 * server with the user's token, never cached; shown in the account shell.
 *
 * @see specs/003-account-orders/spec.md US3, FR-022
 * @see specs/003-account-orders/research.md R12
 */
import { Package } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { EmptyState } from "@/components/layout/EmptyState";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { OrderList } from "@/features/orders/components/OrderList";
import { OrderStatusFilter } from "@/features/orders/components/OrderStatusFilter";
import { OrdersPagination } from "@/features/orders/components/OrdersPagination";
import { ORDERS_MESSAGES } from "@/features/orders/messages";
import {
  ordersListPath,
  readOrdersListParams,
  type RawSearchParams,
} from "@/features/orders/orders-list";
import { toOrderSummaryRow } from "@/features/orders/order-view";
import { getMyOrders } from "@/lib/api/endpoints/orders";
import { getAccessTokenOrRedirect } from "@/lib/auth/guards";
import { CATALOG_PATH, HOME_PATH } from "@/lib/constants/routes";
import type { OrdersListParams } from "@/lib/schemas/order";

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: ORDERS_MESSAGES.metaTitle,
  description: ORDERS_MESSAGES.pageDescription,
  robots: { index: false },
};

/** Props of the orders page. */
interface OrdersPageProps {
  readonly searchParams: Promise<RawSearchParams>;
}

/**
 * Empty state, with or without a filter.
 *
 * @param props - Current parameters.
 * @returns The illustrated empty state.
 */
function OrdersEmpty({ params }: { readonly params: OrdersListParams }): ReactNode {
  const isFiltered = params.statuses.length > 0;
  return (
    <EmptyState
      icon={<Package className="size-10" />}
      title={isFiltered ? ORDERS_MESSAGES.emptyFilteredTitle : ORDERS_MESSAGES.emptyTitle}
      body={isFiltered ? ORDERS_MESSAGES.emptyFilteredBody : ORDERS_MESSAGES.emptyBody}
      action={
        isFiltered
          ? { href: ordersListPath([]), label: ORDERS_MESSAGES.filterReset }
          : { href: CATALOG_PATH, label: ORDERS_MESSAGES.goToCatalog }
      }
    />
  );
}

/**
 * Orders page.
 *
 * @param props - Page props.
 * @param props.searchParams - Query string, read for `?status=` and `?page=`.
 * @returns Header, filter, list and pagination.
 * @throws {ApiError} When the backend cannot read the orders (error boundary).
 */
export default async function OrdersPage({ searchParams }: OrdersPageProps): Promise<ReactNode> {
  const params = readOrdersListParams(await searchParams);
  const accessToken = await getAccessTokenOrRedirect(ordersListPath(params.statuses, params.page));
  const orders = await getMyOrders(params, accessToken);
  if (orders.content.length === 0 && params.page > 1 && orders.page.totalPages > 0) {
    redirect(ordersListPath(params.statuses, orders.page.totalPages));
  }
  const hasOrders = orders.content.length > 0;
  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: COMMON_MESSAGES.breadcrumbHome },
              { href: null, label: ORDERS_MESSAGES.pageTitle },
            ]}
          />
        }
        title={<LiveTitle text={ORDERS_MESSAGES.pageTitle} className={PAGE_TITLE_CLASS} />}
        subtitle={ORDERS_MESSAGES.pageDescription}
      />
      <div className="flex flex-col gap-6">
        {(hasOrders || params.statuses.length > 0) && (
          <OrderStatusFilter selected={params.statuses} />
        )}
        {hasOrders ? (
          <OrderList rows={orders.content.map(toOrderSummaryRow)} />
        ) : (
          <OrdersEmpty params={params} />
        )}
        <OrdersPagination
          statuses={params.statuses}
          page={params.page}
          totalPages={orders.page.totalPages}
        />
      </div>
    </>
  );
}
