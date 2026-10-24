// @vitest-environment node
/**
 * Push endpoint masking (feature 005, T007): only the push service host is ever logged.
 *
 * @see specs/005-web-push-notifications/research.md R12
 */
import { describe, expect, it } from "vitest";

import { maskPushEndpoint } from "@/lib/log-safety";

describe("maskPushEndpoint", () => {
  it.each([
    ["https://fcm.googleapis.com/fcm/send/dQw4w9WgXcQ:APA91bHsecret", "fcm.googleapis.com/…"],
    [
      "https://updates.push.services.mozilla.com/wpush/v2/gAAAAABsecret",
      "updates.push.services.mozilla.com/…",
    ],
    [
      "https://wns2-par02p.notify.windows.com/w/?token=BQYAAABsecret",
      "wns2-par02p.notify.windows.com/…",
    ],
    ["https://web.push.apple.com/QGuQyavXutnMH2secret", "web.push.apple.com/…"],
  ])("keeps only the host of %s", (endpoint, masked) => {
    expect(maskPushEndpoint(endpoint)).toBe(masked);
    expect(maskPushEndpoint(endpoint)).not.toContain("secret");
  });

  it.each([null, undefined, "", "not a url"])("hides everything for %j", (endpoint) => {
    expect(maskPushEndpoint(endpoint)).toBe("…");
  });
});
