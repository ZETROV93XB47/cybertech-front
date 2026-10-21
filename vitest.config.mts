/**
 * Vitest configuration for unit, component and type-level tests.
 *
 * - jsdom environment so React components and browser storage can be tested;
 * - `resolve.tsconfigPaths` resolves the `@/` alias exactly like Next.js does;
 * - `typecheck` runs `*.test-d.ts` files (type-level assertions such as the backend error-code
 *   drift check, task T020);
 * - static image imports give a `StaticImageData`-like object, as with Next.js (feature 004).
 */
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vitest/config";

/** Static image files imported by the components (`public/images/**`). */
const STATIC_IMAGE_PATTERN = /\.(jpe?g|png|webp)$/;

/** Size given to every imported image in tests (the site photos are 16:9, 1 920 × 1 080). */
const TEST_IMAGE_SIZE = { width: 1_920, height: 1_080 } as const;

/** One transparent pixel, the blur placeholder of the imported images in tests. */
const TEST_BLUR_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Turns a static image import into the object Next.js gives (`src`, size, blur placeholder), so
 * `next/image` renders it in jsdom exactly as in the app.
 *
 * @returns The Vite plugin.
 */
function staticImageData(): Plugin {
  return {
    name: "static-image-data",
    enforce: "pre",
    load(id) {
      if (!STATIC_IMAGE_PATTERN.test(id)) {
        return null;
      }
      const src = `/${id.split("/public/").pop() ?? id}`;
      return `export default ${JSON.stringify({ src, ...TEST_IMAGE_SIZE, blurDataURL: TEST_BLUR_DATA_URL })};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), staticImageData()],
  resolve: {
    tsconfigPaths: true,
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
