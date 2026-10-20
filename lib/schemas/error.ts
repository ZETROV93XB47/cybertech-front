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
 * One short line of a `409 NOT_ENOUGH_STOCK` (`StockShortageDto`): the product, the quantity
 * asked for and what can still be ordered (never negative).
 *
 * @see StockShortageDto (backend, commit f582c3a)
 * @see docs/backend/backend-prompts-lot2.md §11
 */
export const StockShortageSchema = z.object({
  productUuid: z.uuid(),
  requested: z.int().nonnegative(),
  available: z.int().nonnegative(),
});

/** A short line of a stock refusal. */
export type StockShortage = z.infer<typeof StockShortageSchema>;

/**
 * Structured `details` of an error (`ErrorDetailsDto`), sent only with `NOT_ENOUGH_STOCK`:
 * every short line for an order (place, update, retry), the first one for the cart.
 */
export const ErrorDetailsSchema = z.object({
  items: z.array(StockShortageSchema),
});

/**
 * `ErrorResponseDto`.
 *
 * `errorCode` falls back to `undefined` when the backend sends a code this front does not know
 * yet: the error is then routed by HTTP status instead of being mistaken for an outage. The
 * type-level drift test (T020) signals such codes at the next `npm run gen:api`. `details` is
 * optional and dropped when malformed.
 */
export const ApiErrorBodySchema = z.object({
  message: z.string(),
  httpStatusCode: z.int(),
  errorCodeType: z.enum(ErrorCodeType).optional().catch(undefined),
  errorCode: z.enum(BackendErrorCode).optional().catch(undefined),
  fieldErrors: z.array(FieldErrorSchema).optional(),
  // Tolerant: a malformed `details` is dropped, never turns the error into an outage.
  details: ErrorDetailsSchema.optional().catch(undefined),
});

/** A parsed backend error body. */
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
