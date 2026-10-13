/**
 * Type-level drift check (task T020): `BackendErrorCode` must list exactly the `errorCode`
 * values of the backend OpenAPI schema. Regenerate `lib/api/schema.d.ts` with `npm run gen:api`
 * after a backend change; this file then fails to typecheck if the enum is out of date.
 */
import { describe, expectTypeOf, it } from "vitest";

import type { components } from "@/lib/api/schema";
import type { BackendErrorCode, ErrorCodeType } from "@/lib/enums/error-code";

type OpenApiErrorCode = NonNullable<components["schemas"]["ErrorResponseDto"]["errorCode"]>;
type OpenApiErrorCodeType = NonNullable<components["schemas"]["ErrorResponseDto"]["errorCodeType"]>;

describe("BackendErrorCode", () => {
  it("matches the OpenAPI errorCode union exactly", () => {
    expectTypeOf<`${BackendErrorCode}`>().toEqualTypeOf<OpenApiErrorCode>();
  });

  it("ErrorCodeType matches the OpenAPI errorCodeType union exactly", () => {
    expectTypeOf<`${ErrorCodeType}`>().toEqualTypeOf<OpenApiErrorCodeType>();
  });
});
