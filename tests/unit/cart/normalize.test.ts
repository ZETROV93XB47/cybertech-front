import { describe, expect, it } from "vitest";

import {
  buildAccountCartView,
  buildGuestCartView,
  emptyCartView,
  predictCartView,
  type CartEnrichment,
} from "@/features/cart/cart-view";
import { Brand } from "@/lib/enums/brand";
import { CartAction, CartLineStatus, CartSource } from "@/lib/enums/cart";
import { AccountCartSchema } from "@/lib/schemas/cart";

import { NULL_CART, PRODUCT_A, PRODUCT_B, PRODUCT_C, backendCart } from "../../helpers/cart";

function enrichment(
  stock: Record<string, number>,
  deleted: readonly string[] = [],
): CartEnrichment {
  const uuids = Object.keys(stock).filter((uuid) => !deleted.includes(uuid));
  return {
    products: new Map(
      uuids.map((uuid) => [
        uuid,
        {
          uuid,
          name: `Produit ${uuid.slice(-1)}`,
          brand: Brand.DELL,
          category: "COMPUTER",
          price: uuid === PRODUCT_B ? 250.5 : 100,
          imageUrl: "http://localhost:4566/cybertech-products/a.jpg",
        },
      ]),
    ),
    stock: new Map(
      Object.entries(stock).map(([uuid, available]) => [
        uuid,
        { productUuid: uuid, availableStock: available, inStock: available > 0 },
      ]),
    ),
  };
}

describe("buildAccountCartView", () => {
  it("normalises a cart whose fields are all null into an empty view with total 0", () => {
    const cart = AccountCartSchema.parse(NULL_CART);
    expect(buildAccountCartView(cart, null)).toEqual({
      source: CartSource.ACCOUNT,
      cartUuid: null,
      lines: [],
      total: 0,
      totalIsEstimate: false,
      itemCount: 0,
    });
  });

  it("also accepts a cart whose fields are absent", () => {
    expect(buildAccountCartView(AccountCartSchema.parse({}), null).lines).toEqual([]);
  });

  it("keeps the backend total and adds image and stock", () => {
    const cart = AccountCartSchema.parse(
      backendCart([
        [PRODUCT_A, 2],
        [PRODUCT_B, 1],
      ]),
    );
    const view = buildAccountCartView(cart, enrichment({ [PRODUCT_A]: 1, [PRODUCT_B]: 10 }));
    expect(view.total).toBe(450.5);
    expect(view.totalIsEstimate).toBe(false);
    expect(view.itemCount).toBe(3);
    expect(view.lines[0]).toMatchObject({
      productUuid: PRODUCT_A,
      availableStock: 1,
      status: CartLineStatus.INSUFFICIENT_STOCK,
    });
    expect(view.lines[1]?.status).toBe(CartLineStatus.OK);
    expect(view.lines[1]?.imageUrl).not.toBeNull();
  });

  it("marks a deleted product unavailable, but not when the enrichment failed", () => {
    const cart = AccountCartSchema.parse(backendCart([[PRODUCT_A, 1]]));
    expect(buildAccountCartView(cart, enrichment({}, [PRODUCT_A])).lines[0]?.status).toBe(
      CartLineStatus.UNAVAILABLE,
    );
    expect(buildAccountCartView(cart, null).lines[0]).toMatchObject({
      status: CartLineStatus.OK,
      availableStock: null,
      imageUrl: null,
    });
  });
});

describe("buildGuestCartView", () => {
  it("re-reads prices and estimates the total", () => {
    const view = buildGuestCartView(
      [
        { productUuid: PRODUCT_A, quantity: 3 },
        { productUuid: PRODUCT_B, quantity: 2 },
      ],
      enrichment({ [PRODUCT_A]: 10, [PRODUCT_B]: 10 }),
    );
    expect(view).toMatchObject({
      source: CartSource.GUEST,
      cartUuid: null,
      total: 801,
      totalIsEstimate: true,
      itemCount: 5,
    });
    expect(view.lines.map((line) => line.lineTotal)).toEqual([300, 501]);
  });

  it("flags insufficient stock and deleted products, without counting the latter", () => {
    const view = buildGuestCartView(
      [
        { productUuid: PRODUCT_A, quantity: 5 },
        { productUuid: PRODUCT_C, quantity: 1 },
      ],
      enrichment({ [PRODUCT_A]: 2 }),
    );
    expect(view.lines.map((line) => line.status)).toEqual([
      CartLineStatus.INSUFFICIENT_STOCK,
      CartLineStatus.UNAVAILABLE,
    ]);
    expect(view.lines[1]).toMatchObject({ name: "", unitPrice: 0, lineTotal: 0 });
    expect(view.itemCount).toBe(5);
    expect(view.total).toBe(500);
  });

  it("treats a product flagged out of stock as 0 available", () => {
    const view = buildGuestCartView(
      [{ productUuid: PRODUCT_A, quantity: 1 }],
      enrichment({ [PRODUCT_A]: 0 }),
    );
    expect(view.lines[0]).toMatchObject({
      availableStock: 0,
      status: CartLineStatus.INSUFFICIENT_STOCK,
    });
  });
});

describe("emptyCartView and predictCartView", () => {
  it("builds empty views for both sources", () => {
    expect(emptyCartView(CartSource.GUEST)).toMatchObject({ total: 0, totalIsEstimate: true });
    expect(emptyCartView(CartSource.ACCOUNT)).toMatchObject({ total: 0, totalIsEstimate: false });
  });

  it("predicts quantity changes, removals and clears", () => {
    const cart = buildGuestCartView(
      [
        { productUuid: PRODUCT_A, quantity: 1 },
        { productUuid: PRODUCT_B, quantity: 1 },
      ],
      enrichment({ [PRODUCT_A]: 10, [PRODUCT_B]: 10 }),
    );
    const added = predictCartView(cart, {
      action: CartAction.ADD,
      productUuid: PRODUCT_A,
      quantity: 2,
    });
    expect(added.lines[0]).toMatchObject({ quantity: 3, lineTotal: 300 });
    expect(added.itemCount).toBe(4);
    const unknown = predictCartView(cart, {
      action: CartAction.ADD,
      productUuid: PRODUCT_C,
      quantity: 2,
    });
    expect(unknown.itemCount).toBe(4);
    expect(predictCartView(cart, { action: CartAction.REMOVE, productUuid: PRODUCT_A }).total).toBe(
      250.5,
    );
    expect(predictCartView(cart, { action: CartAction.CLEAR })).toMatchObject({
      itemCount: 0,
      total: 0,
    });
  });
});
