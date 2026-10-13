/**
 * Server side of the cart view: loads the product data and live stock that complete the cart
 * lines, then builds the {@link CartView} with the pure builders of `features/cart/cart-view.ts`.
 *
 * Product cards come from the Next.js data cache (60 s); the stock is always read live (FR-007).
 *
 * @see docs/guest-cart.md §3, §5
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import "server-only";

import { getAvailability, getProductsByUuids } from "@/lib/api/endpoints/products";
import { createModuleLogger } from "@/lib/logger";
import type { AccountCart, CartView, GuestLine } from "@/lib/schemas/cart";

import { buildAccountCartView, buildGuestCartView, type CartEnrichment } from "../cart-view";

const log = createModuleLogger("cart.view");

/**
 * Loads the product cards and the live stock of a list of products.
 *
 * @param uuids - Product UUIDs of the cart lines.
 * @returns The enrichment, empty maps when there is no line.
 * @throws {ApiError} When the backend is unavailable.
 */
export async function loadCartEnrichment(uuids: readonly string[]): Promise<CartEnrichment> {
  if (uuids.length === 0) {
    return { products: new Map(), stock: new Map() };
  }
  const distinct = [...new Set(uuids)];
  const [products, stock] = await Promise.all([
    getProductsByUuids(distinct),
    getAvailability(distinct),
  ]);
  return {
    products: new Map(products.map((product) => [product.uuid, product])),
    stock: new Map(stock.map((item) => [item.productUuid, item])),
  };
}

/**
 * Builds the account view of a backend cart.
 *
 * The cart itself comes from the backend; images and stock are a bonus: when they cannot be
 * loaded the lines are shown without them instead of failing the whole cart.
 *
 * @param cart - Backend cart (`CartResponseDto`).
 * @returns The account view.
 */
export async function toAccountCartView(cart: AccountCart): Promise<CartView> {
  const uuids = (cart.items ?? []).map((item) => item.productUuid);
  try {
    return buildAccountCartView(cart, await loadCartEnrichment(uuids));
  } catch {
    log.warn({ lines: uuids.length }, "Cart lines shown without images and stock");
    return buildAccountCartView(cart, null);
  }
}

/**
 * Builds the guest view of the lines stored in the browser (prices and stock re-read live).
 *
 * @param lines - Guest lines, already validated by Zod.
 * @returns The guest view.
 * @throws {ApiError} When the backend is unavailable (the stock check is the point of the call).
 */
export async function toGuestCartView(lines: readonly GuestLine[]): Promise<CartView> {
  const enrichment = await loadCartEnrichment(lines.map((line) => line.productUuid));
  return buildGuestCartView(lines, enrichment);
}
