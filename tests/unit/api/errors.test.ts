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
    [BackendErrorCode.PRODUCT_ALREADY_IN_WISHLIST, 409, FrontErrorCode.ALREADY_EXISTS],
    // Feature 003 (specs/003-account-orders/data-model.md §1).
    [BackendErrorCode.DISCOUNT_TYPE_NOT_ACTIVE, 400, FrontErrorCode.DISCOUNT_INVALID],
    [BackendErrorCode.PAYMENT_FAILED, 402, FrontErrorCode.PAYMENT_FAILED],
    [BackendErrorCode.FAILED_UPDATING_ORDER, 422, FrontErrorCode.PAYMENT_FAILED],
    [BackendErrorCode.PAYMENT_ALREADY_COMPLETED, 409, FrontErrorCode.PAYMENT_ALREADY_COMPLETED],
    [BackendErrorCode.ORDER_ALREADY_SHIPPED, 409, FrontErrorCode.ORDER_LOCKED],
    [BackendErrorCode.CANNOT_CANCEL_ORDER, 409, FrontErrorCode.ORDER_LOCKED],
    [BackendErrorCode.ORDER_NOT_FUNDED, 409, FrontErrorCode.ORDER_LOCKED],
    [BackendErrorCode.ORDER_REFUND_FAILED, 409, FrontErrorCode.REFUND_FAILED],
    [BackendErrorCode.USER_NOT_ACTIVE, 403, FrontErrorCode.ACCOUNT_INACTIVE],
    [BackendErrorCode.BANK_CARD_EXPIRED, 400, FrontErrorCode.CARD_EXPIRED],
    [BackendErrorCode.ORDER_NOT_FOUND, 404, FrontErrorCode.NOT_FOUND],
    [BackendErrorCode.ORDER_DOESNT_BELONGS_TO_USER, 403, FrontErrorCode.NOT_FOUND],
    [BackendErrorCode.BANK_CARD_NOT_FOUND, 404, FrontErrorCode.NO_SAVED_CARD],
    [BackendErrorCode.NO_PREVIOUS_PAYMENT_ATTEMPT_FOUND, 404, FrontErrorCode.NOT_FOUND],
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
  it("relays another user's order as a 404, without revealing it exists", async () => {
    const error = await parseErrorResponse(errorResponse(403, "ORDER_DOESNT_BELONGS_TO_USER"));
    expect(error.status).toBe(404);
    expect(error.frontCode).toBe(FrontErrorCode.NOT_FOUND);
  });

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
