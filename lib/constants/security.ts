/**
 * Security constants: Content Security Policy and HTTP security headers (task T048, T049).
 *
 * @see specs/001-catalog-auth-cart/research.md R7
 */

/** Request header through which `proxy.ts` hands the per-request CSP nonce to the app. */
export const NONCE_HEADER = "x-nonce";

/**
 * Request header through which `proxy.ts` hands the requested path and query string to the
 * private layout: a layout cannot read the URL, and `requireSession` needs the page to come
 * back to after sign-in.
 *
 * @see specs/003-account-orders/research.md R1
 */
export const REQUEST_PATH_HEADER = "x-request-path";

/** Response header of the Content Security Policy. */
export const CSP_HEADER = "Content-Security-Policy";

/** Number of random bytes of a CSP nonce (128 bits). */
export const NONCE_BYTES = 16;

/** CSP keyword sources. */
export const CSP_SOURCES = {
  SELF: "'self'",
  NONE: "'none'",
  STRICT_DYNAMIC: "'strict-dynamic'",
  UNSAFE_INLINE: "'unsafe-inline'",
  UNSAFE_EVAL: "'unsafe-eval'",
  DATA: "data:",
  BLOB: "blob:",
  WEBSOCKET: "ws:",
} as const;

/**
 * `Permissions-Policy`: the shop needs none of these browser features (desktop only, no
 * gyroscope effect, constitution IX).
 */
export const PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), gyroscope=()";

/**
 * Response headers of the service worker files (feature 005, research R13): never cached for
 * long, so that a new version is picked up at the next visit, and allowed to control the whole
 * site.
 *
 * @see specs/005-web-push-notifications/contracts/bff-routes.md §7
 */
export const SERVICE_WORKER_HEADERS = {
  /** `Cache-Control` of `/sw.js` and `/sw-core.js`: revalidated at every load. */
  cacheControl: "no-cache",
  /** `Service-Worker-Allowed` of `/sw.js`: the worker scope may be the whole site. */
  allowedScope: "/",
} as const;

/** `Referrer-Policy`: full URL on same origin, origin only elsewhere. */
export const REFERRER_POLICY = "strict-origin-when-cross-origin";

/** `X-Content-Type-Options`: forbids MIME sniffing. */
export const CONTENT_TYPE_OPTIONS = "nosniff";

/**
 * Path prefixes of the private pages, redirected to the sign-in page by `proxy.ts` when no
 * session cookie is present, then checked for real by `app/(account)/layout.tsx`.
 *
 * @see specs/003-account-orders/research.md R1
 */
export const PRIVATE_PATH_PREFIXES: readonly string[] = ["/account", "/checkout"];
