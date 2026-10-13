// @vitest-environment node
import { describe, expect, it } from "vitest";

import { LogLevel } from "@/lib/enums/log-level";
import { parseEnv } from "@/lib/env";

const VALID_ENV = {
  API_BASE_URL: "http://localhost:8081",
  AUTH_SECRET: "x".repeat(32),
  AUTH_URL: "http://localhost:3000",
  AUTH_KEYCLOAK_ID: "cybertech-front-client",
  AUTH_KEYCLOAK_SECRET: "secret",
  AUTH_KEYCLOAK_ISSUER: "http://localhost:8080/realms/cybertech",
  IMAGES_REMOTE_HOST: "localhost:4566",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

describe("parseEnv", () => {
  it("applies defaults for optional variables", () => {
    const env = parseEnv(VALID_ENV);
    expect(env.API_VERSION).toBe("1.0");
    expect(env.LOG_LEVEL).toBe(LogLevel.INFO);
    expect(env.E2E).toBe(false);
  });

  it("parses E2E as a boolean", () => {
    expect(parseEnv({ ...VALID_ENV, E2E: "true" }).E2E).toBe(true);
  });

  it("lists every missing or invalid variable", () => {
    expect(() => parseEnv({ ...VALID_ENV, API_BASE_URL: "not-a-url", AUTH_SECRET: undefined })).toThrow(
      /API_BASE_URL[\s\S]*AUTH_SECRET|AUTH_SECRET[\s\S]*API_BASE_URL/,
    );
  });

  it("rejects an unknown log level", () => {
    expect(() => parseEnv({ ...VALID_ENV, LOG_LEVEL: "verbose" })).toThrow(/LOG_LEVEL/);
  });
});
