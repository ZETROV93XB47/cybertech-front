// @vitest-environment node
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE as deleteCartRoute,
  GET as getCartRoute,
  POST as addRoute,
} from "@/app/api/cart/route";
import {
  DELETE as removeLineRoute,
  PATCH as setQuantityRoute,
} from "@/app/api/cart/items/[productUuid]/route";
import { POST as mergeRoute } from "@/app/api/cart/merge/route";
import { POST as previewRoute } from "@/app/api/cart/preview/route";
import { ApiError } from "@/lib/api/errors";
import { FrontErrorCode } from "@/lib/enums/error-code";

import {
  API,
  CART_UUID,
  NULL_CART,
  PRODUCT_A,
  PRODUCT_B,
  PRODUCT_C,
  backendCart,
  errorBody,
  mockCatalog,
} from "../../helpers/cart";
import { server } from "../../msw/server";

const guards = vi.hoisted(() => ({ getAccessTokenOrThrow: vi.fn() }));
vi.mock("@/lib/auth/guards", () => guards);

const json = (method: string, body?: unknown): Request =>
  new Request("http://localhost:3000/api/cart", {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const params = (productUuid: string) => ({ params: Promise.resolve({ productUuid }) });

beforeEach(() => {
  guards.getAccessTokenOrThrow.mockResolvedValue("token");
  mockCatalog({ [PRODUCT_A]: 10, [PRODUCT_B]: 3 });
});

describe("cart routes without a session", () => {
  it("answer 401 unauthenticated", async () => {
    guards.getAccessTokenOrThrow.mockRejectedValue(
      new ApiError({
        status: 401,
        frontCode: FrontErrorCode.UNAUTHENTICATED,
        message: "No session",
      }),
    );
    for (const response of [
      await getCartRoute(),
      await addRoute(json("POST", { productUuid: PRODUCT_A, quantity: 1 })),
      await deleteCartRoute(),
      await mergeRoute(json("POST", { items: [] })),
    ]) {
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ error: { code: "unauthenticated" } });
    }
  });
});

describe("GET /api/cart", () => {
  it("normalises a user without a cart", async () => {
    server.use(http.get(`${API}/cart/get`, () => HttpResponse.json(NULL_CART)));
    const response = await getCartRoute();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ source: "account", lines: [], total: 0 });
  });
});

describe("POST /api/cart", () => {
  it("adds and answers 201 with the account view", async () => {
    server.use(
      http.post(`${API}/cart/add`, () =>
        HttpResponse.json(backendCart([[PRODUCT_A, 2]]), { status: 201 }),
      ),
    );
    const response = await addRoute(json("POST", { productUuid: PRODUCT_A, quantity: 2 }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ itemCount: 2, totalIsEstimate: false });
  });

  it("attaches the live stock to insufficient-stock", async () => {
    server.use(
      http.post(`${API}/cart/add`, () =>
        HttpResponse.json(errorBody("NOT_ENOUGH_STOCK", 409), { status: 409 }),
      ),
    );
    const response = await addRoute(json("POST", { productUuid: PRODUCT_B, quantity: 5 }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "insufficient-stock", availableStock: 3 },
    });
  });

  it("rejects an invalid body without calling the backend", async () => {
    for (const body of [
      { productUuid: "x", quantity: 1 },
      { productUuid: PRODUCT_A, quantity: 100 },
    ]) {
      const response = await addRoute(json("POST", body));
      expect(response.status).toBe(400);
    }
  });

  it("retries a busy cart lock once", async () => {
    let calls = 0;
    server.use(
      http.post(`${API}/cart/add`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(errorBody("CONCURRENT_MODIFICATION", 409), { status: 409 })
          : HttpResponse.json(backendCart([[PRODUCT_A, 1]]), { status: 201 });
      }),
    );
    const response = await addRoute(json("POST", { productUuid: PRODUCT_A, quantity: 1 }));
    expect(response.status).toBe(201);
    expect(calls).toBe(2);
  });
});

describe("PATCH /api/cart/items/[productUuid]", () => {
  it("replaces every line with this one set to the absolute quantity", async () => {
    let sent: unknown;
    server.use(
      http.get(`${API}/cart/get`, () =>
        HttpResponse.json(
          backendCart([
            [PRODUCT_A, 1],
            [PRODUCT_B, 1],
          ]),
        ),
      ),
      http.patch(`${API}/cart/update/${CART_UUID}`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(
          backendCart([
            [PRODUCT_A, 4],
            [PRODUCT_B, 1],
          ]),
        );
      }),
    );
    const response = await setQuantityRoute(json("PATCH", { quantity: 4 }), params(PRODUCT_A));
    expect(response.status).toBe(200);
    expect(sent).toEqual({
      cartItemAddRequestDtos: [
        { productUuid: PRODUCT_A, quantity: 4 },
        { productUuid: PRODUCT_B, quantity: 1 },
      ],
    });
  });

  it("adds the line when the user has no cart yet", async () => {
    server.use(
      http.get(`${API}/cart/get`, () => HttpResponse.json(NULL_CART)),
      http.post(`${API}/cart/add`, () =>
        HttpResponse.json(backendCart([[PRODUCT_A, 2]]), { status: 201 }),
      ),
    );
    const response = await setQuantityRoute(json("PATCH", { quantity: 2 }), params(PRODUCT_A));
    expect(await response.json()).toMatchObject({ itemCount: 2 });
  });

  it("rejects a malformed product UUID", async () => {
    const response = await setQuantityRoute(json("PATCH", { quantity: 2 }), params("nope"));
    expect(response.status).toBe(400);
  });
});

describe("DELETE routes", () => {
  it("removing a line already gone returns the current cart", async () => {
    server.use(
      http.patch(`${API}/cart/remove/${PRODUCT_A}`, () =>
        HttpResponse.json(errorBody("CANNOT_REMOVE_ITEM_FROM_EMPTY_CART", 409), { status: 409 }),
      ),
      http.get(`${API}/cart/get`, () => HttpResponse.json(backendCart([[PRODUCT_B, 1]]))),
    );
    const response = await removeLineRoute(json("DELETE"), params(PRODUCT_A));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ itemCount: 1 });
  });

  it("clearing answers an empty account view", async () => {
    server.use(http.delete(`${API}/cart/clear`, () => new HttpResponse(null, { status: 204 })));
    const response = await deleteCartRoute();
    expect(await response.json()).toMatchObject({ source: "account", lines: [], itemCount: 0 });
  });
});

describe("POST /api/cart/preview", () => {
  it("is public and flags each line", async () => {
    guards.getAccessTokenOrThrow.mockRejectedValue(new Error("must not be called"));
    const response = await previewRoute(
      json("POST", {
        items: [
          { productUuid: PRODUCT_A, quantity: 1 },
          { productUuid: PRODUCT_B, quantity: 5 },
          { productUuid: PRODUCT_C, quantity: 1 },
        ],
      }),
    );
    const view = (await response.json()) as { lines: { status: string }[]; source: string };
    expect(view.source).toBe("guest");
    expect(view.lines.map((line) => line.status)).toEqual([
      "ok",
      "insufficient-stock",
      "unavailable",
    ]);
  });

  it("rejects more than 50 lines", async () => {
    const items = Array.from({ length: 51 }, (_, index) => ({
      productUuid: `01a0fcee-0000-7000-8000-${String(index).padStart(12, "0")}`,
      quantity: 1,
    }));
    expect((await previewRoute(json("POST", { items }))).status).toBe(400);
  });
});
