/**
 * Reading of the claims of a Keycloak access token.
 *
 * The token comes straight from the Keycloak token endpoint over the server-to-server channel,
 * so its payload is decoded without signature verification: it is only used to display roles,
 * never to grant access (the backend verifies every token itself).
 */
import { z } from "zod";

import { KEYCLOAK_REALM_ACCESS_CLAIM } from "@/lib/constants/auth";

/** Index of the payload part in a `header.payload.signature` JWT. */
const JWT_PAYLOAD_INDEX = 1;

/** Separator of the three parts of a JWT. */
const JWT_PART_SEPARATOR = ".";

/** Shape of the claims read from the access token. */
const AccessTokenClaimsSchema = z.object({
  [KEYCLOAK_REALM_ACCESS_CLAIM]: z.object({ roles: z.array(z.string()) }).optional(),
});

/**
 * Extracts the Keycloak realm roles of an access token.
 *
 * @param accessToken - Raw JWT returned by Keycloak.
 * @returns The roles, or an empty list when the token cannot be read.
 */
export function readRealmRoles(accessToken: string): readonly string[] {
  const payload = accessToken.split(JWT_PART_SEPARATOR)[JWT_PAYLOAD_INDEX];
  if (!payload) {
    return [];
  }
  try {
    const json: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const claims = AccessTokenClaimsSchema.safeParse(json);
    return claims.success ? (claims.data[KEYCLOAK_REALM_ACCESS_CLAIM]?.roles ?? []) : [];
  } catch {
    return [];
  }
}
