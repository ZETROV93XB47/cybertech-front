/**
 * Shipping address entered in the checkout or the order edit form.
 *
 * The backend takes the address as four flat fields (`shippingStreet`, `shippingCity`, …), each
 * `@NotBlank`; the front keeps it grouped and flattens it when building the backend body.
 *
 * @see specs/003-account-orders/data-model.md §3
 * @see docs/backend/api-map.md §D.8
 */
import { z } from "zod";

import { ADDRESS_FIELD_MAX_LENGTH } from "@/lib/constants/account";

/** One address field: trimmed, not blank (`@NotBlank`), bounded. */
const AddressFieldSchema = z.string().trim().min(1).max(ADDRESS_FIELD_MAX_LENGTH);

/** Delivery address of an order. */
export const ShippingAddressSchema = z.object({
  street: AddressFieldSchema,
  zipCode: AddressFieldSchema,
  city: AddressFieldSchema,
  country: AddressFieldSchema,
});

/** Validated delivery address. */
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

/** Flat address fields of `OrderPlacingRequestDto` / `OrderUpdateRequestDto`. */
export interface BackendShippingAddress {
  readonly shippingStreet: string;
  readonly shippingCity: string;
  readonly shippingZipCode: string;
  readonly shippingCountry: string;
}

/**
 * Flattens an address into the backend field names.
 *
 * @param address - Validated address.
 * @returns The `shipping*` fields of the order DTOs.
 */
export function toBackendShippingAddress(address: ShippingAddress): BackendShippingAddress {
  return {
    shippingStreet: address.street,
    shippingCity: address.city,
    shippingZipCode: address.zipCode,
    shippingCountry: address.country,
  };
}
