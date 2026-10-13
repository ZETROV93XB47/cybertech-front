/**
 * Authentication constants (Auth.js v5 + Keycloak).
 *
 * @see specs/001-catalog-auth-cart/research.md R2–R4
 */

/**
 * Safety margin before access-token expiry at which the BFF refreshes it.
 *
 * Keycloak issues access tokens valid for 300 s (`accessTokenLifespan` of the `cybertech` realm);
 * refreshing 30 s early avoids sending a token that expires while the request is in flight.
 */
export const ACCESS_TOKEN_REFRESH_MARGIN_MS = 30_000;

/** Re-exported for OIDC `expires_in` / `exp` conversions. */
export { MS_PER_SECOND } from "./time";

/** Auth.js provider id for Keycloak; used by `signIn(KEYCLOAK_PROVIDER_ID)`. */
export const KEYCLOAK_PROVIDER_ID = "keycloak";

/** Query parameter carrying the page to come back to after sign-in. */
export const CALLBACK_URL_PARAM = "callbackUrl";

/** Front page that triggers the Keycloak sign-in. */
export const LOGIN_PATH = "/login";

/** Path of the OIDC token endpoint, relative to the Keycloak issuer URL. */
export const KEYCLOAK_TOKEN_PATH = "/protocol/openid-connect/token";

/** Path of the OIDC RP-initiated logout endpoint, relative to the Keycloak issuer URL. */
export const KEYCLOAK_LOGOUT_PATH = "/protocol/openid-connect/logout";

/** OAuth 2.0 grant type used to renew an access token. */
export const REFRESH_TOKEN_GRANT_TYPE = "refresh_token";

/** Name of the Keycloak claim holding realm roles (`realm_access.roles`). */
export const KEYCLOAK_REALM_ACCESS_CLAIM = "realm_access";

/**
 * Query parameters of the Keycloak RP-initiated logout (`end_session_endpoint`).
 *
 * @see specs/001-catalog-auth-cart/research.md R4
 */
export const LOGOUT_PARAMS = {
  /** ID token of the session to close; lets Keycloak skip its confirmation page. */
  idTokenHint: "id_token_hint",
  /** Where Keycloak sends the browser back; must match the client's allowed patterns. */
  postLogoutRedirectUri: "post_logout_redirect_uri",
  /** Client asking for the logout (required when no ID token is available). */
  clientId: "client_id",
} as const;

/** Query parameter Auth.js adds to the sign-in page when a sign-in attempt failed. */
export const AUTH_ERROR_PARAM = "error";

/**
 * Name of the Auth.js session cookie (default of `@auth/core`), without the `__Secure-` prefix
 * used over HTTPS. Only the test-only expire-session route writes it directly.
 */
export const SESSION_COOKIE_NAME = "authjs.session-token";

/** Prefix Auth.js adds to its cookies when the site runs over HTTPS. */
export const SECURE_COOKIE_PREFIX = "__Secure-";

/**
 * Lifetime of the session cookie: the Auth.js default (30 days). The real limit is the Keycloak
 * SSO session (30 min idle, 10 h max), enforced through the refresh token.
 */
export const SESSION_MAX_AGE_SECONDS = 2_592_000;

/**
 * Largest value of one session cookie chunk, as computed by `@auth/core`
 * (4 096 bytes allowed per cookie minus 160 bytes estimated for its name and attributes).
 */
export const SESSION_COOKIE_CHUNK_SIZE = 3_936;

/** Refresh token written by the test-only route to make the next renewal fail. */
export const INVALID_REFRESH_TOKEN = "e2e-invalid-refresh-token";
