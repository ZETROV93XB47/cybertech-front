/**
 * Builds the comparison view of 1 to 3 products, served by `GET /api/compare`.
 *
 * Products come from the catalog data cache (`getProductByUuid`) and labels from the category
 * schema, so the rows use exactly the labels, units and order of the product page
 * (`specLabel`, `formatSpecValue`, FR-018). Nothing is asked of the backend beyond what the
 * product page already reads.
 *
 * @see specs/002-catalog-refresh/data-model.md §6
 * @see specs/002-catalog-refresh/contracts/bff-routes.md §1
 * @see specs/002-catalog-refresh/research.md R11
 */
import "server-only";

import { formatSpecValue, specKeys, specLabel } from "@/features/catalog/product-specs";
import type { CategoryKey } from "@/lib/enums/category-key";
import { maskUuid } from "@/lib/log-safety";
import { createModuleLogger } from "@/lib/logger";
import { toCategoryKey } from "@/lib/schemas/category";
import type { ComparisonRow, ComparisonView } from "@/lib/schemas/compare";
import { toProductCard, type Product } from "@/lib/schemas/product";

import { getCategorySchema } from "./endpoints/categories";
import { getProductByUuid } from "./endpoints/products";

const log = createModuleLogger("compare.view");

/**
 * Picks the category of the comparison: the most frequent one among the found products, the
 * first product's on a tie (a tampered selection can mix categories, data-model §6).
 *
 * @param products - Found products, in request order.
 * @returns The category, or `undefined` when no product has a known category.
 */
function majorityCategory(products: readonly Product[]): CategoryKey | undefined {
  const counts = new Map<CategoryKey, number>();
  let best: CategoryKey | undefined;
  for (const product of products) {
    const category = toCategoryKey(product.category);
    if (category === undefined) {
      continue;
    }
    const count = (counts.get(category) ?? 0) + 1;
    counts.set(category, count);
    if (best === undefined || count > (counts.get(best) ?? 0)) {
      best = category;
    }
  }
  return best;
}

/**
 * Builds one row per attribute that at least one product fills.
 *
 * @param products - Compared products.
 * @param schemaLabels - Labels of the category schema (empty when the schema is missing).
 * @returns The rows, schema properties first.
 */
function buildRows(
  products: readonly Product[],
  schemaLabels: Readonly<Record<string, string>>,
): ComparisonRow[] {
  const keys = specKeys(
    schemaLabels,
    products.map((product) => product.attributes),
  );
  return keys.flatMap((key) => {
    const values = products.map((product) => formatSpecValue(key, product.attributes[key]));
    if (values.every((value) => value === null)) {
      return [];
    }
    const differs = values.some((value) => value !== values[0]);
    return [{ key, label: specLabel(key, schemaLabels), values, differs }];
  });
}

/**
 * Loads the labels of the category schema; a missing schema falls back to humanised keys.
 *
 * @param category - Category of the comparison.
 * @returns Labels by attribute key.
 * @throws {ApiError} When the backend is unavailable.
 */
async function loadLabels(category: CategoryKey): Promise<Readonly<Record<string, string>>> {
  const { labels } = await getCategorySchema(category);
  if (Object.keys(labels).length === 0) {
    log.warn({ category }, "Category schema missing; comparison rows use humanised keys");
  }
  return labels;
}

/**
 * Builds the comparison of the requested products.
 *
 * @param uuids - 1 to `COMPARE_MAX_PRODUCTS` distinct, validated product UUIDs.
 * @returns The view: found products in request order, aligned rows, and the UUIDs to drop.
 * @throws {ApiError} When the backend is unavailable.
 * @see specs/002-catalog-refresh/data-model.md §6
 */
export async function buildComparisonView(uuids: readonly string[]): Promise<ComparisonView> {
  const found = (await Promise.all(uuids.map((uuid) => getProductByUuid(uuid)))).filter(
    (product): product is Product => product !== null,
  );
  const category = majorityCategory(found);
  const kept = found.filter((product) => toCategoryKey(product.category) === category);
  const keptUuids = new Set(kept.map((product) => product.uuid));
  const missing = uuids.filter((uuid) => !keptUuids.has(uuid));
  log.info(
    {
      requested: uuids.length,
      found: kept.length,
      missing: missing.length,
      category: category ?? null,
      missingUuids: missing.map(maskUuid),
    },
    "Comparison view built",
  );
  if (category === undefined) {
    return { category: null, products: [], rows: [], missing };
  }
  const labels = await loadLabels(category);
  return {
    category,
    products: kept.map(toProductCard),
    rows: buildRows(kept, labels),
    missing,
  };
}
