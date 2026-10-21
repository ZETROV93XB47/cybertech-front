/**
 * Review constants (feature 004, US5), aligned with the backend Bean Validation and page sizes.
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §6
 * @see ReviewCreateRequestDto, CyberTechAppConstants (backend)
 */

/** Longest review comment, in characters (`@Size(max = 1000)` on the backend). */
export const REVIEW_COMMENT_MAX_LENGTH = 1_000;

/** Lowest rating of a review (`@Min(1)` on the backend). */
export const REVIEW_MIN_RATING = 1;

/** Highest rating of a review, 1 to 5 stars (`@Max(5)` on the backend). */
export const REVIEW_MAX_RATING = 5;

/** Reviews per page on the product page (`DEFAULT_PAGE_SIZE_PRODUCT_REVIEWS`). */
export const PRODUCT_REVIEWS_PAGE_SIZE = 10;

/** Reviews per page in « Mes avis » (`DEFAULT_PAGE_SIZE_MY_REVIEWS`). */
export const MY_REVIEWS_PAGE_SIZE = 10;

/** Sort of « Mes avis »: newest first (`DEFAULT_SORT_FIELD`, descending). */
export const MY_REVIEWS_SORT = "createdAt,desc";

/**
 * Data-cache lifetime of the public reviews of a product; every review written through the
 * front revalidates its tag at once, so this only bounds changes made elsewhere.
 */
export const PRODUCT_REVIEWS_REVALIDATE_SECONDS = 60;

/** Query parameter of the page of « Mes avis » (1-based). */
export const MY_REVIEWS_PAGE_PARAM = "page";

/**
 * Cache tag of the public reviews of one product.
 *
 * @param productUuid - Product UUID.
 * @returns The tag `product-reviews:{uuid}`.
 */
export function productReviewsTag(productUuid: string): string {
  return `product-reviews:${productUuid}`;
}
