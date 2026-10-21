/**
 * Customer reviews of a product, as the product page shows them (LDLC-like: average, star
 * distribution, list).
 *
 * Built from `GET /review/product/{uuid}` (backend `bddcafd`): the average and the distribution
 * cover every published review, the list is one page, newest first. When the reviews cannot be
 * read, the page shows {@link NO_REVIEWS}: nothing is invented (FR-020).
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §5.3
 * @see docs/backend/api-map.md §10
 */
import { z } from "zod";

import { REVIEW_MAX_RATING } from "@/lib/constants/reviews";
import { PublicReviewSchema, type ProductReviewsResponse } from "@/lib/schemas/review";

export { REVIEW_MAX_RATING };

/** Ratings from the highest to the lowest, for the distribution bars. */
export const REVIEW_RATINGS: readonly number[] = Array.from(
  { length: REVIEW_MAX_RATING },
  (_, index) => REVIEW_MAX_RATING - index,
);

/** One published review. */
export interface ProductReview {
  readonly uuid: string;
  /** 1 to {@link REVIEW_MAX_RATING}. */
  readonly rating: number;
  readonly comment: string | null;
  /** First name of the author, `null` when the account has none. */
  readonly authorFirstName: string | null;
  /** Day of publication (`2026-10-14`). */
  readonly createdAt: string;
}

/** Reviews of a product with their summary. */
export interface ProductReviews {
  /** Average rating, `null` without review. */
  readonly average: number | null;
  readonly count: number;
  /** Number of reviews per rating (1 to 5). */
  readonly distribution: Readonly<Record<number, number>>;
  readonly items: readonly ProductReview[];
  /** 0-based index of the last page loaded. */
  readonly page: number;
  /** Whether more pages exist after {@link page}. */
  readonly hasMore: boolean;
}

/**
 * Reviews as the BFF route `GET /api/products/{uuid}/reviews` sends them to the browser
 * (« Voir plus d'avis »).
 */
export const ProductReviewsSchema = z.object({
  average: z.number().nullable(),
  count: z.int().nonnegative(),
  distribution: z.record(z.coerce.number(), z.int().nonnegative()),
  items: z.array(PublicReviewSchema),
  page: z.int().nonnegative(),
  hasMore: z.boolean(),
}) satisfies z.ZodType<ProductReviews>;

/** A product without any review (or whose reviews could not be read). */
export const NO_REVIEWS: ProductReviews = {
  average: null,
  count: 0,
  distribution: Object.fromEntries(REVIEW_RATINGS.map((rating) => [rating, 0])),
  items: [],
  page: 0,
  hasMore: false,
};

/**
 * Builds the reviews shown on the product page from the backend answer.
 *
 * @param response - Validated `ProductReviewsResponseDto`.
 * @returns The average, count, distribution and the reviews of the page.
 */
export function toProductReviews(response: ProductReviewsResponse): ProductReviews {
  const { page } = response.reviews;
  return {
    average: response.averageRating,
    count: response.reviewCount,
    distribution: Object.fromEntries(
      REVIEW_RATINGS.map((rating) => [rating, response.distribution[String(rating)] ?? 0]),
    ),
    items: response.reviews.content.map((review) => ({
      uuid: review.uuid,
      rating: review.rating,
      comment: review.comment,
      authorFirstName: review.authorFirstName,
      createdAt: review.createdAt,
    })),
    page: page.number,
    hasMore: page.number + 1 < page.totalPages,
  };
}
