/**
 * Cart constants.
 *
 * Values are aligned with the backend and with `docs/guest-cart.md`; never hard-code them
 * elsewhere.
 */

/**
 * Maximum number of lines in a guest cart.
 *
 * Browser-side guard: the backend accepts more, but the guest-cart preview calls
 * `GET /product/availability`, which is capped at 50 UUIDs per request.
 *
 * @see docs/guest-cart.md §2
 */
export const GUEST_CART_MAX_LINES = 50;

/**
 * Minimum quantity of a cart line, matching `@Min(1)` on `CartItemAddRequestDto.quantity`.
 *
 * @see docs/backend/api-map.md D.5
 */
export const CART_LINE_MIN_QUANTITY = 1;

/**
 * Maximum quantity of a cart line chosen in the UI (front-side guard, not a backend limit).
 *
 * @see docs/guest-cart.md §2
 */
export const CART_LINE_MAX_QUANTITY = 99;

/**
 * Time during which the cached account cart is considered fresh on the client.
 * After that, TanStack Query refetches it (also on window focus).
 */
export const CART_STALE_TIME_MS = 30_000;

/**
 * Maximum number of UUIDs accepted by `GET /product/availability` in one call.
 *
 * @see docs/backend/api-map.md §3
 */
export const AVAILABILITY_MAX_UUIDS_PER_REQUEST = 50;

/**
 * Name of the Web Lock that guarantees only one tab merges the guest cart at sign-in.
 *
 * @see docs/guest-cart.md §4 rule 2
 */
export const MERGE_LOCK_NAME = "ct-guest-cart-merge";
