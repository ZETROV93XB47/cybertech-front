// @vitest-environment node
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as getAvailabilityRoute } from "@/app/api/availability/route";
import { GET as getProductsRoute } from "@/app/api/products/route";
import { GET as searchRoute } from "@/app/api/search/route";

import {
  PRODUCT_NOT_FOUND_BODY,
  PRODUCT_UUID,
  backendPage,
  backendProduct,
  fakeUuids,
} from "../../helpers/products";
import { TEST_BACKEND_URL } from "../../helpers/test-env";
import { server } from "../../msw/server";

const API = `${TEST_BACKEND_URL}/api/v1/services`;
const get = (path: string): NextRequest => new NextRequest(`http://localhost:3000${path}`);

describe("GET /api/search", () => {
  it("returns the first 6 cards, never cached", async () => {
    let size: unknown;
    server.use(
      http.post(`${API}/product/search`, async ({ request }) => {
        size = ((await request.json()) as { size: number }).size;
        return HttpResponse.json(backendPage([backendProduct()]));
      }),
    );
    const response = await searchRoute(get("/api/search?q=surface"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(((await response.json()) as { results: unknown[] }).results).toHaveLength(1);
    expect(size).toBe(6);
  });

  it("rejects an empty or too long keyword without calling the backend", async () => {
    for (const query of ["", "?q=%20%20", `?q=${"a".repeat(101)}`]) {
      const response = await searchRoute(get(`/api/search${query}`));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "invalid" } });
    }
  });

  it("answers 503 unavailable when the backend is down", async () => {
    server.use(http.post(`${API}/product/search`, () => HttpResponse.error()));
    const response = await searchRoute(get("/api/search?q=surface"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "unavailable" } });
  });
});

describe("GET /api/availability", () => {
  it("accepts comma-separated and repeated UUIDs", async () => {
    server.use(
      http.get(`${API}/product/availability`, () =>
        HttpResponse.json([{ productUuid: PRODUCT_UUID, availableStock: 4, inStock: true }]),
      ),
    );
    const response = await getAvailabilityRoute(
      get(`/api/availability?uuids=${PRODUCT_UUID}&uuids=${PRODUCT_UUID}`),
    );
    expect(await response.json()).toEqual({
      items: [{ productUuid: PRODUCT_UUID, availableStock: 4, inStock: true }],
    });
  });

  it("rejects a missing, malformed or too long list", async () => {
    for (const query of ["", "?uuids=nope", `?uuids=${fakeUuids(51).join(",")}`]) {
      const response = await getAvailabilityRoute(get(`/api/availability${query}`));
      expect(response.status).toBe(400);
    }
  });
});

describe("GET /api/products", () => {
  it("omits unknown products and keeps the input order", async () => {
    const [unknown] = fakeUuids(1);
    server.use(
      http.get(`${API}/product/get/${PRODUCT_UUID}`, () => HttpResponse.json(backendProduct())),
      http.get(`${API}/product/get/${unknown}`, () =>
        HttpResponse.json(PRODUCT_NOT_FOUND_BODY, { status: 404 }),
      ),
    );
    const response = await getProductsRoute(get(`/api/products?uuids=${unknown},${PRODUCT_UUID}`));
    const body = (await response.json()) as { products: { uuid: string }[] };
    expect(body.products.map((product) => product.uuid)).toEqual([PRODUCT_UUID]);
  });

  it("accepts at most 8 UUIDs", async () => {
    const response = await getProductsRoute(get(`/api/products?uuids=${fakeUuids(9).join(",")}`));
    expect(response.status).toBe(400);
  });
});
