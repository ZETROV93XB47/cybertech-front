/**
 * Type-level drift check of the catalog sort (backend prompt §16, `14252d5`): the backend values
 * of « Trier par » must be exactly the `ProductSearchRequestDto.sort` values of the OpenAPI.
 * Regenerate `lib/api/schema.d.ts` with `npm run gen:api` after a backend change.
 */
import { describe, expectTypeOf, it } from "vitest";

import type { components } from "@/lib/api/schema";
import type { BackendProductSort } from "@/lib/enums/product-sort";

type OpenApiSort = components["schemas"]["ProductSearchRequestDto"]["sort"];

describe("search sort", () => {
  it("BackendProductSort has the values of ProductSearchRequestDto.sort", () => {
    expectTypeOf<`${BackendProductSort}`>().toEqualTypeOf<OpenApiSort>();
  });
});
