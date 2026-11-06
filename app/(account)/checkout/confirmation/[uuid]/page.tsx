/**
 * Confirmation of a placed order (feature 003 US1): what was ordered (with the product photos),
 * the total charged (backend amount), the payment follow-up until it is accepted or refused, and
 * what happens next, with links to the order and to the catalog (T072).
 *
 * Reached with `router.replace`, so the back button does not return to a checkout ready to
 * place the same order again. An unknown order, or another user's, is « introuvable ».
 *
 * @see specs/003-account-orders/spec.md FR-013, FR-014
 * @see specs/003-account-orders/research.md R10, R11
 * @see specs/005-web-push-notifications/spec.md US1 (notifications opt-in)
 * @see specs/003-account-orders/tasks.md T072, T073
 */
import { ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { LiveTitle } from "@/components/effects/LiveTitle";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PRIMARY_CTA_CLASS } from "@/components/layout/cta";
import { PAGE_TITLE_CLASS, PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { PaymentTracker } from "@/features/checkout/components/PaymentTracker";
import { CHECKOUT_SUMMARY_MESSAGES, CONFIRMATION_MESSAGES } from "@/features/checkout/messages";
import { COMMON_MESSAGES } from "@/features/common/messages";
import { PushOptIn } from "@/features/notifications/components/PushOptIn";
import { LineThumbnail } from "@/features/orders/components/LineThumbnail";
import { shortOrderNumber } from "@/features/orders/order-view";
import { readLinePhotos, type LinePhotos } from "@/features/orders/server/order-data";
import { ApiError } from "@/lib/api/errors";
import { getOrder } from "@/lib/api/endpoints/orders";
import { getAccessTokenOrRedirect } from "@/lib/auth/guards";
import {
  ACCOUNT_PATHS,
  CATALOG_PATH,
  checkoutConfirmationPath,
  HOME_PATH,
  orderPath,
} from "@/lib/constants/routes";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { formatPrice } from "@/lib/format";
import { OrderUuidParamSchema, type OrderResponse } from "@/lib/schemas/order";

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
 * Lines with their photo, discount (when one was granted, US2) and total of the order.
 *
 * @param props - The order and the photos of its products.
 * @returns The section.
 */
function OrderRecap({
  order,
  photos,
}: {
  readonly order: OrderResponse;
  readonly photos: LinePhotos;
}): ReactNode {
  return (
    <section
      aria-labelledby="confirmation-lines"
      className="glass flex flex-col gap-4 rounded-card p-6"
    >
      <h2 id="confirmation-lines" className="text-lg">
        {CONFIRMATION_MESSAGES.linesTitle}
      </h2>
      <ul className="flex flex-col gap-3 text-sm">
        {order.orderItems.map((item) => (
          <li key={item.orderItemUuid} className="flex items-center gap-3">
            <LineThumbnail
              src={photos.get(item.productUuid) ?? null}
              category={item.category ?? null}
            />
            <span className="min-w-0 flex-1">
              {item.productName}{" "}
              <span className="text-text-muted">
                {CHECKOUT_SUMMARY_MESSAGES.quantity(item.quantity)}
              </span>
            </span>
            <span className="price shrink-0">{formatPrice(item.lineItemTotalPrice)}</span>
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
 * What happens after the order, with the way to follow it and to keep shopping.
 *
 * @param props - The order UUID.
 * @returns The section.
 */
function NextSteps({ orderUuid }: { readonly orderUuid: string }): ReactNode {
  return (
    <section
      aria-labelledby="confirmation-next"
      className="glass flex flex-col gap-4 rounded-card p-6"
    >
      <h2 id="confirmation-next" className="flex items-center gap-2 text-lg">
        <Sparkles aria-hidden className="size-5 text-gold" />
        {CONFIRMATION_MESSAGES.nextStepsTitle}
      </h2>
      <ol className="flex flex-col gap-3 text-sm text-text-muted">
        {CONFIRMATION_MESSAGES.nextSteps.map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span
              aria-hidden
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs text-text"
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-4">
        <MagneticButton>
          <Link href={orderPath(orderUuid)} className={PRIMARY_CTA_CLASS}>
            {CONFIRMATION_MESSAGES.viewOrder}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </MagneticButton>
        <Link
          href={CATALOG_PATH}
          className="text-sm text-brand-text underline-offset-4 hover:underline"
        >
          {CONFIRMATION_MESSAGES.continueShopping}
        </Link>
      </div>
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
  const photos = await readLinePhotos(order);
  const number = CONFIRMATION_MESSAGES.orderNumber(shortOrderNumber(order.uuid));
  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            steps={[
              { href: HOME_PATH, label: COMMON_MESSAGES.breadcrumbHome },
              { href: ACCOUNT_PATHS.orders, label: CONFIRMATION_MESSAGES.breadcrumbOrders },
              { href: null, label: number },
            ]}
          />
        }
        title={<LiveTitle text={CONFIRMATION_MESSAGES.pageTitle} className={PAGE_TITLE_CLASS} />}
        subtitle={number}
      />
      <div className="grid items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <PaymentTracker orderUuid={order.uuid} withLinks={false} />
          <NextSteps orderUuid={order.uuid} />
          <PushOptIn />
        </div>
        <div className="lg:col-span-5">
          <OrderRecap order={order} photos={photos} />
        </div>
      </div>
    </PageShell>
  );
}
