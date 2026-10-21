import "server-only";

/**
 * Server reads of the order pages: the order itself (a missing or foreign order is a 404 page)
 * and which of its products are still in the catalog, in one availability call for all lines.
 *
 * @see specs/003-account-orders/data-model.md §4.5
 * @see specs/003-account-orders/spec.md Edge Cases « produit retiré du catalogue »
 */
import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import { getOrder } from "@/lib/api/endpoints/orders";
import { getAvailability } from "@/lib/api/endpoints/products";
import { getReviewableProducts } from "@/lib/api/endpoints/reviews";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger, maskUuid } from "@/lib/logger";
import type { OrderResponse } from "@/lib/schemas/order";

const log = createModuleLogger("orders.read");

/**
 * Reads one order of the caller, or renders the « commande introuvable » page.
 *
 * @param uuid - Order UUID, already validated.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The order.
 * @throws {ApiError} When the backend is unavailable (error boundary).
 */
export async function readOrder(uuid: string, accessToken: string): Promise<OrderResponse> {
  try {
    return await getOrder(uuid, accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.NOT_FOUND) {
      log.info({ orderUuid: maskUuid(uuid) }, "Order not found for the caller");
      notFound();
    }
    throw error;
  }
}

/**
 * UUIDs of the order products still in the catalog (present in `GET /product/availability`).
 * A failure only removes the product links, so it is logged and swallowed.
 *
 * @param order - Order.
 * @returns The UUIDs, or `null` when the availability could not be read.
 */
export async function readCatalogUuids(order: OrderResponse): Promise<ReadonlySet<string> | null> {
  try {
    const availability = await getAvailability(order.orderItems.map((item) => item.productUuid));
    return new Set(availability.map((entry) => entry.productUuid));
  } catch (error) {
    log.warn(
      { orderUuid: maskUuid(order.uuid), code: error instanceof ApiError ? error.frontCode : null },
      "Availability unreadable, order lines left unlinked",
    );
    return null;
  }
}

/**
 * Products of this order the customer can still review (FR-019); a bonus, so a failure only
 * hides the « Donner mon avis » links.
 *
 * @param orderUuid - Order shown.
 * @param accessToken - The user's access token; never logged.
 * @returns The product UUIDs reviewable for this order, empty on failure.
 * @see specs/004-catalog-promos-reviews/spec.md FR-019
 */
export async function readReviewableProductUuids(
  orderUuid: string,
  accessToken: string,
): Promise<ReadonlySet<string>> {
  try {
    const reviewable = await getReviewableProducts(accessToken);
    return new Set(
      reviewable.filter((entry) => entry.orderUuid === orderUuid).map((entry) => entry.productUuid),
    );
  } catch (error) {
    log.warn(
      { orderUuid: maskUuid(orderUuid), code: error instanceof ApiError ? error.frontCode : null },
      "Reviewable products unreadable, review links hidden",
    );
    return new Set();
  }
}
