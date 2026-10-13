// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import {
  getAvailability,
  getBestSellers,
  getProductByUuid,
  searchProducts,
} from "@/lib/api/endpoints/products";
import { ApiError } from "@/lib/api/errors";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { EMPTY_SEARCH_FILTERS } from "@/lib/schemas/search";

import {
  PRODUCT_NOT_FOUND_BODY,
  PRODUCT_UUID,
  backendPage,
  backendProduct,
  fakeUuids,
} from "../../helpers/products";
import { TEST_BACKEND_URL } from "../../helpers/test-env";
import { allLoggedText, testLogger } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const API = `${TEST_BACKEND_URL}/api/v1/services`;

describe("getBestSellers", () => {
  it("returns cards and drops the products that break the contract", async () => {
    server.use(
      http.get(`${API}/product/best-sellers`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("size")).toBe("8");
        expect(request.headers.get("Authorization")).toBeNull();
        return HttpResponse.json(
          backendPage([backendProduct(), backendProduct({ uuid: "not-a-uuid", price: "free" })]),
        );
      }),
    );
    const cards = await getBestSellers();
    expect(cards).toEqual([
      {
        uuid: PRODUCT_UUID,
        name: "Microsoft Surface Go 4",
        brand: "MICROSOFT",
        category: "COMPUTER",
        price: 729,
        imageUrl: "http://localhost:4566/cybertech-products/surface_0.jpg",
      },
    ]);
    expect(testLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ source: "best-sellers" }),
      "Product dropped: response does not match the contract",
    );
  });
});

describe("searchProducts", () => {
  it("posts the search body and never logs the keyword", async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/product/search`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(backendPage([backendProduct()]));
      }),
    );
    const page = await searchProducts({
      ...EMPTY_SEARCH_FILTERS,
      keyword: "secret words",
      page: 2,
    });
    expect(body).toEqual({ keyword: "secret words", page: 2, size: 24 });
    expect(page.content).toHaveLength(1);
    expect(testLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ hasKeyword: true, page: 2 }),
      "Searching products",
    );
    expect(allLoggedText()).not.toContain("secret words");
  });
});

describe("getProductByUuid", () => {
  it("returns the product", async () => {
    server.use(
      http.get(`${API}/product/get/${PRODUCT_UUID}`, () => HttpResponse.json(backendProduct())),
    );
    expect((await getProductByUuid(PRODUCT_UUID))?.name).toBe("Microsoft Surface Go 4");
  });

  it("returns null for an unknown product", async () => {
    server.use(
      http.get(`${API}/product/get/${PRODUCT_UUID}`, () =>
        HttpResponse.json(PRODUCT_NOT_FOUND_BODY, { status: 404 }),
      ),
    );
    expect(await getProductByUuid(PRODUCT_UUID)).toBeNull();
  });

  it("returns null for a malformed UUID without calling the backend", async () => {
    expect(await getProductByUuid("../admin")).toBeNull();
  });

  it("throws an unavailable error when the backend is down", async () => {
    server.use(http.get(`${API}/product/get/${PRODUCT_UUID}`, () => HttpResponse.error()));
    const error: unknown = await getProductByUuid(PRODUCT_UUID).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ frontCode: FrontErrorCode.UNAVAILABLE });
  });
});

describe("getAvailability", () => {
  it("splits the distinct UUIDs into calls of 50", async () => {
    const sizes: number[] = [];
    server.use(
      http.get(`${API}/product/availability`, ({ request }) => {
        const uuids = new URL(request.url).searchParams.get("uuids")?.split(",") ?? [];
        sizes.push(uuids.length);
        return HttpResponse.json(
          uuids.map((productUuid) => ({ productUuid, availableStock: 1, inStock: true })),
        );
      }),
    );
    const uuids = fakeUuids(60);
    const items = await getAvailability([...uuids, uuids[0]!]);
    expect(sizes.sort((a, b) => a - b)).toEqual([10, 50]);
    expect(items).toHaveLength(60);
  });
});
