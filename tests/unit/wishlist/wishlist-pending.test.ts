/**
 * Wishlist add kept aside during the sign-in (feature 003 US6, T091).
 *
 * @see specs/003-account-orders/research.md R22
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearWishlistPending,
  storeWishlistPending,
  takeWishlistPending,
} from "@/features/wishlist/wishlist-pending";
import { StorageKey } from "@/lib/enums/storage-key";

import { PRODUCT_A } from "../../helpers/cart";

/** Storage whose every call throws, like a blocked `sessionStorage`. */
const BLOCKED: Storage = {
  length: 0,
  clear: () => {
    throw new Error("blocked");
  },
  getItem: () => {
    throw new Error("blocked");
  },
  key: () => null,
  removeItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("wishlist pending add", () => {
  it("stores under ct_wishlist_pending_v1, then is taken once", () => {
    expect(storeWishlistPending(window.sessionStorage, { productUuid: PRODUCT_A })).toBe(true);
    expect(window.sessionStorage.getItem(StorageKey.WISHLIST_PENDING)).not.toBeNull();
    expect(takeWishlistPending(window.sessionStorage)).toEqual({ productUuid: PRODUCT_A });
    expect(takeWishlistPending(window.sessionStorage)).toBeNull();
  });

  it("drops a tampered value", () => {
    window.sessionStorage.setItem(StorageKey.WISHLIST_PENDING, JSON.stringify({ productUuid: 1 }));
    expect(takeWishlistPending(window.sessionStorage)).toBeNull();
    expect(window.sessionStorage.getItem(StorageKey.WISHLIST_PENDING)).toBeNull();
  });

  it("drops a value that is not JSON", () => {
    window.sessionStorage.setItem(StorageKey.WISHLIST_PENDING, "{oops");
    expect(takeWishlistPending(window.sessionStorage)).toBeNull();
  });

  it("clears the stored add", () => {
    storeWishlistPending(window.sessionStorage, { productUuid: PRODUCT_A });
    clearWishlistPending(window.sessionStorage);
    expect(takeWishlistPending(window.sessionStorage)).toBeNull();
  });

  it("treats a blocked storage as empty", () => {
    expect(storeWishlistPending(BLOCKED, { productUuid: PRODUCT_A })).toBe(false);
    expect(takeWishlistPending(BLOCKED)).toBeNull();
    expect(() => {
      clearWishlistPending(BLOCKED);
    }).not.toThrow();
  });
});
