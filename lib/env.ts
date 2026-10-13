/**
 * Server environment variables, validated once at startup (constitution VI).
 *
 * `instrumentation.ts` calls {@link getEnv} when the server boots, so a missing or invalid
 * variable stops `npm run dev` with an explicit message instead of failing on the first request.
 * Only `NEXT_PUBLIC_SITE_URL` is meant for the browser; everything else stays server-side.
 *
 * @see specs/001-catalog-auth-cart/plan.md (Variables d'environnement)
 */
import "server-only";

import { z } from "zod";

import { LogLevel } from "@/lib/enums/log-level";

/** Default value of the `X-API-VERSION` header (backend default, see api-map §0). */
const DEFAULT_API_VERSION = "1.0";

/** Minimum length of `AUTH_SECRET`; `npx auth secret` generates 32 random bytes in base64. */
const AUTH_SECRET_MIN_LENGTH = 32;

/** Zod schema of every variable listed in `.env.example`. */
const EnvSchema = z.object({
  API_BASE_URL: z.url(),
  API_VERSION: z.string().min(1).default(DEFAULT_API_VERSION),
  AUTH_SECRET: z.string().min(AUTH_SECRET_MIN_LENGTH),
  AUTH_URL: z.url(),
  AUTH_KEYCLOAK_ID: z.string().min(1),
  AUTH_KEYCLOAK_SECRET: z.string().min(1),
  AUTH_KEYCLOAK_ISSUER: z.url(),
  IMAGES_REMOTE_HOST: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
  E2E: z.stringbool().default(false),
  LOG_LEVEL: z.enum(LogLevel).default(LogLevel.INFO),
});

/** Validated server environment. */
export type Env = z.infer<typeof EnvSchema>;

/** Environment parsed on first access, then reused. */
let cachedEnv: Env | undefined;

/**
 * Validates a raw environment object.
 *
 * Exported separately from {@link getEnv} so tests can validate an explicit object without
 * touching `process.env`.
 *
 * @param source - Raw variables, usually `process.env`.
 * @returns The typed, defaulted environment.
 * @throws {Error} Listing every missing or invalid variable, one per line.
 */
export function parseEnv(source: Readonly<Record<string, string | undefined>>): Env {
  const result = EnvSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }
  const problems = result.error.issues.map(
    (issue) => `- ${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(
    `Invalid environment, check .env.local (see .env.example):\n${problems.join("\n")}`,
  );
}

/**
 * Returns the validated environment, parsing `process.env` on the first call.
 *
 * @returns The typed environment.
 * @throws {Error} When a variable is missing or invalid (see {@link parseEnv}).
 */
export function getEnv(): Env {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}
