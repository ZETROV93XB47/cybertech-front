/**
 * UUID list received in a query string (`?uuids=a,b` or `?uuids=a&uuids=b`).
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import { z } from "zod";

/** Separator of a comma-separated UUID list. */
export const UUID_LIST_SEPARATOR = ",";

/**
 * Builds the schema of a list of distinct UUIDs.
 *
 * @param max - Maximum number of UUIDs.
 * @returns A schema accepting 1 to `max` UUIDs.
 */
export function uuidListSchema(max: number): z.ZodArray<z.ZodUUID> {
  return z.array(z.uuid()).min(1).max(max);
}

/**
 * Reads every value of a UUID list parameter, comma-separated or repeated, without duplicates.
 *
 * @param params - Query parameters.
 * @param name - Parameter name.
 * @returns The trimmed, distinct, non-empty values (not validated yet).
 */
export function readUuidListParam(params: URLSearchParams, name: string): string[] {
  const values = params
    .getAll(name)
    .flatMap((value) => value.split(UUID_LIST_SEPARATOR))
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(values)];
}
