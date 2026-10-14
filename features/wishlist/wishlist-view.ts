/**
 * Rows of « Ma wishlist », built on the server from the backend page: only what a row shows,
 * the price copied from the product (never computed), the date of the add formatted in French.
 *
 * @see specs/003-account-orders/data-model.md §4.8
 */
import { WISHLIST_PAGE_PARAM } from "@/lib/constants/wishlist";
import { ACCOUNT_PATHS, productPath } from "@/lib/constants/routes";
import { formatDay } from "@/lib/format";
import type { WishlistItem } from "@/lib/schemas/wishlist";

/** First page of the list (1-based). */
const FIRST_PAGE = 1;

/** One product of « Ma wishlist ». */
export interface WishlistRow {
  readonly productUuid: string;
  readonly name: string;
  readonly category: string;
  readonly price: number;
  /** First photo, `null` when the product has none. */
  readonly imageUrl: string | null;
  /** Path of the product page. */
  readonly href: string;
  /** Day of the add (« 14 octobre »), `null` when the backend date is unreadable. */
  readonly addedOn: string | null;
}

/**
 * Turns the backend entries into rows, in the backend order (newest first).
 *
 * @param items - Entries of one page.
 * @returns The rows.
 */
export function toWishlistRows(items: readonly WishlistItem[]): WishlistRow[] {
  return items.map(({ product, addedAt }) => ({
    productUuid: product.uuid,
    name: product.name,
    category: product.category,
    price: product.price,
    imageUrl: product.photoUrls[0] ?? null,
    href: productPath(product.uuid),
    addedOn: formatDay(addedAt),
  }));
}

/**
 * Builds the path of one page of « Ma wishlist ».
 *
 * @param page - 1-based page.
 * @returns `/account/wishlist` for the first page, `/account/wishlist?page=N` otherwise.
 */
export function wishlistPagePath(page: number): string {
  if (page <= FIRST_PAGE) {
    return ACCOUNT_PATHS.wishlist;
  }
  return `${ACCOUNT_PATHS.wishlist}?${new URLSearchParams({ [WISHLIST_PAGE_PARAM]: String(page) }).toString()}`;
}
