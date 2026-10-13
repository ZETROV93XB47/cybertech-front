/**
 * TanStack Query client factory and reset (client-side server state: cart, availability…).
 *
 * @see specs/001-catalog-auth-cart/research.md R6, plan « Stratégie de cache »
 */
import { QueryClient } from "@tanstack/react-query";

import { CART_STALE_TIME_MS } from "@/lib/constants/cart";

/**
 * Creates the query client of a browser session.
 *
 * Queries are refetched when the window regains focus (another device may have changed the
 * cart). Mutations are never retried automatically: the BFF already retries the retryable
 * cases once (contracts/errors.md), a second client retry would double the delay.
 *
 * @returns A configured query client.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: CART_STALE_TIME_MS, refetchOnWindowFocus: true, retry: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Removes every cached query, so no private data stays in memory after sign-out (FR-017).
 *
 * @param queryClient - Client of the current browser session.
 */
export function resetClientState(queryClient: QueryClient): void {
  queryClient.cancelQueries().catch(() => undefined);
  queryClient.clear();
}
