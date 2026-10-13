/**
 * Next.js instrumentation hook, run once when the server starts.
 *
 * Validates the environment immediately so the app refuses to boot with a missing variable
 * (constitution VI) instead of failing later on a user request.
 */

/** Next.js runtime value for the Node.js server (the edge runtime has no `process.env` access). */
const NODE_RUNTIME = "nodejs";

/**
 * Called by Next.js at server startup.
 *
 * @returns A promise resolved once the environment has been validated.
 * @throws {Error} When the environment is invalid (see `lib/env.ts`).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== NODE_RUNTIME) {
    return;
  }
  const { getEnv } = await import("@/lib/env");
  getEnv();
}
