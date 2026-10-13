/**
 * Single cart hook of the UI: returns the same {@link CartView} for a visitor (cart kept in the
 * browser) and for a signed-in user (cart kept by the backend), plus the actions to change it.
 *
 * - Guest: lines from `localStorage`, enriched by `POST /api/cart/preview`; every add is checked
 *   against the live stock before it is written; other tabs follow through the `storage` event.
 * - Account: `GET /api/cart` cached under `QueryKey.CART`, optimistic updates replaced by the
 *   server view or rolled back on error.
 *
 * @see docs/guest-cart.md §1, §3, §5
 * @see specs/001-catalog-auth-cart/research.md R6
 */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { handleExpiredSession } from "@/features/auth/session-expiry";
import { BffError } from "@/lib/api/bff-client";
import { CART_STALE_TIME_MS } from "@/lib/constants/cart";
import { CartAction, CartSource } from "@/lib/enums/cart";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { QueryKey } from "@/lib/enums/query-key";
import type { CartView } from "@/lib/schemas/cart";
import type { GuestLine } from "@/lib/schemas/storage";

import {
  prepareGuestCartChange,
  fetchAccountCart,
  fetchGuestPreview,
  sendAccountChange,
} from "../cart-client";
import { cartErrorMessage, cartSuccessMessage } from "../cart-feedback";
import { predictCartView, type CartViewChange } from "../cart-view";
import {
  parseGuestCart,
  readGuestCartRaw,
  subscribeToGuestCart,
  writeGuestCart,
} from "../guest-storage";

/** Session status of Auth.js meaning « signed in ». */
const AUTHENTICATED_STATUS = "authenticated";

/** Session status of Auth.js while the session is being read. */
const LOADING_STATUS = "loading";

/** Outcome of a cart action, returned to the component that triggered it. */
export type CartChangeResult =
  | { readonly ok: true; readonly message: string; readonly cart: CartView }
  | { readonly ok: false; readonly message: string; readonly code?: FrontErrorCode };

/** What {@link useCart} returns. */
export interface UseCartResult {
  /** `undefined` while the session is being read. */
  readonly source: CartSource | undefined;
  /** `undefined` until the first load. */
  readonly cart: CartView | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isMutating: boolean;
  /**
   * `false` while the session is being read: the cart source is unknown, so actions are refused
   * (an add would otherwise land in the guest cart of a signed-in user). Disable buttons on it.
   */
  readonly isReady: boolean;
  /** Last outcome message, for an `aria-live="polite"` region. */
  readonly announcement: string;
  readonly add: (productUuid: string, quantity: number) => Promise<CartChangeResult>;
  readonly setQuantity: (productUuid: string, quantity: number) => Promise<CartChangeResult>;
  readonly remove: (productUuid: string) => Promise<CartChangeResult>;
  readonly clear: () => Promise<CartChangeResult>;
}

/**
 * Query key of the account cart.
 *
 * @returns `["cart", "account"]`.
 */
export function accountCartQueryKey(): readonly [QueryKey.CART, CartSource.ACCOUNT] {
  return [QueryKey.CART, CartSource.ACCOUNT];
}

/**
 * Query key of a guest cart: the lines are part of the key, so a change in another tab (new
 * lines) loads a new preview while the previous one stays displayed.
 *
 * @param lines - Guest lines.
 * @returns `["cart", "guest", "<uuid>:<qty>,…"]`.
 */
export function guestCartQueryKey(
  lines: readonly GuestLine[],
): readonly [QueryKey.CART, CartSource.GUEST, string] {
  const signature = lines.map((line) => `${line.productUuid}:${line.quantity}`).join(",");
  return [QueryKey.CART, CartSource.GUEST, signature];
}

/**
 * Reads the guest cart snapshot (a string, compared with `Object.is` by React).
 *
 * @returns The stored JSON, or `null`.
 */
function getGuestSnapshot(): string | null {
  return readGuestCartRaw(window.localStorage);
}

/**
 * Server snapshot: nothing is stored on the server.
 *
 * @returns `null`.
 */
function getServerSnapshot(): string | null {
  return null;
}

/**
 * Reads the cart source from the session.
 *
 * A signed-in user whose session can no longer be renewed stays on the account cart: the next
 * change is refused by the BFF (`unauthenticated`), kept aside and replayed after sign-in
 * (research R14), instead of silently landing in a guest cart.
 *
 * @returns `ACCOUNT` when signed in (even with an expired session), `GUEST` otherwise,
 * `undefined` while the session is being read.
 */
function useCartSource(): CartSource | undefined {
  const { status } = useSession();
  if (status === LOADING_STATUS) {
    return undefined;
  }
  return status === AUTHENTICATED_STATUS ? CartSource.ACCOUNT : CartSource.GUEST;
}

/**
 * Turns any error of an action into its failure result.
 *
 * @param error - Thrown error.
 * @returns The failure result.
 */
function toFailure(error: unknown): CartChangeResult {
  const code = error instanceof BffError ? error.code : FrontErrorCode.UNKNOWN;
  const stock = error instanceof BffError ? error.availableStock : undefined;
  return { ok: false, code, message: cartErrorMessage(code, stock) };
}

/**
 * Runs a change of the account cart with an optimistic update. A change refused for lack of a
 * valid session is kept aside and the user is sent to the sign-in page (FR-018).
 *
 * @param queryClient - Query client.
 * @param change - Requested change.
 * @returns The outcome.
 */
async function runAccountChange(
  queryClient: QueryClient,
  change: CartViewChange,
): Promise<CartChangeResult> {
  const key = accountCartQueryKey();
  await queryClient.cancelQueries({ queryKey: key });
  const before = queryClient.getQueryData<CartView>(key);
  if (before) {
    queryClient.setQueryData(key, predictCartView(before, change));
  }
  try {
    const cart = await sendAccountChange(change);
    queryClient.setQueryData(key, cart);
    return { ok: true, cart, message: cartSuccessMessage(change, before, cart) };
  } catch (error) {
    queryClient.setQueryData(key, before);
    const failure = toFailure(error);
    if (!failure.ok && failure.code === FrontErrorCode.UNAUTHENTICATED) {
      handleExpiredSession(change);
    }
    if (!failure.ok && failure.code === FrontErrorCode.NOT_FOUND) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
    return failure;
  }
}

/**
 * Runs a change of the guest cart (stock checked before the write).
 *
 * @param queryClient - Query client.
 * @param change - Requested change.
 * @param before - View displayed before the change.
 * @returns The outcome.
 */
async function runGuestChange(
  queryClient: QueryClient,
  change: CartViewChange,
  before: CartView | undefined,
): Promise<CartChangeResult> {
  try {
    const outcome = await prepareGuestCartChange(change, window.localStorage);
    if (!outcome.ok) {
      return { ok: false, message: outcome.message };
    }
    // Cache first, then storage: the re-render triggered by the write finds the view ready.
    queryClient.setQueryData(guestCartQueryKey(outcome.lines), outcome.cart);
    if (!writeGuestCart(window.localStorage, outcome.lines)) {
      return { ok: false, message: cartErrorMessage(FrontErrorCode.UNKNOWN) };
    }
    return {
      ok: true,
      cart: outcome.cart,
      message: cartSuccessMessage(change, before, outcome.cart),
    };
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * Reads the cart query of the current source.
 *
 * @param source - Cart source, `undefined` while the session is being read.
 * @param guestLines - Lines stored in the browser.
 * @returns The query result.
 */
function useCartQuery(source: CartSource | undefined, guestLines: readonly GuestLine[]) {
  const isAccount = source === CartSource.ACCOUNT;
  return useQuery({
    queryKey: isAccount ? accountCartQueryKey() : guestCartQueryKey(guestLines),
    queryFn: () => (isAccount ? fetchAccountCart() : fetchGuestPreview(guestLines)),
    enabled: source !== undefined,
    staleTime: CART_STALE_TIME_MS,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}

/**
 * Returns the cart of the visitor or of the signed-in user, and the actions to change it.
 *
 * @returns The cart, its state, the last announcement and the actions.
 */
export function useCart(): UseCartResult {
  const queryClient = useQueryClient();
  const source = useCartSource();
  const raw = useSyncExternalStore(subscribeToGuestCart, getGuestSnapshot, getServerSnapshot);
  const guestLines = useMemo(() => parseGuestCart(raw), [raw]);
  const query = useCartQuery(source, guestLines);
  const [announcement, setAnnouncement] = useState("");
  const mutation = useMutation({
    mutationFn: async (change: CartViewChange): Promise<CartChangeResult> => {
      if (source === undefined) {
        return { ok: false, message: cartErrorMessage(FrontErrorCode.UNKNOWN) };
      }
      return source === CartSource.ACCOUNT
        ? runAccountChange(queryClient, change)
        : runGuestChange(queryClient, change, query.data);
    },
  });
  const run = useCallback(
    async (change: CartViewChange): Promise<CartChangeResult> => {
      const result = await mutation.mutateAsync(change);
      setAnnouncement(result.message);
      return result;
    },
    [mutation],
  );
  return {
    source,
    cart: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    isMutating: mutation.isPending,
    isReady: source !== undefined,
    announcement,
    add: (productUuid, quantity) => run({ action: CartAction.ADD, productUuid, quantity }),
    setQuantity: (productUuid, quantity) => run({ action: CartAction.SET, productUuid, quantity }),
    remove: (productUuid) => run({ action: CartAction.REMOVE, productUuid }),
    clear: () => run({ action: CartAction.CLEAR }),
  };
}
