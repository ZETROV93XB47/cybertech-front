/**
 * `GET /api/search?q=` — results of the ⌘K command palette (FR-009).
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/bff-response";
import { searchProducts } from "@/lib/api/endpoints/products";
import { parseQueryValue } from "@/lib/api/query-validation";
import { COMMAND_PALETTE_RESULT_SIZE, SEARCH_KEYWORD_MAX_LENGTH } from "@/lib/constants/catalog";
import { SearchParam } from "@/lib/enums/search-param";
import { EMPTY_SEARCH_FILTERS } from "@/lib/schemas/search";

/** Keyword typed in the palette: 1 to 100 characters once trimmed. */
const KeywordSchema = z.string().trim().min(1).max(SEARCH_KEYWORD_MAX_LENGTH);

/**
 * Searches the first products matching the keyword.
 *
 * @param request - Request carrying `q`.
 * @returns `200 { results: ProductCard[] }` (at most {@link COMMAND_PALETTE_RESULT_SIZE}), or an error.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const keyword = parseQueryValue(
    request.nextUrl.searchParams.get(SearchParam.KEYWORD),
    KeywordSchema,
    SearchParam.KEYWORD,
  );
  if (!keyword.ok) {
    return keyword.response;
  }
  try {
    const page = await searchProducts(
      { ...EMPTY_SEARCH_FILTERS, keyword: keyword.data },
      COMMAND_PALETTE_RESULT_SIZE,
    );
    return jsonOk({ results: page.content });
  } catch (error) {
    return jsonError(error);
  }
}
