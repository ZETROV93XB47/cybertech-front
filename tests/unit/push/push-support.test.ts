/**
 * Push support detection (feature 005, T013).
 *
 * @see specs/005-web-push-notifications/research.md R3
 */
import { describe, expect, it } from "vitest";

import { detectPushSupport, type PushEnvironment } from "@/features/notifications/push-support";
import { PushSupport } from "@/lib/enums/push";

/** Chrome on a Windows desktop. */
const CHROME: PushEnvironment = {
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isSecureContext: true,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0",
  maxTouchPoints: 0,
  isStandalone: false,
};

/** Safari on an iPhone, outside of a home-screen app: no push API. */
const IPHONE: PushEnvironment = {
  ...CHROME,
  hasPushManager: false,
  hasNotification: false,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1",
  maxTouchPoints: 5,
};

describe("detectPushSupport", () => {
  it("supports a desktop browser with every API in a secure context", () => {
    expect(detectPushSupport(CHROME)).toBe(PushSupport.SUPPORTED);
  });

  it.each([
    ["no PushManager", { ...CHROME, hasPushManager: false }],
    ["no service worker", { ...CHROME, hasServiceWorker: false }],
    ["an insecure context", { ...CHROME, isSecureContext: false }],
  ])("does not support %s", (_label, env) => {
    expect(detectPushSupport(env)).toBe(PushSupport.UNSUPPORTED);
  });

  it("asks to install the site on an iPhone", () => {
    expect(detectPushSupport(IPHONE)).toBe(PushSupport.INSTALL_REQUIRED);
  });

  it("asks to install the site on an iPad presenting itself as a Mac", () => {
    const ipad = { ...IPHONE, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari" };
    expect(detectPushSupport(ipad)).toBe(PushSupport.INSTALL_REQUIRED);
  });

  it("supports a home-screen app on iOS, and a real Mac without touch is just unsupported", () => {
    expect(
      detectPushSupport({ ...IPHONE, ...CHROME, userAgent: IPHONE.userAgent, isStandalone: true }),
    ).toBe(PushSupport.SUPPORTED);
    const oldMac = {
      ...CHROME,
      hasPushManager: false,
      userAgent: "Mozilla/5.0 (Macintosh) Safari",
    };
    expect(detectPushSupport(oldMac)).toBe(PushSupport.UNSUPPORTED);
  });
});
