/**
 * Category endpoints: the list of the active categories and the JSON Schema of a category's
 * `attributes`.
 *
 * Both only change through admin actions, so they stay in the data cache for
 * {@link CATEGORY_SCHEMA_REVALIDATE_SECONDS} / {@link CATEGORIES_REVALIDATE_SECONDS}.
 *
 * @see docs/backend/api-map.md §4
 * @see specs/004-catalog-promos-reviews/research.md R1
 * @see ProductCategorySchemaController#getActiveCategories, #getByCategoryKey (backend)
 */
import "server-only";

import { backendFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { BACKEND_PATHS } from "@/lib/constants/api";
import { CATEGORY_SCHEMA_REVALIDATE_SECONDS } from "@/lib/constants/catalog";
import {
  CATEGORIES_CACHE_TAG,
  CATEGORIES_REVALIDATE_SECONDS,
  CATEGORY_ORDER,
} from "@/lib/constants/categories";
import { FrontErrorCode } from "@/lib/enums/error-code";
import type { CategoryKey } from "@/lib/enums/category-key";
import { createModuleLogger } from "@/lib/logger";
import {
  CategorySchemaResponseSchema,
  CategorySummariesSchema,
  parseCategorySchema,
  toCategoryKey,
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

/** Logger of the active category list. */
const categoriesLog = createModuleLogger("catalog.categories");

/**
 * Reads the active categories the front can show, in display order.
 *
 * The backend decides which categories are active; the front keeps the ones it knows how to
 * name and illustrate, in {@link CATEGORY_ORDER}. A key it does not know is left out of the
 * navigation and reported once per read. If the list cannot be read, every known category is
 * offered so that the navigation never disappears.
 *
 * @returns The active known categories, never empty on a backend failure.
 * @see specs/004-catalog-promos-reviews/research.md R1
 */
export async function getActiveCategories(): Promise<readonly CategoryKey[]> {
  let summaries;
  try {
    summaries = await backendFetch(BACKEND_PATHS.categoriesActive, {
      schema: CategorySummariesSchema,
      nextCache: { revalidate: CATEGORIES_REVALIDATE_SECONDS, tags: [CATEGORIES_CACHE_TAG] },
    });
  } catch (error) {
    const frontCode = error instanceof ApiError ? error.frontCode : FrontErrorCode.UNKNOWN;
    categoriesLog.warn({ frontCode }, "Active categories not read; every known category offered");
    return CATEGORY_ORDER;
  }
  const active = new Set(summaries.map((summary) => summary.categoryKey));
  const unknown = [...active].filter((key) => toCategoryKey(key) === undefined);
  if (unknown.length > 0) {
    categoriesLog.warn({ unknownKeys: unknown }, "Active categories unknown to the front ignored");
  }
  return CATEGORY_ORDER.filter((key) => active.has(key));
}
