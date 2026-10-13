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

/** Cart page (`app/(shop)/cart/page.tsx`). */
export const CART_PATH = "/cart";

/** BFF route handlers called by the browser (contracts/bff-routes.md). */
export const BFF_ROUTES = {
  /** `GET ?q=` — command palette results. */
  search: "/api/search",
  /** `GET ?uuids=` — live stock. */
  availability: "/api/availability",
  /** `GET ?uuids=` — product cards (recently viewed). */
  products: "/api/products",
  /** `GET`, `POST`, `DELETE` — account cart (USER). */
  cart: "/api/cart",
  /** `POST` — guest cart enriched with live prices and stock (public). */
  cartPreview: "/api/cart/preview",
  /** `POST` — merge of the guest cart at sign-in (USER). */
  cartMerge: "/api/cart/merge",
} as const;

/**
 * Builds the BFF route of one account cart line (`PATCH` quantity, `DELETE`).
 *
 * @param productUuid - Product of the line.
 * @returns The path `/api/cart/items/{productUuid}`.
 */
export function cartItemRoute(productUuid: string): string {
  return `${BFF_ROUTES.cart}/items/${encodeURIComponent(productUuid)}`;
}

/** Registration page (`app/(auth)/register/page.tsx`). */
export const REGISTER_PATH = "/register";
