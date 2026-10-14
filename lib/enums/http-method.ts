/**
 * HTTP methods used to call the backend.
 */

/** Method of a backend call. `DELETE` may carry a body (`/cart/decreaseQuantity`, api-map E.11). */
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PATCH = "PATCH",
  /** Idempotent write of the BFF (`PUT /api/wishlist/[productUuid]`). */
  PUT = "PUT",
  DELETE = "DELETE",
}
