/**
 * Wishlist schemas: a backend wishlist entry and its page, the product UUIDs sent to the
 * browser, and the add kept aside while a visitor signs in.
 *
 * @see specs/003-account-orders/data-model.md §4.8
 * @see docs/backend/api-map.md §9, D.19
 */
import { z } from "zod";

import { WISHLIST_IDS_MAX } from "@/lib/constants/wishlist";

import { pagedSchema } from "./paged";
import { ProductSchema } from "./product";

/** `WishlistResponseDto`: one product of the wishlist and when it was added. */
export const WishlistItemSchema = z.object({
  uuid: z.uuid(),
  product: ProductSchema,
  /** `LocalDateTime` without a time zone, kept as a string. */
  addedAt: z.string().min(1),
});

/** One wishlist entry. */
export type WishlistItem = z.infer<typeof WishlistItemSchema>;

/** Page of `GET /wishlist/my-wishlist`. */
export const WishlistPageSchema = pagedSchema(WishlistItemSchema);

/** A page of the wishlist. */
export type WishlistPage = z.infer<typeof WishlistPageSchema>;

/** Body of `GET /api/wishlist/ids`. */
export const WishlistIdsSchema = z.object({
  productUuids: z.array(z.uuid()).max(WISHLIST_IDS_MAX),
});

/** Product UUIDs of the wishlist. */
export type WishlistIds = z.infer<typeof WishlistIdsSchema>;

/** Body of `PUT` / `DELETE /api/wishlist/[productUuid]`. */
export const WishlistToggleResultSchema = z.object({
  productUuid: z.uuid(),
  /** Whether the product is now in the wishlist. */
  isInWishlist: z.boolean(),
});

/** Result of a wishlist change. */
export type WishlistToggleResult = z.infer<typeof WishlistToggleResultSchema>;

/**
 * Add kept in `sessionStorage` while a visitor signs in (`ct_wishlist_pending_v1`): a product
 * UUID only, nothing personal.
 */
export const WishlistPendingSchema = z.object({ productUuid: z.uuid() });

/** Wishlist add kept aside. */
export type WishlistPending = z.infer<typeof WishlistPendingSchema>;
