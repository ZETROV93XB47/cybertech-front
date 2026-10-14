/**
 * Type-level drift check (feature 003, T007): the order schemas must keep the field names and
 * types of the backend OpenAPI. Regenerate `lib/api/schema.d.ts` with `npm run gen:api` after a
 * backend change; this file then fails to typecheck if a field was renamed or retyped.
 */
import { describe, expectTypeOf, it } from "vitest";

import type { components } from "@/lib/api/schema";
import type {
  OrderItem,
  OrderQuoteResponse,
  OrderResponse,
  OrderStatusResult,
} from "@/lib/schemas/order";

type Schemas = components["schemas"];
type OpenApiOrder = Required<Schemas["OrderResponseDto"]>;
type OpenApiItem = Required<Schemas["OrderItemResponseDto"]>;
type OpenApiQuote = Required<Schemas["OrderQuoteResponseDto"]>;
type OpenApiStatus = Required<Schemas["OrderStatusDto"]>;

describe("order schemas", () => {
  it("OrderResponse has the field names of OrderResponseDto", () => {
    expectTypeOf<keyof OrderResponse>().toEqualTypeOf<keyof OpenApiOrder>();
    expectTypeOf<keyof OrderItem>().toEqualTypeOf<keyof OpenApiItem>();
  });

  it("OrderResponse keeps the nullable breakdown of the OpenAPI", () => {
    expectTypeOf<OrderResponse["subtotalAmount"]>().toEqualTypeOf<OpenApiOrder["subtotalAmount"]>();
    expectTypeOf<OrderResponse["shippingCost"]>().toEqualTypeOf<OpenApiOrder["shippingCost"]>();
    expectTypeOf<`${NonNullable<OrderResponse["discountCalculationType"]>}`>().toEqualTypeOf<
      NonNullable<OpenApiOrder["discountCalculationType"]>
    >();
  });

  it("OrderQuoteResponse and OrderStatusResult match their DTOs", () => {
    expectTypeOf<keyof OrderQuoteResponse>().toEqualTypeOf<keyof OpenApiQuote>();
    expectTypeOf<OrderQuoteResponse["minOrderAmount"]>().toEqualTypeOf<
      OpenApiQuote["minOrderAmount"]
    >();
    expectTypeOf<keyof OrderStatusResult>().toEqualTypeOf<keyof OpenApiStatus>();
  });
});
