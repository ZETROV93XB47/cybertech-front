/**
 * Type-level drift check (feature 003, T003): the enums aligned with the backend must list
 * exactly the values of the OpenAPI schema (`npm run gen:api`).
 */
import { describe, expectTypeOf, it } from "vitest";

import type { components } from "@/lib/api/schema";
import type { BankCardType } from "@/lib/enums/bank-card";
import type { Brand } from "@/lib/enums/brand";
import type { OrderStatus, PaymentType } from "@/lib/enums/order";

type Schemas = components["schemas"];

describe("backend-aligned enums", () => {
  it("OrderStatus matches OrderResponseDto.status", () => {
    expectTypeOf<`${OrderStatus}`>().toEqualTypeOf<
      NonNullable<Schemas["OrderResponseDto"]["status"]>
    >();
  });

  it("PaymentType matches OrderPlacingRequestDto.paymentType", () => {
    expectTypeOf<`${PaymentType}`>().toEqualTypeOf<
      NonNullable<Schemas["OrderPlacingRequestDto"]["paymentType"]>
    >();
  });

  it("BankCardType matches BankCardResponseDto.cardType", () => {
    expectTypeOf<`${BankCardType}`>().toEqualTypeOf<
      NonNullable<Schemas["BankCardResponseDto"]["cardType"]>
    >();
  });

  // `ProductResponseDto.brand` is typed `string` in the OpenAPI; the create DTO carries the enum.
  it("Brand matches ProductCreateRequestDto.brand", () => {
    expectTypeOf<`${Brand}`>().toEqualTypeOf<
      NonNullable<Schemas["ProductCreateRequestDto"]["brand"]>
    >();
  });
});
