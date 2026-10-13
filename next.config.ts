/**
 * Next.js configuration.
 *
 * Kept deliberately small: security headers and image hosts are added by the foundational tasks
 * (T023, T049). No `output: "standalone"`: the front only runs locally (constitution X).
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pino relies on worker threads and dynamic requires; bundling it breaks its transports.
  serverExternalPackages: ["pino", "pino-pretty"],
};

export default nextConfig;
