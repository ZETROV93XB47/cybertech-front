"use client";

/**
 * Wishlist state on the client: the product UUIDs of the signed-in user's wishlist, read once
 * per page view and shared by every heart (FR-039), and the add / remove change, applied
 * optimistically then rolled back when the BFF refuses it (FR-035).
 *
 * A visitor has no wishlist: the query stays disabled and every heart is empty.
 *
 * @see specs/003-account-orders/research.md R22
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useCallback } from "react";

import { BffError, bffGet, bffSend } from "@/lib/api/bff-client";
import { BFF_ROUTES, wishlistItemRoute } from "@/lib/constants/routes";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { QueryKey } from "@/lib/enums/query-key";
import { WishlistIdsSchema, WishlistToggleResultSchema } from "@/lib/schemas/wishlist";

/** Session status of Auth.js meaning « signed in ». */
const AUTHENTICATED_STATUS = "authenticated";

/** Session status of Auth.js while the session is being read. */
const LOADING_STATUS = "loading";

/** No product: the wishlist of a visitor, or before the first answer. */
const EMPTY_IDS: readonly string[] = [];

/** Result of {@link useWishlistIds}. */
export interface UseWishlistIdsResult {
  /** Whether a usable session exists (otherwise the heart asks to sign in). */
  readonly isSignedIn: boolean;
  /** Whether the session status is known. */
  readonly isReady: boolean;
  /** Tells whether a product is in the wishlist. */
  readonly has: (productUuid: string) => boolean;
}

/** Outcome of a heart click. */
export type WishlistChangeResult =
  { readonly ok: true } | { readonly ok: false; readonly code: FrontErrorCode };

/**
 * Query key of the wishlist product UUIDs.
 *
 * @returns The key `["wishlist"]`.
 */
export function wishlistQueryKey(): readonly [QueryKey.WISHLIST] {
  return [QueryKey.WISHLIST];
}

/**
 * Whether the current session can call the user routes.
 *
 * @returns Signed-in and ready flags.
 */
function useSignedIn(): { readonly isSignedIn: boolean; readonly isReady: boolean } {
  const { data: session, status } = useSession();
  return {
    isSignedIn: status === AUTHENTICATED_STATUS && !session.error,
    isReady: status !== LOADING_STATUS,
  };
}

/**
 * Reads the wishlist product UUIDs of the signed-in user.
 *
 * @returns Session flags and the membership test.
 */
export function useWishlistIds(): UseWishlistIdsResult {
  const { isSignedIn, isReady } = useSignedIn();
  const query = useQuery({
    queryKey: wishlistQueryKey(),
    queryFn: async ({ signal }): Promise<readonly string[]> =>
      (await bffGet(BFF_ROUTES.wishlistIds, new URLSearchParams(), WishlistIdsSchema, signal))
        .productUuids,
    enabled: isSignedIn,
  });
  const ids = isSignedIn ? (query.data ?? EMPTY_IDS) : EMPTY_IDS;
  const has = useCallback((productUuid: string) => ids.includes(productUuid), [ids]);
  return { isSignedIn, isReady, has };
}

/**
 * Writes the membership of one product in the cached UUIDs.
 *
 * @param queryClient - Query client.
 * @param productUuid - Product.
 * @param isInWishlist - Membership to write.
 */
export function setWishlistMembership(
  queryClient: QueryClient,
  productUuid: string,
  isInWishlist: boolean,
): void {
  queryClient.setQueryData<readonly string[]>(wishlistQueryKey(), (current = EMPTY_IDS) => {
    const others = current.filter((uuid) => uuid !== productUuid);
    return isInWishlist ? [productUuid, ...others] : others;
  });
}

/**
 * Sends one change to the BFF.
 *
 * @param productUuid - Product.
 * @param isInWishlist - Membership wanted.
 * @returns The membership after the change.
 * @throws {BffError} When the BFF refuses the change.
 */
export async function sendWishlistChange(
  productUuid: string,
  isInWishlist: boolean,
): Promise<boolean> {
  const method = isInWishlist ? HttpMethod.PUT : HttpMethod.DELETE;
  const result = await bffSend(wishlistItemRoute(productUuid), method, WishlistToggleResultSchema);
  return result.isInWishlist;
}

/** Variables of the change mutation. */
interface ChangeVariables {
  readonly productUuid: string;
  readonly isInWishlist: boolean;
}

/**
 * Adds or removes a product, optimistically.
 *
 * @returns `change(productUuid, isInWishlist)`, resolved with the outcome; never throws.
 */
export function useToggleWishlist(): (
  productUuid: string,
  isInWishlist: boolean,
) => Promise<WishlistChangeResult> {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ productUuid, isInWishlist }: ChangeVariables) =>
      sendWishlistChange(productUuid, isInWishlist),
    onMutate: async ({ productUuid, isInWishlist }: ChangeVariables) => {
      await queryClient.cancelQueries({ queryKey: wishlistQueryKey() });
      setWishlistMembership(queryClient, productUuid, isInWishlist);
    },
    onError: (_error, { productUuid, isInWishlist }) => {
      setWishlistMembership(queryClient, productUuid, !isInWishlist);
    },
  });
  const { mutateAsync } = mutation;
  return useCallback(
    async (productUuid: string, isInWishlist: boolean): Promise<WishlistChangeResult> => {
      try {
        await mutateAsync({ productUuid, isInWishlist });
        return { ok: true };
      } catch (error) {
        return { ok: false, code: error instanceof BffError ? error.code : FrontErrorCode.UNKNOWN };
      }
    },
    [mutateAsync],
  );
}
