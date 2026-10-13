/**
 * Type augmentation of Auth.js: what the encrypted session cookie (JWT) and the client-visible
 * session contain.
 *
 * The split is the heart of constitution IV: tokens live in {@link JWT} (encrypted, httpOnly,
 * server-only); the {@link Session} sent to the browser only carries display data.
 */
import type { DefaultSession } from "next-auth";

import type { SessionError } from "@/lib/enums/session-error";

declare module "next-auth" {
  /** Session exposed to Server Components and to `useSession()` in the browser. */
  interface Session {
    /** Display data only: name and email from the ID token. */
    user: DefaultSession["user"];
    /** Keycloak realm roles (e.g. `USER`), for display decisions only. */
    roles: readonly string[];
    /** Set when the session can no longer be renewed; the UI must send the user to sign in. */
    error?: SessionError;
  }
}

declare module "@auth/core/jwt" {
  /** Content of the encrypted session cookie. Never sent to the browser in clear. */
  interface JWT {
    /** Keycloak access token (5 min), sent as `Authorization: Bearer` by the BFF. */
    accessToken?: string | undefined;
    /** Keycloak refresh token, used to renew the access token. */
    refreshToken?: string | undefined;
    /** Keycloak ID token, needed for the RP-initiated logout (`id_token_hint`). */
    idToken?: string | undefined;
    /** Access-token expiry, epoch milliseconds. */
    expiresAt?: number | undefined;
    /** Keycloak realm roles extracted from the access token. */
    roles?: readonly string[] | undefined;
    /** Renewal failure marker. */
    error?: SessionError | undefined;
  }
}
