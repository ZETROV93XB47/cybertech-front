/**
 * URL of the Keycloak account console, where the password is changed (« Mon profil » links to
 * it: the site never handles the password, FR-029).
 *
 * Derived from `AUTH_KEYCLOAK_ISSUER` (the realm URL) so no new environment variable is needed
 * (constitution VI).
 *
 * @see specs/003-account-orders/research.md R17
 */
import "server-only";

import { KEYCLOAK_ACCOUNT_PATH } from "@/lib/constants/auth";
import { getEnv } from "@/lib/env";

/**
 * Builds the URL of the account console of the realm.
 *
 * @returns `{AUTH_KEYCLOAK_ISSUER}/account`.
 * @throws {Error} When the environment is invalid (checked at boot).
 */
export function accountConsoleUrl(): string {
  return `${getEnv().AUTH_KEYCLOAK_ISSUER}${KEYCLOAK_ACCOUNT_PATH}`;
}
