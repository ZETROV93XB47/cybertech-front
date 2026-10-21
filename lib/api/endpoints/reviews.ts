/**
 * Review calls to the backend (feature 004, US5): public reviews of a product, products the
 * caller can review, the caller's reviews, and publish / edit / delete.
 *
 * Every call is logged by `backendFetch` (method, route, status, duration, request id). The writes
 * add one line with masked UUIDs and the rating; a comment or a first name is never logged.
 *
 * @see specs/004-catalog-promos-reviews/contracts/bff-routes.md §1 to §3
 * @see ReviewCrudController (backend)
 */
import "server-only";

import { z } from "zod";

import { backendFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { BACKEND_PATHS, BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import {
  MY_REVIEWS_PAGE_SIZE,
  MY_REVIEWS_SORT,
  PRODUCT_REVIEWS_PAGE_SIZE,
  PRODUCT_REVIEWS_REVALIDATE_SECONDS,
  productReviewsTag,
} from "@/lib/constants/reviews";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { createModuleLogger, maskUuid } from "@/lib/logger";
import {
  MyReviewsPageSchema,
  ProductReviewsResponseSchema,
  ReviewResponseSchema,
  ReviewableProductSchema,
  type MyReviewsPage,
  type ProductReviewsResponse,
  type ReviewCreateBody,
  type ReviewResponse,
  type ReviewUpdateBody,
  type ReviewableProduct,
} from "@/lib/schemas/review";

const writeLog = createModuleLogger("reviews.write");

/** Offset between the 1-based page of the URL and the 0-based page of Spring. */
const PAGE_INDEX_OFFSET = 1;

/**
 * Reads one page of the published reviews of a product, with the average and the distribution.
 *
 * Public and cached `PRODUCT_REVIEWS_REVALIDATE_SECONDS`; every write through the front
 * revalidates the product tag.
 *
 * @param productUuid - Product UUID.
 * @param page - 0-based page (the product page asks page 0, « Voir plus d'avis » the next ones).
 * @returns The summary and the page of reviews.
 * @throws {ApiError} `not-found` for an unknown product, `unavailable` when the backend is down.
 */
export async function getProductReviews(
  productUuid: string,
  page: number,
): Promise<ProductReviewsResponse> {
  return backendFetch(`${BACKEND_PATHS.reviewProduct}/${productUuid}`, {
    schema: ProductReviewsResponseSchema,
    query: {
      [BACKEND_QUERY_PARAMS.page]: String(page),
      [BACKEND_QUERY_PARAMS.size]: String(PRODUCT_REVIEWS_PAGE_SIZE),
    },
    nextCache: {
      revalidate: PRODUCT_REVIEWS_REVALIDATE_SECONDS,
      tags: [productReviewsTag(productUuid)],
    },
  });
}

/**
 * Lists the products the caller can review now, one per (product, order) pair.
 *
 * @param accessToken - The user's access token; never logged.
 * @returns The products to review, in the backend order.
 * @throws {ApiError} When the backend refuses or is unavailable.
 */
export async function getReviewableProducts(accessToken: string): Promise<ReviewableProduct[]> {
  return backendFetch(BACKEND_PATHS.reviewReviewable, {
    schema: z.array(ReviewableProductSchema),
    accessToken,
  });
}

/**
 * Reads one page of the caller's reviews, newest first.
 *
 * @param page - 1-based page of « Mes avis ».
 * @param accessToken - The user's access token; never logged.
 * @returns The page.
 * @throws {ApiError} When the backend refuses or is unavailable.
 */
export async function getMyReviews(page: number, accessToken: string): Promise<MyReviewsPage> {
  return backendFetch(BACKEND_PATHS.reviewMine, {
    schema: MyReviewsPageSchema,
    query: {
      [BACKEND_QUERY_PARAMS.page]: String(page - PAGE_INDEX_OFFSET),
      [BACKEND_QUERY_PARAMS.size]: String(MY_REVIEWS_PAGE_SIZE),
      [BACKEND_QUERY_PARAMS.sort]: MY_REVIEWS_SORT,
    },
    accessToken,
  });
}

/**
 * Publishes a review of a bought product.
 *
 * @param body - Validated body (blank comment already left out).
 * @param accessToken - The user's access token; never logged.
 * @returns The review as written.
 * @throws {ApiError} `review-rejected` (moderation), `review-not-allowed` (order not reviewable),
 *   `not-found`, `unauthenticated`, `rate-limited`, `unavailable`.
 */
export async function createReview(
  body: ReviewCreateBody,
  accessToken: string,
): Promise<ReviewResponse> {
  const review = await backendFetch(BACKEND_PATHS.reviewCreate, {
    schema: ReviewResponseSchema,
    method: HttpMethod.POST,
    body,
    accessToken,
  });
  writeLog.info(
    {
      reviewUuid: maskUuid(review.uuid),
      productUuid: maskUuid(body.productUuid),
      orderUuid: maskUuid(body.orderUuid),
      rating: body.rating,
      hasComment: body.comment !== undefined,
    },
    "Review published",
  );
  return review;
}

/**
 * Edits a review of the caller (rating and comment; an empty comment removes the text).
 *
 * @param body - Validated body.
 * @param accessToken - The user's access token; never logged.
 * @returns The review as written.
 * @throws {ApiError} `review-rejected`, `forbidden` (not the author), `not-found`, …
 */
export async function updateReview(
  body: ReviewUpdateBody,
  accessToken: string,
): Promise<ReviewResponse> {
  const review = await backendFetch(`${BACKEND_PATHS.reviewUpdate}/${body.reviewUuid}`, {
    schema: ReviewResponseSchema,
    method: HttpMethod.PATCH,
    body,
    accessToken,
  });
  writeLog.info(
    { reviewUuid: maskUuid(body.reviewUuid), rating: body.rating, hasComment: body.comment !== "" },
    "Review updated",
  );
  return review;
}

/**
 * Deletes a review of the caller; a review already gone counts as deleted.
 *
 * @param reviewUuid - Review UUID.
 * @param accessToken - The user's access token; never logged.
 * @returns `true` when deleted now, `false` when it was already gone.
 * @throws {ApiError} `forbidden` (not the author), `unauthenticated`, `unavailable`, …
 */
export async function deleteReview(reviewUuid: string, accessToken: string): Promise<boolean> {
  try {
    await backendFetch(`${BACKEND_PATHS.reviewDelete}/${reviewUuid}`, {
      schema: z.undefined(),
      method: HttpMethod.DELETE,
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.NOT_FOUND) {
      writeLog.info({ reviewUuid: maskUuid(reviewUuid) }, "Review already gone, deletion done");
      return false;
    }
    throw error;
  }
  writeLog.info({ reviewUuid: maskUuid(reviewUuid) }, "Review deleted");
  return true;
}
