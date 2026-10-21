/**
 * `GET /api/products/{uuid}/reviews?page=` — one page of the public reviews of a product, with
 * its average and distribution (« Voir plus d'avis » on the product page). Public.
 *
 * @see specs/004-catalog-promos-reviews/contracts/bff-routes.md §1
 */
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/bff-response";
import { getProductReviews } from "@/lib/api/endpoints/reviews";
import { parseQueryValue } from "@/lib/api/query-validation";
import { PRODUCT_REVIEWS_PAGE_PARAM } from "@/lib/constants/routes";
import { createModuleLogger, maskUuid } from "@/lib/logger";
import { toProductReviews } from "@/features/catalog/reviews";

const log = createModuleLogger("reviews.product");

/** Name of the dynamic segment, reported in `fieldErrors`. */
const PRODUCT_UUID_PARAM = "uuid";

/** Accepted `?page=`: a 0-based page index. */
const PageSchema = z.coerce.number().int().nonnegative();

/** Context given by Next.js to the handler. */
interface ReviewsContext {
  readonly params: Promise<{ uuid: string }>;
}

/**
 * Reads one page of reviews.
 *
 * @param request - Request carrying `?page=`.
 * @param context - Route parameters.
 * @returns `200 ProductReviews`, `400 invalid` without backend call, `404 not-found` for an
 *   unknown product, `503 unavailable`.
 */
export async function GET(request: NextRequest, context: ReviewsContext): Promise<NextResponse> {
  const uuid = parseQueryValue((await context.params).uuid, z.uuid(), PRODUCT_UUID_PARAM);
  if (!uuid.ok) {
    return uuid.response;
  }
  const page = parseQueryValue(
    request.nextUrl.searchParams.get(PRODUCT_REVIEWS_PAGE_PARAM),
    PageSchema,
    PRODUCT_REVIEWS_PAGE_PARAM,
  );
  if (!page.ok) {
    return page.response;
  }
  try {
    const reviews = toProductReviews(await getProductReviews(uuid.data, page.data));
    log.info(
      { productUuid: maskUuid(uuid.data), page: page.data, returned: reviews.items.length },
      "Product reviews read",
    );
    return jsonOk(reviews);
  } catch (error) {
    return jsonError(error);
  }
}
