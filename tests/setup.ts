/**
 * Global test setup:
 * - DOM and accessibility matchers;
 * - a complete test environment (`lib/env.ts` validates it like in production);
 * - module loggers replaced by a silent spy logger (`tests/helpers/test-logger.ts`);
 * - the MSW server that mocks the backend at the HTTP level (constitution VII).
 */
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";
import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";

import { TEST_ENV } from "./helpers/test-env";
import { clearTestLogger, testLogger } from "./helpers/test-logger";
import { server } from "./msw/server";

Object.assign(process.env, TEST_ENV);

vi.mock("@/lib/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/logger")>();
  return { ...actual, createModuleLogger: () => testLogger };
});

expect.extend(toHaveNoViolations);

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  clearTestLogger();
});

afterAll(() => {
  server.close();
});
