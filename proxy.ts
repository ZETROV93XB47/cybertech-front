/**
 * Next.js proxy (formerly `middleware.ts`), run before every page and API request.
 *
 * 1. Sets the per-request Content Security Policy and hands its nonce to the app through the
 *    `x-nonce` request header (read by the root layout).
 * 2. Redirects a product list URL to its canonical form (invalid parameters dropped, no-JavaScript
 *    filter form normalised) with a real 307, before the page starts streaming (FR-004).
 * 3. Guards the private pages (`/account/**`, `/checkout/**`): without a session cookie the
 *    browser is sent to the sign-in page, which brings it back afterwards. Only the presence of
 *    the cookie is checked here (no secret, no server-only module); `app/(account)/layout.tsx`
 *    validates the session for real (constitution II). BFF routes are never redirected: they
 *    answer `401` themselves. The requested path is handed to that layout through the
 *    `x-request-path` request header.
 *
 * @see specs/003-account-orders/research.md R1
 */
import { NextResponse, type NextRequest } from "next/server";

import { buildSearchQuery, parseSearchParams } from "@/features/catalog/search-params";
import { loginPath } from "@/lib/auth/callback-url";
import { SECURE_COOKIE_PREFIX, SESSION_COOKIE_NAME } from "@/lib/constants/auth";
import { CATALOG_PATH } from "@/lib/constants/routes";
import {
  CSP_HEADER,
  NONCE_HEADER,
  PRIVATE_PATH_PREFIXES,
  REQUEST_PATH_HEADER,
} from "@/lib/constants/security";
import { buildCsp, generateNonce } from "@/lib/security/csp";

/** Value of `NODE_ENV` while running `next dev`. */
const DEVELOPMENT_NODE_ENV = "development";

/** Separator between a path prefix and the rest of the path. */
const PATH_SEPARATOR = "/";

/** Separator between the session cookie name and a chunk index (`authjs.session-token.0`). */
const COOKIE_CHUNK_SEPARATOR = ".";

/** Names a session cookie may have: plain or `__Secure-` prefixed. */
const SESSION_COOKIE_NAMES: readonly string[] = [
  SESSION_COOKIE_NAME,
  `${SECURE_COOKIE_PREFIX}${SESSION_COOKIE_NAME}`,
];

/**
 * Tells whether a path is a private page.
 *
 * @param pathname - Requested path.
 * @returns `true` for a prefix itself or a path below it (`/account`, `/account/orders`), not
 *   for a look-alike (`/accounting`).
 */
function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}${PATH_SEPARATOR}`),
  );
}

/**
 * Tells whether the request carries an Auth.js session cookie, whole or chunked.
 *
 * @param request - Incoming request.
 * @returns `true` when a session cookie is present (its validity is checked by the layout).
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) =>
      SESSION_COOKIE_NAMES.some(
        (sessionName) =>
          name === sessionName || name.startsWith(`${sessionName}${COOKIE_CHUNK_SEPARATOR}`),
      ),
    );
}

/**
 * Builds the sign-in redirect of a private page requested without a session.
 *
 * @param request - Incoming request.
 * @returns The redirect, or `null` when the page is public or a session cookie is present.
 */
function privatePageRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (!isPrivatePath(pathname) || hasSessionCookie(request)) {
    return null;
  }
  return NextResponse.redirect(new URL(loginPath(`${pathname}${search}`), request.url));
}

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
 * @returns A sign-in or canonical-URL redirect, or the response continuing to the app with the
 *   CSP header.
 */
export function proxy(request: NextRequest): NextResponse {
  const redirect = privatePageRedirect(request) ?? canonicalCatalogRedirect(request);
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
  requestHeaders.set(REQUEST_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, csp);
  return response;
}

/**
 * Runs on every route except static assets, optimised images and the service worker files of the
 * notifications (feature 005): a CSP set on `/sw.js` would apply to the worker itself, and its
 * nonce-based `script-src` would block `importScripts("/sw-core.js")`. The matcher must be a
 * literal (read at build time), hence the paths written here and not imported.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|sw-core\\.js|icons/).*)"],
};
