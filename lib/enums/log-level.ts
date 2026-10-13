/**
 * Server log levels, from the most to the least verbose (constitution XII).
 */

/** Level accepted by `LOG_LEVEL` and by the pino logger. */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}
