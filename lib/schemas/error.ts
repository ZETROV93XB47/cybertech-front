/**
 * Backend error body schema (`ErrorResponseDto`), same format for every status including 429.
 *
 * @see docs/backend/api-map.md §0.1
 * @see specs/001-catalog-auth-cart/contracts/errors.md
 */
import { z } from "zod";

import { BackendErrorCode, ErrorCodeType } from "@/lib/enums/error-code";

/** One field error of a Bean Validation failure (never contains the rejected value). */
export const FieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

/** A backend field error. */
export type FieldError = z.infer<typeof FieldErrorSchema>;

/**
 * `ErrorResponseDto`.
 *
 * `errorCode` falls back to `undefined` when the backend sends a code this front does not know
 * yet: the error is then routed by HTTP status instead of being mistaken for an outage. The
 * type-level drift test (T020) signals such codes at the next `npm run gen:api`.
 */
export const ApiErrorBodySchema = z.object({
  message: z.string(),
  httpStatusCode: z.int(),
  errorCodeType: z.enum(ErrorCodeType).optional().catch(undefined),
  errorCode: z.enum(BackendErrorCode).optional().catch(undefined),
  fieldErrors: z.array(FieldErrorSchema).optional(),
});

/** A parsed backend error body. */
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
