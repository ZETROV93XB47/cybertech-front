/**
 * Browser-side client of the BFF Route Handlers (same origin, JSON).
 *
 * The browser never calls Spring or Keycloak (constitution III): every client query goes through
 * this helper, which validates the body and turns error bodies into {@link BffError}.
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 */
import type { z } from "zod";

import { FrontErrorCode } from "@/lib/enums/error-code";
import { FrontErrorBodySchema } from "@/lib/schemas/front-error";

/** Error raised by {@link bffGet}; the UI branches on {@link BffError.code}. */
export class BffError extends Error {
  public readonly code: FrontErrorCode;
  public readonly status: number;

  /**
   * @param code - Stable front error code.
   * @param status - HTTP status of the BFF response.
   * @param message - Technical message (English), never shown as is.
   */
  public constructor(code: FrontErrorCode, status: number, message: string) {
    super(message);
    this.name = "BffError";
    this.code = code;
    this.status = status;
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
  return new BffError(body.data.error.code, response.status, body.data.error.message);
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
