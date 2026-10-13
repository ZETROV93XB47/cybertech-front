/**
 * Server-side renewal of the Keycloak access token (research R3).
 *
 * Access tokens last 5 minutes; the refresh token lasts as long as the Keycloak SSO session
 * (30 min idle, 10 h max). Concurrent renewals of the same session within one server process are
 * merged into a single call. The realm uses `revokeRefreshToken=false`, so two processes renewing
 * at the same time both get valid tokens: no distributed lock is needed.
 */
import "server-only";

import type { JWT } from "@auth/core/jwt";
import { z } from "zod";

import {
  ACCESS_TOKEN_REFRESH_MARGIN_MS,
  KEYCLOAK_TOKEN_PATH,
  MS_PER_SECOND,
  REFRESH_TOKEN_GRANT_TYPE,
} from "@/lib/constants/auth";
import { BACKEND_TIMEOUT_MS } from "@/lib/constants/api";
import { getEnv } from "@/lib/env";
import { SessionError } from "@/lib/enums/session-error";
import { createModuleLogger, maskUuid } from "@/lib/logger";

import { readRealmRoles } from "./token-claims";

const log = createModuleLogger("auth.refresh");

/** Successful answer of the Keycloak token endpoint. */
const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
  refresh_token: z.string().min(1).optional(),
  id_token: z.string().min(1).optional(),
});

/** Renewals in flight, keyed by refresh token, so parallel requests share one call. */
const inFlightRefreshes = new Map<string, Promise<JWT>>();

/**
 * Tells whether the access token must be renewed now.
 *
 * @param token - Session JWT.
 * @param now - Current time in epoch milliseconds (injectable for tests).
 * @returns `true` when the token expires within {@link ACCESS_TOKEN_REFRESH_MARGIN_MS}.
 */
export function needsRefresh(token: JWT, now: number = Date.now()): boolean {
  return token.expiresAt === undefined || token.expiresAt - ACCESS_TOKEN_REFRESH_MARGIN_MS < now;
}

/**
 * Calls the Keycloak token endpoint with the refresh token.
 *
 * @param token - Session JWT holding a refresh token.
 * @returns The JWT with new tokens and expiry, or flagged with `REFRESH_TOKEN_ERROR`.
 */
async function requestNewTokens(token: JWT): Promise<JWT> {
  const env = getEnv();
  const response = await fetch(`${env.AUTH_KEYCLOAK_ISSUER}${KEYCLOAK_TOKEN_PATH}`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.AUTH_KEYCLOAK_ID,
      client_secret: env.AUTH_KEYCLOAK_SECRET,
      grant_type: REFRESH_TOKEN_GRANT_TYPE,
      refresh_token: token.refreshToken ?? "",
    }),
    signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    cache: "no-store",
  });
  const parsed = TokenResponseSchema.safeParse(await response.json().catch(() => undefined));
  if (!response.ok || !parsed.success) {
    log.warn({ status: response.status, subject: maskUuid(token.sub) }, "Token refresh rejected");
    return { ...token, error: SessionError.REFRESH_TOKEN_ERROR };
  }
  log.info({ subject: maskUuid(token.sub) }, "Access token refreshed");
  return {
    ...token,
    error: undefined,
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token ?? token.refreshToken,
    idToken: parsed.data.id_token ?? token.idToken,
    expiresAt: Date.now() + parsed.data.expires_in * MS_PER_SECOND,
    roles: readRealmRoles(parsed.data.access_token),
  };
}

/**
 * Renews the access token of a session, merging concurrent renewals.
 *
 * @param token - Session JWT whose access token is about to expire.
 * @returns The renewed JWT, or the JWT flagged with `SessionError.REFRESH_TOKEN_ERROR` when
 *   Keycloak refuses (expired SSO session, revoked token) or cannot be reached.
 */
export async function refreshAccessToken(token: JWT): Promise<JWT> {
  const refreshToken = token.refreshToken;
  if (!refreshToken) {
    return { ...token, error: SessionError.REFRESH_TOKEN_ERROR };
  }
  const pending = inFlightRefreshes.get(refreshToken);
  if (pending) {
    return pending;
  }
  const refresh = requestNewTokens(token)
    .catch((cause: unknown) => {
      log.error(
        { reason: cause instanceof Error ? cause.name : "unknown" },
        "Token refresh failed",
      );
      return { ...token, error: SessionError.REFRESH_TOKEN_ERROR };
    })
    .finally(() => inFlightRefreshes.delete(refreshToken));
  inFlightRefreshes.set(refreshToken, refresh);
  return refresh;
}
