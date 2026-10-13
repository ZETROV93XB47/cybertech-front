// @vitest-environment node
import type { Account } from "next-auth";
import { describe, expect, it } from "vitest";

import { jwtCallback, sessionCallback } from "@/lib/auth/callbacks";
import { SessionError } from "@/lib/enums/session-error";

import { fakeJwt } from "../../helpers/fake-jwt";

const ACCESS = fakeJwt({ realm_access: { roles: ["USER"] } });

describe("jwtCallback", () => {
  it("stores Keycloak tokens at sign-in", async () => {
    const account = {
      provider: "keycloak",
      type: "oidc",
      providerAccountId: "kc-1",
      access_token: ACCESS,
      refresh_token: "refresh-1",
      id_token: "id-1",
      expires_at: 2_000_000_000,
    } satisfies Account;

    const token = await jwtCallback({ token: { sub: "kc-1" }, account });

    expect(token).toMatchObject({
      accessToken: ACCESS,
      refreshToken: "refresh-1",
      idToken: "id-1",
      expiresAt: 2_000_000_000_000,
      roles: ["USER"],
    });
  });

  it("returns a still-valid token unchanged", async () => {
    const token = { accessToken: ACCESS, expiresAt: Date.now() + 120_000 };
    expect(await jwtCallback({ token })).toBe(token);
  });

  it("does not retry a session already flagged as unrenewable", async () => {
    const token = { accessToken: ACCESS, expiresAt: 0, error: SessionError.REFRESH_TOKEN_ERROR };
    expect(await jwtCallback({ token })).toBe(token);
  });
});

describe("sessionCallback", () => {
  it("never exposes a token to the browser", () => {
    const session = sessionCallback({
      session: {
        expires: "2026-10-13T12:00:00.000Z",
        user: { name: "Jane Doe", email: "jane@example.com" },
        roles: [],
      },
      token: {
        accessToken: "secret-access",
        refreshToken: "secret-refresh",
        idToken: "secret-id",
        roles: ["USER"],
      },
    });

    expect(JSON.stringify(session)).not.toMatch(/secret-/);
    expect(session).toEqual({
      expires: "2026-10-13T12:00:00.000Z",
      user: { name: "Jane Doe", email: "jane@example.com" },
      roles: ["USER"],
    });
  });

  it("exposes the renewal error so the UI can send the user to sign in", () => {
    const session = sessionCallback({
      session: { expires: "2026-10-13T12:00:00.000Z", user: {}, roles: [] },
      token: { error: SessionError.REFRESH_TOKEN_ERROR },
    });
    expect(session.error).toBe(SessionError.REFRESH_TOKEN_ERROR);
  });
});
