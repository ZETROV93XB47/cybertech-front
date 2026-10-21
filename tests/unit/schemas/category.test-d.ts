/**
 * Type-level drift check (feature 004, T015): `CategorySummarySchema` keeps the field names of
 * `ProductCategoryResponseDto`. Regenerate `lib/api/schema.d.ts` with `npm run gen:api` after a
 * backend change; this file then fails to typecheck if a field was renamed.
 */
import { describe, expectTypeOf, it } from "vitest";

import type { components } from "@/lib/api/schema";
import type { CategorySummary } from "@/lib/schemas/category";

type OpenApiCategory = Required<components["schemas"]["ProductCategoryResponseDto"]>;

describe("category schemas", () => {
  it("CategorySummary has the field names of ProductCategoryResponseDto", () => {
    expectTypeOf<keyof CategorySummary>().toEqualTypeOf<keyof OpenApiCategory>();
  });
});
