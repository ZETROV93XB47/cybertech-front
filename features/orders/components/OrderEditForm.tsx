"use client";

/**
 * Order edit form: lines (quantities, removal, products added by search), delivery address,
 * shipping and payment method, then one save. The order keeps its original discount, and the
 * form says so; after the save, the old and new totals and the effect on the payment are shown
 * (amounts from the backend only).
 *
 * @see specs/003-account-orders/spec.md US3 scenarios 5, 9, 10, FR-025
 * @see specs/003-account-orders/research.md R14
 */
import { BadgePercent } from "lucide-react";
import type { ReactNode } from "react";

import { AddressFields } from "@/features/checkout/components/AddressStep";
import { PaymentMethodsFieldset } from "@/features/checkout/components/PaymentStep";
import { ShippingChoicesFieldset } from "@/features/checkout/components/ShippingStep";
import type { ShippingChoice } from "@/features/checkout/shipping-choices";
import type { ParsedAddress } from "@/lib/address";
import { OrderEditActionType } from "@/lib/enums/order";
import type { OrderResponse } from "@/lib/schemas/order";

import { useOrderEditForm, type UseOrderEditFormResult } from "../hooks/useOrderEditForm";
import { ORDER_EDIT_MESSAGES } from "../messages";

import { EditLines } from "./EditLines";
import { EditSavedPanel } from "./EditSavedPanel";
import { ProductPicker } from "./ProductPicker";

/** Props of {@link OrderEditForm}. */
export interface OrderEditFormProps {
  readonly order: OrderResponse;
  /** Address of the order, split into fields. */
  readonly address: ParsedAddress;
  /** Shipping choices with their real prices. */
  readonly choices: readonly ShippingChoice[];
  /** Campaign key the order was placed with, `null` for none. */
  readonly discountKey: string | null;
}

/**
 * Titled block of the form.
 *
 * @param props - Title and content.
 * @returns The section.
 */
function FormSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <section className="glass flex flex-col gap-4 rounded-card p-6">
      <h2 className="text-lg">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Delivery and payment blocks.
 *
 * @param props - Form state and shipping choices.
 * @returns The two sections.
 */
function DeliveryAndPayment({
  form,
  choices,
}: {
  readonly form: UseOrderEditFormResult;
  readonly choices: readonly ShippingChoice[];
}): ReactNode {
  const { state, dispatch, isPaymentMissing } = form;
  return (
    <>
      <FormSection title={ORDER_EDIT_MESSAGES.addressTitle}>
        <AddressFields
          value={state.address}
          errors={state.addressErrors}
          onChange={(field, value) => {
            dispatch({ type: OrderEditActionType.CHANGE_ADDRESS, field, value });
          }}
        />
      </FormSection>
      <FormSection title={ORDER_EDIT_MESSAGES.shippingTitle}>
        <ShippingChoicesFieldset
          choices={choices}
          value={state.shipping}
          error={null}
          onChange={(value) => {
            dispatch({ type: OrderEditActionType.SELECT_SHIPPING, value });
          }}
        />
      </FormSection>
      <FormSection title={ORDER_EDIT_MESSAGES.paymentTitle}>
        <PaymentMethodsFieldset
          value={state.payment}
          describedBy="edit-payment-hint"
          onChange={(value) => {
            dispatch({ type: OrderEditActionType.SELECT_PAYMENT, value });
          }}
        />
        <p
          id="edit-payment-hint"
          className={isPaymentMissing ? "text-sm text-rose" : "text-xs text-text-muted"}
        >
          {isPaymentMissing ? ORDER_EDIT_MESSAGES.paymentRequired : ORDER_EDIT_MESSAGES.paymentHint}
        </p>
      </FormSection>
    </>
  );
}

/**
 * Order edit form.
 *
 * @param props - Order, address, shipping choices and discount key.
 * @returns The form.
 */
export function OrderEditForm({
  order,
  address,
  choices,
  discountKey,
}: OrderEditFormProps): ReactNode {
  const form = useOrderEditForm(order, address);
  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void form.save();
      }}
    >
      <p className="flex items-center gap-3 rounded-card border border-gold p-4 text-sm">
        <BadgePercent aria-hidden className="size-5 shrink-0 text-gold" />
        {discountKey === null
          ? ORDER_EDIT_MESSAGES.noDiscount
          : ORDER_EDIT_MESSAGES.discountKept(discountKey)}
      </p>
      <FormSection title={ORDER_EDIT_MESSAGES.linesTitle}>
        <EditLines
          orderUuid={order.uuid}
          lines={form.state.lines}
          stockFlagged={form.state.stockFlagged}
          dispatch={form.dispatch}
          disabled={form.isSaving}
        />
        <ProductPicker
          disabled={form.isSaving}
          onPick={(product) => {
            form.dispatch({ type: OrderEditActionType.ADD_PRODUCT, product });
          }}
        />
      </FormSection>
      <DeliveryAndPayment form={form} choices={choices} />
      <p role="alert" className="min-h-5 text-sm text-gold">
        {form.message}
      </p>
      {form.saved && <EditSavedPanel orderUuid={order.uuid} saved={form.saved} />}
      <button
        type="submit"
        disabled={form.isSaving}
        className="cta-gradient h-12 self-start rounded-button px-8 font-medium disabled:opacity-40"
      >
        {form.isSaving ? ORDER_EDIT_MESSAGES.saving : ORDER_EDIT_MESSAGES.save}
      </button>
    </form>
  );
}
