"use server";

/**
 * Server Actions of the account: sign-in through Keycloak, complete sign-out and registration.
 *
 * Cookies can only be written in Server Actions and Route Handlers, so `signIn` / `signOut` are
 * never called while a Server Component renders.
 *
 * @see specs/001-catalog-auth-cart/research.md R2, R4, R9
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { registerUser } from "@/lib/api/endpoints/users";
import { safeCallbackPath } from "@/lib/auth/callback-url";
import { signIn, signOut } from "@/lib/auth/config";
import { readSessionToken } from "@/lib/auth/guards";
import { FORWARDED_FOR_HEADER, FORWARDED_FOR_SEPARATOR, REAL_IP_HEADER } from "@/lib/constants/api";
import {
  CALLBACK_URL_PARAM,
  KEYCLOAK_LOGOUT_PATH,
  KEYCLOAK_PROVIDER_ID,
  LOGOUT_PARAMS,
} from "@/lib/constants/auth";
import { HOME_PATH } from "@/lib/constants/routes";
import { getEnv } from "@/lib/env";
import { RegisterStatus } from "@/lib/enums/register-status";
import { maskUuid } from "@/lib/log-safety";
import { createModuleLogger } from "@/lib/logger";
import {
  RegisterInputSchema,
  readRegisterForm,
  toRegisterFieldErrors,
  toUserCreateRequest,
} from "@/lib/schemas/register";

import { REGISTER_MESSAGES } from "./messages";
import { toRegisterFailure } from "./register-errors";
import { withoutPassword, type RegisterActionState } from "./register-state";

const log = createModuleLogger("auth.session");

/**
 * Starts the Keycloak sign-in (code flow with PKCE) and comes back to the requested page.
 *
 * @param formData - Form of the sign-in page, carrying `callbackUrl`.
 * @returns Never: redirects to Keycloak.
 * @throws The Next.js redirect to Keycloak (expected control flow).
 * @see specs/001-catalog-auth-cart/spec.md FR-015
 */
export async function signInWithKeycloak(formData: FormData): Promise<void> {
  const raw = formData.get(CALLBACK_URL_PARAM);
  const redirectTo = safeCallbackPath(typeof raw === "string" ? raw : null, getEnv().AUTH_URL);
  await signIn(KEYCLOAK_PROVIDER_ID, { redirectTo });
}

/**
 * Builds the Keycloak `end_session_endpoint` URL.
 *
 * @param idToken - ID token of the session, when known.
 * @returns The logout URL, coming back to the home page of the front.
 */
function keycloakLogoutUrl(idToken: string | undefined): string {
  const env = getEnv();
  const url = new URL(`${env.AUTH_KEYCLOAK_ISSUER}${KEYCLOAK_LOGOUT_PATH}`);
  url.searchParams.set(LOGOUT_PARAMS.clientId, env.AUTH_KEYCLOAK_ID);
  url.searchParams.set(LOGOUT_PARAMS.postLogoutRedirectUri, new URL(HOME_PATH, env.AUTH_URL).href);
  if (idToken) {
    url.searchParams.set(LOGOUT_PARAMS.idTokenHint, idToken);
  }
  return url.href;
}

/**
 * Signs out of the application AND of Keycloak (FR-017): deletes the session cookie, then sends
 * the browser to the Keycloak logout, which closes the SSO session and comes back home.
 *
 * The client clears its query cache before calling this action (no private data left in memory).
 *
 * @returns Never: redirects to Keycloak.
 * @throws The Next.js redirect to Keycloak (expected control flow).
 * @see specs/001-catalog-auth-cart/research.md R4
 */
export async function signOutEverywhere(): Promise<void> {
  const token = await readSessionToken();
  await signOut({ redirect: false });
  log.info({ subject: maskUuid(token?.sub) }, "User signed out");
  redirect(keycloakLogoutUrl(token?.idToken));
}

/**
 * Reads the browser IP from the incoming request, for the backend rate limiter.
 *
 * @returns The first `X-Forwarded-For` entry, else `X-Real-IP`, else `undefined`.
 */
async function readClientIp(): Promise<string | undefined> {
  const incoming = await headers();
  const forwarded = incoming.get(FORWARDED_FOR_HEADER)?.split(FORWARDED_FOR_SEPARATOR)[0]?.trim();
  if (forwarded) {
    return forwarded;
  }
  return incoming.get(REAL_IP_HEADER) ?? undefined;
}

/**
 * Creates an account (US2). Validates with the same schema as the form, then calls the backend;
 * backend errors are projected onto the fields (FR-011 to FR-013). Never signs the user in
 * (FR-014). Works without JavaScript through `useActionState` (progressive enhancement).
 *
 * @param _previous - Previous state (unused: each submission starts afresh).
 * @param formData - Submitted form.
 * @returns The new form state; the password is never sent back.
 * @see specs/001-catalog-auth-cart/research.md R9
 */
export async function registerUserAction(
  _previous: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const raw = readRegisterForm(formData);
  const values = withoutPassword(raw);
  const parsed = RegisterInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: RegisterStatus.ERROR,
      values,
      fieldErrors: toRegisterFieldErrors(parsed.error),
      formError: REGISTER_MESSAGES.errors.form,
    };
  }
  try {
    const user = await registerUser(toUserCreateRequest(parsed.data), await readClientIp());
    return { status: RegisterStatus.SUCCESS, values: {}, fieldErrors: {}, email: user.email };
  } catch (error) {
    return toRegisterFailure(error, values);
  }
}
