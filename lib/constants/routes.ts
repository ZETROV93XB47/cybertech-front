/**
 * Page paths of the front, written once so links never drift from the `app/` tree.
 */

/** Home page. */
export const HOME_PATH = "/";

/** Product list and search results (`app/(shop)/products/page.tsx`). */
export const CATALOG_PATH = "/products";

/**
 * Builds the path of a product page.
 *
 * @param uuid - Product UUID.
 * @returns The path `/products/{uuid}`.
 */
export function productPath(uuid: string): string {
  return `${CATALOG_PATH}/${encodeURIComponent(uuid)}`;
}

/** BFF route handlers called by the browser (contracts/bff-routes.md). */
export const BFF_ROUTES = {
  /** `GET ?q=` — command palette results. */
  search: "/api/search",
  /** `GET ?uuids=` — live stock. */
  availability: "/api/availability",
  /** `GET ?uuids=` — product cards (recently viewed). */
  products: "/api/products",
} as const;
