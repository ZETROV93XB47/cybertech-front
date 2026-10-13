// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/bff-response";
import { ApiError } from "@/lib/api/errors";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { FrontErrorBodySchema } from "@/lib/schemas/front-error";

describe("jsonOk", () => {
  it("returns JSON that is never cached", async () => {
    const response = jsonOk({ a: 1 }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ a: 1 });
  });
});

describe("jsonError", () => {
  it("exposes the front code, retry delay and available stock with the original status", async () => {
    const response = jsonError(
      new ApiError({
        status: 409,
        frontCode: FrontErrorCode.INSUFFICIENT_STOCK,
        message: "Not enough stock",
        retryAfterSeconds: 3,
      }),
      { availableStock: 2 },
    );
    expect(response.status).toBe(409);
    const body = FrontErrorBodySchema.parse(await response.json());
    expect(body.error).toEqual({
      code: FrontErrorCode.INSUFFICIENT_STOCK,
      message: "Not enough stock",
      retryAfterSeconds: 3,
      availableStock: 2,
    });
  });

  it("turns an unexpected error into a 500 unknown error", async () => {
    const response = jsonError(new TypeError("boom"));
    expect(response.status).toBe(500);
    const body = FrontErrorBodySchema.parse(await response.json());
    expect(body.error.code).toBe(FrontErrorCode.UNKNOWN);
  });
});

describe("parseJsonBody", () => {
  const Schema = z.object({ quantity: z.int().min(1) });

  it("returns the validated data", async () => {
    const result = await parseJsonBody(
      new Request("http://front.test", { method: "POST", body: JSON.stringify({ quantity: 2 }) }),
      Schema,
    );
    expect(result).toEqual({ ok: true, data: { quantity: 2 } });
  });

  it.each([JSON.stringify({ quantity: 0 }), "not json"])(
    "returns a 400 invalid response for %s",
    async (raw) => {
      const result = await parseJsonBody(
        new Request("http://front.test", { method: "POST", body: raw }),
        Schema,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
        const body = FrontErrorBodySchema.parse(await result.response.json());
        expect(body.error.code).toBe(FrontErrorCode.INVALID);
      }
    },
  );
});
