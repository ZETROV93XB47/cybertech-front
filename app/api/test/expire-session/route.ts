/**
 * `POST /api/test/expire-session?mode=access|all` — test-only route of the Playwright journeys.
 *
 * Exists only when `E2E=true` (404 otherwise, so it can never be used on a normal run):
 * - `access`: the access token is marked expired; the next request must renew it silently;
 * - `all`: the refresh token is replaced by an invalid value; the renewal fails and the session
 *   carries `RefreshTokenError`.
 *
 * @see specs/001-catalog-auth-cart/contracts/bff-routes.md
 * @see specs/001-catalog-auth-cart/tasks.md T099
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api/bff-response";
import { ApiError } from "@/lib/api/errors";
import { parseQueryValue } from "@/lib/api/query-validation";
import { readSessionToken } from "@/lib/auth/guards";
import { sessionCookieName, writeSessionCookie } from "@/lib/auth/session-cookie";
import { INVALID_REFRESH_TOKEN } from "@/lib/constants/auth";
import { HTTP_STATUS } from "@/lib/constants/http";
import { getEnv } from "@/lib/env";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { ExpireSessionMode } from "@/lib/enums/expire-session-mode";
import { createModuleLogger } from "@/lib/logger";

/** Name of the query parameter choosing the mode. */
const MODE_PARAM = "mode";

/** Expiry date written for an expired access token (the epoch). */
const EXPIRED_AT_MS = 0;

const log = createModuleLogger("auth.test-expire");

/**
 * Damages the session of the caller as requested.
 *
 * @param request - Request carrying `mode` and the session cookies.
 * @returns `204`; `404` outside E2E; `401` without a session; `400` for an unknown mode.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!getEnv().E2E) {
    return new NextResponse(null, { status: HTTP_STATUS.NOT_FOUND });
  }
  const mode = parseQueryValue(
    request.nextUrl.searchParams.get(MODE_PARAM),
    z.enum(ExpireSessionMode),
    MODE_PARAM,
  );
  if (!mode.ok) {
    return mode.response;
  }
  const token = await readSessionToken();
  if (!token) {
    return jsonError(
      new ApiError({
        status: HTTP_STATUS.UNAUTHORIZED,
        frontCode: FrontErrorCode.UNAUTHENTICATED,
        message: "No session to expire",
      }),
    );
  }
  const damaged = {
    ...token,
    expiresAt: EXPIRED_AT_MS,
    ...(mode.data === ExpireSessionMode.ALL ? { refreshToken: INVALID_REFRESH_TOKEN } : {}),
  };
  const response = new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT });
  const existing = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith(sessionCookieName()));
  await writeSessionCookie(response, damaged, existing);
  log.warn({ mode: mode.data }, "Session expired on purpose (E2E)");
  return response;
}
