/**
 * Category schema endpoint: the JSON Schema of a category's `attributes`.
 *
 * Schemas only change through admin actions, so they stay in the data cache for
 * {@link CATEGORY_SCHEMA_REVALIDATE_SECONDS}.
 *
 * @see docs/backend/api-map.md §4
 * @see ProductCategorySchemaController#getByCategoryKey (backend)
 */
import "server-only";

import { backendFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { BACKEND_PATHS } from "@/lib/constants/api";
import { CATEGORY_SCHEMA_REVALIDATE_SECONDS } from "@/lib/constants/catalog";
import { FrontErrorCode } from "@/lib/enums/error-code";
import type { CategoryKey } from "@/lib/enums/category-key";
import { createModuleLogger } from "@/lib/logger";
import {
  CategorySchemaResponseSchema,
  parseCategorySchema,
  type ParsedCategorySchema,
} from "@/lib/schemas/category";

/** Cache tag of every category schema. */
const CATEGORY_SCHEMA_CACHE_TAG = "category-schemas";

/** Result used when a category has no usable schema: no filter, keys shown humanised. */
const EMPTY_CATEGORY_SCHEMA: ParsedCategorySchema = { facets: [], labels: {} };

const log = createModuleLogger("catalog.category");

/**
 * Loads and parses the schema of a category.
 *
 * An unknown category or an unreadable schema is not an error for the visitor: the list simply
 * shows no category-specific filter. Both cases are logged.
 *
 * @param categoryKey - Category key.
 * @returns The facets and attribute labels of the category.
 * @throws {ApiError} When the backend is unavailable.
 */
export async function getCategorySchema(categoryKey: CategoryKey): Promise<ParsedCategorySchema> {
  let response;
  try {
    response = await backendFetch(`${BACKEND_PATHS.categorySchema}/${categoryKey}`, {
      schema: CategorySchemaResponseSchema,
      nextCache: {
        revalidate: CATEGORY_SCHEMA_REVALIDATE_SECONDS,
        tags: [CATEGORY_SCHEMA_CACHE_TAG],
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.frontCode !== FrontErrorCode.UNAVAILABLE) {
      log.warn({ categoryKey, frontCode: error.frontCode }, "Category schema not available");
      return EMPTY_CATEGORY_SCHEMA;
    }
    throw error;
  }
  const parsed = parseCategorySchema(response.jsonSchema);
  if (!parsed) {
    log.warn({ categoryKey }, "Category JSON schema is not an object schema; no filter shown");
    return EMPTY_CATEGORY_SCHEMA;
  }
  return parsed;
}
