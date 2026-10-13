/**
 * Playwright configuration for end-to-end journeys (constitution VII).
 *
 * Runs against the real local environment: backend services via docker-compose, Spring from
 * IntelliJ, and the front started here with `E2E=1` (enables the test-only session route).
 * The `reduced-motion` project replays every journey with `prefers-reduced-motion: reduce`.
 */
import { defineConfig, devices } from "@playwright/test";

/** Local URL of the front (constitution X). */
const BASE_URL = "http://localhost:3000";

/** Time allowed for `next dev` to compile and answer the first request. */
const WEB_SERVER_TIMEOUT_MS = 120_000;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    locale: "fr-FR",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "reduced-motion",
      use: { ...devices["Desktop Chrome"], contextOptions: { reducedMotion: "reduce" } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: WEB_SERVER_TIMEOUT_MS,
    env: { E2E: "true" },
  },
});
