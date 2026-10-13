// @vitest-environment node
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as compareRoute } from "@/app/api/compare/route";

import { PRODUCT_NOT_FOUND_BODY, backendProduct, fakeUuids } from "../../helpers/products";
import { TEST_BACKEND_URL } from "../../helpers/test-env";
import { server } from "../../msw/server";

const API = `${TEST_BACKEND_URL}/api/v1/services`;
const get = (path: string): NextRequest => new NextRequest(`http://localhost:3000${path}`);

const [A = "", B = "", C = "", D = ""] = fakeUuids(4);

describe("GET /api/compare", () => {
  it("rejects a missing, empty, invalid, duplicated or too long list without backend call", async () => {
    let backendCalls = 0;
    server.use(
      http.get(`${API}/*`, () => {
        backendCalls += 1;
        return HttpResponse.json({});
      }),
    );
    const queries = [
      "",
      "?uuids=",
      "?uuids=nope",
      `?uuids=${A},${A}`,
      `?uuids=${A}&uuids=${A}`,
      `?uuids=${[A, B, C, D].join(",")}`,
    ];
    for (const query of queries) {
      const response = await compareRoute(get(`/api/compare${query}`));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "invalid" } });
    }
    expect(backendCalls).toBe(0);
  });

  it("returns the comparison view, cached privately for 60 seconds", async () => {
    server.use(
      http.get(`${API}/product/get/:uuid`, ({ params }) =>
        HttpResponse.json(backendProduct({ uuid: String(params.uuid), attributes: { cpu: "X" } })),
      ),
      http.get(`${API}/product-category-schemas/:key`, () =>
        HttpResponse.json(PRODUCT_NOT_FOUND_BODY, { status: 404 }),
      ),
    );
    const response = await compareRoute(get(`/api/compare?uuids=${A},${B}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60");
    const body = (await response.json()) as { products: { uuid: string }[]; missing: string[] };
    expect(body.products.map((product) => product.uuid)).toEqual([A, B]);
    expect(body.missing).toEqual([]);
  });

  it("answers 503 unavailable when the backend is down", async () => {
    server.use(http.get(`${API}/product/get/:uuid`, () => HttpResponse.error()));
    const response = await compareRoute(get(`/api/compare?uuids=${A}`));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "unavailable" } });
  });
});
