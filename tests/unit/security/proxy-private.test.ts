// @vitest-environment node
/**
 * Guard of the private pages in `proxy.ts` (feature 003, T013).
 *
 * @see specs/003-account-orders/research.md R1
 * @see specs/003-account-orders/contracts/bff-routes.md §4
 */
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";
import { CSP_HEADER } from "@/lib/constants/security";

/** Origin of the requests built by the tests. */
const ORIGIN = "http://localhost:3000";

/** Status of the redirect issued by `NextResponse.redirect`. */
const TEMPORARY_REDIRECT = 307;

/**
 * Builds a request as the proxy receives it.
 *
 * @param path - Path and query string.
 * @param cookie - Raw `Cookie` header, if any.
 * @returns The request.
 */
function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(new URL(path, ORIGIN), {
    headers: cookie === undefined ? {} : { cookie },
  });
}

/**
 * Reads the sign-in redirect of a response.
 *
 * @param response - Proxy response.
 * @returns The redirect target, relative to the origin.
 */
function redirectTarget(response: Response): string {
  const location = new URL(response.headers.get("location") ?? "", ORIGIN);
  return `${location.pathname}${location.search}`;
}

describe("proxy — private pages", () => {
  it.each(["/account", "/account/orders/123", "/checkout", "/checkout/confirmation/abc"])(
    "redirects %s to the sign-in page without a session cookie",
    (path) => {
      const response = proxy(request(path));
      expect(response.status).toBe(TEMPORARY_REDIRECT);
      expect(redirectTarget(response)).toBe(`/login?callbackUrl=${encodeURIComponent(path)}`);
    },
  );

  it("keeps the query string of the page to come back to", () => {
    const response = proxy(request("/account/orders?status=PAID&page=2"));
    expect(redirectTarget(response)).toBe(
      `/login?callbackUrl=${encodeURIComponent("/account/orders?status=PAID&page=2")}`,
    );
  });

  it.each([
    "authjs.session-token=abc",
    "__Secure-authjs.session-token=abc",
    "authjs.session-token.0=abc; authjs.session-token.1=def",
  ])("lets a request with a session cookie through (%s), with the CSP", (cookie) => {
    const response = proxy(request("/account/orders", cookie));
    expect(response.status).not.toBe(TEMPORARY_REDIRECT);
    expect(response.headers.get(CSP_HEADER)).toContain("default-src");
  });

  it("does not take a look-alike cookie for a session", () => {
    const response = proxy(request("/checkout", "authjs.session-token-old=abc"));
    expect(response.status).toBe(TEMPORARY_REDIRECT);
  });

  it.each(["/api/checkout/quote", "/api/orders/123/status"])(
    "never redirects the BFF route %s (it answers 401 itself)",
    (path) => {
      expect(proxy(request(path)).status).not.toBe(TEMPORARY_REDIRECT);
    },
  );

  it("does not guard a page that only starts like a private prefix", () => {
    expect(proxy(request("/accounting")).status).not.toBe(TEMPORARY_REDIRECT);
  });

  it("keeps the canonical redirect of the product list", () => {
    const response = proxy(request("/products?unknown=1"));
    expect(response.status).toBe(TEMPORARY_REDIRECT);
    expect(redirectTarget(response)).toBe("/products");
  });
});
