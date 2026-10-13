import { describe, expect, it } from "vitest";

import { BackendErrorCode, ErrorCodeType } from "@/lib/enums/error-code";
import { ApiErrorBodySchema } from "@/lib/schemas/error";

describe("ApiErrorBodySchema", () => {
  it("parses a validation error with field errors", () => {
    const body = ApiErrorBodySchema.parse({
      message: "Validation failed",
      httpStatusCode: 400,
      errorCodeType: "TECHNICAL",
      errorCode: "INVALID_REQUEST",
      fieldErrors: [{ field: "email", message: "Email should be valid" }],
    });
    expect(body.errorCode).toBe(BackendErrorCode.INVALID_REQUEST);
    expect(body.errorCodeType).toBe(ErrorCodeType.TECHNICAL);
    expect(body.fieldErrors).toHaveLength(1);
  });

  it("keeps the body usable when the backend sends an unknown code", () => {
    const body = ApiErrorBodySchema.parse({
      message: "New business rule",
      httpStatusCode: 409,
      errorCodeType: "FUNCTIONAL",
      errorCode: "SOMETHING_NEW",
    });
    expect(body.errorCode).toBeUndefined();
    expect(body.httpStatusCode).toBe(409);
  });

  it("rejects a body without message or status", () => {
    expect(ApiErrorBodySchema.safeParse({ errorCode: "INVALID_REQUEST" }).success).toBe(false);
  });
});
