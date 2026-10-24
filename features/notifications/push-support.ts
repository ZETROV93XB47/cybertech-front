/**
 * What this browser can do with push notifications (feature 005, research R3), read once on the
 * client: a server render never knows it, so the notification components render nothing until
 * they are mounted.
 *
 * @see specs/005-web-push-notifications/research.md R3
 */
import { PushSupport } from "@/lib/enums/push";

/** What {@link detectPushSupport} reads from the browser; injected in the tests. */
export interface PushEnvironment {
  readonly hasServiceWorker: boolean;
  readonly hasPushManager: boolean;
  readonly hasNotification: boolean;
  /** `window.isSecureContext`: `https:` or `localhost`. */
  readonly isSecureContext: boolean;
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  /** Whether the site runs as a home-screen app (`display-mode: standalone`). */
  readonly isStandalone: boolean;
}

/** User agents of iPhone, iPad and iPod. */
const IOS_USER_AGENT = /iPad|iPhone|iPod/;

/** User agent of iPadOS in desktop mode (a Mac), told apart from a real Mac by its touch screen. */
const MAC_USER_AGENT = "Macintosh";

/** Media query of a home-screen app. */
const STANDALONE_QUERY = "(display-mode: standalone)";

/**
 * Whether the device is an iPhone or an iPad (iPadOS presents itself as a Mac with touch).
 *
 * @param env - Browser environment.
 * @returns `true` on iOS / iPadOS.
 */
function isAppleMobile(env: PushEnvironment): boolean {
  return (
    IOS_USER_AGENT.test(env.userAgent) ||
    (env.userAgent.includes(MAC_USER_AGENT) && env.maxTouchPoints > 1)
  );
}

/**
 * Detects the push support.
 *
 * @param env - Browser environment (defaults to the real one).
 * @returns `SUPPORTED`, `INSTALL_REQUIRED` (iPhone / iPad outside a home-screen app) or
 *   `UNSUPPORTED`.
 */
export function detectPushSupport(env: PushEnvironment = browserEnvironment()): PushSupport {
  const hasApis = env.hasServiceWorker && env.hasPushManager && env.hasNotification;
  if (hasApis && env.isSecureContext) {
    return PushSupport.SUPPORTED;
  }
  if (isAppleMobile(env) && !env.isStandalone) {
    return PushSupport.INSTALL_REQUIRED;
  }
  return PushSupport.UNSUPPORTED;
}

/**
 * Reads the real browser environment.
 *
 * @returns The environment; everything `false` outside of a browser.
 */
export function browserEnvironment(): PushEnvironment {
  if (typeof window === "undefined") {
    return {
      hasServiceWorker: false,
      hasPushManager: false,
      hasNotification: false,
      isSecureContext: false,
      userAgent: "",
      maxTouchPoints: 0,
      isStandalone: false,
    };
  }
  const legacyStandalone = (navigator as Navigator & { readonly standalone?: boolean }).standalone;
  return {
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    isSecureContext: window.isSecureContext,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    isStandalone: window.matchMedia(STANDALONE_QUERY).matches || legacyStandalone === true,
  };
}
