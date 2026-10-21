/**
 * Enums of the reviews (feature 004, US5).
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §1
 */

/** State of a review form (publish or edit) after its last submission. */
export enum ReviewFormStatus {
  /** Nothing submitted yet. */
  IDLE = "idle",
  /** Published or updated. */
  SUCCESS = "success",
  /** Refused; the rating and the comment are kept (FR-017). */
  ERROR = "error",
}

/** Fields of the review form, as named in the submitted `FormData`. */
export enum ReviewField {
  RATING = "rating",
  COMMENT = "comment",
  ORDER_UUID = "orderUuid",
  PRODUCT_UUID = "productUuid",
  REVIEW_UUID = "reviewUuid",
}

/** What a review form does. */
export enum ReviewFormMode {
  /** Publish a review of a bought product. */
  CREATE = "create",
  /** Edit a published review. */
  EDIT = "edit",
}
