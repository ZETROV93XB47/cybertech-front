/**
 * HTTP constants shared by the BFF client and the Route Handlers.
 *
 * Status codes are numbers, so they are named constants rather than an enum (the constitution
 * only allows string enums).
 */

/** HTTP status codes used by the front. */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** Lowest status of the 5xx (server error) class. */
export const SERVER_ERROR_MIN_STATUS = 500;

/** `Cache-Control` value of every BFF response: never stored by the browser or a proxy. */
export const NO_STORE = "no-store";

/** Header names used by the BFF responses. */
export const HTTP_HEADERS = {
  CACHE_CONTROL: "Cache-Control",
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
  ACCEPT: "Accept",
} as const;

/** Scheme prefix of an OAuth bearer token in the `Authorization` header. */
export const BEARER_PREFIX = "Bearer ";
