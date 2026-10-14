/**
 * Confirmation of a placed order (feature 003 US1): what was ordered, the total charged
 * (backend amount), and the payment follow-up until it is accepted or refused.
 *
 * Reached with `router.replace`, so the back button does not return to a checkout ready to
 * place the same order again. An unknown order, or another user's, is « introuvable ».
 *
 * @see specs/003-account-orders/spec.md FR-013, FR-014
 * @see specs/003-account-orders/research.md R10, R11
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { PaymentTracker } from "@/features/checkout/components/PaymentTracker";
import { CHECKOUT_SUMMARY_MESSAGES, CONFIRMATION_MESSAGES } from "@/features/checkout/messages";
import { ApiError } from "@/lib/api/errors";
import { getOrder } from "@/lib/api/endpoints/orders";
import { getAccessTokenOrRedirect } from "@/lib/auth/guards";
import { checkoutConfirmationPath } from "@/lib/constants/routes";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { formatPrice } from "@/lib/format";
import { OrderUuidParamSchema, type OrderResponse } from "@/lib/schemas/order";

/** Characters of the order UUID shown as its number. */
const ORDER_NUMBER_LENGTH = 8;

/** Page metadata: private content, never indexed. */
export const metadata: Metadata = {
  title: CONFIRMATION_MESSAGES.metaTitle,
  robots: { index: false },
};

/** Props of the confirmation page. */
interface ConfirmationPageProps {
  readonly params: Promise<{ uuid: string }>;
}

/**
 * Reads the order, or answers « introuvable ».
 *
 * @param uuid - Order UUID from the URL.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The order.
 * @throws {ApiError} Errors other than « not found ».
 */
async function readOrder(uuid: string, accessToken: string): Promise<OrderResponse> {
  try {
    return await getOrder(uuid, accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.NOT_FOUND) {
      notFound();
    }
    throw error;
  }
}

/**
 * Lines, discount (when one was granted, US2) and total of the order.
 *
 * @param props - The order.
 * @returns The section.
 */
function OrderRecap({ order }: { readonly order: OrderResponse }): ReactNode {
  return (
    <section
      aria-labelledby="confirmation-lines"
      className="glass flex flex-col gap-4 rounded-card p-6"
    >
      <h2 id="confirmation-lines" className="text-lg">
        {CONFIRMATION_MESSAGES.linesTitle}
      </h2>
      <ul className="flex flex-col gap-2 text-sm">
        {order.orderItems.map((item) => (
          <li key={item.orderItemUuid} className="flex items-baseline justify-between gap-3">
            <span>
              {item.productName}{" "}
              <span className="text-text-muted">
                {CHECKOUT_SUMMARY_MESSAGES.quantity(item.quantity)}
              </span>
            </span>
            <span>{formatPrice(item.lineItemTotalPrice)}</span>
          </li>
        ))}
      </ul>
      {order.discountAmount !== null && order.discountAmount > 0 && (
        <p className="flex items-baseline justify-between gap-4 text-sm text-gold">
          <span>{CHECKOUT_SUMMARY_MESSAGES.discountWithKey(order.discountKey)}</span>
          <span data-testid="confirmation-discount">− {formatPrice(order.discountAmount)}</span>
        </p>
      )}
      <p className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
        <span>{CONFIRMATION_MESSAGES.totalPaid}</span>
        <span className="price text-2xl" data-testid="confirmation-total">
          {formatPrice(order.totalAmount)}
        </span>
      </p>
    </section>
  );
}

/**
 * Confirmation page.
 *
 * @param props - Page props.
 * @param props.params - Route parameters (`uuid`).
 * @returns Header, payment follow-up and order recap.
 */
export default async function ConfirmationPage({
  params,
}: ConfirmationPageProps): Promise<ReactNode> {
  const parsed = OrderUuidParamSchema.safeParse((await params).uuid);
  if (!parsed.success) {
    notFound();
  }
  const accessToken = await getAccessTokenOrRedirect(checkoutConfirmationPath(parsed.data));
  const order = await readOrder(parsed.data, accessToken);
  return (
    <PageShell>
      <PageHeader
        title={<LiveTitle text={CONFIRMATION_MESSAGES.pageTitle} className={PAGE_TITLE_CLASS} />}
        subtitle={CONFIRMATION_MESSAGES.orderNumber(
          order.uuid.slice(0, ORDER_NUMBER_LENGTH).toUpperCase(),
        )}
      />
      <div className="grid items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PaymentTracker orderUuid={order.uuid} />
        </div>
        <div className="lg:col-span-5">
          <OrderRecap order={order} />
        </div>
      </div>
    </PageShell>
  );
}
