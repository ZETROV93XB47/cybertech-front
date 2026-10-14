"use client";

/**
 * Form and folded summary of each checkout step, wired to the checkout reducer.
 *
 * @see specs/003-account-orders/spec.md FR-006 to FR-009
 */
import type { Dispatch, ReactNode } from "react";

import { DELIVERY_MESSAGES } from "@/features/catalog/messages";
import { assertNever } from "@/lib/assert-never";
import { CheckoutStep } from "@/lib/enums/checkout";
import { CheckoutActionType } from "@/lib/enums/checkout-step-state";

import type { CheckoutAction, CheckoutState } from "../checkout-state";
import { CHECKOUT_MESSAGES } from "../messages";
import type { ShippingChoice } from "../shipping-choices";

import { AddressStep } from "./AddressStep";
import { PaymentStep } from "./PaymentStep";
import { ShippingStep } from "./ShippingStep";

/** Props of {@link CheckoutStepForm}. */
export interface CheckoutStepFormProps {
  readonly step: CheckoutStep;
  readonly state: CheckoutState;
  readonly dispatch: Dispatch<CheckoutAction>;
  readonly choices: readonly ShippingChoice[];
}

/**
 * Folded summary of a validated step.
 *
 * @param step - Step.
 * @param state - Checkout state.
 * @returns The choices made, in one or two lines.
 */
export function stepSummary(step: CheckoutStep, state: CheckoutState): ReactNode {
  switch (step) {
    case CheckoutStep.ADDRESS: {
      const { street, zipCode, city, country } = state.address;
      return `${street}, ${zipCode} ${city}, ${country}`;
    }
    case CheckoutStep.SHIPPING:
      return state.shipping
        ? `${DELIVERY_MESSAGES.typeLabels[state.shipping.type]} — ${DELIVERY_MESSAGES.providerLabels[state.shipping.provider]}`
        : null;
    case CheckoutStep.PAYMENT:
      return state.payment ? CHECKOUT_MESSAGES.paymentLabels[state.payment] : null;
    default:
      return assertNever(step);
  }
}

/**
 * Form of the open step.
 *
 * @param props - Step, state, dispatcher and shipping choices.
 * @returns The form.
 */
export function CheckoutStepForm({
  step,
  state,
  dispatch,
  choices,
}: CheckoutStepFormProps): ReactNode {
  switch (step) {
    case CheckoutStep.ADDRESS:
      return (
        <AddressStep
          value={state.address}
          errors={state.addressErrors}
          notice={state.addressNotice}
          onChange={(field, value) => {
            dispatch({ type: CheckoutActionType.CHANGE_ADDRESS, field, value });
          }}
          onSubmit={() => {
            dispatch({ type: CheckoutActionType.SUBMIT_ADDRESS });
          }}
        />
      );
    case CheckoutStep.SHIPPING:
      return (
        <ShippingStep
          choices={choices}
          value={state.shipping}
          error={state.stepError}
          onChange={(value) => {
            dispatch({ type: CheckoutActionType.SELECT_SHIPPING, value });
          }}
          onSubmit={() => {
            dispatch({ type: CheckoutActionType.SUBMIT_SHIPPING });
          }}
        />
      );
    case CheckoutStep.PAYMENT:
      return (
        <PaymentStep
          value={state.payment}
          error={state.stepError}
          onChange={(value) => {
            dispatch({ type: CheckoutActionType.SELECT_PAYMENT, value });
          }}
          onSubmit={() => {
            dispatch({ type: CheckoutActionType.SUBMIT_PAYMENT });
          }}
        />
      );
    default:
      return assertNever(step);
  }
}
