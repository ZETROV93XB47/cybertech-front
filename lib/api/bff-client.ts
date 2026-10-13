/**
 * Browser-side client of the BFF Route Handlers (same origin, JSON).
 *
 * The browser never calls Spring or Keycloak (constitution III): every client query goes through
 * this helper, which validates the body and turns error bodies into {@link BffError}.
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import type { z } from "zod";

import { JSON_CONTENT_TYPE } from "@/lib/constants/api";
import { HTTP_HEADERS } from "@/lib/constants/http";
import { FrontErrorCode } from "@/lib/enums/error-code";
import type { HttpMethod } from "@/lib/enums/http-method";
import { FrontErrorBodySchema } from "@/lib/schemas/front-error";

/** Error raised by {@link bffGet} and {@link bffSend}; the UI branches on {@link BffError.code}. */
export class BffError extends Error {
  public readonly code: FrontErrorCode;
  public readonly status: number;
  /** Live stock sent with an `insufficient-stock` error. */
  public readonly availableStock: number | undefined;

  /**
   * @param code - Stable front error code.
   * @param status - HTTP status of the BFF response.
   * @param message - Technical message (English), never shown as is.
   * @param availableStock - Live stock, for `insufficient-stock` errors.
   */
  public constructor(
    code: FrontErrorCode,
    status: number,
    message: string,
    availableStock?: number,
  ) {
    super(message);
    this.name = "BffError";
    this.code = code;
    this.status = status;
    this.availableStock = availableStock;
  }
}

/**
 * Reads the error of a non-2xx BFF response.
 *
 * @param response - Failed response.
 * @returns The error to throw.
 */
async function toBffError(response: Response): Promise<BffError> {
  const body = FrontErrorBodySchema.safeParse(await response.json().catch(() => undefined));
  if (!body.success) {
    return new BffError(FrontErrorCode.UNKNOWN, response.status, "Unreadable BFF error body");
  }
  const { code, message, availableStock } = body.data.error;
  return new BffError(code, response.status, message, availableStock);
}

/**
 * Validates the JSON body of a successful BFF response.
 *
 * @param response - Successful response.
 * @param schema - Expected body schema.
 * @returns The validated body.
 * @throws {BffError} When the body breaks the contract.
 */
async function readBffBody<TSchema extends z.ZodType>(
  response: Response,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const body = schema.safeParse(await response.json());
  if (!body.success) {
    throw new BffError(
      FrontErrorCode.UNKNOWN,
      response.status,
      "BFF body does not match the contract",
    );
  }
  return body.data;
}

/**
 * Calls a BFF route with `GET` and validates the JSON body.
 *
 * @param path - Route path, e.g. `BFF_ROUTES.search`.
 * @param params - Query parameters.
 * @param schema - Expected body schema.
 * @param signal - Abort signal (TanStack Query cancels outdated requests with it).
 * @returns The validated body.
 * @throws {BffError} On error responses or a body that breaks the contract.
 */
export async function bffGet<TSchema extends z.ZodType>(
  path: string,
  params: URLSearchParams,
  schema: TSchema,
  signal?: AbortSignal,
): Promise<z.infer<TSchema>> {
  const response = await fetch(`${path}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw await toBffError(response);
  }
  return readBffBody(response, schema);
}

/**
 * Calls a BFF route with a write method and validates the JSON body.
 *
 * @param path - Route path, e.g. `BFF_ROUTES.cart`.
 * @param method - HTTP method (`POST`, `PATCH`, `DELETE`).
 * @param schema - Expected body schema.
 * @param body - JSON body, if any.
 * @returns The validated body.
 * @throws {BffError} On error responses, network failures or a body that breaks the contract.
 */
export async function bffSend<TSchema extends z.ZodType>(
  path: string,
  method: HttpMethod,
  schema: TSchema,
  body?: unknown,
): Promise<z.infer<TSchema>> {
  const headers: Record<string, string> = { [HTTP_HEADERS.ACCEPT]: JSON_CONTENT_TYPE };
  if (body !== undefined) {
    headers[HTTP_HEADERS.CONTENT_TYPE] = JSON_CONTENT_TYPE;
  }
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new BffError(FrontErrorCode.UNAVAILABLE, 0, "BFF unreachable");
  }
  if (!response.ok) {
    throw await toBffError(response);
  }
  return readBffBody(response, schema);
}
