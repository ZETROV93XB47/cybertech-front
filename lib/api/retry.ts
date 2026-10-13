/**
 * Single automatic retry of backend writes (spec edge case « conflit temporaire »).
 *
 * The backend serialises cart writes with a Redis lock; a busy lock returns
 * `CONCURRENT_MODIFICATION` (409). One retry absorbs this race; a second failure is shown.
 *
 * @see specs/001-catalog-auth-cart/contracts/errors.md
 */
import "server-only";

import { BACKEND_MAX_RETRIES } from "@/lib/constants/api";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger } from "@/lib/logger";

import { ApiError } from "./errors";

const log = createModuleLogger("api.retry");

/**
 * Tells whether a failed write may be retried once.
 *
 * @param error - Error thrown by the first attempt.
 * @returns `true` for a concurrent modification or a temporary unavailability.
 */
export function isRetryableWrite(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  return (
    error.frontCode === FrontErrorCode.CONFLICT || error.frontCode === FrontErrorCode.UNAVAILABLE
  );
}

/**
 * Runs an operation, retrying it {@link BACKEND_MAX_RETRIES} time(s) on a retryable error.
 *
 * @param operation - Backend write to run.
 * @param shouldRetry - Predicate deciding whether an error is retryable.
 * @returns The operation result.
 * @throws The last error when every attempt failed or the error is not retryable.
 */
export async function withSingleRetry<TResult>(
  operation: () => Promise<TResult>,
  shouldRetry: (error: unknown) => boolean = isRetryableWrite,
): Promise<TResult> {
  let attempt = 0;
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= BACKEND_MAX_RETRIES || !shouldRetry(error)) {
        throw error;
      }
      attempt += 1;
      log.warn(
        { attempt, frontCode: error instanceof ApiError ? error.frontCode : undefined },
        "Retrying backend write",
      );
    }
  }
}
