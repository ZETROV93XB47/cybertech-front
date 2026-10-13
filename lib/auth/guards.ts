/**
 * Server-side session guards for BFF routes, Server Actions and private layouts.
 *
 * The access token is read from the encrypted session cookie with `getToken` (server only): it is
 * never part of the session object that the browser can fetch. When the token is about to
 * expire it is renewed for the current request; the cookie itself is renewed by the next
 * `auth()` call (proxy, page or action).
 *
 * @see specs/001-catalog-auth-cart/research.md R1, R3
 */
import "server-only";

import { getToken, type JWT } from "next-auth/jwt";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import { HTTP_STATUS } from "@/lib/constants/http";
import { getEnv } from "@/lib/env";
import { FrontErrorCode } from "@/lib/enums/error-code";

import { loginPath } from "./callback-url";
import { auth } from "./config";
import { needsRefresh, refreshAccessToken } from "./refresh";

/** URL scheme that requires the `__Secure-` cookie prefix. */
const HTTPS_PROTOCOL = "https:";

/** Message of the error thrown when no usable session exists. */
const UNAUTHENTICATED_MESSAGE = "No valid session";

/**
 * Builds the error of a request without a usable session.
 *
 * @returns A 401 `UNAUTHENTICATED` error.
 */
function unauthenticated(): ApiError {
  return new ApiError({
    status: HTTP_STATUS.UNAUTHORIZED,
    frontCode: FrontErrorCode.UNAUTHENTICATED,
    message: UNAUTHENTICATED_MESSAGE,
  });
}

/**
 * Tells whether the session cookie carries the `__Secure-` prefix (HTTPS deployments).
 *
 * @returns `true` when `AUTH_URL` is an HTTPS URL.
 */
export function usesSecureCookie(): boolean {
  return new URL(getEnv().AUTH_URL).protocol === HTTPS_PROTOCOL;
}

/**
 * Decrypts the session cookie of the current request (server only: it holds the tokens).
 *
 * @returns The cookie content, or `null` without a session.
 */
export async function readSessionToken(): Promise<JWT | null> {
  return getToken({
    req: { headers: await headers() },
    secret: getEnv().AUTH_SECRET,
    secureCookie: usesSecureCookie(),
  });
}

/**
 * Returns a valid Keycloak access token for the current request.
 *
 * @returns The access token, renewed if it was about to expire.
 * @throws {ApiError} `UNAUTHENTICATED` (401) when there is no session or it cannot be renewed.
 */
export async function getAccessTokenOrThrow(): Promise<string> {
  const token = await readSessionToken();
  if (!token?.accessToken || token.error) {
    throw unauthenticated();
  }
  if (!needsRefresh(token)) {
    return token.accessToken;
  }
  const renewed = await refreshAccessToken(token);
  if (renewed.error || !renewed.accessToken) {
    throw unauthenticated();
  }
  return renewed.accessToken;
}

/**
 * Ensures a page is viewed by a signed-in user, otherwise redirects to the sign-in page.
 *
 * @param callbackPath - Path to come back to after sign-in.
 * @returns A promise resolved when the session is valid.
 */
export async function requireSession(callbackPath: string): Promise<void> {
  const session = await auth();
  if (!session || session.error) {
    redirect(loginPath(callbackPath));
  }
}
