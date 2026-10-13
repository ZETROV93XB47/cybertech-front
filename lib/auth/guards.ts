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

import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import { CALLBACK_URL_PARAM, LOGIN_PATH } from "@/lib/constants/auth";
import { HTTP_STATUS } from "@/lib/constants/http";
import { getEnv } from "@/lib/env";
import { FrontErrorCode } from "@/lib/enums/error-code";

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
 * Returns a valid Keycloak access token for the current request.
 *
 * @returns The access token, renewed if it was about to expire.
 * @throws {ApiError} `UNAUTHENTICATED` (401) when there is no session or it cannot be renewed.
 */
export async function getAccessTokenOrThrow(): Promise<string> {
  const env = getEnv();
  const token = await getToken({
    req: { headers: await headers() },
    secret: env.AUTH_SECRET,
    secureCookie: new URL(env.AUTH_URL).protocol === HTTPS_PROTOCOL,
  });
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
    const params = new URLSearchParams({ [CALLBACK_URL_PARAM]: callbackPath });
    redirect(`${LOGIN_PATH}?${params.toString()}`);
  }
}
