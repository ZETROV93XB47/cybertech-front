/**
 * Next.js configuration: security headers, product image host, server packages.
 *
 * No `output: "standalone"`: the front only runs locally (constitution X). The CSP itself is set
 * per request by `proxy.ts` because it carries a nonce.
 */
import type { NextConfig } from "next";

import {
  CONTENT_TYPE_OPTIONS,
  PERMISSIONS_POLICY,
  REFERRER_POLICY,
} from "./lib/constants/security";

/** Path prefix of product images in the LocalStack S3 bucket. */
const PRODUCT_IMAGES_PATH = "/cybertech-products/**";

/** Protocol of the local S3 (LocalStack has no TLS). */
const IMAGES_PROTOCOL = "http";

/**
 * Reads the product image host (`host:port`) from the environment.
 *
 * @returns The host and optional port.
 * @throws {Error} When `IMAGES_REMOTE_HOST` is missing (constitution VI).
 */
function readImagesHost(): { hostname: string; port: string } {
  const value = process.env.IMAGES_REMOTE_HOST;
  if (!value) {
    throw new Error("IMAGES_REMOTE_HOST is missing: copy .env.example to .env.local");
  }
  const [hostname = value, port = ""] = value.split(":");
  return { hostname, port };
}

const imagesHost = readImagesHost();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The project guidance for coding agents lives in CLAUDE.md; no generated AGENTS.md.
  agentRules: false,
  // pino relies on worker threads and dynamic requires; bundling it breaks its transports.
  serverExternalPackages: ["pino", "pino-pretty"],
  images: {
    remotePatterns: [
      {
        protocol: IMAGES_PROTOCOL,
        hostname: imagesHost.hostname,
        port: imagesHost.port,
        pathname: PRODUCT_IMAGES_PATH,
      },
    ],
  },
  headers() {
    return Promise.resolve([
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: REFERRER_POLICY },
          { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
          { key: "X-Content-Type-Options", value: CONTENT_TYPE_OPTIONS },
        ],
      },
    ]);
  },
};

export default nextConfig;
