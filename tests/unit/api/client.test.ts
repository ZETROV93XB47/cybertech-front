// @vitest-environment node
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { backendFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { withSingleRetry } from "@/lib/api/retry";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";

import { TEST_BACKEND_URL } from "../../helpers/test-env";
import { allLoggedText, testLogger } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const PATH = "/api/v1/services/thing";
const THING_URL = `${TEST_BACKEND_URL}${PATH}`;
const ThingSchema = z.object({ id: z.number() });

describe("backendFetch", () => {
  it("sends version, JSON and bearer headers, and returns the validated body", async () => {
    let seen: Headers | undefined;
    server.use(
      http.post(THING_URL, ({ request }) => {
        seen = request.headers;
        return HttpResponse.json({ id: 1 }, { headers: { "X-Request-Id": "abcd1234" } });
      }),
    );

    const body = await backendFetch(PATH, {
      method: HttpMethod.POST,
      schema: ThingSchema,
      body: { a: 1 },
      accessToken: "secret-token",
    });

    expect(body).toEqual({ id: 1 });
    expect(seen?.get("X-API-VERSION")).toBe("1.0");
    expect(seen?.get("Authorization")).toBe("Bearer secret-token");
    expect(seen?.get("Content-Type")).toBe("application/json");
    expect(testLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST", path: PATH, status: 200, requestId: "abcd1234" }),
      "Backend call succeeded",
    );
  });

  it("never logs the access token", async () => {
    server.use(http.get(THING_URL, () => HttpResponse.json({ id: 1 })));
    await backendFetch(PATH, { schema: ThingSchema, accessToken: "secret-token" });
    expect(allLoggedText()).not.toContain("secret-token");
  });

  it("appends repeated query parameters", async () => {
    let seenUrl = "";
    server.use(
      http.get(THING_URL, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ id: 1 });
      }),
    );
    await backendFetch(PATH, { schema: ThingSchema, query: { uuids: ["a", "b"], page: "0" } });
    expect(seenUrl).toContain("uuids=a&uuids=b&page=0");
  });

  it("allows a body on DELETE and accepts 204", async () => {
    let received: unknown;
    server.use(
      http.delete(THING_URL, async ({ request }) => {
        received = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await expect(
      backendFetch(PATH, {
        method: HttpMethod.DELETE,
        schema: z.undefined(),
        body: { productUuid: "x" },
      }),
    ).resolves.toBeUndefined();
    expect(received).toEqual({ productUuid: "x" });
  });

  it("maps a backend error and logs it as rejected", async () => {
    server.use(
      http.post(THING_URL, () =>
        HttpResponse.json(
          {
            message: "Not enough stock",
            httpStatusCode: 409,
            errorCodeType: "FUNCTIONAL",
            errorCode: "NOT_ENOUGH_STOCK",
          },
          { status: 409 },
        ),
      ),
    );
    await expect(
      backendFetch(PATH, { method: HttpMethod.POST, schema: ThingSchema, body: {} }),
    ).rejects.toMatchObject({ frontCode: FrontErrorCode.INSUFFICIENT_STOCK, status: 409 });
    expect(testLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "NOT_ENOUGH_STOCK" }),
      "Backend call rejected",
    );
  });

  it("turns a contract mismatch into an unavailable error logged as error", async () => {
    server.use(http.get(THING_URL, () => HttpResponse.json({ id: "not-a-number" })));
    await expect(backendFetch(PATH, { schema: ThingSchema })).rejects.toMatchObject({
      frontCode: FrontErrorCode.UNAVAILABLE,
    });
    expect(testLogger.error).toHaveBeenCalled();
  });

  it("times out as unavailable", async () => {
    server.use(
      http.get(THING_URL, async () => {
        await delay("infinite");
        return HttpResponse.json({ id: 1 });
      }),
    );
    await expect(backendFetch(PATH, { schema: ThingSchema, timeoutMs: 50 })).rejects.toMatchObject({
      frontCode: FrontErrorCode.UNAVAILABLE,
      status: 503,
    });
  });
});

describe("withSingleRetry", () => {
  it("retries once on a concurrent modification, then succeeds", async () => {
    let calls = 0;
    server.use(
      http.post(THING_URL, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              {
                message: "Locked",
                httpStatusCode: 409,
                errorCodeType: "FUNCTIONAL",
                errorCode: "CONCURRENT_MODIFICATION",
              },
              { status: 409 },
            )
          : HttpResponse.json({ id: 2 });
      }),
    );
    const body = await withSingleRetry(() =>
      backendFetch(PATH, { method: HttpMethod.POST, schema: ThingSchema, body: {} }),
    );
    expect(body).toEqual({ id: 2 });
    expect(calls).toBe(2);
    expect(testLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1 }),
      "Retrying backend write",
    );
  });

  it("does not retry a business error", async () => {
    let calls = 0;
    const operation = (): Promise<never> => {
      calls += 1;
      return Promise.reject(
        new ApiError({ status: 409, frontCode: FrontErrorCode.INSUFFICIENT_STOCK, message: "x" }),
      );
    };
    await expect(withSingleRetry(operation)).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(1);
  });

  it("gives up after one retry", async () => {
    let calls = 0;
    const operation = (): Promise<never> => {
      calls += 1;
      return Promise.reject(
        new ApiError({ status: 503, frontCode: FrontErrorCode.UNAVAILABLE, message: "down" }),
      );
    };
    await expect(withSingleRetry(operation)).rejects.toMatchObject({
      frontCode: FrontErrorCode.UNAVAILABLE,
    });
    expect(calls).toBe(2);
  });
});
