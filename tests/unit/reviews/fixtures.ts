/**
 * Review fixtures (feature 004, US5): backend answers as `GET /review/*` sends them.
 */
import { fakeUuids } from "../../helpers/products";

export const [
  REVIEW_UUID = "",
  PRODUCT_UUID = "",
  ORDER_UUID = "",
  USER_UUID = "",
  OTHER_PRODUCT = "",
  OTHER_ORDER = "",
] = fakeUuids(6);

/** A public review with a comment. */
export const PUBLIC_REVIEW = {
  uuid: REVIEW_UUID,
  rating: 4,
  comment: "Très bon écran, livré vite.",
  authorFirstName: "Camille",
  createdAt: "2026-10-14",
};

/**
 * Backend answer of `GET /review/product/{uuid}`.
 *
 * @param overrides - Fields to change.
 * @returns The `ProductReviewsResponseDto`.
 */
export function productReviewsResponse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    averageRating: 4.3,
    reviewCount: 12,
    distribution: { "1": 0, "2": 1, "3": 1, "4": 4, "5": 6 },
    reviews: {
      content: [
        PUBLIC_REVIEW,
        { ...PUBLIC_REVIEW, uuid: OTHER_PRODUCT, comment: null, authorFirstName: null },
      ],
      page: { size: 10, number: 0, totalElements: 12, totalPages: 2 },
    },
    ...overrides,
  };
}

/** A review of the caller, edited after publication. */
export const MY_REVIEW = {
  uuid: REVIEW_UUID,
  productUuid: PRODUCT_UUID,
  productName: "Écran 27 pouces",
  orderUuid: ORDER_UUID,
  rating: 5,
  comment: "Parfait.",
  createdAt: "2026-10-14T10:00:00",
  updatedAt: "2026-10-16T09:30:00",
};

/** A product to review. */
export const REVIEWABLE = {
  productUuid: PRODUCT_UUID,
  orderUuid: ORDER_UUID,
  productName: "Écran 27 pouces",
  orderDate: "2026-10-12",
};

/** Answer of create and update. */
export const REVIEW_RESPONSE = {
  uuid: REVIEW_UUID,
  userUuid: USER_UUID,
  productUuid: PRODUCT_UUID,
  productName: "Écran 27 pouces",
  rating: 4,
  comment: "Bien.",
};
