/**
 * Review schemas (feature 004, US5): what the backend answers about reviews, and the bodies the
 * front sends to publish or edit one.
 *
 * Field names follow the OpenAPI (`tests/unit/schemas/review.test-d.ts`). Dates are kept as the
 * backend writes them: a day (`2026-10-14`) for a public review and an order, a local date-time
 * for « Mes avis ». The bodies apply the backend Bean Validation rules before any call.
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §5
 * @see ReviewCrudController, ReviewCreateRequestDto, ReviewUpdateRequestDto (backend)
 */
import { z } from "zod";

import {
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_MAX_RATING,
  REVIEW_MIN_RATING,
} from "@/lib/constants/reviews";

import { pagedSchema } from "./paged";

/** A rating from 1 to 5 stars. */
export const RatingSchema = z.int().min(REVIEW_MIN_RATING).max(REVIEW_MAX_RATING);

/** Keys of the rating distribution, always all present (`"1"` to `"5"`). */
const DISTRIBUTION_KEYS = Array.from({ length: REVIEW_MAX_RATING }, (_, index) =>
  String(index + REVIEW_MIN_RATING),
);

/** `PublicReviewDto`: a published review, with the author's first name only. */
export const PublicReviewSchema = z.object({
  uuid: z.uuid(),
  rating: RatingSchema,
  comment: z.string().nullable(),
  /** `null` when the account has no first name: shown as « Client ». */
  authorFirstName: z.string().nullable(),
  createdAt: z.iso.date(),
});

/** A published review. */
export type PublicReview = z.infer<typeof PublicReviewSchema>;

/** `ProductReviewsResponseDto`: summary over every published review, plus one page of them. */
export const ProductReviewsResponseSchema = z.object({
  averageRating: z.number().nullable(),
  reviewCount: z.int().nonnegative(),
  distribution: z
    .record(z.string(), z.int().nonnegative())
    .refine((distribution) => DISTRIBUTION_KEYS.every((key) => key in distribution), {
      message: "Every rating from 1 to 5 must be counted",
    }),
  reviews: pagedSchema(PublicReviewSchema),
});

/** Reviews of a product, as the backend sends them. */
export type ProductReviewsResponse = z.infer<typeof ProductReviewsResponseSchema>;

/** `ReviewableProductDto`: one product the caller can review now, with its order. */
export const ReviewableProductSchema = z.object({
  productUuid: z.uuid(),
  orderUuid: z.uuid(),
  productName: z.string(),
  orderDate: z.iso.date().nullable(),
});

/** A product to review. */
export type ReviewableProduct = z.infer<typeof ReviewableProductSchema>;

/** `MyReviewDto`: a review of the caller. */
export const MyReviewSchema = z.object({
  uuid: z.uuid(),
  productUuid: z.uuid(),
  productName: z.string(),
  /** `null` for an old review whose order could not be matched. */
  orderUuid: z.uuid().nullable(),
  rating: RatingSchema,
  comment: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

/** A review of the caller. */
export type MyReview = z.infer<typeof MyReviewSchema>;

/** One page of the caller's reviews. */
export const MyReviewsPageSchema = pagedSchema(MyReviewSchema);

/** A page of « Mes avis ». */
export type MyReviewsPage = z.infer<typeof MyReviewsPageSchema>;

/** `ReviewResponseDto`: answer of create and update. */
export const ReviewResponseSchema = z.object({
  uuid: z.uuid(),
  userUuid: z.uuid(),
  productUuid: z.uuid(),
  productName: z.string(),
  rating: RatingSchema,
  comment: z.string().nullable(),
});

/** A review as written. */
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

/** A comment as typed: trimmed, at most 1 000 characters. */
const CommentSchema = z.string().trim().max(REVIEW_COMMENT_MAX_LENGTH);

/** Body of `POST /review/create`; a blank comment is left out (rating-only review). */
export const ReviewCreateBodySchema = z.object({
  orderUuid: z.uuid(),
  productUuid: z.uuid(),
  rating: RatingSchema,
  comment: CommentSchema.optional().transform((comment) => (comment === "" ? undefined : comment)),
});

/** A review to publish. */
export type ReviewCreateBody = z.infer<typeof ReviewCreateBodySchema>;

/**
 * Body of `PATCH /review/update/{uuid}`. The comment is always sent: an empty one removes the
 * text and leaves a rating-only review (backend `ReviewManagementServiceImp#update`), while a
 * missing one would keep the old text.
 */
export const ReviewUpdateBodySchema = z.object({
  reviewUuid: z.uuid(),
  rating: RatingSchema,
  comment: CommentSchema.default(""),
});

/** A review edit. */
export type ReviewUpdateBody = z.infer<typeof ReviewUpdateBodySchema>;

/** Body of the deletion: the review, and its product to refresh the product page. */
export const ReviewDeleteInputSchema = z.object({
  reviewUuid: z.uuid(),
  productUuid: z.uuid(),
});

/** A review to delete. */
export type ReviewDeleteInput = z.infer<typeof ReviewDeleteInputSchema>;
