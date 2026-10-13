/**
 * Global test setup: DOM matchers, accessibility matcher and the MSW server that mocks the
 * backend at the HTTP level (constitution VII).
 */
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";
import { afterAll, afterEach, beforeAll, expect } from "vitest";

import { server } from "./msw/server";

expect.extend(toHaveNoViolations);

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
