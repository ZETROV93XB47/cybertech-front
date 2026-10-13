/**
 * Single HTTP client of the BFF towards the Spring backend (constitution III).
 *
 * Centralises base URL, version header, bearer token, timeout, JSON parsing, Zod validation,
 * error mapping and logging, so endpoint modules (`lib/api/endpoints/*`) only describe *what*
 * they call. Server-only: the backend URL and tokens never reach the browser.
 *
 * @see specs/001-catalog-auth-cart/research.md R8
 */
import "server-only";

import type { z } from "zod";

import {
  API_VERSION_HEADER,
  BACKEND_TIMEOUT_MS,
  FORWARDED_FOR_HEADER,
  JSON_CONTENT_TYPE,
  REQUEST_ID_HEADER,
} from "@/lib/constants/api";
import {
  BEARER_PREFIX,
  HTTP_HEADERS,
  HTTP_STATUS,
  SERVER_ERROR_MIN_STATUS,
} from "@/lib/constants/http";
import { getEnv } from "@/lib/env";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { HttpMethod } from "@/lib/enums/http-method";
import { createModuleLogger } from "@/lib/logger";

import { ApiError, parseErrorResponse, unavailableError } from "./errors";

/** Next.js data-cache options of a `fetch` (catalog reads only). */
export interface NextFetchCache {
  /** Seconds before the cached response is refreshed. */
  readonly revalidate: number;
  /** Tags allowing grouped revalidation. */
  readonly tags: readonly string[];
}

/** Options of {@link backendFetch}. */
export interface BackendFetchOptions<TSchema extends z.ZodType> {
  /** Schema validating the 2xx body; use `z.undefined()` for 204 responses. */
  readonly schema: TSchema;
  /** HTTP method; `GET` by default. */
  readonly method?: HttpMethod;
  /** JSON body, serialised by the client. Allowed on `DELETE` (backend quirk, api-map E.11). */
  readonly body?: unknown;
  /** Query parameters appended to the path. */
  readonly query?: Readonly<Record<string, string | readonly string[]>>;
  /** Keycloak access token of the user; omitted for public endpoints. Never logged. */
  readonly accessToken?: string;
  /** Browser IP forwarded to the backend rate limiter (registration). */
  readonly forwardedFor?: string;
  /** Data-cache options; when absent the call is never cached (`no-store`). */
  readonly nextCache?: NextFetchCache;
  /** Timeout override, for tests only. */
  readonly timeoutMs?: number;
}

const log = createModuleLogger("api.client");

/**
 * Builds the absolute backend URL of a call.
 *
 * @param path - Path from `BACKEND_PATHS`, possibly followed by an id.
 * @param query - Optional query parameters (arrays are repeated).
 * @returns The absolute URL.
 */
function buildUrl(path: string, query?: BackendFetchOptions<z.ZodType>["query"]): URL {
  const url = new URL(path, getEnv().API_BASE_URL);
  for (const [name, value] of Object.entries(query ?? {})) {
    const values = typeof value === "string" ? [value] : value;
    for (const item of values) {
      url.searchParams.append(name, item);
    }
  }
  return url;
}

/**
 * Builds the request headers: version, JSON, optional bearer token and forwarded IP.
 *
 * @param options - Call options.
 * @returns The headers.
 */
function buildHeaders(options: BackendFetchOptions<z.ZodType>): Headers {
  const headers = new Headers({
    [API_VERSION_HEADER]: getEnv().API_VERSION,
    [HTTP_HEADERS.ACCEPT]: JSON_CONTENT_TYPE,
  });
  if (options.body !== undefined) {
    headers.set(HTTP_HEADERS.CONTENT_TYPE, JSON_CONTENT_TYPE);
  }
  if (options.accessToken) {
    headers.set(HTTP_HEADERS.AUTHORIZATION, `${BEARER_PREFIX}${options.accessToken}`);
  }
  if (options.forwardedFor) {
    headers.set(FORWARDED_FOR_HEADER, options.forwardedFor);
  }
  return headers;
}

/**
 * Builds the `fetch` init object, including cache mode and timeout.
 *
 * @param options - Call options.
 * @returns The request init.
 */
function buildInit(options: BackendFetchOptions<z.ZodType>): RequestInit {
  const init: RequestInit = {
    method: options.method ?? HttpMethod.GET,
    headers: buildHeaders(options),
    signal: AbortSignal.timeout(options.timeoutMs ?? BACKEND_TIMEOUT_MS),
  };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }
  if (options.nextCache) {
    init.next = { revalidate: options.nextCache.revalidate, tags: [...options.nextCache.tags] };
  } else {
    init.cache = "no-store";
  }
  return init;
}

/**
 * Reads and validates a 2xx body.
 *
 * @param response - Successful backend response.
 * @param schema - Expected body schema.
 * @returns The validated body.
 * @throws {ApiError} `UNAVAILABLE` when the body does not match the contract.
 */
async function readBody<TSchema extends z.ZodType>(
  response: Response,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const text = await response.text();
  const raw: unknown =
    response.status === HTTP_STATUS.NO_CONTENT || text === "" ? undefined : JSON.parse(text);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError({
      status: response.status,
      frontCode: FrontErrorCode.UNAVAILABLE,
      message: `Backend response does not match the contract: ${parsed.error.message}`,
    });
  }
  return parsed.data;
}

/**
 * Logs one backend call with the level matching its outcome.
 *
 * @param fields - Structured fields (method, path, status, duration, request id, error code).
 * @param error - The error thrown, if any.
 */
function logCall(fields: Readonly<Record<string, unknown>>, error?: ApiError): void {
  if (!error) {
    log.info(fields, "Backend call succeeded");
    return;
  }
  const withError = { ...fields, frontCode: error.frontCode, errorCode: error.backendCode };
  if (error.status >= SERVER_ERROR_MIN_STATUS || error.frontCode === FrontErrorCode.UNAVAILABLE) {
    log.error({ ...withError, reason: error.message }, "Backend call failed");
    return;
  }
  log.warn(withError, "Backend call rejected");
}

/**
 * Calls the backend and returns the validated body.
 *
 * @param path - Backend path (from `BACKEND_PATHS`), without base URL.
 * @param options - Schema, method, body, token and cache options.
 * @returns The body validated by `options.schema`.
 * @throws {ApiError} On non-2xx responses, timeouts, network errors and contract mismatches.
 */
export async function backendFetch<TSchema extends z.ZodType>(
  path: string,
  options: BackendFetchOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const method = options.method ?? HttpMethod.GET;
  const startedAt = performance.now();
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), buildInit(options));
  } catch (cause) {
    const error = unavailableError(cause);
    logCall({ method, path, durationMs: Math.round(performance.now() - startedAt) }, error);
    throw error;
  }
  const requestId = response.headers.get(REQUEST_ID_HEADER) ?? undefined;
  const fields = { method, path, status: response.status, requestId };
  try {
    if (!response.ok) {
      throw await parseErrorResponse(response, requestId);
    }
    const body = await readBody(response, options.schema);
    logCall({ ...fields, durationMs: Math.round(performance.now() - startedAt) });
    return body;
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : unavailableError(cause);
    logCall({ ...fields, durationMs: Math.round(performance.now() - startedAt) }, error);
    throw error;
  }
}
