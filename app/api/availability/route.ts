/**
 * `GET /api/availability?uuids=` — live stock of products, never cached (FR-007).
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import type { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/bff-response";
import { getAvailability } from "@/lib/api/endpoints/products";
import { parseQueryValue } from "@/lib/api/query-validation";
import { BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import { AVAILABILITY_MAX_UUIDS_PER_REQUEST } from "@/lib/constants/cart";
import { readUuidListParam, uuidListSchema } from "@/lib/schemas/uuid-list";

/**
 * Returns the live stock of 1 to {@link AVAILABILITY_MAX_UUIDS_PER_REQUEST} products.
 *
 * @param request - Request carrying `uuids`.
 * @returns `200 { items: ProductAvailability[] }` (unknown products absent), or an error.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const uuids = parseQueryValue(
    readUuidListParam(request.nextUrl.searchParams, BACKEND_QUERY_PARAMS.uuids),
    uuidListSchema(AVAILABILITY_MAX_UUIDS_PER_REQUEST),
    BACKEND_QUERY_PARAMS.uuids,
  );
  if (!uuids.ok) {
    return uuids.response;
  }
  try {
    return jsonOk({ items: await getAvailability(uuids.data) });
  } catch (error) {
    return jsonError(error);
  }
}
