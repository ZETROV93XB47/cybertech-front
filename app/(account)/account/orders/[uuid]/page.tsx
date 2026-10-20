/**
 * Order detail (feature 003 US3): lines, address and shipping, total breakdown (or total only
 * for old orders), timeline, payment retry, edit and cancel. Read on the server with the user's
 * token, never cached; another user's order is a « commande introuvable » (404), without
 * revealing it exists.
 *
 * @see specs/003-account-orders/spec.md US3, FR-023 to FR-027
 * @see specs/003-account-orders/research.md R13
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { OrderDetail } from "@/features/orders/components/OrderDetail";
import { ORDER_DETAIL_MESSAGES, ORDERS_MESSAGES } from "@/features/orders/messages";
import { readOrder, readCatalogUuids } from "@/features/orders/server/order-data";
import { shortOrderNumber, toOrderView } from "@/features/orders/order-view";
import { getAccessTokenOrRedirect } from "@/lib/auth/guards";
import { ACCOUNT_PATHS, HOME_PATH, orderPath } from "@/lib/constants/routes";
import { formatFullDay } from "@/lib/format";
import { OrderUuidParamSchema } from "@/lib/schemas/order";

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: ORDER_DETAIL_MESSAGES.metaTitle,
  robots: { index: false },
};

/** Props of the order detail page. */
interface OrderPageProps {
  readonly params: Promise<{ uuid: string }>;
}

/**
 * Order detail page.
 *
 * @param props - Page props.
 * @param props.params - Route parameters (`uuid`).
 * @returns Header and detail.
 * @throws {ApiError} When the backend cannot read the order (error boundary).
 */
export default async function OrderPage({ params }: OrderPageProps): Promise<ReactNode> {
  const parsed = OrderUuidParamSchema.safeParse((await params).uuid);
  if (!parsed.success) {
    notFound();
  }
  const accessToken = await getAccessTokenOrRedirect(orderPath(parsed.data));
  const order = await readOrder(parsed.data, accessToken);
  const view = toOrderView(order, await readCatalogUuids(order));
  const number = ORDERS_MESSAGES.orderNumber(shortOrderNumber(order.uuid));
  const day = formatFullDay(order.createdAt);
  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: COMMON_MESSAGES.breadcrumbHome },
              { href: ACCOUNT_PATHS.orders, label: ORDER_DETAIL_MESSAGES.breadcrumbOrders },
              { href: null, label: number },
            ]}
          />
        }
        title={<LiveTitle text={number} className={PAGE_TITLE_CLASS} />}
        subtitle={day === null ? undefined : ORDERS_MESSAGES.placedOn(day)}
      />
      <OrderDetail order={view} />
    </>
  );
}
