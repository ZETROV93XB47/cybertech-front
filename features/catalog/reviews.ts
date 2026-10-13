/**
 * Customer reviews of a product, as the product page shows them (LDLC-like: average, star
 * distribution, list).
 *
 * The backend cannot list the reviews of a product yet (no public endpoint, no average): the
 * page shows {@link NO_REVIEWS} until `GET /review/product/{uuid}` exists (requested in
 * `docs/backend/backend-prompts-lot2.md` §8). Nothing is invented meanwhile.
 *
 * @see docs/backend/api-map.md §10, §D.22
 */

/** Highest rating of a review (1 to 5 stars). */
export const REVIEW_MAX_RATING = 5;

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
}

/** Reviews of a product with their summary. */
export interface ProductReviews {
  /** Average rating, `null` without review. */
  readonly average: number | null;
  readonly count: number;
  /** Number of reviews per rating (1 to 5). */
  readonly distribution: Readonly<Record<number, number>>;
  readonly items: readonly ProductReview[];
}

/** A product without any review. */
export const NO_REVIEWS: ProductReviews = {
  average: null,
  count: 0,
  distribution: Object.fromEntries(REVIEW_RATINGS.map((rating) => [rating, 0])),
  items: [],
};
