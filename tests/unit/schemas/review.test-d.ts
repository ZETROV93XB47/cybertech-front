/**
 * Type-level drift check (feature 004, T048): the review schemas keep the field names of the
 * backend OpenAPI. Regenerate `lib/api/schema.d.ts` with `npm run gen:api` after a backend change.
 */
import { describe, expectTypeOf, it } from "vitest";

import type { components } from "@/lib/api/schema";
import type {
  MyReview,
  ProductReviewsResponse,
  PublicReview,
  ReviewCreateBody,
  ReviewResponse,
  ReviewUpdateBody,
  ReviewableProduct,
} from "@/lib/schemas/review";

type Schemas = components["schemas"];

describe("review schemas", () => {
  it("answers have the field names of their DTO", () => {
    expectTypeOf<keyof PublicReview>().toEqualTypeOf<keyof Required<Schemas["PublicReviewDto"]>>();
    expectTypeOf<keyof ProductReviewsResponse>().toEqualTypeOf<
      keyof Required<Schemas["ProductReviewsResponseDto"]>
    >();
    expectTypeOf<keyof ReviewableProduct>().toEqualTypeOf<
      keyof Required<Schemas["ReviewableProductDto"]>
    >();
    expectTypeOf<keyof MyReview>().toEqualTypeOf<keyof Required<Schemas["MyReviewDto"]>>();
    expectTypeOf<keyof ReviewResponse>().toEqualTypeOf<
      keyof Required<Schemas["ReviewResponseDto"]>
    >();
  });

  it("bodies have the field names of their request DTO", () => {
    expectTypeOf<keyof ReviewCreateBody>().toEqualTypeOf<
      keyof Required<Schemas["ReviewCreateRequestDto"]>
    >();
    expectTypeOf<keyof ReviewUpdateBody>().toEqualTypeOf<
      keyof Required<Schemas["ReviewUpdateRequestDto"]>
    >();
  });
});
