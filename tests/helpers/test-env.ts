/**
 * Environment used by unit tests. The backend URL points to a fake host intercepted by MSW.
 */

/** Base URL of the mocked backend. */
export const TEST_BACKEND_URL = "http://backend.test";

/** Complete, valid environment for `lib/env.ts`. */
export const TEST_ENV = {
  API_BASE_URL: TEST_BACKEND_URL,
  API_VERSION: "1.0",
  AUTH_SECRET: "test-secret-test-secret-test-secret-42",
  AUTH_URL: "http://localhost:3000",
  AUTH_KEYCLOAK_ID: "cybertech-front-client",
  AUTH_KEYCLOAK_SECRET: "test-keycloak-secret",
  AUTH_KEYCLOAK_ISSUER: "http://keycloak.test/realms/cybertech",
  IMAGES_REMOTE_HOST: "localhost:4566",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  E2E: "false",
  LOG_LEVEL: "error",
} as const;
