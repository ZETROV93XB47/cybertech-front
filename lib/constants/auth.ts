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

/** Number of milliseconds in one second, to convert OIDC `expires_in` / `exp` values. */
export const MS_PER_SECOND = 1_000;

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
