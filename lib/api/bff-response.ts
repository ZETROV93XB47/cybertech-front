/**
 * Helpers shared by every BFF Route Handler: JSON responses, error responses, body parsing.
 *
 * Every response carries `Cache-Control: no-store` (private or live data), and every input is
 * validated by Zod before any backend call (contracts/bff-routes.md, « Règles communes »).
 */
import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import { HTTP_HEADERS, HTTP_STATUS, NO_STORE } from "@/lib/constants/http";
import { FrontErrorCode } from "@/lib/enums/error-code";
import type { FrontErrorBody } from "@/lib/schemas/front-error";

import { ApiError } from "./errors";

/** Message of a request body that is missing or not valid JSON. */
const INVALID_BODY_MESSAGE = "Invalid request body";

/** Extra details some errors carry for the UI. */
export interface ErrorDetails {
  /** Live stock to show in « Il n'en reste que N ». */
  readonly availableStock?: number;
}

/**
 * Builds a JSON success response.
 *
 * @param data - Response body.
 * @param status - HTTP status (200 by default).
 * @returns The response, never cached.
 */
export function jsonOk(data: unknown, status: number = HTTP_STATUS.OK): NextResponse {
  return NextResponse.json(data, { status, headers: { [HTTP_HEADERS.CACHE_CONTROL]: NO_STORE } });
}

/**
 * Builds the JSON error response of a failed BFF call.
 *
 * @param error - Error from the backend client, or anything else (treated as unavailable).
 * @param details - Optional UI details (e.g. available stock).
 * @returns The error response with the original status.
 */
export function jsonError(error: unknown, details?: ErrorDetails): NextResponse {
  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError({
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          frontCode: FrontErrorCode.UNKNOWN,
          message: error instanceof Error ? error.message : String(error),
        });
  const body: FrontErrorBody = {
    error: {
      code: apiError.frontCode,
      message: apiError.message,
      ...(apiError.fieldErrors ? { fieldErrors: [...apiError.fieldErrors] } : {}),
      ...(apiError.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: apiError.retryAfterSeconds }),
      ...(details?.availableStock === undefined ? {} : { availableStock: details.availableStock }),
      ...(apiError.stockShortages ? { stockShortages: [...apiError.stockShortages] } : {}),
    },
  };
  return NextResponse.json(body, {
    status: apiError.status,
    headers: { [HTTP_HEADERS.CACHE_CONTROL]: NO_STORE },
  });
}

/** Result of {@link parseJsonBody}: the data, or the 400 response to return. */
export type ParsedBody<TData> =
  | { readonly ok: true; readonly data: TData }
  | { readonly ok: false; readonly response: NextResponse };

/**
 * Reads and validates a JSON request body.
 *
 * @param request - Incoming request.
 * @param schema - Expected body schema.
 * @returns The validated data, or a ready-to-return 400 `invalid` response.
 */
export async function parseJsonBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<ParsedBody<z.infer<TSchema>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = undefined;
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const invalid = new ApiError({
    status: HTTP_STATUS.BAD_REQUEST,
    frontCode: FrontErrorCode.INVALID,
    message: INVALID_BODY_MESSAGE,
    fieldErrors: parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
  return { ok: false, response: jsonError(invalid) };
}
