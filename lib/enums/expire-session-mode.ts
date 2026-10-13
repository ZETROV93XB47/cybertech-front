/**
 * How the test-only route `POST /api/test/expire-session` damages the session (E2E only).
 *
 * @see specs/001-catalog-auth-cart/tasks.md T099
 */

/** Session expiry simulated for the Playwright journeys. */
export enum ExpireSessionMode {
  /** The access token is expired: the next request must renew it silently. */
  ACCESS = "access",
  /** The refresh token is invalid too: the renewal fails (`RefreshTokenError`). */
  ALL = "all",
}
