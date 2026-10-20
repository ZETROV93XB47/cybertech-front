// @vitest-environment node
/**
 * Structured `details` of `409 NOT_ENOUGH_STOCK` (backend commit f582c3a, prompt §11, T099): read
 * from the backend body, carried by `ApiError`, relayed by the BFF and read back into `BffError`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { BffError, bffSend } from "@/lib/api/bff-client";
import { jsonError } from "@/lib/api/bff-response";
import { parseErrorResponse } from "@/lib/api/errors";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";

const PRODUCT_A = "01a15a5d-0b7a-72a5-adab-b6da9eb3a4b1";
const PRODUCT_B = "01a15a5d-0a83-7c63-8c0e-8e77958d7f7b";

/**
 * Builds a backend `NOT_ENOUGH_STOCK` response.
 *
 * @param details - `details` member, omitted when `undefined`.
 * @returns The response.
 */
function stockResponse(details?: unknown): Response {
  return new Response(
    JSON.stringify({
      message: "Not enough stock",
      httpStatusCode: 409,
      errorCodeType: "FUNCTIONAL",
      errorCode: "NOT_ENOUGH_STOCK",
      ...(details === undefined ? {} : { details }),
    }),
    { status: 409, headers: { "Content-Type": "application/json" } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseErrorResponse with stock details", () => {
  it("reads every short line", async () => {
    const error = await parseErrorResponse(
      stockResponse({
        items: [
          { productUuid: PRODUCT_A, requested: 3, available: 1 },
          { productUuid: PRODUCT_B, requested: 2, available: 0 },
        ],
      }),
    );
    expect(error.frontCode).toBe(FrontErrorCode.INSUFFICIENT_STOCK);
    expect(error.stockShortages).toEqual([
      { productUuid: PRODUCT_A, requested: 3, available: 1 },
      { productUuid: PRODUCT_B, requested: 2, available: 0 },
    ]);
  });

  it("has no shortages when the backend sends no details", async () => {
    const error = await parseErrorResponse(stockResponse());
    expect(error.frontCode).toBe(FrontErrorCode.INSUFFICIENT_STOCK);
    expect(error.stockShortages).toBeUndefined();
  });

  it("drops malformed details without turning the error into an outage", async () => {
    const error = await parseErrorResponse(
      stockResponse({ items: [{ productUuid: "nope", requested: -1, available: "x" }] }),
    );
    expect(error.frontCode).toBe(FrontErrorCode.INSUFFICIENT_STOCK);
    expect(error.stockShortages).toBeUndefined();
  });
});

describe("BFF relay of the short lines", () => {
  it("goes from the backend body to the BffError of the browser", async () => {
    const apiError = await parseErrorResponse(
      stockResponse({ items: [{ productUuid: PRODUCT_A, requested: 3, available: 1 }] }),
    );
    const relayed = jsonError(apiError);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(relayed));
    const thrown = await bffSend("/api/orders/x", HttpMethod.POST, z.object({}), {}).catch(
      (error: unknown) => error,
    );
    expect(thrown).toBeInstanceOf(BffError);
    expect((thrown as BffError).code).toBe(FrontErrorCode.INSUFFICIENT_STOCK);
    expect((thrown as BffError).stockShortages).toEqual([
      { productUuid: PRODUCT_A, requested: 3, available: 1 },
    ]);
  });

  it("sends nothing more than before when there are no details", async () => {
    const body = (await jsonError(await parseErrorResponse(stockResponse())).json()) as {
      error: Record<string, unknown>;
    };
    expect(body.error).not.toHaveProperty("stockShortages");
  });
});
