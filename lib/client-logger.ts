/**
 * Browser logger (constitution XII): the only place allowed to call `console`.
 *
 * In production only errors are written, so nothing sensitive or noisy reaches the user's
 * console; in development warnings and debug lines help while building.
 */

/** Value of `NODE_ENV` in production builds. */
const PRODUCTION_NODE_ENV = "production";

/** Extra structured data attached to a log line. Never put tokens or personal data here. */
export type ClientLogContext = Readonly<Record<string, unknown>>;

/** Whether the bundle is a production build. */
const isProduction = process.env.NODE_ENV === PRODUCTION_NODE_ENV;

/* eslint-disable no-console -- this module is the single, documented console gateway. */
/** Minimal client logger. */
export const clientLogger = {
  /**
   * Logs an error (kept in production).
   *
   * @param message - Short English description.
   * @param context - Optional non-sensitive details.
   */
  error(message: string, context?: ClientLogContext): void {
    console.error(message, context ?? {});
  },
  /**
   * Logs a warning (development only).
   *
   * @param message - Short English description.
   * @param context - Optional non-sensitive details.
   */
  warn(message: string, context?: ClientLogContext): void {
    if (!isProduction) {
      console.warn(message, context ?? {});
    }
  },
  /**
   * Logs a debug line (development only).
   *
   * @param message - Short English description.
   * @param context - Optional non-sensitive details.
   */
  debug(message: string, context?: ClientLogContext): void {
    if (!isProduction) {
      console.debug(message, context ?? {});
    }
  },
} as const;
/* eslint-enable no-console */
