/**
 * Content Security Policy builder (research R7, task T048).
 *
 * A fresh nonce per request allows only the scripts Next.js renders with it
 * (`'strict-dynamic'` then trusts what they load). Inline styles stay allowed because Next.js,
 * Motion and Radix set `style` attributes; scripts, the real XSS vector, stay locked.
 */
import { CSP_SOURCES, NONCE_BYTES } from "@/lib/constants/security";

/** Inputs of {@link buildCsp}. */
export interface CspInput {
  /** Per-request nonce. */
  readonly nonce: string;
  /** Development mode: React needs `eval` and Next.js hot reload needs WebSockets. */
  readonly isDevelopment: boolean;
  /** Host serving product images (`IMAGES_REMOTE_HOST`), e.g. `localhost:4566`. */
  readonly imagesHost: string;
  /** Origin of the Keycloak issuer: sign-in forms redirect there. */
  readonly identityProviderOrigin: string;
}

/**
 * Generates a random CSP nonce.
 *
 * @returns A base64 string of {@link NONCE_BYTES} random bytes.
 */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Builds the `Content-Security-Policy` header value.
 *
 * @param input - Nonce, mode and allowed external origins.
 * @returns The policy, directives separated by `; `.
 */
export function buildCsp(input: CspInput): string {
  const { SELF, NONE, STRICT_DYNAMIC, UNSAFE_INLINE, UNSAFE_EVAL, DATA, BLOB, WEBSOCKET } =
    CSP_SOURCES;
  const scripts: string[] = [SELF, `'nonce-${input.nonce}'`, STRICT_DYNAMIC];
  const connections: string[] = [SELF];
  if (input.isDevelopment) {
    scripts.push(UNSAFE_EVAL);
    connections.push(WEBSOCKET);
  }
  const directives: readonly (readonly [string, readonly string[]])[] = [
    ["default-src", [SELF]],
    ["script-src", scripts],
    ["style-src", [SELF, UNSAFE_INLINE]],
    ["img-src", [SELF, BLOB, DATA, input.imagesHost]],
    ["font-src", [SELF]],
    ["connect-src", connections],
    ["object-src", [NONE]],
    ["base-uri", [SELF]],
    ["form-action", [SELF, input.identityProviderOrigin]],
    ["frame-ancestors", [NONE]],
  ];
  return directives.map(([name, sources]) => `${name} ${sources.join(" ")}`).join("; ");
}
