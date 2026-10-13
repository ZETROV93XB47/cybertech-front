/**
 * Silent logger used by every unit test in place of the module loggers.
 *
 * Each method is a spy, so tests can assert what was logged (and that no secret was).
 */
import { vi } from "vitest";

/** Spy logger with the subset of the pino API used by the code. */
export const testLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
};

testLogger.child.mockReturnValue(testLogger);

/** Clears every recorded call (run after each test). */
export function clearTestLogger(): void {
  testLogger.debug.mockClear();
  testLogger.info.mockClear();
  testLogger.warn.mockClear();
  testLogger.error.mockClear();
}

/**
 * Serialises every logged argument, to check that a secret never appears in any log line.
 *
 * @returns All logged arguments as one JSON string.
 */
export function allLoggedText(): string {
  return JSON.stringify([
    testLogger.debug.mock.calls,
    testLogger.info.mock.calls,
    testLogger.warn.mock.calls,
    testLogger.error.mock.calls,
  ]);
}
