import { afterEach, describe, expect, it } from "vitest";

import {
  clearPendingAction,
  storePendingAction,
  takePendingAction,
  toCartChange,
  toPendingAction,
} from "@/features/cart/pending-action";
import { CartAction, PendingActionType } from "@/lib/enums/cart";

import { PRODUCT_A } from "../../helpers/cart";

const KEY = "ct_pending_action_v1";

afterEach(() => {
  window.sessionStorage.clear();
});

describe("pending action", () => {
  it("is stored, replayed once, then gone", () => {
    const action = { type: PendingActionType.ADD, productUuid: PRODUCT_A, quantity: 2 };
    expect(storePendingAction(window.sessionStorage, action)).toBe(true);
    expect(takePendingAction(window.sessionStorage)).toEqual(action);
    expect(takePendingAction(window.sessionStorage)).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("keeps a single action: the last one wins", () => {
    storePendingAction(window.sessionStorage, {
      type: PendingActionType.REMOVE,
      productUuid: PRODUCT_A,
    });
    storePendingAction(window.sessionStorage, {
      type: PendingActionType.SET,
      productUuid: PRODUCT_A,
      quantity: 5,
    });
    expect(takePendingAction(window.sessionStorage)?.type).toBe(PendingActionType.SET);
  });

  it.each([
    ["corrupted JSON", "{nope"],
    ["unknown type", JSON.stringify({ type: "explode", productUuid: PRODUCT_A })],
    ["quantity 100", JSON.stringify({ type: "add", productUuid: PRODUCT_A, quantity: 100 })],
  ])("clears an invalid value (%s)", (_label, raw) => {
    window.sessionStorage.setItem(KEY, raw);
    expect(takePendingAction(window.sessionStorage)).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("can be cleared explicitly (sign-out)", () => {
    storePendingAction(window.sessionStorage, {
      type: PendingActionType.REMOVE,
      productUuid: PRODUCT_A,
    });
    clearPendingAction(window.sessionStorage);
    expect(takePendingAction(window.sessionStorage)).toBeNull();
  });

  it("converts cart changes both ways, but never stores « vider le panier »", () => {
    const add = { action: CartAction.ADD, productUuid: PRODUCT_A, quantity: 3 } as const;
    const stored = toPendingAction(add);
    expect(stored).toEqual({ type: PendingActionType.ADD, productUuid: PRODUCT_A, quantity: 3 });
    expect(stored && toCartChange(stored)).toEqual(add);
    expect(toPendingAction({ action: CartAction.CLEAR })).toBeNull();
    expect(toCartChange({ type: PendingActionType.SET, productUuid: PRODUCT_A })).toBeNull();
  });
});
