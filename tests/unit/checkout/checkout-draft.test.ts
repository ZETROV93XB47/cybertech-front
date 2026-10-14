import { describe, expect, it } from "vitest";

import {
  clearCheckoutDraft,
  readCheckoutDraft,
  writeCheckoutDraft,
} from "@/features/checkout/checkout-draft";
import { CheckoutStep } from "@/lib/enums/checkout";
import { PaymentType } from "@/lib/enums/order";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";
import { StorageKey } from "@/lib/enums/storage-key";
import { CheckoutDraftSchema, type CheckoutDraft } from "@/lib/schemas/storage";

/** In-memory `Storage`, so each test starts from an empty tab. */
class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();

  public get length(): number {
    return this.items.size;
  }

  public clear(): void {
    this.items.clear();
  }

  public getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.items.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

/** `Storage` whose every access throws, like a browser with storage blocked. */
class BlockedStorage extends MemoryStorage {
  public override getItem(): string | null {
    throw new Error("blocked");
  }

  public override removeItem(): void {
    throw new Error("blocked");
  }

  public override setItem(): void {
    throw new Error("blocked");
  }
}

const DRAFT: CheckoutDraft = {
  step: CheckoutStep.PAYMENT,
  shippingType: ShippingType.EXPRESS,
  shippingProvider: ShippingProvider.FEDEX,
  paymentType: PaymentType.VISA,
  hadCustomAddress: true,
};

describe("CheckoutDraftSchema", () => {
  it("accepts a full draft and a draft with only the step", () => {
    expect(CheckoutDraftSchema.safeParse(DRAFT).success).toBe(true);
    expect(
      CheckoutDraftSchema.safeParse({ step: CheckoutStep.ADDRESS, hadCustomAddress: false })
        .success,
    ).toBe(true);
  });

  it("rejects an address field: the draft never holds personal data", () => {
    expect(CheckoutDraftSchema.safeParse({ ...DRAFT, street: "1 rue du Test" }).success).toBe(
      false,
    );
    expect(CheckoutDraftSchema.safeParse({ ...DRAFT, address: { city: "Paris" } }).success).toBe(
      false,
    );
  });

  it("rejects unknown enum values and a missing flag", () => {
    expect(CheckoutDraftSchema.safeParse({ ...DRAFT, step: "review" }).success).toBe(false);
    expect(CheckoutDraftSchema.safeParse({ ...DRAFT, shippingType: "PICKUP" }).success).toBe(false);
    expect(CheckoutDraftSchema.safeParse({ ...DRAFT, paymentType: "PAYPAL" }).success).toBe(false);
    expect(CheckoutDraftSchema.safeParse({ step: CheckoutStep.ADDRESS }).success).toBe(false);
  });
});

describe("checkout draft storage", () => {
  it("writes then reads the draft under ct_checkout_v1", () => {
    const storage = new MemoryStorage();
    expect(writeCheckoutDraft(storage, DRAFT)).toBe(true);
    expect(storage.getItem(StorageKey.CHECKOUT)).not.toBeNull();
    expect(readCheckoutDraft(storage)).toEqual(DRAFT);
  });

  it("returns null when nothing is stored", () => {
    expect(readCheckoutDraft(new MemoryStorage())).toBeNull();
  });

  it.each([
    ["not JSON", "{oops"],
    ["tampered step", JSON.stringify({ ...DRAFT, step: "review" })],
    ["stored address", JSON.stringify({ ...DRAFT, street: "1 rue du Test" })],
  ])("removes an invalid value (%s)", (_label, raw) => {
    const storage = new MemoryStorage();
    storage.setItem(StorageKey.CHECKOUT, raw);
    expect(readCheckoutDraft(storage)).toBeNull();
    expect(storage.getItem(StorageKey.CHECKOUT)).toBeNull();
  });

  it("clears the draft", () => {
    const storage = new MemoryStorage();
    writeCheckoutDraft(storage, DRAFT);
    clearCheckoutDraft(storage);
    expect(readCheckoutDraft(storage)).toBeNull();
  });

  it("survives a blocked storage", () => {
    const storage = new BlockedStorage();
    expect(writeCheckoutDraft(storage, DRAFT)).toBe(false);
    expect(readCheckoutDraft(storage)).toBeNull();
    expect(() => {
      clearCheckoutDraft(storage);
    }).not.toThrow();
  });
});
