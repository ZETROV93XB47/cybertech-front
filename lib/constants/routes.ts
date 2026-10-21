/**
 * Page paths of the front, written once so links never drift from the `app/` tree.
 */
import type { OrderRouteAction } from "@/lib/enums/order";

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

/**
 * List of the running discount campaigns (`app/(shop)/promotions/page.tsx`).
 *
 * @see specs/004-catalog-promos-reviews/spec.md US4
 */
export const PROMOTIONS_PATH = "/promotions";

/**
 * Builds the path of a campaign page.
 *
 * @param key - Discount key (`BLACK_FRIDAY`…), already validated by `DiscountKeySchema`.
 * @returns The path `/promotions/{key}`.
 */
export function promotionRoute(key: string): string {
  return `${PROMOTIONS_PATH}/${encodeURIComponent(key)}`;
}

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
  /**
   * `GET ?uuids=` — comparison view of 1 to 3 products (public).
   *
   * @see specs/002-catalog-refresh/contracts/bff-routes.md §1
   */
  compare: "/api/compare",
  /**
   * `POST` — backend quote of the account cart (USER).
   *
   * @see specs/003-account-orders/contracts/bff-routes.md §1
   */
  checkoutQuote: "/api/checkout/quote",
  /** `POST` — places the order from the account cart (USER). */
  checkoutPlace: "/api/checkout/place",
  /** Prefix of the order routes; see {@link orderRoute}. */
  orders: "/api/orders",
  /**
   * `GET` — product UUIDs of the signed-in user's wishlist (USER).
   *
   * @see specs/003-account-orders/contracts/bff-routes.md §1
   */
  wishlistIds: "/api/wishlist/ids",
  /** Prefix of the wishlist item routes; see {@link wishlistItemRoute}. */
  wishlist: "/api/wishlist",
  /**
   * `POST` — saves a test card typed in « Ajouter une carte », replacing the current one when
   * asked (USER). The number is never logged nor sent back.
   *
   * @see specs/003-account-orders/contracts/bff-routes.md §2 bis
   */
  bankCard: "/api/bank-card",
} as const;

/**
 * Builds the BFF route adding (`PUT`) or removing (`DELETE`) one product of the wishlist.
 *
 * @param productUuid - Product UUID.
 * @returns The path `/api/wishlist/{productUuid}`.
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 */
export function wishlistItemRoute(productUuid: string): string {
  return `${BFF_ROUTES.wishlist}/${encodeURIComponent(productUuid)}`;
}

/**
 * Builds the BFF route of one order: `POST /api/orders/{uuid}` edits it, the actions are
 * sub-resources.
 *
 * @param uuid - Order UUID.
 * @param action - Sub-resource, omitted for the edit route.
 * @returns The path `/api/orders/{uuid}` or `/api/orders/{uuid}/{action}`.
 * @see specs/003-account-orders/contracts/bff-routes.md §1
 */
export function orderRoute(uuid: string, action?: OrderRouteAction): string {
  const base = `${BFF_ROUTES.orders}/${encodeURIComponent(uuid)}`;
  return action === undefined ? base : `${base}/${action}`;
}

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

/** Single-page checkout (`app/(account)/checkout/page.tsx`), private. */
export const CHECKOUT_PATH = "/checkout";

/**
 * Builds the path of the confirmation page of a placed order.
 *
 * @param uuid - Order UUID.
 * @returns The path `/checkout/confirmation/{uuid}`.
 */
export function checkoutConfirmationPath(uuid: string): string {
  return `${CHECKOUT_PATH}/confirmation/${encodeURIComponent(uuid)}`;
}

/** Pages of the account area (`app/(account)/account/**`), private. */
export const ACCOUNT_PATHS = {
  /** Account root, redirected to the orders. */
  root: "/account",
  /** « Mes commandes ». */
  orders: "/account/orders",
  /** « Mon profil ». */
  profile: "/account/profile",
  /** « Ma carte ». */
  card: "/account/card",
  /** « Ma wishlist ». */
  wishlist: "/account/wishlist",
  /** « Mes avis » (feature 004 US5). */
  reviews: "/account/reviews",
} as const;

/** Query parameters of « Mes avis » opening the review form of one bought product. */
export const REVIEW_TARGET_PARAMS = {
  /** Product to review. */
  product: "product",
  /** Order the product was bought in. */
  order: "order",
} as const;

/**
 * Builds the path of « Mes avis » with the form of one bought product open.
 *
 * @param target - Product and order of the review.
 * @param target.productUuid - Product UUID.
 * @param target.orderUuid - Order UUID.
 * @returns The path `/account/reviews?product=…&order=…`.
 * @see specs/004-catalog-promos-reviews/research.md R10
 */
export function accountReviewRoute(target: {
  readonly productUuid: string;
  readonly orderUuid: string;
}): string {
  const query = new URLSearchParams({
    [REVIEW_TARGET_PARAMS.product]: target.productUuid,
    [REVIEW_TARGET_PARAMS.order]: target.orderUuid,
  });
  return `${ACCOUNT_PATHS.reviews}?${query.toString()}`;
}

/**
 * Query parameter of « Ma carte » holding the relative path to go back to once a card is saved
 * (checked with `safeCallbackPath`).
 *
 * @see specs/003-account-orders/research.md R21
 */
export const CARD_RETURN_PARAM = "returnTo";

/**
 * Builds the path of « Ma carte » coming back to a page after the card is saved.
 *
 * @param returnTo - Relative path to come back to (e.g. `/checkout`).
 * @returns The path `/account/card?returnTo=…`.
 * @see specs/003-account-orders/spec.md FR-009
 */
export function cardPathReturningTo(returnTo: string): string {
  return `${ACCOUNT_PATHS.card}?${new URLSearchParams({ [CARD_RETURN_PARAM]: returnTo }).toString()}`;
}

/**
 * Builds the path of an order detail page.
 *
 * @param uuid - Order UUID.
 * @returns The path `/account/orders/{uuid}`.
 */
export function orderPath(uuid: string): string {
  return `${ACCOUNT_PATHS.orders}/${encodeURIComponent(uuid)}`;
}

/**
 * Builds the path of the edit page of an order.
 *
 * @param uuid - Order UUID.
 * @returns The path `/account/orders/{uuid}/edit`.
 */
export function orderEditPath(uuid: string): string {
  return `${orderPath(uuid)}/edit`;
}
