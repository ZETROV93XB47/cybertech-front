/**
 * Vitest configuration for unit, component and type-level tests.
 *
 * - jsdom environment so React components and browser storage can be tested;
 * - `tsconfigPaths` resolves the `@/` alias exactly like Next.js does;
 * - `typecheck` runs `*.test-d.ts` files (type-level assertions such as the backend error-code
 *   drift check, task T020).
 */
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // `server-only` throws outside React Server Components; tests import server modules
      // directly, so the marker is replaced by an empty stub.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    typecheck: {
      enabled: true,
      include: ["tests/unit/**/*.test-d.ts"],
    },
    restoreMocks: true,
  },
});
