/**
 * Next.js proxy (formerly `middleware.ts`), run before every page and API request.
 *
 * 1. Sets the per-request Content Security Policy and hands its nonce to the app through the
 *    `x-nonce` request header (read by the root layout).
 * 2. Redirects a product list URL to its canonical form (invalid parameters dropped, no-JavaScript
 *    filter form normalised) with a real 307, before the page starts streaming (FR-004).
 * 3. Guards private routes. Lot 1 has none; `/account/**` (lot 2) will be checked here, and
 *    again on the server by each private layout (constitution II).
 */
import { NextResponse, type NextRequest } from "next/server";

import { buildSearchQuery, parseSearchParams } from "@/features/catalog/search-params";
import { CATALOG_PATH } from "@/lib/constants/routes";
import { CSP_HEADER, NONCE_HEADER } from "@/lib/constants/security";
import { buildCsp, generateNonce } from "@/lib/security/csp";

/** Value of `NODE_ENV` while running `next dev`. */
const DEVELOPMENT_NODE_ENV = "development";

/**
 * Builds the redirect to the canonical product list URL, when the current one differs.
 *
 * Category-specific filters are checked against the category schema later, by the page itself.
 *
 * @param request - Incoming request.
 * @returns The redirect, or `null` when the URL is already canonical or is not the list.
 */
function canonicalCatalogRedirect(request: NextRequest): NextResponse | null {
  const url = request.nextUrl;
  if (url.pathname !== CATALOG_PATH) {
    return null;
  }
  const canonical = buildSearchQuery(parseSearchParams(url.searchParams));
  if (canonical === url.searchParams.toString()) {
    return null;
  }
  const target = url.clone();
  target.search = canonical;
  return NextResponse.redirect(target);
}

/**
 * Adds the CSP to the request and the response.
 *
 * Environment variables are read from `process.env` here: they were validated at server start
 * by `instrumentation.ts`, and the proxy must stay free of server-only modules.
 *
 * @param request - Incoming request.
 * @returns A canonical-URL redirect, or the response continuing to the app with the CSP header.
 */
export function proxy(request: NextRequest): NextResponse {
  const redirect = canonicalCatalogRedirect(request);
  if (redirect) {
    return redirect;
  }
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
