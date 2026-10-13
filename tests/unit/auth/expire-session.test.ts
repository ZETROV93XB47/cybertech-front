// @vitest-environment node
import { decode } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { chunkSessionCookie } from "@/lib/auth/session-cookie";

import { TEST_ENV } from "../../helpers/test-env";

const guards = vi.hoisted(() => ({
  readSessionToken: vi.fn(),
  usesSecureCookie: vi.fn(() => false),
}));
vi.mock("@/lib/auth/guards", () => guards);

const e2e = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    getEnv: () => actual.parseEnv({ ...process.env, E2E: String(e2e.enabled) }),
  };
});

const COOKIE = "authjs.session-token";
const TOKEN = {
  sub: "kc-1",
  accessToken: "a".repeat(2_000),
  refreshToken: "r".repeat(1_000),
  idToken: "i".repeat(2_000),
  expiresAt: Date.now() + 300_000,
};

async function callRoute(mode: string, cookies = `${COOKIE}.0=x; ${COOKIE}.1=y; ${COOKIE}.2=z`) {
  const { POST } = await import("@/app/api/test/expire-session/route");
  return POST(
    new NextRequest(`http://localhost:3000/api/test/expire-session?mode=${mode}`, {
      method: "POST",
      headers: { cookie: cookies },
    }),
  );
}

async function readWrittenToken(response: Response): Promise<Record<string, unknown> | null> {
  const parts = response.headers
    .getSetCookie()
    .map((line) => line.split(";")[0] ?? "")
    .filter((pair) => pair.split("=")[1] !== "")
    .sort()
    .map((pair) => pair.slice(pair.indexOf("=") + 1));
  return decode({ token: parts.join(""), secret: TEST_ENV.AUTH_SECRET, salt: COOKIE });
}

beforeEach(() => {
  guards.readSessionToken.mockResolvedValue(TOKEN);
});

afterEach(() => {
  e2e.enabled = false;
});

describe("chunkSessionCookie", () => {
  it("keeps a small value in one cookie and splits a large one like Auth.js", () => {
    expect(chunkSessionCookie(COOKIE, "abc")).toEqual([{ name: COOKIE, value: "abc" }]);
    const chunks = chunkSessionCookie(COOKIE, "x".repeat(8_000));
    expect(chunks.map((chunk) => chunk.name)).toEqual([
      `${COOKIE}.0`,
      `${COOKIE}.1`,
      `${COOKIE}.2`,
    ]);
    expect(chunks.every((chunk) => chunk.value.length <= 3_936)).toBe(true);
  });
});

describe("POST /api/test/expire-session", () => {
  it("does not exist outside E2E", async () => {
    expect((await callRoute("access")).status).toBe(404);
  });

  describe("with E2E=true", () => {
    beforeEach(() => {
      e2e.enabled = true;
    });

    it("expires the access token only", async () => {
      const response = await callRoute("access");
      expect(response.status).toBe(204);
      expect(await readWrittenToken(response)).toMatchObject({
        expiresAt: 0,
        refreshToken: TOKEN.refreshToken,
      });
    });

    it("also invalidates the refresh token", async () => {
      const token = await readWrittenToken(await callRoute("all"));
      expect(token).toMatchObject({ expiresAt: 0, refreshToken: "e2e-invalid-refresh-token" });
    });

    it("rejects an unknown mode and a missing session", async () => {
      expect((await callRoute("forever")).status).toBe(400);
      guards.readSessionToken.mockResolvedValue(null);
      expect((await callRoute("access")).status).toBe(401);
    });
  });
});
