// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildCsp, generateNonce } from "@/lib/security/csp";

const BASE = {
  nonce: "abc123",
  imagesHost: "localhost:4566",
  identityProviderOrigin: "http://localhost:8080",
};

const directive = (csp: string, name: string): string =>
  csp.split("; ").find((part) => part.startsWith(`${name} `)) ?? "";

describe("buildCsp", () => {
  it("locks scripts to the nonce in production", () => {
    const csp = buildCsp({ ...BASE, isDevelopment: false });
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'");
  });

  it("allows eval and hot-reload websockets in development only", () => {
    const csp = buildCsp({ ...BASE, isDevelopment: true });
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toContain("ws:");
  });

  it("allows inline styles, product images and the Keycloak form redirect", () => {
    const csp = buildCsp({ ...BASE, isDevelopment: false });
    expect(directive(csp, "style-src")).toBe("style-src 'self' 'unsafe-inline'");
    expect(directive(csp, "img-src")).toContain("localhost:4566");
    expect(directive(csp, "form-action")).toBe("form-action 'self' http://localhost:8080");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
  });
});

describe("generateNonce", () => {
  it("returns a different base64 value each time", () => {
    const first = generateNonce();
    expect(first).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(generateNonce()).not.toBe(first);
  });
});
