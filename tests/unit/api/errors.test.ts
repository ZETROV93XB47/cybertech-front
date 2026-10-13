// @vitest-environment node
import { describe, expect, it } from "vitest";

import { ApiError, parseErrorResponse, toFrontErrorCode, unavailableError } from "@/lib/api/errors";
import { BackendErrorCode, FrontErrorCode } from "@/lib/enums/error-code";

/** Builds a backend error response like `ErrorManagementController` does. */
function errorResponse(
  status: number,
  errorCode: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      message: "backend message",
      httpStatusCode: status,
      errorCodeType: "FUNCTIONAL",
      errorCode,
      ...extra,
    }),
    { status, headers: { "Content-Type": "application/json", ...headers } },
  );
}

describe("toFrontErrorCode — one case per row of contracts/errors.md", () => {
  it.each([
    [BackendErrorCode.INVALID_REQUEST, 400, FrontErrorCode.INVALID],
    [BackendErrorCode.MALFORMED_JSON, 400, FrontErrorCode.INVALID],
    [BackendErrorCode.METHOD_ARGUMENT_TYPE_MISMATCH, 400, FrontErrorCode.INVALID],
    [BackendErrorCode.AUTHENTICATION_REQUIRED, 401, FrontErrorCode.UNAUTHENTICATED],
    [BackendErrorCode.ACCESS_DENIED, 403, FrontErrorCode.FORBIDDEN],
    [BackendErrorCode.PRODUCT_NOT_FOUND, 404, FrontErrorCode.NOT_FOUND],
    [BackendErrorCode.RESOURCE_NOT_FOUND, 404, FrontErrorCode.NOT_FOUND],
    [BackendErrorCode.USER_NOT_FOUND, 404, FrontErrorCode.NOT_FOUND],
    [BackendErrorCode.CART_NOT_FOUND, 404, FrontErrorCode.NOT_FOUND],
    [BackendErrorCode.CART_ITEM_NOT_FOUND, 404, FrontErrorCode.NOT_FOUND],
    [BackendErrorCode.NOT_ENOUGH_STOCK, 409, FrontErrorCode.INSUFFICIENT_STOCK],
    [BackendErrorCode.CONCURRENT_MODIFICATION, 409, FrontErrorCode.CONFLICT],
    [BackendErrorCode.CART_IS_EMPTY, 409, FrontErrorCode.EMPTY_CART],
    [BackendErrorCode.CANNOT_REMOVE_ITEM_FROM_EMPTY_CART, 409, FrontErrorCode.EMPTY_CART],
    [BackendErrorCode.USER_ALREADY_EXISTS, 409, FrontErrorCode.ALREADY_EXISTS],
    [BackendErrorCode.TOO_MANY_REQUESTS, 429, FrontErrorCode.RATE_LIMITED],
    [BackendErrorCode.APPLICATION_ERROR, 500, FrontErrorCode.UNAVAILABLE],
    [BackendErrorCode.PAYMENT_FAILED, 402, FrontErrorCode.UNKNOWN],
  ])("%s (%i) → %s", (code, status, expected) => {
    expect(toFrontErrorCode(code, status)).toBe(expected);
  });

  it.each([
    [400, FrontErrorCode.INVALID],
    [401, FrontErrorCode.UNAUTHENTICATED],
    [403, FrontErrorCode.FORBIDDEN],
    [404, FrontErrorCode.NOT_FOUND],
    [409, FrontErrorCode.CONFLICT],
    [429, FrontErrorCode.RATE_LIMITED],
    [502, FrontErrorCode.UNAVAILABLE],
    [418, FrontErrorCode.UNKNOWN],
  ])("without known code, status %i → %s", (status, expected) => {
    expect(toFrontErrorCode(undefined, status)).toBe(expected);
  });
});

describe("parseErrorResponse", () => {
  it("keeps field errors of a validation failure", async () => {
    const error = await parseErrorResponse(
      errorResponse(400, "INVALID_REQUEST", {
        fieldErrors: [{ field: "email", message: "Email should be valid" }],
      }),
      "req12345",
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.frontCode).toBe(FrontErrorCode.INVALID);
    expect(error.fieldErrors).toEqual([{ field: "email", message: "Email should be valid" }]);
    expect(error.requestId).toBe("req12345");
  });

  it("reads Retry-After on 429", async () => {
    const error = await parseErrorResponse(
      errorResponse(429, "TOO_MANY_REQUESTS", {}, { "Retry-After": "37" }),
    );
    expect(error.frontCode).toBe(FrontErrorCode.RATE_LIMITED);
    expect(error.retryAfterSeconds).toBe(37);
  });

  it("treats a non-JSON body as unavailable", async () => {
    const error = await parseErrorResponse(
      new Response("<html>Bad gateway</html>", { status: 502 }),
    );
    expect(error.frontCode).toBe(FrontErrorCode.UNAVAILABLE);
    expect(error.status).toBe(502);
  });

  it("routes an unknown backend code by status", async () => {
    const error = await parseErrorResponse(errorResponse(409, "BRAND_NEW_RULE"));
    expect(error.backendCode).toBeUndefined();
    expect(error.frontCode).toBe(FrontErrorCode.CONFLICT);
  });
});

describe("unavailableError", () => {
  it("returns a 503 unavailable error", () => {
    const error = unavailableError(new DOMException("timed out", "TimeoutError"));
    expect(error.status).toBe(503);
    expect(error.frontCode).toBe(FrontErrorCode.UNAVAILABLE);
    expect(error.message).toContain("TimeoutError");
  });
});
