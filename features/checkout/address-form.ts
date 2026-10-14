/**
 * Validation of the shipping address step: the same rules as the BFF (`ShippingAddressSchema`,
 * `@NotBlank` on the backend), turned into French messages per field.
 *
 * @see specs/003-account-orders/spec.md FR-007
 * @see docs/backend/api-map.md §D.8
 */
import type { ParsedAddress } from "@/lib/address";
import { ADDRESS_FIELD_MAX_LENGTH } from "@/lib/constants/account";
import { AddressField } from "@/lib/enums/checkout-step-state";
import { ShippingAddressSchema, type ShippingAddress } from "@/lib/schemas/address";

import { CHECKOUT_MESSAGES } from "./messages";

/** Error message per address field; a field without error is absent. */
export type AddressErrors = Partial<Record<AddressField, string>>;

/** Outcome of {@link validateAddress}. */
export type AddressValidation =
  | { readonly ok: true; readonly address: ShippingAddress }
  | { readonly ok: false; readonly errors: AddressErrors };

/**
 * Message of one field value.
 *
 * @param value - Typed value.
 * @returns The error, or `undefined` when the value is valid.
 */
function fieldError(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return CHECKOUT_MESSAGES.requiredField;
  }
  return trimmed.length > ADDRESS_FIELD_MAX_LENGTH
    ? CHECKOUT_MESSAGES.fieldTooLong(ADDRESS_FIELD_MAX_LENGTH)
    : undefined;
}

/**
 * Validates the address typed in the checkout.
 *
 * @param value - Current form values.
 * @returns The trimmed address, or the error of each wrong field.
 */
export function validateAddress(value: ParsedAddress): AddressValidation {
  const parsed = ShippingAddressSchema.safeParse(value);
  if (parsed.success) {
    return { ok: true, address: parsed.data };
  }
  const errors: AddressErrors = {};
  for (const field of Object.values(AddressField)) {
    const message = fieldError(value[field]);
    if (message !== undefined) {
      errors[field] = message;
    }
  }
  return { ok: false, errors };
}
