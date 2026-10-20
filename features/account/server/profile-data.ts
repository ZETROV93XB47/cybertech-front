import "server-only";

/**
 * Data of « Mon profil », read on the server with the user's token, never cached.
 *
 * @see specs/003-account-orders/contracts/bff-routes.md §3
 */
import { ApiError } from "@/lib/api/errors";
import { getProfile } from "@/lib/api/endpoints/users";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { createModuleLogger } from "@/lib/logger";

import { toProfileView, type ProfileView } from "../profile-view";

const log = createModuleLogger("account.profile");

/**
 * Reads the displayed profile.
 *
 * @param accessToken - Keycloak access token; never logged.
 * @returns The profile, or `null` when the account has no backend profile (`USER_NOT_FOUND`).
 * @throws {ApiError} `UNAUTHENTICATED` or `UNAVAILABLE`, rethrown to the page.
 */
export async function readProfileView(accessToken: string): Promise<ProfileView | null> {
  try {
    return toProfileView(await getProfile(accessToken));
  } catch (error) {
    if (error instanceof ApiError && error.frontCode === FrontErrorCode.NOT_FOUND) {
      log.warn("Profile not found");
      return null;
    }
    throw error;
  }
}
