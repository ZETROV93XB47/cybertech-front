/**
 * Default MSW handlers.
 *
 * Empty on purpose: each test declares the backend responses it needs with `server.use(...)`,
 * so a test never depends on a hidden default. Unhandled requests fail the test (see setup).
 */
import type { RequestHandler } from "msw";

export const handlers: RequestHandler[] = [];
