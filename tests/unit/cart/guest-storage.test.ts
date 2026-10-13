import { afterEach, describe, expect, it, vi } from "vitest";

import { applyGuestChange } from "@/features/cart/guest-lines";
import {
  GUEST_CART_EVENT,
  clearGuestCart,
  readGuestCart,
  subscribeToGuestCart,
  writeGuestCart,
} from "@/features/cart/guest-storage";
import { CartAction, GuestCartLimit } from "@/lib/enums/cart";

import { fakeUuids } from "../../helpers/products";

const KEY = "ct_guest_cart_v1";
const [A = "", B = ""] = fakeUuids(2);

afterEach(() => {
  window.localStorage.clear();
});

describe("guest cart storage", () => {
  it("writes and reads the lines with an ISO date", () => {
    expect(writeGuestCart(window.localStorage, [{ productUuid: A, quantity: 2 }])).toBe(true);
    const stored = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as { updatedAt: string };
    expect(Number.isNaN(Date.parse(stored.updatedAt))).toBe(false);
    expect(readGuestCart(window.localStorage)).toEqual([{ productUuid: A, quantity: 2 }]);
  });

  it("returns an empty cart when nothing is stored", () => {
    expect(readGuestCart(window.localStorage)).toEqual([]);
  });

  it.each([
    ["corrupted JSON", "{not json"],
    ["wrong shape", JSON.stringify({ items: "nope" })],
    [
      "quantity 100",
      JSON.stringify({
        items: [{ productUuid: A, quantity: 100 }],
        updatedAt: "2026-10-13T10:00:00Z",
      }),
    ],
  ])("resets a %s", (_label, raw) => {
    window.localStorage.setItem(KEY, raw);
    expect(readGuestCart(window.localStorage)).toEqual([]);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("refuses to write more than 50 lines or a quantity outside 1–99", () => {
    const lines = fakeUuids(51).map((productUuid) => ({ productUuid, quantity: 1 }));
    expect(writeGuestCart(window.localStorage, lines)).toBe(false);
    expect(writeGuestCart(window.localStorage, lines.slice(0, 50))).toBe(true);
    expect(writeGuestCart(window.localStorage, [{ productUuid: A, quantity: 0 }])).toBe(false);
    expect(writeGuestCart(window.localStorage, [{ productUuid: A, quantity: 99 }])).toBe(true);
  });

  it("removes the key when the cart is emptied", () => {
    writeGuestCart(window.localStorage, [{ productUuid: A, quantity: 1 }]);
    expect(clearGuestCart(window.localStorage)).toBe(true);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("survives a blocked storage", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    } as unknown as Storage;
    expect(readGuestCart(blocked)).toEqual([]);
    expect(writeGuestCart(blocked, [{ productUuid: A, quantity: 1 }])).toBe(false);
  });

  it("notifies on writes in this tab and on `storage` events from other tabs", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToGuestCart(callback);
    writeGuestCart(window.localStorage, [{ productUuid: A, quantity: 1 }]);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    window.dispatchEvent(new StorageEvent("storage", { key: "ct_recent_v1" }));
    expect(callback).toHaveBeenCalledTimes(2);
    unsubscribe();
    window.dispatchEvent(new Event(GUEST_CART_EVENT));
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe("applyGuestChange", () => {
  const lines = [{ productUuid: A, quantity: 2 }];

  it("adds quantities to an existing line (additive, like the backend)", () => {
    expect(
      applyGuestChange(lines, { action: CartAction.ADD, productUuid: A, quantity: 1 }),
    ).toEqual({
      ok: true,
      lines: [{ productUuid: A, quantity: 3 }],
    });
  });

  it("sets, removes and clears lines", () => {
    const set = applyGuestChange(lines, { action: CartAction.SET, productUuid: B, quantity: 4 });
    expect(set).toEqual({ ok: true, lines: [...lines, { productUuid: B, quantity: 4 }] });
    expect(applyGuestChange(lines, { action: CartAction.REMOVE, productUuid: A })).toEqual({
      ok: true,
      lines: [],
    });
    expect(applyGuestChange(lines, { action: CartAction.CLEAR })).toEqual({ ok: true, lines: [] });
  });

  it("refuses more than 99 units and a 51st line", () => {
    expect(
      applyGuestChange(lines, { action: CartAction.ADD, productUuid: A, quantity: 98 }),
    ).toEqual({
      ok: false,
      limit: GuestCartLimit.MAX_QUANTITY,
    });
    const full = fakeUuids(50).map((productUuid) => ({ productUuid, quantity: 1 }));
    expect(
      applyGuestChange(full, {
        action: CartAction.ADD,
        productUuid: "01a0fcee-0000-7000-8000-0000000000ff",
        quantity: 1,
      }),
    ).toEqual({ ok: false, limit: GuestCartLimit.MAX_LINES });
  });
});
