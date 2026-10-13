/**
 * Type-level drift check (task T008): the Zod schema of the facets must accept every response
 * the backend OpenAPI describes. Regenerate `lib/api/schema.d.ts` with `npm run gen:api` after
 * a backend change; this file then fails to typecheck if a field was renamed or retyped.
 */
import { describe, expectTypeOf, it } from "vitest";

import type { components } from "@/lib/api/schema";
import type { ProductFacetsResponse } from "@/lib/schemas/facets";

type OpenApiFacets = Required<components["schemas"]["ProductFacetsResponseDto"]>;
type OpenApiFacetValue = Required<components["schemas"]["FacetValueDto"]>;
type OpenApiRange = components["schemas"]["RangeFacetDto"];

describe("ProductFacetsResponse", () => {
  it("has the field names of the OpenAPI schema", () => {
    expectTypeOf<keyof ProductFacetsResponse>().toEqualTypeOf<keyof OpenApiFacets>();
  });

  it("types facet values and ranges like the OpenAPI schema", () => {
    expectTypeOf<ProductFacetsResponse["brands"][number]>().toEqualTypeOf<OpenApiFacetValue>();
    expectTypeOf<keyof ProductFacetsResponse["price"]>().toEqualTypeOf<keyof OpenApiRange>();
  });
});
