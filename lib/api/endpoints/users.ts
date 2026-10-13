/**
 * User endpoints of the backend: registration (public, rate limited per IP) and profile of the
 * signed-in user.
 *
 * @see docs/backend/api-map.md §4
 * @see UserManagementController (backend)
 */
import "server-only";

import { z } from "zod";

import { backendFetch } from "@/lib/api/client";
import { BACKEND_PATHS } from "@/lib/constants/api";
import { HttpMethod } from "@/lib/enums/http-method";
import { maskEmail } from "@/lib/log-safety";
import { createModuleLogger } from "@/lib/logger";
import type { UserCreateRequest } from "@/lib/schemas/register";
import { CurrentUserSchema, type CurrentUser } from "@/lib/schemas/user";

/** `201` body of `POST /user/register` (a `Map` on the backend side). */
const RegisteredUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  username: z.string(),
});

/** Account created by the backend. */
export type RegisteredUser = z.infer<typeof RegisteredUserSchema>;

const log = createModuleLogger("auth.register");

/**
 * Creates an account (backend saga: Keycloak user, then database profile).
 *
 * Never retried: a second attempt after a lost answer would hit `USER_ALREADY_EXISTS`. The
 * password is part of the body only; neither the body nor the full email is ever logged.
 *
 * @param request - `UserCreateRequestDto` body, without bank card.
 * @param forwardedFor - Browser IP, forwarded to the backend rate limiter (5 per minute).
 * @returns The created account.
 * @throws {ApiError} `INVALID` (with `fieldErrors`), `ALREADY_EXISTS`, `RATE_LIMITED` (with
 * `retryAfterSeconds`) or `UNAVAILABLE`.
 * @see specs/001-catalog-auth-cart/research.md R9
 * @see UserManagementController#register (backend)
 */
export async function registerUser(
  request: UserCreateRequest,
  forwardedFor?: string,
): Promise<RegisteredUser> {
  const user = await backendFetch(BACKEND_PATHS.userRegister, {
    schema: RegisteredUserSchema,
    method: HttpMethod.POST,
    body: request,
    ...(forwardedFor ? { forwardedFor } : {}),
  });
  log.info({ email: maskEmail(request.email) }, "Account created");
  return user;
}

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
