/**
 * Pure builders of the {@link CartView} shared by the guest and account carts.
 *
 * Kept free of I/O so the normalisation rules (null backend fields, line statuses, estimated
 * total) are unit-tested on their own; `features/cart/server/cart-view.ts` loads the data and
 * calls these builders.
 *
 * @see docs/guest-cart.md §1, §3, §6
 * @see specs/001-catalog-auth-cart/data-model.md §4
 */
import { assertNever } from "@/lib/assert-never";
import { CartAction, CartLineStatus, CartSource } from "@/lib/enums/cart";
import type {
  AccountCart,
  AccountCartItem,
  CartLine,
  CartView,
  GuestLine,
} from "@/lib/schemas/cart";
import type { ProductAvailability, ProductCard } from "@/lib/schemas/product";

/** A change of a displayed cart (same shape for the guest and the account cart). */
export type CartViewChange =
  | { readonly action: CartAction.ADD; readonly productUuid: string; readonly quantity: number }
  | { readonly action: CartAction.SET; readonly productUuid: string; readonly quantity: number }
  | { readonly action: CartAction.REMOVE; readonly productUuid: string }
  | { readonly action: CartAction.CLEAR };

/** Cents per euro, used to round sums of floating-point prices. */
const CENTS_PER_EURO = 100;

/** Product data and live stock used to complete the cart lines, by product UUID. */
export interface CartEnrichment {
  /** Cards of the products that still exist; a missing UUID means the product was deleted. */
  readonly products: ReadonlyMap<string, ProductCard>;
  /** Live stock; a missing UUID means the stock is unknown. */
  readonly stock: ReadonlyMap<string, ProductAvailability>;
}

/**
 * Rounds an amount to the cent.
 *
 * @param amount - Amount in euros.
 * @returns The amount rounded to two decimals.
 */
export function roundToCents(amount: number): number {
  return Math.round(amount * CENTS_PER_EURO) / CENTS_PER_EURO;
}

/**
 * Units that can really be ordered: zero when the product is flagged out of stock.
 *
 * @param availability - Live stock, if known.
 * @returns The orderable quantity, or `null` when unknown.
 */
export function orderableStock(availability: ProductAvailability | undefined): number | null {
  if (!availability) {
    return null;
  }
  return availability.inStock ? availability.availableStock : 0;
}

/**
 * Status of a line whose product exists.
 *
 * @param quantity - Quantity in the cart.
 * @param stock - Orderable stock, `null` when unknown (the backend checks again anyway).
 * @returns `INSUFFICIENT_STOCK` when the stock is known and lower than the quantity, else `OK`.
 */
function stockStatus(quantity: number, stock: number | null): CartLineStatus {
  return stock !== null && quantity > stock ? CartLineStatus.INSUFFICIENT_STOCK : CartLineStatus.OK;
}

/**
 * Sums the lines of a view.
 *
 * @param source - Cart source.
 * @param cartUuid - Account cart UUID, `null` for a guest.
 * @param lines - Displayed lines.
 * @param backendTotal - Total computed by the backend (account), or `undefined` to estimate it.
 * @returns The view.
 */
function toView(
  source: CartSource,
  cartUuid: string | null,
  lines: readonly CartLine[],
  backendTotal?: number,
): CartView {
  const counted = lines.filter((line) => line.status !== CartLineStatus.UNAVAILABLE);
  const estimate = roundToCents(counted.reduce((sum, line) => sum + line.lineTotal, 0));
  return {
    source,
    cartUuid,
    lines: [...lines],
    total: backendTotal ?? estimate,
    totalIsEstimate: backendTotal === undefined,
    itemCount: counted.reduce((sum, line) => sum + line.quantity, 0),
  };
}

/**
 * Builds an empty cart view.
 *
 * @param source - Cart source.
 * @returns A view without lines, total 0.
 */
export function emptyCartView(source: CartSource): CartView {
  return toView(source, null, [], source === CartSource.ACCOUNT ? 0 : undefined);
}

/**
 * Builds one account line.
 *
 * @param item - Backend line.
 * @param enrichment - Product data and stock, or `null` when they could not be loaded.
 * @returns The displayed line.
 */
function toAccountLine(item: AccountCartItem, enrichment: CartEnrichment | null): CartLine {
  const product = enrichment?.products.get(item.productUuid);
  const stock = orderableStock(enrichment?.stock.get(item.productUuid));
  const deleted = enrichment !== null && product === undefined;
  return {
    productUuid: item.productUuid,
    name: item.productName,
    imageUrl: product?.imageUrl ?? null,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineItemTotalPrice,
    availableStock: stock,
    status: deleted ? CartLineStatus.UNAVAILABLE : stockStatus(item.quantity, stock),
  };
}

/**
 * Normalises the backend cart into a view. `items ?? []` and `totalPrice ?? 0`: a user without a
 * cart gets an object whose fields are all `null` (api-map E.13).
 *
 * @param cart - Backend cart.
 * @param enrichment - Product data and stock, or `null` when they could not be loaded (lines are
 * then shown without image nor stock rather than failing the whole cart).
 * @returns The account view; its total is the backend one (`totalIsEstimate: false`).
 */
export function buildAccountCartView(
  cart: AccountCart,
  enrichment: CartEnrichment | null,
): CartView {
  const lines = (cart.items ?? []).map((item) => toAccountLine(item, enrichment));
  return toView(CartSource.ACCOUNT, cart.cartUuid ?? null, lines, cart.totalPrice ?? 0);
}

/**
 * Builds one guest line from the live product data.
 *
 * @param line - Stored guest line.
 * @param enrichment - Product data and stock.
 * @returns The displayed line; `UNAVAILABLE` with an empty name when the product was deleted.
 */
function toGuestLine(line: GuestLine, enrichment: CartEnrichment): CartLine {
  const product = enrichment.products.get(line.productUuid);
  if (!product) {
    return {
      productUuid: line.productUuid,
      name: "",
      imageUrl: null,
      unitPrice: 0,
      quantity: line.quantity,
      lineTotal: 0,
      availableStock: null,
      status: CartLineStatus.UNAVAILABLE,
    };
  }
  const stock = orderableStock(enrichment.stock.get(line.productUuid));
  return {
    productUuid: line.productUuid,
    name: product.name,
    imageUrl: product.imageUrl,
    unitPrice: product.price,
    quantity: line.quantity,
    lineTotal: roundToCents(product.price * line.quantity),
    availableStock: stock,
    status: stockStatus(line.quantity, stock),
  };
}

/**
 * Builds the guest view: prices re-read live, a status per line, an estimated total.
 *
 * @param lines - Stored guest lines.
 * @param enrichment - Product data and stock.
 * @returns The guest view (`totalIsEstimate: true`).
 */
export function buildGuestCartView(
  lines: readonly GuestLine[],
  enrichment: CartEnrichment,
): CartView {
  return toView(
    CartSource.GUEST,
    null,
    lines.map((line) => toGuestLine(line, enrichment)),
  );
}

/**
 * Applies a quantity to one displayed line and recomputes its subtotal.
 *
 * @param line - Displayed line.
 * @param quantity - New quantity.
 * @returns The updated line.
 */
function withQuantity(line: CartLine, quantity: number): CartLine {
  return { ...line, quantity, lineTotal: roundToCents(line.unitPrice * quantity) };
}

/**
 * Predicts the view after a change, for an optimistic update. Replaced by the server view as soon
 * as it arrives (or rolled back on error). An added product that is not displayed yet only
 * increases the item count: its name and price are unknown until the server answers.
 *
 * @param view - Current view.
 * @param change - Requested change.
 * @returns The predicted view.
 */
export function predictCartView(view: CartView, change: CartViewChange): CartView {
  const backendTotal = view.totalIsEstimate ? undefined : 0;
  switch (change.action) {
    case CartAction.ADD: {
      const line = view.lines.find((item) => item.productUuid === change.productUuid);
      if (!line) {
        return { ...view, itemCount: view.itemCount + change.quantity };
      }
      return predictCartView(view, {
        ...change,
        action: CartAction.SET,
        quantity: line.quantity + change.quantity,
      });
    }
    case CartAction.SET: {
      const lines = view.lines.map((line) =>
        line.productUuid === change.productUuid ? withQuantity(line, change.quantity) : line,
      );
      return withEstimatedTotal(view, lines, backendTotal);
    }
    case CartAction.REMOVE:
      return withEstimatedTotal(
        view,
        view.lines.filter((line) => line.productUuid !== change.productUuid),
        backendTotal,
      );
    case CartAction.CLEAR:
      return withEstimatedTotal(view, [], backendTotal);
    default:
      return assertNever(change);
  }
}

/**
 * Rebuilds a view around new lines, with a total summed from the lines.
 *
 * @param view - Previous view (source and cart UUID are kept).
 * @param lines - New lines.
 * @param backendTotal - `undefined` to keep the view marked as estimated.
 * @returns The new view.
 */
function withEstimatedTotal(
  view: CartView,
  lines: readonly CartLine[],
  backendTotal: number | undefined,
): CartView {
  const estimated = toView(view.source, view.cartUuid, lines);
  return backendTotal === undefined ? estimated : { ...estimated, totalIsEstimate: false };
}
