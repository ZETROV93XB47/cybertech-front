/**
 * Wishlist endpoints of the backend: the caller's wishlist (paginated, or its product UUIDs for
 * the hearts), add and remove. Every call needs the user's access token and is never cached.
 *
 * Add and remove are idempotent from the front's point of view: « already in the wishlist »
 * (`409 PRODUCT_ALREADY_IN_WISHLIST`) is a successful add and « not in the wishlist » (`404`) a
 * successful removal (FR-036). Reads are retried once on a temporary unavailability.
 *
 * @see specs/003-account-orders/research.md R22
 * @see docs/backend/api-map.md §9
 * @see WishlistManagementController, WishlistServiceImp (backend)
 */
import "server-only";

import { z } from "zod";

import { backendFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { withSingleRetry } from "@/lib/api/retry";
import { BACKEND_PATHS, BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import { WISHLIST_IDS_MAX, WISHLIST_PAGE_SIZE, WISHLIST_SORT } from "@/lib/constants/wishlist";
import { BackendErrorCode, FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { createModuleLogger } from "@/lib/logger";
import { WishlistItemSchema, WishlistPageSchema, type WishlistPage } from "@/lib/schemas/wishlist";

const log = createModuleLogger("wishlist.toggle");

/** Offset between the 1-based page of the URL and the 0-based page of Spring. */
const PAGE_INDEX_OFFSET = 1;

/** First page of the URL (1-based). */
const FIRST_PAGE = 1;

/**
 * Retry policy of the reads: one more attempt only when the backend was unavailable.
 *
 * @param error - Error of the first attempt.
 * @returns `true` for a temporary unavailability.
 */
function isRetryableRead(error: unknown): boolean {
  return error instanceof ApiError && error.frontCode === FrontErrorCode.UNAVAILABLE;
}

/**
 * Reads one page of the wishlist.
 *
 * @param page - 1-based page.
 * @param size - Page size.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The page.
 * @throws {ApiError} `UNAUTHENTICATED`, or `UNAVAILABLE` after the single retry.
 */
function readWishlistPage(page: number, size: number, accessToken: string): Promise<WishlistPage> {
  return withSingleRetry(
    () =>
      backendFetch(BACKEND_PATHS.wishlistMine, {
        schema: WishlistPageSchema,
        query: {
          [BACKEND_QUERY_PARAMS.page]: String(page - PAGE_INDEX_OFFSET),
          [BACKEND_QUERY_PARAMS.size]: String(size),
          [BACKEND_QUERY_PARAMS.sort]: WISHLIST_SORT,
        },
        accessToken,
      }),
    isRetryableRead,
  );
}

/**
 * Reads one page of « Ma wishlist », newest first.
 *
 * @param page - 1-based page of the URL.
 * @param accessToken - Keycloak access token; never logged.
 * @returns The page of {@link WISHLIST_PAGE_SIZE} entries.
 * @throws {ApiError} `UNAUTHENTICATED`, or `UNAVAILABLE` after the single retry.
 * @see WishlistManagementController#getMyWishlist (backend)
 */
export async function getMyWishlist(page: number, accessToken: string): Promise<WishlistPage> {
  return readWishlistPage(page, WISHLIST_PAGE_SIZE, accessToken);
}

/**
 * Reads the product UUIDs of the wishlist, to colour the hearts (at most
 * {@link WISHLIST_IDS_MAX}, newest first).
 *
 * @param accessToken - Keycloak access token; never logged.
 * @returns The product UUIDs.
 * @throws {ApiError} `UNAUTHENTICATED`, or `UNAVAILABLE` after the single retry.
 */
export async function getWishlistProductUuids(accessToken: string): Promise<string[]> {
  const page = await readWishlistPage(FIRST_PAGE, WISHLIST_IDS_MAX, accessToken);
  return page.content.map((item) => item.product.uuid);
}

/**
 * Adds a product to the wishlist; a product already in it counts as added.
 *
 * @param productUuid - Product UUID, already validated.
 * @param accessToken - Keycloak access token; never logged.
 * @throws {ApiError} `NOT_FOUND` for an unknown product, `UNAVAILABLE`, `RATE_LIMITED`.
 * @see WishlistServiceImp#addProductToMyWishlist (backend)
 */
export async function addToWishlist(productUuid: string, accessToken: string): Promise<void> {
  try {
    await backendFetch(`${BACKEND_PATHS.wishlistAdd}/${productUuid}`, {
      schema: WishlistItemSchema,
      method: HttpMethod.POST,
      accessToken,
    });
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.backendCode === BackendErrorCode.PRODUCT_ALREADY_IN_WISHLIST
    ) {
      log.info({ productUuid }, "Product already in the wishlist, add counted as done");
      return;
    }
    throw error;
  }
}

/**
 * Removes a product from the wishlist; a product already absent counts as removed.
 *
 * @param productUuid - Product UUID, already validated.
 * @param accessToken - Keycloak access token; never logged.
 * @throws {ApiError} `UNAVAILABLE`, `RATE_LIMITED`.
 * @see WishlistServiceImp#removeProductFromMyWishlist (backend)
 */
export async function removeFromWishlist(productUuid: string, accessToken: string): Promise<void> {
  try {
    await backendFetch(`${BACKEND_PATHS.wishlistRemove}/${productUuid}`, {
      schema: z.undefined(),
      method: HttpMethod.DELETE,
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.NOT_FOUND) {
      log.info({ productUuid }, "Product not in the wishlist, removal counted as done");
      return;
    }
    throw error;
  }
}
