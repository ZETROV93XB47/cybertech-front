/**
 * Playwright configuration for Claude's verification runs and the visual audit captures
 * (feature 002, T002 / T025 / T066 / T076).
 *
 * Targets a `next dev -p 3123` started for the run, so the developer's own server on port 3000
 * is never touched; journeys that sign in through Keycloak still need port 3000 (the only
 * redirect URI of the front client) and use `playwright.config.ts`.
 */
import { defineConfig, devices } from "@playwright/test";

/** Port of the verification server. */
const VERIFY_BASE_URL = "http://localhost:3123";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: VERIFY_BASE_URL, locale: "fr-FR", ...devices["Desktop Chrome"] },
});
