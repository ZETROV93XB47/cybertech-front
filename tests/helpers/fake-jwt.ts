/**
 * Builds unsigned JWTs for tests (the front never verifies signatures; the backend does).
 *
 * @param payload - Claims to encode.
 * @returns A `header.payload.signature` string.
 */
export function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}
