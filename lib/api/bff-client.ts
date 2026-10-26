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
import { HTTP_HEADERS, HTTP_STATUS } from "@/lib/constants/http";
import { FrontErrorCode } from "@/lib/enums/error-code";
import type { HttpMethod } from "@/lib/enums/http-method";
import type { StockShortage } from "@/lib/schemas/error";
import { FrontErrorBodySchema } from "@/lib/schemas/front-error";

/** Error raised by {@link bffGet} and {@link bffSend}; the UI branches on {@link BffError.code}. */
export class BffError extends Error {
  public readonly code: FrontErrorCode;
  public readonly status: number;
  /** Live stock sent with an `insufficient-stock` error. */
  public readonly availableStock: number | undefined;
  /** Seconds to wait, sent with a `rate-limited` error. */
  public readonly retryAfterSeconds: number | undefined;
  /** Short lines sent with an `insufficient-stock` error, when the backend named them. */
  public readonly stockShortages: readonly StockShortage[] | undefined;
  /** A card replacement failed: the previous card is still saved. */
  public readonly cardKept: boolean;

  /**
   * @param code - Stable front error code.
   * @param status - HTTP status of the BFF response.
   * @param message - Technical message (English), never shown as is.
   * @param availableStock - Live stock, for `insufficient-stock` errors.
   * @param retryAfterSeconds - Delay before retrying, for `rate-limited` errors.
   * @param stockShortages - Short lines, for `insufficient-stock` errors.
   * @param cardKept - The previous card is still saved (failed card replacement).
   */
  public constructor(
    code: FrontErrorCode,
    status: number,
    message: string,
    availableStock?: number,
    retryAfterSeconds?: number,
    stockShortages?: readonly StockShortage[],
    cardKept = false,
  ) {
    super(message);
    this.name = "BffError";
    this.code = code;
    this.status = status;
    this.availableStock = availableStock;
    this.retryAfterSeconds = retryAfterSeconds;
    this.stockShortages = stockShortages;
    this.cardKept = cardKept;
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
  const { code, message, availableStock, retryAfterSeconds, stockShortages, cardKept } =
    body.data.error;
  return new BffError(
    code,
    response.status,
    message,
    availableStock,
    retryAfterSeconds,
    stockShortages,
    cardKept === true,
  );
}

/**
 * Validates the JSON body of a successful BFF response. A `204` has no body: it is validated as
 * `undefined` (use `z.undefined()`).
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
  const json: unknown =
    response.status === HTTP_STATUS.NO_CONTENT ? undefined : await response.json();
  const body = schema.safeParse(json);
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
 * @param signal - Abort signal (TanStack Query cancels an outdated quote with it).
 * @returns The validated body.
 * @throws {BffError} On error responses, network failures or a body that breaks the contract.
 * @throws {DOMException} `AbortError` when the request was cancelled through `signal`.
 */
export async function bffSend<TSchema extends z.ZodType>(
  path: string,
  method: HttpMethod,
  schema: TSchema,
  body?: unknown,
  signal?: AbortSignal,
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
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    // A cancelled request is not an outage: let the caller (TanStack Query) see the abort.
    if (signal?.aborted) {
      throw error;
    }
    throw new BffError(FrontErrorCode.UNAVAILABLE, 0, "BFF unreachable");
  }
  if (!response.ok) {
    throw await toBffError(response);
  }
  return readBffBody(response, schema);
}
