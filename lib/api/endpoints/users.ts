/**
 * User endpoints of the backend. `registerUser` is added by US2 (task T104).
 *
 * @see docs/backend/api-map.md §4
 * @see UserManagementController (backend)
 */
import "server-only";

import { backendFetch } from "@/lib/api/client";
import { BACKEND_PATHS } from "@/lib/constants/api";
import { CurrentUserSchema, type CurrentUser } from "@/lib/schemas/user";

/**
 * Reads the profile of the signed-in user. Never cached: private data.
 *
 * @param accessToken - Keycloak access token; never logged.
 * @returns The user, reduced to `uuid`, `email`, `firstName`, `lastName`.
 * @throws {ApiError} `UNAUTHENTICATED`, `NOT_FOUND` (`USER_NOT_FOUND`) or `UNAVAILABLE`.
 */
export async function getMe(accessToken: string): Promise<CurrentUser> {
  return backendFetch(BACKEND_PATHS.userMe, { schema: CurrentUserSchema, accessToken });
}
