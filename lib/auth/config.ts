/**
 * Auth.js v5 configuration: Keycloak (OIDC, Authorization Code + PKCE, confidential client
 * `cybertech-front-client`), session stored as an encrypted JWT in an httpOnly cookie.
 *
 * Auth.js reads `AUTH_SECRET`, `AUTH_URL`, `AUTH_KEYCLOAK_ID`, `AUTH_KEYCLOAK_SECRET` and
 * `AUTH_KEYCLOAK_ISSUER` itself; they are validated beforehand by `lib/env.ts`.
 *
 * @see specs/001-catalog-auth-cart/research.md R2
 */
import "server-only";

import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

import { LOGIN_PATH } from "@/lib/constants/auth";

import { jwtCallback, sessionCallback } from "./callbacks";
import "./types";

/**
 * Auth.js entry points: route `handlers`, `auth()` to read the session server-side, and the
 * `signIn` / `signOut` actions.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Keycloak({ checks: ["pkce", "state"] })],
  session: { strategy: "jwt" },
  pages: { signIn: LOGIN_PATH },
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
});
