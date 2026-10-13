/**
 * Validation of the `callbackUrl` given to the sign-in page (open-redirect protection).
 *
 * Only paths of the front itself are accepted; anything else (other origin, protocol-relative
 * `//evil.example`, `javascript:`…) falls back to the home page.
 *
 * @see specs/001-catalog-auth-cart/spec.md FR-015
 */
import { CALLBACK_URL_PARAM, LOGIN_PATH } from "@/lib/constants/auth";
import { HOME_PATH } from "@/lib/constants/routes";

/** Placeholder origin used to resolve relative paths; never leaves this module. */
const RESOLUTION_ORIGIN = "http://callback.invalid";

/**
 * Turns a raw `callbackUrl` into a safe same-origin path.
 *
 * @param raw - Value of the query parameter (relative path or absolute URL).
 * @param appOrigin - Origin of the front (`AUTH_URL`), for absolute URLs.
 * @returns The path with its query string and hash, or `/` when the value is not same-origin.
 */
export function safeCallbackPath(raw: string | null | undefined, appOrigin: string): string {
  if (!raw) {
    return HOME_PATH;
  }
  const isRelative = raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\");
  let url: URL;
  try {
    url = isRelative ? new URL(raw, RESOLUTION_ORIGIN) : new URL(raw);
  } catch {
    return HOME_PATH;
  }
  if (!isRelative && url.origin !== new URL(appOrigin).origin) {
    return HOME_PATH;
  }
  if (url.pathname.startsWith(LOGIN_PATH)) {
    return HOME_PATH;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Builds the sign-in page path that comes back to a given page.
 *
 * @param callbackPath - Path to come back to after sign-in.
 * @returns `/login?callbackUrl=<path>`.
 */
export function loginPath(callbackPath: string): string {
  return `${LOGIN_PATH}?${new URLSearchParams({ [CALLBACK_URL_PARAM]: callbackPath }).toString()}`;
}
