/**
 * Cart schemas: backend cart (`CartResponseDto`), the `CartView` shared by the guest and account
 * carts, the merge report and the bodies of the cart BFF routes.
 *
 * Shared by the server (which builds the views) and the client (which validates what the BFF
 * sends), so this module has no server-only import.
 *
 * @see docs/guest-cart.md §6
 * @see specs/001-catalog-auth-cart/data-model.md §1 (AccountCart), §4
 * @see docs/backend/api-map.md D.16
 */
import { z } from "zod";

import { GUEST_CART_MAX_LINES } from "@/lib/constants/cart";
import { CartLineStatus, CartSource, MergeDropReason } from "@/lib/enums/cart";

import { CartQuantitySchema, GuestLineSchema, type GuestLine } from "./storage";

export { GuestLineSchema, type GuestLine };

/** `CartItemResponseDto`: one line of the account cart (no image, api-map D.16). */
export const AccountCartItemSchema = z.object({
  cartItemUuid: z.uuid(),
  productUuid: z.uuid(),
  productName: z.string(),
  quantity: z.int().min(1),
  unitPrice: z.number().nonnegative(),
  lineItemTotalPrice: z.number().nonnegative(),
  /**
   * Category key of the product (`COMPUTER`, `SMARTPHONE`…, backend `abe674d`); free text, read
   * through `toCategoryKey`. Optional so that an older backend still parses.
   */
  category: z.string().min(1).optional(),
});

/** One line of the account cart, as sent by the backend. */
export type AccountCartItem = z.infer<typeof AccountCartItemSchema>;

/**
 * `CartResponseDto`. A user without a cart gets an object whose fields are all `null`
 * (api-map E.13): every field is nullable and normalised before use.
 */
export const AccountCartSchema = z.object({
  cartUuid: z.uuid().nullish(),
  userUuid: z.uuid().nullish(),
  items: z.array(AccountCartItemSchema).nullish(),
  totalPrice: z.number().nonnegative().nullish(),
});

/** Account cart, as sent by the backend. */
export type AccountCart = z.infer<typeof AccountCartSchema>;

/** One displayed cart line, whatever the source. */
export const CartLineSchema = z.object({
  productUuid: z.uuid(),
  /** Empty for a guest line whose product no longer exists. */
  name: z.string(),
  imageUrl: z.url().nullable(),
  unitPrice: z.number().nonnegative(),
  quantity: z.int().min(1),
  lineTotal: z.number().nonnegative(),
  /** `null` when the stock could not be read. */
  availableStock: z.int().nonnegative().nullable(),
  status: z.enum(CartLineStatus),
});

/** One displayed cart line. */
export type CartLine = z.infer<typeof CartLineSchema>;

/** Same view for the guest and the account cart (docs/guest-cart.md §1). */
export const CartViewSchema = z.object({
  source: z.enum(CartSource),
  cartUuid: z.uuid().nullable(),
  lines: z.array(CartLineSchema),
  total: z.number().nonnegative(),
  /** `true` for a guest: prices are re-read live and the backend computes the real total later. */
  totalIsEstimate: z.boolean(),
  /** Sum of the quantities. */
  itemCount: z.int().nonnegative(),
});

/** Cart shown by every component. */
export type CartView = z.infer<typeof CartViewSchema>;

/** A guest line merged with a quantity lowered to the available stock. */
export const CappedLineSchema = z.object({
  productUuid: z.uuid(),
  requested: CartQuantitySchema,
  added: CartQuantitySchema,
});

/** A guest line that could not be merged at all. */
export const DroppedLineSchema = z.object({
  productUuid: z.uuid(),
  reason: z.enum(MergeDropReason),
});

/** Result of the guest cart merge (docs/guest-cart.md §4). */
export const MergeReportSchema = z.object({
  cart: CartViewSchema,
  /** Lines merged with their full quantity. */
  merged: z.array(z.uuid()),
  capped: z.array(CappedLineSchema),
  dropped: z.array(DroppedLineSchema),
  /** Lines that failed for a technical reason; kept in the browser to be retried. */
  failed: z.array(GuestLineSchema),
});

/** Result of the guest cart merge. */
export type MergeReport = z.infer<typeof MergeReportSchema>;

/** Body of `POST /api/cart/preview` and `POST /api/cart/merge`. */
export const GuestLinesBodySchema = z.object({
  items: z.array(GuestLineSchema).max(GUEST_CART_MAX_LINES),
});

/** Body of `POST /api/cart`: additive add. */
export const CartAddBodySchema = GuestLineSchema;

/** Body of `PATCH /api/cart/items/[productUuid]`: absolute quantity. */
export const CartQuantityBodySchema = z.object({ quantity: CartQuantitySchema });
