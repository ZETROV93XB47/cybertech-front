/**
 * Errors attached to an Auth.js session.
 *
 * @see specs/001-catalog-auth-cart/research.md R3
 */

/** Session error exposed in `session.error`. */
export enum SessionError {
  /**
   * The refresh token was rejected by Keycloak: the session can no longer be renewed and the
   * user must sign in again. The value matches the name used in the Auth.js documentation.
   */
  REFRESH_TOKEN_ERROR = "RefreshTokenError",
}
