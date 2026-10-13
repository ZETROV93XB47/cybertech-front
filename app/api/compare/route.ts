/**
 * `GET /api/compare?uuids=` — comparison view of 1 to 3 products (public).
 *
 * The selection comes from the browser, so it is validated before any backend call: 1 to
 * {@link COMPARE_MAX_PRODUCTS} valid UUIDs, each once. The answer may be kept privately for
 * `COMPARE_RESPONSE_MAX_AGE_SECONDS`: it only holds public catalog data.
 *
 * @see specs/002-catalog-refresh/contracts/bff-routes.md §1
 */
import type { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/bff-response";
import { buildComparisonView } from "@/lib/api/compare";
import { parseQueryValue } from "@/lib/api/query-validation";
import { BACKEND_QUERY_PARAMS } from "@/lib/constants/api";
import { COMPARE_MAX_PRODUCTS, COMPARE_RESPONSE_CACHE_CONTROL } from "@/lib/constants/compare";
import { HTTP_HEADERS } from "@/lib/constants/http";
import { splitUuidListParam, uuidListSchema } from "@/lib/schemas/uuid-list";

/** Message of a list holding the same product twice. */
const DUPLICATE_UUID_MESSAGE = "Duplicate UUID";

/** 1 to {@link COMPARE_MAX_PRODUCTS} distinct UUIDs. */
const CompareUuidsSchema = uuidListSchema(COMPARE_MAX_PRODUCTS).refine(
  (uuids) => new Set(uuids).size === uuids.length,
  { message: DUPLICATE_UUID_MESSAGE },
);

/**
 * Returns the comparison view of the requested products.
 *
 * @param request - Request carrying `uuids` (comma-separated or repeated).
 * @returns `200 ComparisonView`, `400 invalid` without backend call, or `503 unavailable`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const uuids = parseQueryValue(
    splitUuidListParam(request.nextUrl.searchParams, BACKEND_QUERY_PARAMS.uuids),
    CompareUuidsSchema,
    BACKEND_QUERY_PARAMS.uuids,
  );
  if (!uuids.ok) {
    return uuids.response;
  }
  try {
    const response = jsonOk(await buildComparisonView(uuids.data));
    response.headers.set(HTTP_HEADERS.CACHE_CONTROL, COMPARE_RESPONSE_CACHE_CONTROL);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
