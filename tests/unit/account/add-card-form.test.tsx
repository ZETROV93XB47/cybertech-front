/**
 * « Ajouter une carte » logic (feature 003 US5, T086): validation, network following the
 * number until chosen, body sent to the BFF, and the failure messages (the previous card's loss
 * and an expired session asking to type the number again). The rendered form is covered by
 * `bank-card-panel.test.tsx`.
 *
 * @see specs/003-account-orders/research.md R21
 */
import { describe, expect, it } from "vitest";

import {
  emptyAddCardValues,
  toAddCardBody,
  validateAddCard,
  withDigits,
} from "@/features/account/add-card-form";
import { addCardFailure } from "@/features/account/hooks/useAddCard";
import { BffError } from "@/lib/api/bff-client";
import { BankCardField, BankCardType, CardFormStatus } from "@/lib/enums/bank-card";
import { FrontErrorCode } from "@/lib/enums/error-code";

const NOW = new Date("2026-10-20T10:00:00Z");

const VALID = {
  ...withDigits(emptyAddCardValues("Camille"), "1111111111111111"),
  expiryMonth: "12",
  expiryYear: "2030",
};

describe("add card form", () => {
  it("accepts a valid test card and builds the body", () => {
    expect(validateAddCard(VALID, NOW)).toEqual({});
    expect(toAddCardBody(VALID, true)).toEqual({
      cardHolderName: "Camille",
      cardNumber: "1111111111111111",
      expiryDate: "12/2030",
      cardType: BankCardType.OTHER,
      replace: true,
    });
  });

  it("flags the holder, the number and the expiry", () => {
    const errors = validateAddCard(
      { ...emptyAddCardValues(), digits: "1111", expiryMonth: "01", expiryYear: "2020" },
      NOW,
    );
    expect(Object.keys(errors).sort()).toEqual(
      [
        BankCardField.CARD_HOLDER_NAME,
        BankCardField.CARD_NUMBER,
        BankCardField.EXPIRY_MONTH,
      ].sort(),
    );
  });

  it("follows the number until the network is chosen", () => {
    const visa = withDigits(emptyAddCardValues(), "4242");
    expect(visa.network).toBe(BankCardType.VISA);
    const chosen = withDigits(
      { ...visa, network: BankCardType.DISCOVER, isNetworkChosen: true },
      "5555",
    );
    expect(chosen.network).toBe(BankCardType.DISCOVER);
  });
});

describe("addCardFailure", () => {
  it("says explicitly that the previous card is gone", () => {
    const outcome = addCardFailure(
      new BffError(FrontErrorCode.INVALID, 400, "refused", undefined, undefined, undefined, true),
    );
    expect(outcome).toMatchObject({ status: CardFormStatus.ERROR });
    expect(outcome.formError).toMatch(/ancienne carte a été supprimée/);
  });

  it("asks to type the number again after a session expiry", () => {
    const outcome = addCardFailure(new BffError(FrontErrorCode.UNAUTHENTICATED, 401, "expired"));
    expect(outcome.needsSignIn).toBe(true);
    expect(outcome.formError).toMatch(/ressaisis le numéro/);
  });

  it("treats an unexpected error as unknown", () => {
    expect(addCardFailure(new Error("boom")).formError).toMatch(/imprévu/);
  });
});
