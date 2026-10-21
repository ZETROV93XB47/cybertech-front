/**
 * Feature 004, US5 (T048) — review schemas: backend answers and the bodies sent, with the backend
 * Bean Validation rules (rating 1 to 5, comment ≤ 1 000 characters).
 */
import { describe, expect, it } from "vitest";

import { REVIEW_COMMENT_MAX_LENGTH } from "@/lib/constants/reviews";
import {
  MyReviewSchema,
  ProductReviewsResponseSchema,
  PublicReviewSchema,
  ReviewCreateBodySchema,
  ReviewResponseSchema,
  ReviewUpdateBodySchema,
  ReviewableProductSchema,
} from "@/lib/schemas/review";

import {
  MY_REVIEW,
  ORDER_UUID,
  PRODUCT_UUID,
  PUBLIC_REVIEW,
  REVIEWABLE,
  REVIEW_RESPONSE,
  REVIEW_UUID,
  productReviewsResponse,
} from "./fixtures";

describe("backend answers", () => {
  it("reads the reviews of a product", () => {
    expect(ProductReviewsResponseSchema.safeParse(productReviewsResponse()).success).toBe(true);
  });

  it("accepts a product without review (null average)", () => {
    const empty = productReviewsResponse({
      averageRating: null,
      reviewCount: 0,
      distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      reviews: { content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } },
    });
    expect(ProductReviewsResponseSchema.safeParse(empty).success).toBe(true);
  });

  it("refuses a distribution without every rating", () => {
    const partial = productReviewsResponse({ distribution: { "4": 1, "5": 2 } });
    expect(ProductReviewsResponseSchema.safeParse(partial).success).toBe(false);
  });

  it("accepts a review without first name nor comment", () => {
    const review = { ...PUBLIC_REVIEW, authorFirstName: null, comment: null };
    expect(PublicReviewSchema.safeParse(review).success).toBe(true);
  });

  it("reads a product to review, with or without order date", () => {
    expect(ReviewableProductSchema.safeParse(REVIEWABLE).success).toBe(true);
    expect(ReviewableProductSchema.safeParse({ ...REVIEWABLE, orderDate: null }).success).toBe(
      true,
    );
    expect(
      ReviewableProductSchema.safeParse({ ...REVIEWABLE, orderDate: "12/10/2026" }).success,
    ).toBe(false);
  });

  it("reads a review of mine, never edited or without order", () => {
    expect(MyReviewSchema.safeParse(MY_REVIEW).success).toBe(true);
    expect(
      MyReviewSchema.safeParse({ ...MY_REVIEW, updatedAt: null, orderUuid: null }).success,
    ).toBe(true);
  });

  it("reads the answer of create and update", () => {
    expect(ReviewResponseSchema.safeParse(REVIEW_RESPONSE).success).toBe(true);
  });
});

describe("ReviewCreateBodySchema", () => {
  const body = {
    orderUuid: ORDER_UUID,
    productUuid: PRODUCT_UUID,
    rating: 4,
    comment: "  Bien.  ",
  };

  it("trims the comment", () => {
    expect(ReviewCreateBodySchema.parse(body).comment).toBe("Bien.");
  });

  it("leaves a blank comment out (rating-only review)", () => {
    expect(ReviewCreateBodySchema.parse({ ...body, comment: "   " })).not.toHaveProperty(
      "comment",
      "",
    );
    expect(ReviewCreateBodySchema.parse({ ...body, comment: "   " }).comment).toBeUndefined();
  });

  it.each([0, 6, 3.5])("refuses the rating %s", (rating) => {
    expect(ReviewCreateBodySchema.safeParse({ ...body, rating }).success).toBe(false);
  });

  it("accepts 1 000 characters and refuses 1 001", () => {
    const max = "a".repeat(REVIEW_COMMENT_MAX_LENGTH);
    expect(ReviewCreateBodySchema.safeParse({ ...body, comment: max }).success).toBe(true);
    expect(ReviewCreateBodySchema.safeParse({ ...body, comment: `${max}a` }).success).toBe(false);
  });
});

describe("ReviewUpdateBodySchema", () => {
  it("sends an empty comment to remove the text", () => {
    expect(
      ReviewUpdateBodySchema.parse({ reviewUuid: REVIEW_UUID, rating: 3, comment: "  " }).comment,
    ).toBe("");
  });

  it("applies the same rating and length rules", () => {
    expect(ReviewUpdateBodySchema.safeParse({ reviewUuid: REVIEW_UUID, rating: 6 }).success).toBe(
      false,
    );
    const tooLong = "a".repeat(REVIEW_COMMENT_MAX_LENGTH + 1);
    expect(
      ReviewUpdateBodySchema.safeParse({ reviewUuid: REVIEW_UUID, rating: 3, comment: tooLong })
        .success,
    ).toBe(false);
  });
});
