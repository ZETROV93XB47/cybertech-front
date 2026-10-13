/**
 * Backend cart fixtures (`CartResponseDto`, `ProductAvailabilityDto`, cart error bodies) and
 * MSW handlers shared by the cart tests.
 */
import { http, HttpResponse } from "msw";

import { backendProduct } from "./products";
import { TEST_BACKEND_URL } from "./test-env";
import { server } from "../msw/server";

export const API = `${TEST_BACKEND_URL}/api/v1/services`;

export const CART_UUID = "01a13475-0000-7000-8000-000000000001";
export const USER_UUID = "01a13475-0000-7000-8000-000000000002";
export const PRODUCT_A = "01a0fcee-0000-7000-8000-00000000000a";
export const PRODUCT_B = "01a0fcee-0000-7000-8000-00000000000b";
export const PRODUCT_C = "01a0fcee-0000-7000-8000-00000000000c";

export const PRICES: Record<string, number> = {
  [PRODUCT_A]: 100,
  [PRODUCT_B]: 250.5,
  [PRODUCT_C]: 10,
};

export function backendCartItem(productUuid: string, quantity: number): Record<string, unknown> {
  const unitPrice = PRICES[productUuid] ?? 1;
  return {
    cartItemUuid: `01a13475-1111-7000-8000-${productUuid.slice(-12)}`,
    productUuid,
    productName: `Produit ${productUuid.slice(-1).toUpperCase()}`,
    quantity,
    unitPrice,
    lineItemTotalPrice: unitPrice * quantity,
  };
}

export function backendCart(
  lines: readonly (readonly [string, number])[],
): Record<string, unknown> {
  const items = lines.map(([uuid, quantity]) => backendCartItem(uuid, quantity));
  return {
    cartUuid: CART_UUID,
    userUuid: USER_UUID,
    items,
    totalPrice: items.reduce((sum, item) => sum + (item.lineItemTotalPrice as number), 0),
  };
}

export const NULL_CART = { cartUuid: null, userUuid: null, items: null, totalPrice: null };

export function errorBody(errorCode: string, httpStatusCode: number): Record<string, unknown> {
  return {
    message: errorCode,
    httpStatusCode,
    errorCodeType: "FUNCTIONAL",
    errorCode,
  };
}

/**
 * Mocks the public product endpoints: product detail for known UUIDs (others 404) and live stock.
 *
 * @param stock - Available stock by product UUID; products absent from it are unknown.
 */
export function mockCatalog(stock: Record<string, number>): void {
  server.use(
    http.get(`${API}/product/get/:uuid`, ({ params }) => {
      const uuid = String(params.uuid);
      if (!(uuid in stock)) {
        return HttpResponse.json(errorBody("PRODUCT_NOT_FOUND", 404), { status: 404 });
      }
      return HttpResponse.json(
        backendProduct({
          uuid,
          name: `Produit ${uuid.slice(-1).toUpperCase()}`,
          price: PRICES[uuid],
        }),
      );
    }),
    http.get(`${API}/product/availability`, ({ request }) => {
      const uuids = (new URL(request.url).searchParams.get("uuids") ?? "").split(",");
      return HttpResponse.json(
        uuids
          .filter((uuid) => uuid in stock)
          .map((uuid) => ({
            productUuid: uuid,
            availableStock: stock[uuid],
            inStock: (stock[uuid] ?? 0) > 0,
          })),
      );
    }),
  );
}
