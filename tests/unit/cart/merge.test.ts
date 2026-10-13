// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mergeGuestCart } from "@/features/cart/server/merge-guest-cart";
import { ApiError } from "@/lib/api/errors";
import { MergeDropReason } from "@/lib/enums/cart";

import {
  API,
  NULL_CART,
  PRODUCT_A,
  PRODUCT_B,
  PRODUCT_C,
  backendCart,
  errorBody,
  mockCatalog,
} from "../../helpers/cart";
import { allLoggedText, testLogger } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const TOKEN = "secret-access-token";

interface AddBody {
  readonly cartItemAddRequestDtos: readonly { productUuid: string; quantity: number }[];
}

/**
 * Mocks `POST /cart/add`: the batch (more than one line) answers `batchStatus`; single lines are
 * accepted unless listed in `failing`.
 */
function mockAdd(
  batchStatus: number,
  failing: Record<string, readonly [number, string]> = {},
): AddBody[] {
  const bodies: AddBody[] = [];
  const added: [string, number][] = [];
  server.use(
    http.post(`${API}/cart/add`, async ({ request }) => {
      const body = (await request.json()) as AddBody;
      bodies.push(body);
      const lines = body.cartItemAddRequestDtos;
      if (lines.length > 1 && batchStatus !== 201) {
        return HttpResponse.json(errorBody("NOT_ENOUGH_STOCK", batchStatus), {
          status: batchStatus,
        });
      }
      const failure = failing[lines[0]?.productUuid ?? ""];
      if (lines.length === 1 && failure) {
        return HttpResponse.json(errorBody(failure[1], failure[0]), { status: failure[0] });
      }
      lines.forEach((line) => added.push([line.productUuid, line.quantity]));
      return HttpResponse.json(backendCart(added), { status: 201 });
    }),
    http.get(`${API}/cart/get`, () => HttpResponse.json(NULL_CART)),
  );
  return bodies;
}

const LINES = [
  { productUuid: PRODUCT_A, quantity: 2 },
  { productUuid: PRODUCT_B, quantity: 5 },
];

describe("mergeGuestCart", () => {
  it("merges every line with a single batched add when the backend accepts it", async () => {
    mockCatalog({ [PRODUCT_A]: 10, [PRODUCT_B]: 10 });
    const bodies = mockAdd(201);
    const report = await mergeGuestCart(LINES, TOKEN);
    expect(bodies).toHaveLength(1);
    expect(report.merged).toEqual([PRODUCT_A, PRODUCT_B]);
    expect(report).toMatchObject({ capped: [], dropped: [], failed: [] });
    expect(report.cart.itemCount).toBe(7);
    expect(report.cart.totalIsEstimate).toBe(false);
  });

  it("replays line by line on NOT_ENOUGH_STOCK, capping to the stock left", async () => {
    mockCatalog({ [PRODUCT_A]: 10, [PRODUCT_B]: 3 });
    const bodies = mockAdd(409);
    const report = await mergeGuestCart(LINES, TOKEN);
    expect(bodies.map((body) => body.cartItemAddRequestDtos)).toEqual([
      LINES,
      [{ productUuid: PRODUCT_A, quantity: 2 }],
      [{ productUuid: PRODUCT_B, quantity: 3 }],
    ]);
    expect(report.merged).toEqual([PRODUCT_A]);
    expect(report.capped).toEqual([{ productUuid: PRODUCT_B, requested: 5, added: 3 }]);
    expect(testLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requested: 5, added: 3 }),
      "Guest line capped to the available stock",
    );
  });

  it("subtracts what the account cart already holds from the stock", async () => {
    mockCatalog({ [PRODUCT_A]: 10, [PRODUCT_B]: 6 });
    const bodies = mockAdd(409);
    server.use(http.get(`${API}/cart/get`, () => HttpResponse.json(backendCart([[PRODUCT_B, 4]]))));
    const report = await mergeGuestCart(LINES, TOKEN);
    expect(bodies.at(-1)?.cartItemAddRequestDtos).toEqual([
      { productUuid: PRODUCT_B, quantity: 2 },
    ]);
    expect(report.capped).toEqual([{ productUuid: PRODUCT_B, requested: 5, added: 2 }]);
  });

  it("drops out-of-stock and unknown products", async () => {
    mockCatalog({ [PRODUCT_A]: 10, [PRODUCT_B]: 0 });
    mockAdd(409);
    const report = await mergeGuestCart([...LINES, { productUuid: PRODUCT_C, quantity: 1 }], TOKEN);
    expect(report.merged).toEqual([PRODUCT_A]);
    expect(report.dropped).toEqual([
      { productUuid: PRODUCT_B, reason: MergeDropReason.OUT_OF_STOCK },
      { productUuid: PRODUCT_C, reason: MergeDropReason.NOT_FOUND },
    ]);
  });

  it("keeps a line that fails with a 5xx as failed, to retry later", async () => {
    mockCatalog({ [PRODUCT_A]: 10, [PRODUCT_B]: 10 });
    mockAdd(409, { [PRODUCT_B]: [500, "APPLICATION_ERROR"] });
    const report = await mergeGuestCart(LINES, TOKEN);
    expect(report.merged).toEqual([PRODUCT_A]);
    expect(report.failed).toEqual([{ productUuid: PRODUCT_B, quantity: 5 }]);
    expect(testLogger.info).toHaveBeenCalledWith(
      { merged: 1, capped: 0, dropped: 0, failed: 1 },
      "Guest cart merged",
    );
  });

  it("throws when the backend stays unavailable, and never logs the token", async () => {
    server.use(http.post(`${API}/cart/add`, () => HttpResponse.error()));
    await expect(mergeGuestCart(LINES, TOKEN)).rejects.toBeInstanceOf(ApiError);
    expect(allLoggedText()).not.toContain(TOKEN);
  });
});
