/**
 * Schemas of the data kept in the browser (guest cart, recently viewed, pending action, product
 * comparison, checkout draft).
 *
 * The browser content can be edited by the user, so it is validated on every read; invalid data
 * is discarded rather than trusted (constitution IV).
 *
 * @see docs/guest-cart.md §2
 * @see specs/001-catalog-auth-cart/data-model.md §3
 * @see specs/002-catalog-refresh/data-model.md §5
 */
import { z } from "zod";

import {
  CART_LINE_MAX_QUANTITY,
  CART_LINE_MIN_QUANTITY,
  GUEST_CART_MAX_LINES,
} from "@/lib/constants/cart";
import { RECENTLY_VIEWED_MAX } from "@/lib/constants/catalog";
import { COMPARE_MAX_PRODUCTS } from "@/lib/constants/compare";
import { ORDER_MAX_LINES } from "@/lib/constants/orders";
import { PendingActionType } from "@/lib/enums/cart";
import { CategoryKey } from "@/lib/enums/category-key";
import { CheckoutStep } from "@/lib/enums/checkout";
import { PaymentType } from "@/lib/enums/order";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";

/** Quantity of one cart line chosen in the UI. */
export const CartQuantitySchema = z.int().min(CART_LINE_MIN_QUANTITY).max(CART_LINE_MAX_QUANTITY);

/** One guest cart line: identifiers and quantity only, never a price. */
export const GuestLineSchema = z.object({
  productUuid: z.uuid(),
  quantity: CartQuantitySchema,
});

/** One guest cart line. */
export type GuestLine = z.infer<typeof GuestLineSchema>;

/** Content of `ct_guest_cart_v1`. */
export const GuestCartStorageSchema = z.object({
  items: z.array(GuestLineSchema).max(GUEST_CART_MAX_LINES),
  updatedAt: z.iso.datetime(),
});

/** Stored guest cart. */
export type GuestCartStorage = z.infer<typeof GuestCartStorageSchema>;

/** Message of a list holding the same UUID twice. */
const DUPLICATE_UUID_MESSAGE = "Duplicate UUID";

/**
 * Tells whether a list holds each UUID once.
 *
 * @param uuids - UUIDs to check.
 * @returns `true` without duplicates.
 */
function isDistinct(uuids: readonly string[]): boolean {
  return new Set(uuids).size === uuids.length;
}

/** Content of `ct_recent_v1`: most recent first, no duplicate. */
export const RecentlyViewedSchema = z.object({
  uuids: z
    .array(z.uuid())
    .max(RECENTLY_VIEWED_MAX)
    .refine(isDistinct, { message: DUPLICATE_UUID_MESSAGE }),
});

/** Stored recently viewed products. */
export type RecentlyViewed = z.infer<typeof RecentlyViewedSchema>;

/** Content of `ct_pending_action_v1`: one cart action to replay after sign-in. */
export const PendingActionSchema = z.object({
  type: z.enum(PendingActionType),
  productUuid: z.uuid(),
  quantity: CartQuantitySchema.optional(),
});

/** Cart action waiting for the user to sign in again. */
export type PendingAction = z.infer<typeof PendingActionSchema>;

/**
 * Content of `ct_compare_v1`: the category of the comparison and 1 to
 * {@link COMPARE_MAX_PRODUCTS} distinct product UUIDs, in insertion order. An empty selection
 * is not stored (the key is removed).
 *
 * @see specs/002-catalog-refresh/data-model.md §5
 */
export const CompareSelectionSchema = z.object({
  category: z.enum(CategoryKey),
  uuids: z
    .array(z.uuid())
    .min(1)
    .max(COMPARE_MAX_PRODUCTS)
    .refine(isDistinct, { message: DUPLICATE_UUID_MESSAGE }),
});

/** Stored product comparison selection. */
export type CompareSelection = z.infer<typeof CompareSelectionSchema>;

/**
 * Content of `ct_checkout_v1`: the non-personal choices of the checkout, restored after a
 * forced sign-in so the customer only has to click « Valider la commande » again (never replayed
 * automatically, FR-002).
 *
 * Strict on purpose: the address is personal data and is never kept in the browser; a stored
 * value carrying any extra field (an address, for instance) is rejected and removed.
 *
 * @see specs/003-account-orders/data-model.md §4.3
 * @see specs/003-account-orders/research.md R9
 */
export const CheckoutDraftSchema = z.strictObject({
  step: z.enum(CheckoutStep),
  shippingType: z.enum(ShippingType).optional(),
  shippingProvider: z.enum(ShippingProvider).optional(),
  paymentType: z.enum(PaymentType).optional(),
  /** The address had been edited for this order: the checkout warns it was reset. */
  hadCustomAddress: z.boolean(),
});

/** Stored checkout draft. */
export type CheckoutDraft = z.infer<typeof CheckoutDraftSchema>;

/** One line of a stored order edit. */
export const OrderEditDraftLineSchema = z.strictObject({
  productUuid: z.uuid(),
  productName: z.string().min(1),
  quantity: z.int().min(CART_LINE_MIN_QUANTITY).max(CART_LINE_MAX_QUANTITY),
  /** Unit price shown for a line added during the edit; `null` for an existing line. */
  unitPrice: z.number().nonnegative().nullable(),
  isAdded: z.boolean(),
});

/**
 * Order edit kept in `sessionStorage` (`ct_order_edit_v1`) before a forced re-login: the lines,
 * shipping and payment of one order, **never the address** (personal data, constitution IV).
 * Restored once on the edit page of the same order; never saved automatically (FR-002).
 *
 * @see specs/003-account-orders/tasks.md T053
 */
export const OrderEditDraftSchema = z.strictObject({
  orderUuid: z.uuid(),
  lines: z.array(OrderEditDraftLineSchema).min(1).max(ORDER_MAX_LINES),
  shippingType: z.enum(ShippingType),
  shippingProvider: z.enum(ShippingProvider),
  paymentType: z.enum(PaymentType).optional(),
});

/** Stored order edit. */
export type OrderEditDraft = z.infer<typeof OrderEditDraftSchema>;
