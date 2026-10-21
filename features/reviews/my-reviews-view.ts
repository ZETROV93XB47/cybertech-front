/**
 * « Mes avis » as the page shows it: the products to review, newest order first, and one page of
 * the published reviews, with an « modifié » mention when edited after publication (FR-015).
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §5.3
 */
import { productPath, ACCOUNT_PATHS } from "@/lib/constants/routes";
import { MY_REVIEWS_PAGE_PARAM } from "@/lib/constants/reviews";
import { formatFullDay } from "@/lib/format";
import type { MyReview, MyReviewsPage, ReviewableProduct } from "@/lib/schemas/review";

/** First page of « Mes avis » (1-based). */
export const FIRST_MY_REVIEWS_PAGE = 1;

/** One product to review. */
export interface ToReviewRow {
  /** `{productUuid}:{orderUuid}`: a product bought twice appears once per order. */
  readonly id: string;
  readonly productUuid: string;
  readonly orderUuid: string;
  readonly productName: string;
  readonly productHref: string;
  /** « 14 octobre 2026 », `null` when unknown. */
  readonly orderedOn: string | null;
}

/** One published review. */
export interface PublishedRow {
  readonly uuid: string;
  readonly productUuid: string;
  readonly productName: string;
  /** Product page; a removed product lands on the « produit introuvable » page. */
  readonly productHref: string;
  readonly rating: number;
  /** Comment, `""` for a rating-only review. */
  readonly comment: string;
  readonly postedOn: string | null;
  /** Day of the last edit, `null` when never edited. */
  readonly editedOn: string | null;
}

/** « Mes avis ». */
export interface MyReviewsView {
  readonly toReview: readonly ToReviewRow[];
  readonly published: readonly PublishedRow[];
  /** 1-based page of the published reviews. */
  readonly page: number;
  readonly totalPages: number;
}

/**
 * Sort key of a product to review: newest order first, unknown dates last.
 *
 * @param product - Product to review.
 * @returns Its order date, or `""`.
 */
function orderSortKey(product: ReviewableProduct): string {
  return product.orderDate ?? "";
}

/**
 * Row of a product to review.
 *
 * @param product - Product returned by `GET /review/reviewable`.
 * @returns The row.
 */
function toReviewRow(product: ReviewableProduct): ToReviewRow {
  return {
    id: `${product.productUuid}:${product.orderUuid}`,
    productUuid: product.productUuid,
    orderUuid: product.orderUuid,
    productName: product.productName,
    productHref: productPath(product.productUuid),
    orderedOn: product.orderDate === null ? null : formatFullDay(product.orderDate),
  };
}

/**
 * Whether a review was edited after its publication.
 *
 * @param review - Review of the caller.
 * @returns `true` when `updatedAt` is after `createdAt`.
 */
function isEdited(review: MyReview): boolean {
  return review.updatedAt !== null && Date.parse(review.updatedAt) > Date.parse(review.createdAt);
}

/**
 * Row of a published review.
 *
 * @param review - Review returned by `GET /review/mine`.
 * @returns The row.
 */
function toPublishedRow(review: MyReview): PublishedRow {
  return {
    uuid: review.uuid,
    productUuid: review.productUuid,
    productName: review.productName,
    productHref: productPath(review.productUuid),
    rating: review.rating,
    comment: review.comment ?? "",
    postedOn: formatFullDay(review.createdAt),
    editedOn:
      isEdited(review) && review.updatedAt !== null ? formatFullDay(review.updatedAt) : null,
  };
}

/**
 * Builds « Mes avis ».
 *
 * @param reviewable - Products the caller can review.
 * @param mine - Page of the caller's reviews.
 * @param page - 1-based page shown.
 * @returns The two lists and the pagination.
 */
export function toMyReviewsView(
  reviewable: readonly ReviewableProduct[],
  mine: MyReviewsPage,
  page: number,
): MyReviewsView {
  return {
    toReview: [...reviewable]
      .sort((a, b) => orderSortKey(b).localeCompare(orderSortKey(a)))
      .map(toReviewRow),
    published: mine.content.map(toPublishedRow),
    page,
    totalPages: mine.page.totalPages,
  };
}

/**
 * Address of a page of « Mes avis ».
 *
 * @param page - 1-based page.
 * @returns `/account/reviews`, with `?page=` after the first page.
 */
export function myReviewsPagePath(page: number): string {
  return page <= FIRST_MY_REVIEWS_PAGE
    ? ACCOUNT_PATHS.reviews
    : `${ACCOUNT_PATHS.reviews}?${MY_REVIEWS_PAGE_PARAM}=${page}`;
}
