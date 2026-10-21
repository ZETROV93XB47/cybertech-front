// @vitest-environment node
/**
 * Feature 004, US5 (T051) — `GET /api/products/{uuid}/reviews?page=`: relays one page of reviews
 * as the product page view, refuses a malformed request without calling the backend, maps an
 * unknown product to `404 not-found`.
 */
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/products/[uuid]/reviews/route";

import { API, errorBody } from "../../helpers/cart";
import { server } from "../../msw/server";
import { PRODUCT_UUID, productReviewsResponse } from "../reviews/fixtures";

/**
 * Calls the route.
 *
 * @param uuid - Product segment.
 * @param query - Query string, without `?`.
 * @returns The response.
 */
function callRoute(uuid: string, query = ""): Promise<Response> {
  const request = new NextRequest(`http://localhost:3000/api/products/${uuid}/reviews?${query}`);
  return GET(request, { params: Promise.resolve({ uuid }) });
}

describe("GET /api/products/{uuid}/reviews", () => {
  it("relays the requested page as the product page view", async () => {
    const pages: (string | null)[] = [];
    server.use(
      http.get(`${API}/review/product/${PRODUCT_UUID}`, ({ request }) => {
        pages.push(new URL(request.url).searchParams.get("page"));
        return HttpResponse.json(
          productReviewsResponse({
            reviews: {
              content: [],
              page: { size: 10, number: 1, totalElements: 12, totalPages: 2 },
            },
          }),
        );
      }),
    );
    const response = await callRoute(PRODUCT_UUID, "page=1");
    expect(response.status).toBe(200);
    expect(pages).toEqual(["1"]);
    expect(await response.json()).toMatchObject({
      average: 4.3,
      count: 12,
      page: 1,
      hasMore: false,
    });
  });

  it.each([
    ["a malformed uuid", "nope", "page=0"],
    ["a negative page", PRODUCT_UUID, "page=-1"],
    ["a page that is not a number", PRODUCT_UUID, "page=deux"],
  ])("answers 400 invalid for %s, without backend call", async (_label, uuid, query) => {
    const backend = vi.fn();
    server.use(http.get(`${API}/review/product/*`, backend));
    const response = await callRoute(uuid, query);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid" } });
    expect(backend).not.toHaveBeenCalled();
  });

  it("answers 404 not-found for an unknown product", async () => {
    server.use(
      http.get(`${API}/review/product/${PRODUCT_UUID}`, () =>
        HttpResponse.json(errorBody("PRODUCT_NOT_FOUND", 404), { status: 404 }),
      ),
    );
    const response = await callRoute(PRODUCT_UUID, "page=0");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "not-found" } });
  });
});
