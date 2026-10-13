/**
 * Next.js proxy (formerly `middleware.ts`), run before every page and API request.
 *
 * 1. Sets the per-request Content Security Policy and hands its nonce to the app through the
 *    `x-nonce` request header (read by the root layout).
 * 2. Guards private routes. Lot 1 has none; `/account/**` (lot 2) will be checked here, and
 *    again on the server by each private layout (constitution II).
 */
import { NextResponse, type NextRequest } from "next/server";

import { CSP_HEADER, NONCE_HEADER } from "@/lib/constants/security";
import { buildCsp, generateNonce } from "@/lib/security/csp";

/** Value of `NODE_ENV` while running `next dev`. */
const DEVELOPMENT_NODE_ENV = "development";

/**
 * Adds the CSP to the request and the response.
 *
 * Environment variables are read from `process.env` here: they were validated at server start
 * by `instrumentation.ts`, and the proxy must stay free of server-only modules.
 *
 * @param request - Incoming request.
 * @returns The response continuing to the app, with the CSP header.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    isDevelopment: process.env.NODE_ENV === DEVELOPMENT_NODE_ENV,
    imagesHost: process.env.IMAGES_REMOTE_HOST ?? "",
    identityProviderOrigin: new URL(process.env.AUTH_KEYCLOAK_ISSUER ?? request.url).origin,
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set(CSP_HEADER, csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, csp);
  return response;
}

/** Runs on every route except static assets and optimised images. */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
