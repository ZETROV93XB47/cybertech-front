// @vitest-environment node
import type { JWT } from "@auth/core/jwt";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { needsRefresh, refreshAccessToken } from "@/lib/auth/refresh";
import { readRealmRoles } from "@/lib/auth/token-claims";
import { SessionError } from "@/lib/enums/session-error";

import { fakeJwt } from "../../helpers/fake-jwt";
import { TEST_ENV } from "../../helpers/test-env";
import { allLoggedText } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const TOKEN_URL = `${TEST_ENV.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
const NEW_ACCESS = fakeJwt({ sub: "user-1", realm_access: { roles: ["USER"] } });

const expiringToken = (refreshToken = "refresh-1"): JWT => ({
  sub: "0193a2b4-aaaa-7bbb-8ccc-dddddddddddd",
  accessToken: "old-access",
  refreshToken,
  idToken: "id-1",
  expiresAt: Date.now() + 10_000,
});

describe("needsRefresh", () => {
  it("is true within the 30 s margin and when expiry is unknown", () => {
    const now = 1_000_000;
    expect(needsRefresh({ expiresAt: now + 29_000 }, now)).toBe(true);
    expect(needsRefresh({}, now)).toBe(true);
  });

  it("is false when the token is still valid beyond the margin", () => {
    const now = 1_000_000;
    expect(needsRefresh({ expiresAt: now + 31_000 }, now)).toBe(false);
  });
});

describe("refreshAccessToken", () => {
  it("renews tokens with the refresh_token grant", async () => {
    let form: URLSearchParams | undefined;
    server.use(
      http.post(TOKEN_URL, async ({ request }) => {
        form = new URLSearchParams(await request.text());
        return HttpResponse.json({
          access_token: NEW_ACCESS,
          expires_in: 300,
          refresh_token: "refresh-2",
        });
      }),
    );

    const renewed = await refreshAccessToken(expiringToken());

    expect(form?.get("grant_type")).toBe("refresh_token");
    expect(form?.get("refresh_token")).toBe("refresh-1");
    expect(form?.get("client_id")).toBe(TEST_ENV.AUTH_KEYCLOAK_ID);
    expect(renewed.accessToken).toBe(NEW_ACCESS);
    expect(renewed.refreshToken).toBe("refresh-2");
    expect(renewed.idToken).toBe("id-1");
    expect(renewed.roles).toEqual(["USER"]);
    expect(renewed.error).toBeUndefined();
    expect(renewed.expiresAt).toBeGreaterThan(Date.now() + 290_000);
  });

  it("merges concurrent renewals of the same session into one call", async () => {
    let calls = 0;
    server.use(
      http.post(TOKEN_URL, () => {
        calls += 1;
        return HttpResponse.json({ access_token: NEW_ACCESS, expires_in: 300 });
      }),
    );
    const token = expiringToken("refresh-shared");
    const results = await Promise.all([refreshAccessToken(token), refreshAccessToken(token)]);
    expect(calls).toBe(1);
    expect(results[0].accessToken).toBe(NEW_ACCESS);
    expect(results[1].accessToken).toBe(NEW_ACCESS);
  });

  it("flags the session when Keycloak rejects the refresh token", async () => {
    server.use(
      http.post(TOKEN_URL, () => HttpResponse.json({ error: "invalid_grant" }, { status: 400 })),
    );
    const renewed = await refreshAccessToken(expiringToken("refresh-revoked"));
    expect(renewed.error).toBe(SessionError.REFRESH_TOKEN_ERROR);
  });

  it("flags the session when Keycloak is unreachable", async () => {
    server.use(http.post(TOKEN_URL, () => HttpResponse.error()));
    const renewed = await refreshAccessToken(expiringToken("refresh-down"));
    expect(renewed.error).toBe(SessionError.REFRESH_TOKEN_ERROR);
  });

  it("flags the session without calling Keycloak when there is no refresh token", async () => {
    const renewed = await refreshAccessToken({ accessToken: "a", expiresAt: 0 });
    expect(renewed.error).toBe(SessionError.REFRESH_TOKEN_ERROR);
  });

  it("never logs tokens", async () => {
    server.use(
      http.post(TOKEN_URL, () => HttpResponse.json({ access_token: NEW_ACCESS, expires_in: 300 })),
    );
    await refreshAccessToken(expiringToken("refresh-secret"));
    expect(allLoggedText()).not.toMatch(/refresh-secret|old-access|id-1/);
  });
});

describe("readRealmRoles", () => {
  it("reads realm roles and tolerates malformed tokens", () => {
    expect(readRealmRoles(fakeJwt({ realm_access: { roles: ["USER", "ADMIN"] } }))).toEqual([
      "USER",
      "ADMIN",
    ]);
    expect(readRealmRoles("not-a-jwt")).toEqual([]);
    expect(readRealmRoles(fakeJwt({}))).toEqual([]);
  });
});
