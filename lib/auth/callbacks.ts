/**
 * Auth.js `jwt` and `session` callbacks, kept as plain functions so they can be unit tested.
 *
 * - `jwt` runs server-side on sign-in and on every session read: it stores the Keycloak tokens
 *   in the encrypted cookie and renews the access token before it expires.
 * - `session` builds what the browser may see: never a token (constitution IV).
 *
 * @see specs/001-catalog-auth-cart/research.md R2–R3
 */
import "server-only";

import type { JWT } from "@auth/core/jwt";
import type { Account, Session } from "next-auth";

import { MS_PER_SECOND } from "@/lib/constants/auth";

import { needsRefresh, refreshAccessToken } from "./refresh";
import { readRealmRoles } from "./token-claims";

/** Arguments of {@link jwtCallback} used by this project. */
export interface JwtCallbackParams {
  /** Current content of the session cookie. */
  readonly token: JWT;
  /** Present only right after sign-in: tokens returned by Keycloak. */
  readonly account?: Account | null;
}

/**
 * Stores the Keycloak tokens at sign-in, then renews the access token when needed.
 *
 * @param params - Current token and, at sign-in, the Keycloak account.
 * @returns The token to store in the encrypted cookie.
 */
export async function jwtCallback({ token, account }: JwtCallbackParams): Promise<JWT> {
  if (account?.access_token) {
    return {
      ...token,
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      idToken: account.id_token,
      expiresAt: (account.expires_at ?? 0) * MS_PER_SECOND,
      roles: readRealmRoles(account.access_token),
    };
  }
  if (token.error || !needsRefresh(token)) {
    return token;
  }
  return refreshAccessToken(token);
}

/** Arguments of {@link sessionCallback}. */
export interface SessionCallbackParams {
  /** Default session built by Auth.js. */
  readonly session: Session;
  /** Content of the session cookie. */
  readonly token: JWT;
}

/**
 * Builds the session visible to the browser: display data, roles and error, nothing else.
 *
 * @param params - Default session and session cookie content.
 * @returns A session that contains no token.
 */
export function sessionCallback({ session, token }: SessionCallbackParams): Session {
  const visible: Session = {
    expires: session.expires,
    user: { name: session.user?.name ?? null, email: session.user?.email ?? null },
    roles: token.roles ?? [],
  };
  if (token.error) {
    visible.error = token.error;
  }
  return visible;
}
