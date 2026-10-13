/**
 * Root keys of the TanStack Query cache.
 *
 * Centralised so that invalidations (`queryClient.invalidateQueries({ queryKey: [QueryKey.CART] })`)
 * always target the same key as the query that filled the cache.
 */

/** First element of every query key used on the client. */
export enum QueryKey {
  CART = "cart",
  AVAILABILITY = "availability",
  SEARCH = "search",
  RECENT_PRODUCTS = "recent-products",
}
