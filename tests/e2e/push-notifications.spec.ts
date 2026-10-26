/**
 * Feature 005 — browser notifications (quickstart §2 and §4).
 *
 * Runs against the real local backend and Keycloak, on port 3000, in the `chromium` project only
 * (fresh users with a test card). A real push subscription needs the browser's push service
 * (Google's servers for Chromium), which automated Chromium cannot reach reliably: an init script
 * replaces `PushManager.prototype.subscribe` / `getSubscription` with a fake subscription (and the
 * notification permission, which headless Chromium always reports as denied), and the
 * `POST` of the subscription is intercepted (research R15). The real service worker, the real
 * public key of the backend and the real headers are used; the real delivery is checked by hand
 * (quickstart §3).
 */
import { expect, test, type Page } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { firstProductPaths, placePaidOrder, registerUser, signIn } from "./support/account";

/** UUID answered by the intercepted `POST` of the subscription. */
const SUBSCRIPTION_UUID = "0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";

/** Endpoint of the fake subscription. */
const FAKE_ENDPOINT = "https://fcm.googleapis.com/fcm/send/e2e-device";

/** Keys of the fake subscription (base64url). */
const FAKE_KEYS = {
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
  auth: "tBHItJI5svbpez7KI4CCXg",
};

/** Window properties set by the init script. */
interface PushProbe {
  __pushPermissionRequests: number;
}

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "chromium",
    "Notification journeys register users: run them once, in the chromium project",
  );
});

/**
 * Installs the fake subscription and the permission spy before any page script runs.
 *
 * @param page - Page to prepare.
 * @param initialPermission - Permission before any prompt (`denied`: blocked in the settings).
 */
async function fakePushService(
  page: Page,
  initialPermission: NotificationPermission = "default",
): Promise<void> {
  await page.addInitScript(
    ({ endpoint, keys, initial }) => {
      const probe = window as unknown as PushProbe & { __fakeSubscription: unknown };
      probe.__pushPermissionRequests = 0;
      // Headless Chromium answers « denied » whatever the context permissions: the permission is
      // faked too, « default » until the customer accepts the prompt.
      let permission: NotificationPermission = initial;
      Object.defineProperty(Notification, "permission", { get: () => permission });
      Notification.requestPermission = () => {
        probe.__pushPermissionRequests += 1;
        if (permission === "default") {
          permission = "granted";
        }
        return Promise.resolve(permission);
      };
      probe.__fakeSubscription = null;
      PushManager.prototype.getSubscription = () =>
        Promise.resolve(probe.__fakeSubscription as PushSubscription | null);
      PushManager.prototype.subscribe = (options?: PushSubscriptionOptionsInit) => {
        const key = new Uint8Array(options?.applicationServerKey as ArrayBuffer).slice().buffer;
        const subscription = {
          endpoint,
          expirationTime: null,
          options: { applicationServerKey: key, userVisibleOnly: true },
          toJSON: () => ({ endpoint, expirationTime: null, keys }),
          unsubscribe: () => {
            probe.__fakeSubscription = null;
            return Promise.resolve(true);
          },
        };
        probe.__fakeSubscription = subscription;
        return Promise.resolve(subscription as unknown as PushSubscription);
      };
    },
    { endpoint: FAKE_ENDPOINT, keys: FAKE_KEYS, initial: initialPermission },
  );
}

/**
 * Registers a user with a card, signs in, buys one product and opens its confirmation page.
 *
 * @param page - Page.
 * @param context - Browser context.
 * @returns The order UUID.
 */
async function openConfirmation(
  page: Page,
  context: Parameters<typeof registerUser>[0],
): Promise<string> {
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, "/");
  const [productPath = ""] = await firstProductPaths(page, 1);
  const orderUuid = await placePaidOrder(page, productPath.split("/").pop() ?? "");
  await page.goto(`/checkout/confirmation/${orderUuid}`);
  return orderUuid;
}

test("notifications are turned on from the confirmation page, after a click only", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  await fakePushService(page);
  const posted: unknown[] = [];
  await page.route("**/api/notifications/push/subscriptions", async (route) => {
    posted.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { uuid: SUBSCRIPTION_UUID } });
  });
  await openConfirmation(page, context);

  const card = page.getByRole("region", { name: "Sois prévenu quand ta commande est expédiée" });
  await expect(card).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as PushProbe).__pushPermissionRequests)).toBe(
    0,
  );
  await expectNoBlockingViolations(page);

  await card.getByRole("button", { name: "Activer les notifications" }).click();
  const enabled = page.getByRole("region", { name: "Notifications activées" });
  await expect(enabled).toBeVisible();
  expect(posted).toEqual([{ endpoint: FAKE_ENDPOINT, expirationTime: null, keys: FAKE_KEYS }]);
  expect(await page.evaluate(() => (window as unknown as PushProbe).__pushPermissionRequests)).toBe(
    1,
  );
  expect(await page.evaluate(() => window.localStorage.getItem("ct_push_v1"))).toBe(
    JSON.stringify({ subscriptionUuid: SUBSCRIPTION_UUID }),
  );
  const worker = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    return registration?.active?.scriptURL ?? null;
  });
  expect(worker).toMatch(/\/sw\.js$/);
});

test("the service worker is served fresh, for the whole site", async ({ request }) => {
  const worker = await request.get("/sw.js");
  expect(worker.ok()).toBe(true);
  expect(worker.headers()["cache-control"]).toContain("no-cache");
  expect(worker.headers()["service-worker-allowed"]).toBe("/");
  expect(worker.headers()["content-security-policy"]).toBeUndefined();
  const core = await request.get("/sw-core.js");
  expect(core.headers()["cache-control"]).toContain("no-cache");
  expect((await request.get("/icons/notification-192.png")).ok()).toBe(true);
});

test("the public key of the backend is readable through the BFF", async ({ request }) => {
  const response = await request.get("/api/notifications/push/public-key");
  expect(response.status()).toBe(200);
  expect(((await response.json()) as { publicKey: string }).publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
});

test("the profile switch turns notifications on, then off", async ({ page, context }) => {
  test.setTimeout(120_000);
  await fakePushService(page);
  const posted: unknown[] = [];
  const deleted: string[] = [];
  await page.route("**/api/notifications/push/subscriptions", async (route) => {
    posted.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { uuid: SUBSCRIPTION_UUID } });
  });
  await page.route("**/api/notifications/push/subscriptions/*", async (route) => {
    deleted.push(new URL(route.request().url()).pathname.split("/").pop() ?? "");
    await route.fulfill({ status: 204 });
  });
  const email = await registerUser(context);
  await signIn(page, email, "/account/profile");

  const section = page.getByRole("region", { name: "Notifications", exact: true });
  const toggle = section.getByRole("switch", { name: "Notifications du navigateur" });
  await expect(toggle).not.toBeChecked();
  await expectNoBlockingViolations(page);

  await toggle.click();
  await expect(toggle).toBeChecked();
  expect(posted).toHaveLength(1);
  expect(await page.evaluate(() => window.localStorage.getItem("ct_push_v1"))).toBe(
    JSON.stringify({ subscriptionUuid: SUBSCRIPTION_UUID }),
  );

  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(toggle).toBeEnabled();
  expect(deleted).toEqual([SUBSCRIPTION_UUID]);
  expect(await page.evaluate(() => window.localStorage.getItem("ct_push_v1"))).toBeNull();
  expect(
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      return (await registration?.pushManager.getSubscription()) ?? null;
    }),
  ).toBeNull();
});

test("blocked notifications are explained in the profile, without an active switch", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  await fakePushService(page, "denied");
  const email = await registerUser(context);
  await signIn(page, email, "/account/profile");

  const section = page.getByRole("region", { name: "Notifications", exact: true });
  await expect(section.getByText(/cadenas à gauche de l'adresse/)).toBeVisible();
  await expect(section.getByRole("switch", { name: "Notifications du navigateur" })).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as PushProbe).__pushPermissionRequests)).toBe(
    0,
  );
});
