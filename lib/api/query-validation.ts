/**
 * Validation of BFF query parameters: same 400 `invalid` answer as a bad JSON body.
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md « Règles communes »
 */
import "server-only";

import type { z } from "zod";

import { HTTP_STATUS } from "@/lib/constants/http";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { jsonError, type ParsedBody } from "./bff-response";
import { ApiError } from "./errors";

/** Message of a query string that does not match the route contract. */
const INVALID_QUERY_MESSAGE = "Invalid query parameters";

/**
 * Validates a value read from the query string.
 *
 * @param value - Raw value (string, list…).
 * @param schema - Expected schema.
 * @param field - Parameter name reported in `fieldErrors`.
 * @returns The validated data, or a ready-to-return 400 `invalid` response.
 */
export function parseQueryValue<TSchema extends z.ZodType>(
  value: unknown,
  schema: TSchema,
  field: string,
): ParsedBody<z.infer<TSchema>> {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const invalid = new ApiError({
    status: HTTP_STATUS.BAD_REQUEST,
    frontCode: FrontErrorCode.INVALID,
    message: INVALID_QUERY_MESSAGE,
    fieldErrors: parsed.error.issues.map((issue) => ({ field, message: issue.message })),
  });
  return { ok: false, response: jsonError(invalid) };
}
