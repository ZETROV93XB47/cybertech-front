/**
 * Schemas of the data kept in the browser (guest cart, recently viewed, pending action).
 *
 * The browser content can be edited by the user, so it is validated on every read; invalid data
 * is discarded rather than trusted (constitution IV).
 *
 * @see docs/guest-cart.md §2
 * @see specs/001-catalog-auth-cart/data-model.md §3
 */
import { z } from "zod";

import {
  CART_LINE_MAX_QUANTITY,
  CART_LINE_MIN_QUANTITY,
  GUEST_CART_MAX_LINES,
} from "@/lib/constants/cart";
import { RECENTLY_VIEWED_MAX } from "@/lib/constants/catalog";
import { PendingActionType } from "@/lib/enums/cart";

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

/** Content of `ct_recent_v1`: most recent first, no duplicate. */
export const RecentlyViewedSchema = z.object({
  uuids: z
    .array(z.uuid())
    .max(RECENTLY_VIEWED_MAX)
    .refine((uuids) => new Set(uuids).size === uuids.length, { message: "Duplicate UUID" }),
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
