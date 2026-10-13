/**
 * Error body returned by the BFF Route Handlers to the browser.
 *
 * Shared by the server (which builds it) and the client (which parses it), so it contains no
 * server-only import.
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import { z } from "zod";

import { FrontErrorCode } from "@/lib/enums/error-code";

import { FieldErrorSchema } from "./error";

/** `{ error: { code, message, fieldErrors?, retryAfterSeconds?, availableStock? } }`. */
export const FrontErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(FrontErrorCode),
    message: z.string(),
    fieldErrors: z.array(FieldErrorSchema).optional(),
    retryAfterSeconds: z.int().nonnegative().optional(),
    availableStock: z.int().nonnegative().optional(),
  }),
});

/** Error body sent by the BFF. */
export type FrontErrorBody = z.infer<typeof FrontErrorBodySchema>;
