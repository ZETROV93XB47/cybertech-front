/**
 * Feature 004, US5 (T049) — views of the reviews: product page summary and « Mes avis ».
 */
import { describe, expect, it } from "vitest";

import { toProductReviews } from "@/features/catalog/reviews";
import { myReviewsPagePath, toMyReviewsView } from "@/features/reviews/my-reviews-view";
import { MyReviewsPageSchema, ProductReviewsResponseSchema } from "@/lib/schemas/review";

import {
  MY_REVIEW,
  OTHER_ORDER,
  OTHER_PRODUCT,
  PRODUCT_UUID,
  REVIEWABLE,
  productReviewsResponse,
} from "./fixtures";

/**
 * A validated page of my reviews.
 *
 * @param content - Reviews of the page.
 * @param totalPages - Number of pages.
 * @returns The page.
 */
function myPage(content: readonly unknown[], totalPages = 1) {
  return MyReviewsPageSchema.parse({
    content,
    page: { size: 10, number: 0, totalElements: content.length, totalPages },
  });
}

describe("toProductReviews", () => {
  it("keeps the average, the count, the distribution and each review", () => {
    const reviews = toProductReviews(ProductReviewsResponseSchema.parse(productReviewsResponse()));
    expect(reviews.average).toBe(4.3);
    expect(reviews.count).toBe(12);
    expect(reviews.distribution).toEqual({ 1: 0, 2: 1, 3: 1, 4: 4, 5: 6 });
    expect(reviews.items[0]).toMatchObject({ authorFirstName: "Camille", createdAt: "2026-10-14" });
    expect(reviews.items[1]?.authorFirstName).toBeNull();
    expect(reviews.hasMore).toBe(true);
  });

  it("invents nothing for a product without review", () => {
    const reviews = toProductReviews(
      ProductReviewsResponseSchema.parse(
        productReviewsResponse({
          averageRating: null,
          reviewCount: 0,
          distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
          reviews: { content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } },
        }),
      ),
    );
    expect(reviews.average).toBeNull();
    expect(reviews.count).toBe(0);
    expect(reviews.items).toEqual([]);
    expect(reviews.hasMore).toBe(false);
  });
});

describe("toMyReviewsView", () => {
  it("sorts the products to review by order date, newest first, unknown last", () => {
    const view = toMyReviewsView(
      [
        { ...REVIEWABLE, orderDate: "2026-09-01" },
        { ...REVIEWABLE, orderUuid: OTHER_ORDER, orderDate: null },
        { ...REVIEWABLE, productUuid: OTHER_PRODUCT, orderDate: "2026-10-12" },
      ],
      myPage([]),
      1,
    );
    expect(view.toReview.map((row) => row.orderedOn)).toEqual([
      "12 octobre 2026",
      "1 septembre 2026",
      null,
    ]);
    expect(view.toReview[0]?.id).toBe(`${OTHER_PRODUCT}:${REVIEWABLE.orderUuid}`);
    expect(view.toReview[0]?.productHref).toBe(`/products/${OTHER_PRODUCT}`);
  });

  it("marks a review edited after its publication", () => {
    const view = toMyReviewsView([], myPage([MY_REVIEW]), 1);
    expect(view.published[0]).toMatchObject({
      productHref: `/products/${PRODUCT_UUID}`,
      postedOn: "14 octobre 2026",
      editedOn: "16 octobre 2026",
      comment: "Parfait.",
    });
  });

  it("does not mark a review never edited, and shows a rating-only one", () => {
    const view = toMyReviewsView([], myPage([{ ...MY_REVIEW, updatedAt: null, comment: null }]), 1);
    expect(view.published[0]?.editedOn).toBeNull();
    expect(view.published[0]?.comment).toBe("");
  });

  it("keeps the pagination", () => {
    const view = toMyReviewsView([], myPage([MY_REVIEW], 3), 2);
    expect(view).toMatchObject({ page: 2, totalPages: 3 });
    expect(myReviewsPagePath(1)).toBe("/account/reviews");
    expect(myReviewsPagePath(2)).toBe("/account/reviews?page=2");
  });
});
