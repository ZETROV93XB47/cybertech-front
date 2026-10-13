/**
 * `GET /api/products?uuids=` — product cards of the recently viewed products.
 *
 * Each product comes from the data cache of the product page (60 s), so this route stays cheap.
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import type { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/bff-response";
import { getProductsByUuids } from "@/lib/api/endpoints/products";
import { parseQueryValue } from "@/lib/api/query-validation";
import { BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import { RECENTLY_VIEWED_MAX } from "@/lib/constants/catalog";
import { readUuidListParam, uuidListSchema } from "@/lib/schemas/uuid-list";

/**
 * Returns the cards of 1 to {@link RECENTLY_VIEWED_MAX} products.
 *
 * @param request - Request carrying `uuids`.
 * @returns `200 { products: ProductCard[] }` (unknown products omitted, input order kept).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const uuids = parseQueryValue(
    readUuidListParam(request.nextUrl.searchParams, BACKEND_QUERY_PARAMS.uuids),
    uuidListSchema(RECENTLY_VIEWED_MAX),
    BACKEND_QUERY_PARAMS.uuids,
  );
  if (!uuids.ok) {
    return uuids.response;
  }
  try {
    return jsonOk({ products: await getProductsByUuids(uuids.data) });
  } catch (error) {
    return jsonError(error);
  }
}
