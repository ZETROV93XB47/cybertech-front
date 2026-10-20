// @vitest-environment node
/**
 * Checkout reducer, address validation and payment follow-up state (feature 003, T020).
 */
import { describe, expect, it } from "vitest";

import { validateAddress } from "@/features/checkout/address-form";
import {
  areStepsComplete,
  checkoutReducer,
  initCheckoutState,
  stepStateOf,
  toCheckoutDraft,
  type CheckoutAction,
  type CheckoutState,
} from "@/features/checkout/checkout-state";
import { paymentTrackerState } from "@/features/checkout/payment-tracker";
import { BffError } from "@/lib/api/bff-client";
import { CheckoutStep, PaymentTrackerState } from "@/lib/enums/checkout";
import {
  AddressField,
  CheckoutActionType,
  CheckoutStepState,
} from "@/lib/enums/checkout-step-state";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { OrderStatus, PaymentType } from "@/lib/enums/order";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";

const ADDRESS = { street: "1 rue du Test", zipCode: "75001", city: "Paris", country: "France" };

const EXPRESS_FEDEX = { type: ShippingType.EXPRESS, provider: ShippingProvider.FEDEX };

/**
 * Applies several transitions.
 *
 * @param actions - Transitions in order.
 * @returns The final state.
 */
function run(...actions: CheckoutAction[]): CheckoutState {
  return actions.reduce(checkoutReducer, initCheckoutState(ADDRESS));
}

describe("checkoutReducer", () => {
  it("opens the address step first, the others upcoming", () => {
    const state = initCheckoutState(ADDRESS);
    expect(stepStateOf(state, CheckoutStep.ADDRESS)).toBe(CheckoutStepState.CURRENT);
    expect(stepStateOf(state, CheckoutStep.SHIPPING)).toBe(CheckoutStepState.UPCOMING);
    expect(areStepsComplete(state)).toBe(false);
  });

  it("keeps the address step open with an error per empty field", () => {
    const state = run(
      { type: CheckoutActionType.CHANGE_ADDRESS, field: AddressField.CITY, value: "  " },
      { type: CheckoutActionType.SUBMIT_ADDRESS },
    );
    expect(state.openStep).toBe(CheckoutStep.ADDRESS);
    expect(state.addressErrors.city).toBe("Ce champ est obligatoire.");
    expect(state.addressEdited).toBe(true);
  });

  it("unfolds the steps one after the other, then folds everything", () => {
    const state = run(
      { type: CheckoutActionType.SUBMIT_ADDRESS },
      { type: CheckoutActionType.SELECT_SHIPPING, value: EXPRESS_FEDEX },
      { type: CheckoutActionType.SUBMIT_SHIPPING },
      { type: CheckoutActionType.SELECT_PAYMENT, value: PaymentType.VISA },
      { type: CheckoutActionType.SUBMIT_PAYMENT },
    );
    expect(state.openStep).toBeNull();
    expect(stepStateOf(state, CheckoutStep.PAYMENT)).toBe(CheckoutStepState.DONE);
    expect(areStepsComplete(state)).toBe(true);
  });

  it("asks for a choice before leaving a choice step", () => {
    const state = run(
      { type: CheckoutActionType.SUBMIT_ADDRESS },
      { type: CheckoutActionType.SUBMIT_SHIPPING },
    );
    expect(state.openStep).toBe(CheckoutStep.SHIPPING);
    expect(state.stepError).toBe("Choisis une option pour continuer.");
  });

  it("reopens a validated step without losing the choices", () => {
    const state = run(
      { type: CheckoutActionType.SUBMIT_ADDRESS },
      { type: CheckoutActionType.SELECT_SHIPPING, value: EXPRESS_FEDEX },
      { type: CheckoutActionType.SUBMIT_SHIPPING },
      { type: CheckoutActionType.REOPEN, step: CheckoutStep.ADDRESS },
    );
    expect(state.openStep).toBe(CheckoutStep.ADDRESS);
    expect(state.shipping).toEqual(EXPRESS_FEDEX);
    expect(stepStateOf(state, CheckoutStep.SHIPPING)).toBe(CheckoutStepState.DONE);
    expect(areStepsComplete(state)).toBe(false);
  });

  it("restores the choices of a draft and warns when the address had been edited", () => {
    const state = run({
      type: CheckoutActionType.RESTORE_DRAFT,
      draft: {
        step: CheckoutStep.PAYMENT,
        shippingType: ShippingType.EXPRESS,
        shippingProvider: ShippingProvider.DHL,
        paymentType: PaymentType.GOOGLE_PAY,
        hadCustomAddress: true,
      },
    });
    expect(state.shipping).toEqual({ type: ShippingType.EXPRESS, provider: ShippingProvider.DHL });
    expect(state.payment).toBe(PaymentType.GOOGLE_PAY);
    expect(state.address).toEqual(ADDRESS);
    expect(state.addressNotice).toMatch(/adresse a été reprise/);
    // The reset address must be checked again; the restored choices stay folded as done.
    expect(state.openStep).toBe(CheckoutStep.ADDRESS);
    expect(stepStateOf(state, CheckoutStep.SHIPPING)).toBe(CheckoutStepState.DONE);
    expect(stepStateOf(state, CheckoutStep.PAYMENT)).toBe(CheckoutStepState.DONE);
  });

  it("folds every restored step so that only « Valider la commande » is left", () => {
    const state = run({
      type: CheckoutActionType.RESTORE_DRAFT,
      draft: {
        step: CheckoutStep.PAYMENT,
        shippingType: ShippingType.EXPRESS,
        shippingProvider: ShippingProvider.DHL,
        paymentType: PaymentType.GOOGLE_PAY,
        hadCustomAddress: false,
      },
    });
    expect(state.openStep).toBeNull();
    expect(areStepsComplete(state)).toBe(true);
    expect(state.addressNotice).toBeNull();
  });

  it("opens the first step whose choice did not come back", () => {
    const state = run({
      type: CheckoutActionType.RESTORE_DRAFT,
      draft: {
        step: CheckoutStep.SHIPPING,
        shippingType: ShippingType.STANDARD,
        shippingProvider: ShippingProvider.DHL,
        hadCustomAddress: false,
      },
    });
    expect(state.validated).toEqual([CheckoutStep.ADDRESS, CheckoutStep.SHIPPING]);
    expect(state.openStep).toBe(CheckoutStep.PAYMENT);
  });

  it("keeps the address step open when the profile address is incomplete", () => {
    const state = [
      {
        type: CheckoutActionType.RESTORE_DRAFT,
        draft: {
          step: CheckoutStep.PAYMENT,
          shippingType: ShippingType.STANDARD,
          shippingProvider: ShippingProvider.DHL,
          paymentType: PaymentType.VISA,
          hadCustomAddress: false,
        },
      } satisfies CheckoutAction,
    ].reduce(checkoutReducer, initCheckoutState({ ...ADDRESS, city: "" }));
    expect(state.openStep).toBe(CheckoutStep.ADDRESS);
    expect(areStepsComplete(state)).toBe(false);
  });

  it("writes a draft without any address", () => {
    const draft = toCheckoutDraft(
      run(
        { type: CheckoutActionType.CHANGE_ADDRESS, field: AddressField.STREET, value: "2 rue" },
        { type: CheckoutActionType.SUBMIT_ADDRESS },
        { type: CheckoutActionType.SELECT_SHIPPING, value: EXPRESS_FEDEX },
      ),
    );
    expect(draft).toEqual({
      step: CheckoutStep.SHIPPING,
      shippingType: ShippingType.EXPRESS,
      shippingProvider: ShippingProvider.FEDEX,
      hadCustomAddress: true,
    });
    expect(JSON.stringify(draft)).not.toContain("2 rue");
  });
});

describe("validateAddress", () => {
  it("trims a valid address", () => {
    expect(validateAddress({ ...ADDRESS, city: " Paris " })).toEqual({
      ok: true,
      address: ADDRESS,
    });
  });

  it("reports empty and too long fields", () => {
    const result = validateAddress({ ...ADDRESS, zipCode: "", country: "x".repeat(256) });
    expect(result).toEqual({
      ok: false,
      errors: { zipCode: "Ce champ est obligatoire.", country: "255 caractères maximum." },
    });
  });
});

describe("paymentTrackerState", () => {
  it.each([
    [OrderStatus.CREATED, PaymentTrackerState.PENDING],
    [OrderStatus.AWAITING_PAYMENT, PaymentTrackerState.PENDING],
    [OrderStatus.PAID, PaymentTrackerState.PAID],
    [OrderStatus.AWAITING_SHIPPING, PaymentTrackerState.PAID],
    [OrderStatus.SHIPPED, PaymentTrackerState.PAID],
    [OrderStatus.DELIVERED, PaymentTrackerState.PAID],
    [OrderStatus.PAYMENT_FAILED, PaymentTrackerState.FAILED],
    [OrderStatus.CANCELED, PaymentTrackerState.UNKNOWN],
    [OrderStatus.REFUNDED, PaymentTrackerState.UNKNOWN],
    [OrderStatus.RETURNED, PaymentTrackerState.UNKNOWN],
  ])("%s → %s", (status, expected) => {
    expect(paymentTrackerState(status, false, null)).toBe(expected);
  });

  it("is pending before the first answer and timed out after the limit", () => {
    expect(paymentTrackerState(undefined, false, null)).toBe(PaymentTrackerState.PENDING);
    expect(paymentTrackerState(OrderStatus.AWAITING_PAYMENT, true, null)).toBe(
      PaymentTrackerState.TIMED_OUT,
    );
  });

  it("keeps waiting through an outage, stops on another error", () => {
    const outage = new BffError(FrontErrorCode.UNAVAILABLE, 503, "down");
    const missing = new BffError(FrontErrorCode.NOT_FOUND, 404, "missing");
    expect(paymentTrackerState(undefined, false, outage)).toBe(PaymentTrackerState.PENDING);
    expect(paymentTrackerState(undefined, false, missing)).toBe(PaymentTrackerState.UNKNOWN);
  });
});
