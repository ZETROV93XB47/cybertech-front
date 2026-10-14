// @vitest-environment node
/**
 * Wishlist endpoints and schemas (feature 003 US6, T089).
 *
 * @see specs/003-account-orders/research.md R22
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import {
  addToWishlist,
  getMyWishlist,
  getWishlistProductUuids,
  removeFromWishlist,
} from "@/lib/api/endpoints/wishlist";
import { ApiError } from "@/lib/api/errors";
import { WISHLIST_IDS_MAX, WISHLIST_PAGE_SIZE, WISHLIST_SORT } from "@/lib/constants/wishlist";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { WishlistPageSchema } from "@/lib/schemas/wishlist";

import { API, errorBody } from "../../helpers/cart";
import { backendPage, backendProduct, fakeUuids } from "../../helpers/products";
import { server } from "../../msw/server";

const TOKEN = "secret-access-token";
const WISHLIST_API = `${API}/wishlist`;
const [ENTRY_A = "", ENTRY_B = "", PRODUCT_A = "", PRODUCT_B = ""] = fakeUuids(4);

/**
 * Builds a backend wishlist entry.
 *
 * @param uuid - Entry UUID.
 * @param productUuid - Product UUID.
 * @returns The `WishlistResponseDto`.
 */
function entry(uuid: string, productUuid: string): Record<string, unknown> {
  return { uuid, product: backendProduct({ uuid: productUuid }), addedAt: "2026-10-14T10:00:00" };
}

const PAGE = backendPage([entry(ENTRY_A, PRODUCT_A), entry(ENTRY_B, PRODUCT_B)]);

/**
 * Answers a backend error.
 *
 * @param code - Backend `errorCode`.
 * @param status - HTTP status.
 * @returns The response.
 */
function backendError(code: string, status: number): Response {
  return HttpResponse.json(errorBody(code, status), { status });
}

describe("WishlistPageSchema", () => {
  it("accepts a page of WishlistResponseDto", () => {
    expect(WishlistPageSchema.safeParse(PAGE).success).toBe(true);
  });

  it("rejects an entry without product", () => {
    const page = backendPage([{ uuid: ENTRY_A, addedAt: "2026-10-14T10:00:00" }]);
    expect(WishlistPageSchema.safeParse(page).success).toBe(false);
  });
});

describe("getMyWishlist", () => {
  it("reads a 0-based page, newest first, with the bearer token", async () => {
    let url: URL | undefined;
    let authorization: string | null = null;
    server.use(
      http.get(`${WISHLIST_API}/my-wishlist`, ({ request }) => {
        url = new URL(request.url);
        authorization = request.headers.get("Authorization");
        return HttpResponse.json(PAGE);
      }),
    );
    const page = await getMyWishlist(2, TOKEN);
    expect(page.content).toHaveLength(2);
    expect(url?.searchParams.get("page")).toBe("1");
    expect(url?.searchParams.get("size")).toBe(String(WISHLIST_PAGE_SIZE));
    expect(url?.searchParams.get("sort")).toBe(WISHLIST_SORT);
    expect(authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("turns a non-conforming body into unavailable", async () => {
    server.use(http.get(`${WISHLIST_API}/my-wishlist`, () => HttpResponse.json({ nope: true })));
    await expect(getMyWishlist(1, TOKEN)).rejects.toMatchObject({
      frontCode: FrontErrorCode.UNAVAILABLE,
    });
  });
});

describe("getWishlistProductUuids", () => {
  it("reads the first page at the largest size and keeps the product UUIDs", async () => {
    let size: string | null = null;
    server.use(
      http.get(`${WISHLIST_API}/my-wishlist`, ({ request }) => {
        size = new URL(request.url).searchParams.get("size");
        return HttpResponse.json(PAGE);
      }),
    );
    expect(await getWishlistProductUuids(TOKEN)).toEqual([PRODUCT_A, PRODUCT_B]);
    expect(size).toBe(String(WISHLIST_IDS_MAX));
  });
});

describe("addToWishlist", () => {
  it("posts the product", async () => {
    let called = false;
    server.use(
      http.post(`${WISHLIST_API}/add/${PRODUCT_A}`, () => {
        called = true;
        return HttpResponse.json(entry(ENTRY_A, PRODUCT_A), { status: 201 });
      }),
    );
    await addToWishlist(PRODUCT_A, TOKEN);
    expect(called).toBe(true);
  });

  it("counts PRODUCT_ALREADY_IN_WISHLIST as added", async () => {
    server.use(
      http.post(`${WISHLIST_API}/add/${PRODUCT_A}`, () =>
        backendError("PRODUCT_ALREADY_IN_WISHLIST", 409),
      ),
    );
    await expect(addToWishlist(PRODUCT_A, TOKEN)).resolves.toBeUndefined();
  });

  it("relays an unknown product as not-found", async () => {
    server.use(
      http.post(`${WISHLIST_API}/add/${PRODUCT_A}`, () => backendError("PRODUCT_NOT_FOUND", 404)),
    );
    const error = await addToWishlist(PRODUCT_A, TOKEN).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).frontCode).toBe(FrontErrorCode.NOT_FOUND);
  });
});

describe("removeFromWishlist", () => {
  it("deletes the product (204)", async () => {
    server.use(
      http.delete(
        `${WISHLIST_API}/remove/${PRODUCT_A}`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    await expect(removeFromWishlist(PRODUCT_A, TOKEN)).resolves.toBeUndefined();
  });

  it("counts a product already absent (404) as removed", async () => {
    server.use(
      http.delete(`${WISHLIST_API}/remove/${PRODUCT_A}`, () =>
        backendError("WISHLIST_NOT_FOUND", 404),
      ),
    );
    await expect(removeFromWishlist(PRODUCT_A, TOKEN)).resolves.toBeUndefined();
  });
});
