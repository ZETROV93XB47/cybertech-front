/**
 * Comparison view returned by `GET /api/compare` and validated again by the browser.
 *
 * @see specs/002-catalog-refresh/data-model.md §6
 * @see specs/002-catalog-refresh/contracts/bff-routes.md §1
 */
import { z } from "zod";

import { CategoryKey } from "@/lib/enums/category-key";

import { ProductCardSchema } from "./product";

/** One characteristic: its label and one formatted value per compared product. */
export const ComparisonRowSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  /** Aligned on `products`; `null` when the product has no value (shown « — »). */
  values: z.array(z.string().nullable()),
  /** At least two values differ, a missing value counting as a distinct one. */
  differs: z.boolean(),
});

/** One characteristic row of the comparison. */
export type ComparisonRow = z.infer<typeof ComparisonRowSchema>;

/** `ComparisonView`. */
export const ComparisonViewSchema = z.object({
  /** Common category; `null` when no requested product was found. */
  category: z.enum(CategoryKey).nullable(),
  /** Found products, in request order (availability is read live, apart). */
  products: z.array(ProductCardSchema),
  /** Schema properties first, in schema order, then attributes the schema does not describe. */
  rows: z.array(ComparisonRowSchema),
  /** Requested UUIDs that are unknown or of another category: to drop from the selection. */
  missing: z.array(z.uuid()),
});

/** Comparison of 1 to 3 products. */
export type ComparisonView = z.infer<typeof ComparisonViewSchema>;
