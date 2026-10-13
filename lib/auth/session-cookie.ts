/**
 * Rewrites the Auth.js session cookie, for the test-only expire-session route.
 *
 * The cookie is an encrypted JWT, split into chunks (`name.0`, `name.1`…) when it exceeds the
 * browser limit, exactly as `@auth/core` does; stale chunks of the previous value are deleted.
 *
 * @see specs/001-catalog-auth-cart/tasks.md T099
 */
import "server-only";

import { encode, type JWT } from "next-auth/jwt";
import type { NextResponse } from "next/server";

import {
  SECURE_COOKIE_PREFIX,
  SESSION_COOKIE_CHUNK_SIZE,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/constants/auth";
import { getEnv } from "@/lib/env";

import { usesSecureCookie } from "./guards";

/** Separator between the cookie name and the chunk index. */
const CHUNK_SEPARATOR = ".";

/** Root path: the session cookie is sent with every request. */
const COOKIE_PATH = "/";

/**
 * Name of the session cookie for the current deployment.
 *
 * @returns `authjs.session-token`, prefixed with `__Secure-` over HTTPS.
 */
export function sessionCookieName(): string {
  return `${usesSecureCookie() ? SECURE_COOKIE_PREFIX : ""}${SESSION_COOKIE_NAME}`;
}

/**
 * Splits a cookie value into the chunks Auth.js expects.
 *
 * @param name - Cookie name.
 * @param value - Encrypted value.
 * @returns The cookies to write: a single one when the value fits, else `name.0`, `name.1`…
 */
export function chunkSessionCookie(
  name: string,
  value: string,
): { readonly name: string; readonly value: string }[] {
  if (value.length <= SESSION_COOKIE_CHUNK_SIZE) {
    return [{ name, value }];
  }
  const chunks: { name: string; value: string }[] = [];
  for (let start = 0; start < value.length; start += SESSION_COOKIE_CHUNK_SIZE) {
    chunks.push({
      name: `${name}${CHUNK_SEPARATOR}${chunks.length}`,
      value: value.slice(start, start + SESSION_COOKIE_CHUNK_SIZE),
    });
  }
  return chunks;
}

/**
 * Encrypts a session token and writes it on a response, replacing every previous chunk.
 *
 * @param response - Response to decorate.
 * @param token - New session content.
 * @param existingNames - Names of the session cookies sent with the request.
 * @returns A promise resolved once the cookies are set.
 */
export async function writeSessionCookie(
  response: NextResponse,
  token: JWT,
  existingNames: readonly string[],
): Promise<void> {
  const name = sessionCookieName();
  const value = await encode({
    token,
    secret: getEnv().AUTH_SECRET,
    salt: name,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  const chunks = chunkSessionCookie(name, value);
  const written = new Set(chunks.map((chunk) => chunk.name));
  for (const stale of existingNames.filter((cookie) => !written.has(cookie))) {
    response.cookies.delete(stale);
  }
  for (const chunk of chunks) {
    response.cookies.set(chunk.name, chunk.value, {
      httpOnly: true,
      sameSite: "lax",
      path: COOKIE_PATH,
      secure: usesSecureCookie(),
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }
}
