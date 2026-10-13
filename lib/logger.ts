/**
 * Server logger (constitution XII): structured JSON with pino, one child logger per module.
 *
 * Usage: `const log = createModuleLogger("cart.merge"); log.info({ merged: 3 }, "Guest cart merged");`
 *
 * Secrets are protected twice: the `redact` option blanks known sensitive keys wherever they
 * appear, and callers mask identifiers with `maskUuid` / `maskEmail` before logging them.
 */
import "server-only";

import pino, { type DestinationStream, type Logger } from "pino";

import { getEnv } from "@/lib/env";
import { LogLevel } from "@/lib/enums/log-level";

export { maskEmail, maskUuid } from "@/lib/log-safety";

/**
 * Paths blanked by pino before a line is written, at any nesting level used by the BFF.
 * Covers HTTP headers, Auth.js token fields and form passwords.
 */
export const REDACTED_PATHS = [
  "authorization",
  "cookie",
  "headers.authorization",
  "headers.cookie",
  "password",
  "*.password",
  "accessToken",
  "*.accessToken",
  "refreshToken",
  "*.refreshToken",
  "idToken",
  "*.idToken",
] as const;

/** Text written instead of a redacted value. */
export const REDACTION_CENSOR = "[REDACTED]";

/** Value of `NODE_ENV` in production builds. */
const PRODUCTION_NODE_ENV = "production";

/** Options of {@link createLogger}. */
export interface LoggerOptions {
  /** Minimum level written. */
  readonly level: LogLevel;
  /** Human-readable coloured output (development only). */
  readonly pretty: boolean;
  /** Where lines are written; defaults to stdout. Tests pass an in-memory stream. */
  readonly destination?: DestinationStream;
}

/**
 * Builds a pino logger with the project redaction rules.
 *
 * @param options - Level, output format and optional destination.
 * @returns A configured root logger.
 */
export function createLogger(options: LoggerOptions): Logger {
  const base = {
    level: options.level,
    redact: { paths: [...REDACTED_PATHS], censor: REDACTION_CENSOR },
  };
  if (options.destination) {
    return pino(base, options.destination);
  }
  if (options.pretty) {
    return pino({ ...base, transport: { target: "pino-pretty", options: { colorize: true } } });
  }
  return pino(base);
}

/** Root logger, created on first use from the validated environment. */
let rootLogger: Logger | undefined;

/**
 * Returns the shared root logger (pretty output outside production).
 *
 * @returns The root logger.
 */
function getRootLogger(): Logger {
  rootLogger ??= createLogger({
    level: getEnv().LOG_LEVEL,
    pretty: process.env.NODE_ENV !== PRODUCTION_NODE_ENV,
  });
  return rootLogger;
}

/**
 * Creates the child logger of a module; every line it writes carries `module`.
 *
 * @param module - Dotted module name, e.g. `"api.client"`, `"cart.merge"`.
 * @returns A child logger.
 */
export function createModuleLogger(module: string): Logger {
  return getRootLogger().child({ module });
}
