/**
 * Spring `PagedModel` schema (`spring.data.web.pageable.serialization-mode=via-dto`).
 *
 * @see docs/backend/api-map.md §0 (Pagination sortie)
 */
import { z } from "zod";

/** Page metadata returned next to `content`. `number` is zero-based. */
export const PageMetadataSchema = z.object({
  size: z.int().nonnegative(),
  number: z.int().nonnegative(),
  totalElements: z.int().nonnegative(),
  totalPages: z.int().nonnegative(),
});

/** Page metadata. */
export type PageMetadata = z.infer<typeof PageMetadataSchema>;

/**
 * Builds the schema of a page of items.
 *
 * @param item - Schema of one element of `content`.
 * @returns The schema `{ content: T[], page: PageMetadata }`.
 */
export function pagedSchema<TItem extends z.ZodType>(
  item: TItem,
): z.ZodObject<{ content: z.ZodArray<TItem>; page: typeof PageMetadataSchema }> {
  return z.object({ content: z.array(item), page: PageMetadataSchema });
}

/** A page of items as returned by the backend. */
export interface Paged<TItem> {
  readonly content: readonly TItem[];
  readonly page: PageMetadata;
}
