/**
 * Security constants: Content Security Policy and HTTP security headers (task T048, T049).
 *
 * @see specs/001-catalog-auth-cart/research.md R7
 */

/** Request header through which `proxy.ts` hands the per-request CSP nonce to the app. */
export const NONCE_HEADER = "x-nonce";

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

/** `Referrer-Policy`: full URL on same origin, origin only elsewhere. */
export const REFERRER_POLICY = "strict-origin-when-cross-origin";

/** `X-Content-Type-Options`: forbids MIME sniffing. */
export const CONTENT_TYPE_OPTIONS = "nosniff";

/** Path prefix of the private pages of lot 2 (guarded by `proxy.ts`). */
export const PRIVATE_PATH_PREFIX = "/account";
