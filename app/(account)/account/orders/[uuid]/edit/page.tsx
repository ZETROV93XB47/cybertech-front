/**
 * Order edit page (feature 003 US3): quantities, removal, products added by search, address,
 * shipping and payment of an order not shipped yet. The order and the shipping choices are read
 * on the server; the form is a client island. An order that can no longer be edited shows why,
 * with the way back to its detail.
 *
 * @see specs/003-account-orders/spec.md US3, FR-025
 * @see specs/003-account-orders/research.md R14
 */
import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { EmptyState } from "@/components/layout/EmptyState";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { buildShippingChoices } from "@/features/checkout/shipping-choices";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { OrderEditForm } from "@/features/orders/components/OrderEditForm";
import {
  ORDER_DETAIL_MESSAGES,
  ORDER_EDIT_MESSAGES,
  ORDERS_MESSAGES,
} from "@/features/orders/messages";
import { ORDER_STATUS_RULES, shortOrderNumber } from "@/features/orders/order-view";
import { readOrder } from "@/features/orders/server/order-data";
import { parseFlatAddress } from "@/lib/address";
import { getShippingOptions } from "@/lib/api/endpoints/shipping";
import { getAccessTokenOrRedirect } from "@/lib/auth/guards";
import { NO_DISCOUNT_KEY } from "@/lib/constants/discount";
import { ACCOUNT_PATHS, HOME_PATH, orderEditPath, orderPath } from "@/lib/constants/routes";
import { OrderUuidParamSchema } from "@/lib/schemas/order";

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: ORDER_EDIT_MESSAGES.metaTitle,
  robots: { index: false },
};

/** Props of the order edit page. */
interface OrderEditPageProps {
  readonly params: Promise<{ uuid: string }>;
}

/**
 * Breadcrumb of the edit page.
 *
 * @param props - Order UUID.
 * @returns The breadcrumb.
 */
function EditBreadcrumb({ uuid }: { readonly uuid: string }): ReactNode {
  return (
    <Breadcrumb
      steps={[
        { href: HOME_PATH, label: COMMON_MESSAGES.breadcrumbHome },
        { href: ACCOUNT_PATHS.orders, label: ORDER_DETAIL_MESSAGES.breadcrumbOrders },
        { href: orderPath(uuid), label: ORDERS_MESSAGES.orderNumber(shortOrderNumber(uuid)) },
        { href: null, label: ORDER_EDIT_MESSAGES.breadcrumb },
      ]}
    />
  );
}

/**
 * Order edit page.
 *
 * @param props - Page props.
 * @param props.params - Route parameters (`uuid`).
 * @returns Header and form, or the « no longer editable » state.
 * @throws {ApiError} When the backend cannot read the order (error boundary).
 */
export default async function OrderEditPage({ params }: OrderEditPageProps): Promise<ReactNode> {
  const parsed = OrderUuidParamSchema.safeParse((await params).uuid);
  if (!parsed.success) {
    notFound();
  }
  const accessToken = await getAccessTokenOrRedirect(orderEditPath(parsed.data));
  const [order, options] = await Promise.all([
    readOrder(parsed.data, accessToken),
    getShippingOptions(),
  ]);
  const header = (
    <PageHeader
      breadcrumb={<EditBreadcrumb uuid={order.uuid} />}
      title={<LiveTitle text={ORDER_EDIT_MESSAGES.pageTitle} className={PAGE_TITLE_CLASS} />}
      subtitle={ORDER_EDIT_MESSAGES.intro}
    />
  );
  if (!ORDER_STATUS_RULES[order.status].canEdit) {
    return (
      <>
        {header}
        <EmptyState
          icon={<Lock className="size-10" />}
          title={ORDER_EDIT_MESSAGES.notEditable}
          body={ORDER_DETAIL_MESSAGES.noAction}
          action={{ href: orderPath(order.uuid), label: ORDER_EDIT_MESSAGES.backToOrder }}
        />
      </>
    );
  }
  return (
    <>
      {header}
      <OrderEditForm
        order={order}
        address={parseFlatAddress(order.shippingAddress)}
        choices={buildShippingChoices(options, new Date())}
        discountKey={order.discountKey === NO_DISCOUNT_KEY ? null : order.discountKey}
      />
    </>
  );
}
