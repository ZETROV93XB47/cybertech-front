/**
 * Order edit state and body (feature 003, T042): complete list of lines, last line kept,
 * product added once, bounded quantities, address split back, payment required, draft without
 * address.
 *
 * @see specs/003-account-orders/research.md R14
 */
import { describe, expect, it } from "vitest";

import {
  buildOrderUpdateBody,
  initOrderEditState,
  orderEditReducer,
  toOrderEditDraft,
  type OrderEditState,
} from "@/features/orders/order-edit";
import {
  clearOrderEditDraft,
  readOrderEditDraft,
  writeOrderEditDraft,
} from "@/features/orders/order-edit-draft";
import { parseFlatAddress } from "@/lib/address";
import { CART_LINE_MAX_QUANTITY } from "@/lib/constants/cart";
import { ORDER_MAX_LINES } from "@/lib/constants/orders";
import { AddressField } from "@/lib/enums/checkout-step-state";
import { OrderEditActionType, OrderEditIssue, PaymentType } from "@/lib/enums/order";
import { StorageKey } from "@/lib/enums/storage-key";

import { fakeUuids } from "../../helpers/products";

import {
  FLAT_ADDRESS,
  ORDER_UUID,
  PRODUCT_A,
  PRODUCT_B,
  PRODUCT_C,
  RECENT_ORDER,
} from "./fixtures";

/**
 * Initial state of the recent order.
 *
 * @returns The state.
 */
function initial(): OrderEditState {
  return initOrderEditState(RECENT_ORDER, parseFlatAddress(FLAT_ADDRESS));
}

/**
 * Initial state with a payment chosen.
 *
 * @returns The state.
 */
function withPayment(): OrderEditState {
  return orderEditReducer(initial(), {
    type: OrderEditActionType.SELECT_PAYMENT,
    value: PaymentType.VISA,
  });
}

describe("orderEditReducer", () => {
  it("changes a quantity, bounded to the line limits", () => {
    let state = orderEditReducer(initial(), {
      type: OrderEditActionType.SET_QUANTITY,
      productUuid: PRODUCT_A,
      quantity: 1,
    });
    expect(state.lines[0]?.quantity).toBe(1);
    state = orderEditReducer(state, {
      type: OrderEditActionType.SET_QUANTITY,
      productUuid: PRODUCT_A,
      quantity: CART_LINE_MAX_QUANTITY + 10,
    });
    expect(state.lines[0]?.quantity).toBe(CART_LINE_MAX_QUANTITY);
    state = orderEditReducer(state, {
      type: OrderEditActionType.SET_QUANTITY,
      productUuid: PRODUCT_A,
      quantity: 0,
    });
    expect(state.lines[0]?.quantity).toBe(1);
  });

  it("removes a line but never the last one", () => {
    const one = orderEditReducer(initial(), {
      type: OrderEditActionType.REMOVE_LINE,
      productUuid: PRODUCT_B,
    });
    expect(one.lines.map((line) => line.productUuid)).toEqual([PRODUCT_A]);
    const still = orderEditReducer(one, {
      type: OrderEditActionType.REMOVE_LINE,
      productUuid: PRODUCT_A,
    });
    expect(still.lines).toHaveLength(1);
  });

  it("adds a new product once and increases a present one", () => {
    const picked = { productUuid: PRODUCT_C, productName: "Souris", unitPrice: 30 };
    let state = orderEditReducer(initial(), {
      type: OrderEditActionType.ADD_PRODUCT,
      product: picked,
    });
    state = orderEditReducer(state, { type: OrderEditActionType.ADD_PRODUCT, product: picked });
    expect(state.lines.filter((line) => line.productUuid === PRODUCT_C)).toEqual([
      { ...picked, quantity: 2, originalQuantity: 0 },
    ]);
  });

  it(`stops adding new products at ${String(ORDER_MAX_LINES)} lines`, () => {
    let state = initial();
    for (const productUuid of fakeUuids(ORDER_MAX_LINES + 20).slice(10)) {
      state = orderEditReducer(state, {
        type: OrderEditActionType.ADD_PRODUCT,
        product: { productUuid, productName: "P", unitPrice: 1 },
      });
    }
    expect(state.lines).toHaveLength(ORDER_MAX_LINES);
  });

  it("flags only the lines asking for more stock than the saved order", () => {
    let state = orderEditReducer(initial(), {
      type: OrderEditActionType.SET_QUANTITY,
      productUuid: PRODUCT_B,
      quantity: 3,
    });
    state = orderEditReducer(state, {
      type: OrderEditActionType.SET_QUANTITY,
      productUuid: PRODUCT_A,
      quantity: 1,
    });
    state = orderEditReducer(state, { type: OrderEditActionType.FLAG_STOCK });
    expect(state.stockFlagged).toEqual([{ productUuid: PRODUCT_B, available: null }]);
  });

  it("flags exactly the short lines named by the backend, with what is left", () => {
    let state = orderEditReducer(initial(), {
      type: OrderEditActionType.SET_QUANTITY,
      productUuid: PRODUCT_B,
      quantity: 3,
    });
    state = orderEditReducer(state, {
      type: OrderEditActionType.SET_QUANTITY,
      productUuid: PRODUCT_A,
      quantity: 5,
    });
    state = orderEditReducer(state, {
      type: OrderEditActionType.FLAG_STOCK,
      shortages: [{ productUuid: PRODUCT_A, requested: 5, available: 2 }],
    });
    expect(state.stockFlagged).toEqual([{ productUuid: PRODUCT_A, available: 2 }]);
  });

  it("falls back to the increased lines when the backend names no line", () => {
    let state = orderEditReducer(initial(), {
      type: OrderEditActionType.SET_QUANTITY,
      productUuid: PRODUCT_B,
      quantity: 3,
    });
    state = orderEditReducer(state, { type: OrderEditActionType.FLAG_STOCK, shortages: [] });
    expect(state.stockFlagged).toEqual([{ productUuid: PRODUCT_B, available: null }]);
  });

  it("clears the flag of a line whose quantity changes", () => {
    let state = orderEditReducer(initial(), {
      type: OrderEditActionType.FLAG_STOCK,
      shortages: [{ productUuid: PRODUCT_A, requested: 5, available: 0 }],
    });
    state = orderEditReducer(state, {
      type: OrderEditActionType.SET_QUANTITY,
      productUuid: PRODUCT_A,
      quantity: 1,
    });
    expect(state.stockFlagged).toEqual([]);
  });
});

describe("buildOrderUpdateBody", () => {
  it("sends the complete list of lines, the split address and no discount key", () => {
    const state = orderEditReducer(withPayment(), {
      type: OrderEditActionType.SET_QUANTITY,
      productUuid: PRODUCT_A,
      quantity: 1,
    });
    const result = buildOrderUpdateBody(state);
    expect(result).toEqual({
      ok: true,
      body: {
        paymentType: PaymentType.VISA,
        shippingType: RECENT_ORDER.shippingType,
        shippingProvider: RECENT_ORDER.shippingProvider,
        address: {
          street: "12 rue de la Paix",
          zipCode: "75002",
          city: "Paris",
          country: "France",
        },
        items: [
          { productUuid: PRODUCT_A, quantity: 1 },
          { productUuid: PRODUCT_B, quantity: 1 },
        ],
      },
    });
  });

  it("requires a payment method, with no default", () => {
    const result = buildOrderUpdateBody(initial());
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.issues).toEqual([OrderEditIssue.PAYMENT]);
  });

  it("reports an empty address field", () => {
    const state = orderEditReducer(withPayment(), {
      type: OrderEditActionType.CHANGE_ADDRESS,
      field: AddressField.CITY,
      value: " ",
    });
    const result = buildOrderUpdateBody(state);
    expect(result.ok ? [] : result.issues).toEqual([OrderEditIssue.ADDRESS]);
    expect(result.ok ? {} : result.addressErrors).toHaveProperty(AddressField.CITY);
  });
});

describe("order edit draft", () => {
  it("keeps the lines, shipping and payment, never the address", () => {
    const draft = toOrderEditDraft(ORDER_UUID, withPayment());
    expect(JSON.stringify(draft)).not.toContain("Paix");
    writeOrderEditDraft(window.sessionStorage, draft);
    expect(readOrderEditDraft(window.sessionStorage, ORDER_UUID)).toEqual(draft);
    expect(readOrderEditDraft(window.sessionStorage, PRODUCT_A)).toBeNull();
    clearOrderEditDraft(window.sessionStorage);
    expect(readOrderEditDraft(window.sessionStorage, ORDER_UUID)).toBeNull();
  });

  it("removes a tampered draft", () => {
    window.sessionStorage.setItem(StorageKey.ORDER_EDIT, JSON.stringify({ orderUuid: "x" }));
    expect(readOrderEditDraft(window.sessionStorage, ORDER_UUID)).toBeNull();
    expect(window.sessionStorage.getItem(StorageKey.ORDER_EDIT)).toBeNull();
  });

  it("restores a draft on the initial state", () => {
    const picked = { productUuid: PRODUCT_C, productName: "Souris", unitPrice: 30 };
    const edited = orderEditReducer(withPayment(), {
      type: OrderEditActionType.ADD_PRODUCT,
      product: picked,
    });
    const restored = orderEditReducer(initial(), {
      type: OrderEditActionType.RESTORE_DRAFT,
      draft: toOrderEditDraft(ORDER_UUID, edited),
    });
    expect(restored.lines).toEqual(edited.lines);
    expect(restored.payment).toBe(PaymentType.VISA);
  });
});
