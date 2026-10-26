---

description: "Task list for feature 005 — Web Push notifications (service worker, BFF routes, opt-in, profile toggle, subscription upkeep)"
---

# Tasks: Notifications Web Push

**Input**: Design documents from `specs/005-web-push-notifications/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R15), data-model.md, contracts/bff-routes.md, quickstart.md

**Tests**: REQUIRED — constitution principle VII (« un comportement sans test n'est pas terminé ») and the backend prompt §6. Unit tests (Vitest + Testing Library + MSW + jest-axe, `node:vm` for the service worker) and a Playwright journey are included per story, written first and failing before the implementation.

**Organization**: Tasks are grouped by user story in priority order (US1 opt-in and reception P1, US2 profile toggle P2, US3 subscription upkeep and sign-out P3), then the polish phase. Each story is implemented, verified against the real backend on 8081 (VAPID keys configured by the user on 2026-10-22), committed, then the work stops for a report in French before the next story.

**Rules applying to EVERY task** (constitution XI–XIII, `CLAUDE.md`):
- Code, comments, TSDoc and logs in **English**; user-facing text in **French** (tutoiement) in `features/notifications/messages.ts` only.
- No magic number/string: use `lib/constants/push.ts` (and `api.ts`, `routes.ts`, `security.ts`); closed sets are **string enums** in `lib/enums/push.ts`; Zod built from enums; exhaustive `switch` on `PushState` + `assertNever`. In `public/sw.js` and `public/sw-core.js`, every value is a named `SCREAMING_SNAKE_CASE` constant at the top of the file with a JSDoc comment.
- TSDoc on every export and at the top of every module (`@param`, `@returns`, `@throws`, `@see` to the spec, `contracts/bff-routes.md`, research entry or backend `docs/web-push.md`).
- Server logs via `createModuleLogger("notifications.push")`; **never** log a push endpoint (only `maskPushEndpoint`), the `p256dh` / `auth` keys, a token or a cookie; subscription UUIDs through `maskUuid` in business logs. Client: no `console.*`, failures through `clientLogger`.
- Every visual value comes from the theme tokens; reuse `glass`, `cta-gradient`, `components/ui/switch.tsx`, `components/ui/button.tsx`; no raw hex, px, ms or arbitrary Tailwind values.
- Never call `Notification.requestPermission()` outside a click handler (FR-001).
- Reuse existing building blocks: `lib/api/client.ts` (`backendFetch`, `timeoutMs`), `lib/api/bff-response.ts` (`jsonOk`, `jsonError`, `parseJsonBody`), `lib/api/bff-client.ts` (`bffGet`, `bffSend`, `BffError`), `lib/auth/guards.ts` (`getAccessTokenOrThrow`, `readSessionToken`), `lib/log-safety.ts` (`maskUuid`), `lib/client-logger.ts`, `lib/enums/storage-key.ts`, `lib/api/errors.ts` (push codes already mapped), `tests/e2e/support/account.ts` (`registerUser`, `signIn`, `firstProductPaths`, `placePaidOrder`), `tests/e2e/support/a11y.ts`.
- A task is done when `npm run typecheck`, `npm run lint` (0 warning) and `npm run test` pass.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 activation et réception · US2 profil · US3 abonnement toujours juste

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the contract and the local backend before writing code.

- [X] T001 Check that `lib/api/schema.d.ts` still matches the backend (`npm run gen:api` against 8081; `PushSubscriptionRequestDto`, `PushSubscriptionResponseDto`, `PushPublicKeyResponseDto`, `/api/v1/services/notifications/push/public-key`, `/subscriptions`, `/subscriptions/{subscriptionUuid}` present); `curl -s http://localhost:8081/api/v1/services/notifications/push/public-key -H "X-API-VERSION: 1.0"` returns a `publicKey` (VAPID keys loaded); note the result in `specs/005-web-push-notifications/quickstart.md` §1
- [X] T002 [P] Add an ESLint block for `public/**/*.js` in `eslint.config.mjs` (research R1): `languageOptions.globals` = `globals.serviceworker`, `sourceType: "script"`, TypeScript type-checked rules disabled for these files (`tseslint.configs.disableTypeChecked`), `no-magic-numbers` kept (0, 1, -1 allowed); check that `npm run lint` passes with an empty `public/sw.js` placeholder removed afterwards

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Enums, constants, schemas, storage keys, backend endpoints and log masking shared by every story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Create `lib/enums/push.ts` (data-model §1): `PushSupport` (`SUPPORTED = "supported"`, `INSTALL_REQUIRED = "install-required"`, `UNSUPPORTED = "unsupported"`), `PushState` (`UNSUPPORTED = "unsupported"`, `INSTALL_REQUIRED = "install-required"`, `IDLE = "idle"`, `PENDING = "pending"`, `ENABLED = "enabled"`, `DENIED = "denied"`, `UNAVAILABLE = "unavailable"`, `CONFLICT = "conflict"`, `ERROR = "error"`), `PushSwMessageType` (`SUBSCRIPTION_CHANGED = "push-subscription-changed"`), TSDoc per value; add `PUSH = "ct_push_v1"` (`localStorage`, `{ subscriptionUuid }` only, research R6) and `PUSH_SYNC = "ct_push_sync_v1"` (`sessionStorage`, resync done for the tab) to `StorageKey` in `lib/enums/storage-key.ts`
- [X] T004 [P] Create `lib/constants/push.ts` (data-model §5): `SERVICE_WORKER_PATH = "/sw.js"`, `SERVICE_WORKER_CORE_PATH = "/sw-core.js"`, `SERVICE_WORKER_SCOPE = "/"`, `PUSH_SIGN_OUT_TIMEOUT_MS = 2_000` (« déconnexion jamais retardée de plus de 2 s », R8), `PUSH_ENDPOINT_MAX_LENGTH = 2_048`, `PUSH_KEY_MAX_LENGTH = 256`, `PUSH_NOTIFICATION_TAG_PREFIX = "order-"`, `PUSH_SIGN_OUT_FIELD = "pushSubscriptionUuid"`, `PUSH_ENDPOINT_LOG_PLACEHOLDER = "…"`, each with TSDoc giving its origin
- [X] T005 [P] Add `BACKEND_PATHS.pushPublicKey` (`${API_BASE_PATH}/notifications/push/public-key`), `BACKEND_PATHS.pushSubscriptions` (`${API_BASE_PATH}/notifications/push/subscriptions`) and `pushSubscriptionPath(uuid)` (URL-encoded) to `lib/constants/api.ts`; `BFF_ROUTES.pushPublicKey` (`/api/notifications/push/public-key`), `BFF_ROUTES.pushSubscriptions` (`/api/notifications/push/subscriptions`) and `pushSubscriptionRoute(uuid)` to `lib/constants/routes.ts`; TSDoc with method, auth and status codes from `contracts/bff-routes.md` §1–3
- [X] T006 [P] Unit tests `tests/unit/push/push-schemas.test.ts` then create `lib/schemas/push.ts` (data-model §2): `PushPublicKeySchema` (`publicKey` base64url `/^[A-Za-z0-9_-]+$/`, non-empty), `PushSubscriptionBodySchema` (`.strict()`; `endpoint` URL with protocol `https:` and length ≤ `PUSH_ENDPOINT_MAX_LENGTH`; `expirationTime` integer ≥ 0 or `null`; `keys.p256dh` and `keys.auth` base64url, non-empty, ≤ `PUSH_KEY_MAX_LENGTH`), `PushSubscriptionSavedSchema` (`uuid` required, `z.uuid()`, although optional in the OpenAPI), `PushSubscriptionUuidParamSchema` (`z.uuid()`), `PushRecordSchema` (`{ subscriptionUuid: z.uuid() }`), `toBackendSubscription(body)` dropping `expirationTime` when `null`; type test `tests/unit/push/push-contract.test-d.ts` (`toBackendSubscription` result assignable to `components["schemas"]["PushSubscriptionRequestDto"]`)
- [X] T007 [P] Add `maskPushEndpoint(endpoint: string | null | undefined): string` to `lib/log-safety.ts` (keeps `host` + `/` + `PUSH_ENDPOINT_LOG_PLACEHOLDER`, e.g. `fcm.googleapis.com/…`; invalid URL → placeholder only) with tests in `tests/unit/log-safety.test.ts` (new file) (never returns the path or the token part of an FCM, Mozilla, Windows or Apple endpoint)
- [X] T008 Unit tests `tests/unit/push/push-endpoints.test.ts` (MSW) then create `lib/api/endpoints/push.ts` (`import "server-only"`, contracts §5): `getPushPublicKey(): Promise<string>` (`cache: "no-store"`, no token), `savePushSubscription(body, accessToken): Promise<{ uuid: string }>` (POST, `toBackendSubscription`), `deletePushSubscription(uuid, accessToken, options?: { timeoutMs?: number }): Promise<void>` (404 `PUSH_SUBSCRIPTION_NOT_FOUND` → resolves, `info` « Push subscription already gone »); logs `notifications.push` with `maskPushEndpoint` and `maskUuid` only; tests: success, 503 `PUSH_SERVICE_NOT_CONFIGURED` → `UNAVAILABLE`, 409 → `CONFLICT`, 400 `INVALID_PUSH_ENDPOINT` → `INVALID`, 404 on delete → resolves, 403 → `FORBIDDEN`, `expirationTime: null` not sent, a spied logger never receives the endpoint string nor the keys; remove the « Web push is not used by the front yet » comment in `lib/api/errors.ts`
- [X] T009 [P] Create `features/notifications/messages.ts` (`PUSH_MESSAGES`, tutoiement, no amount): opt-in title « Sois prévenu quand ta commande est expédiée », body (paiement confirmé et expédition, même onglet fermé), button « Activer les notifications », pending « Activation… », enabled « Notifications activées », toggle label « Notifications du navigateur » and its description, denied (« Tu as bloqué les notifications pour ce site. Pour les réautoriser, clique sur le cadenas à gauche de l'adresse, puis autorise les notifications. »), unavailable (momentanément indisponibles, rien n'a changé), conflict (appareil lié à un autre compte) + button « Activer pour mon compte », install-required (iPhone / iPad : ajoute le site à l'écran d'accueil), error (réessaie), disable error, session expired (reuse the common message if one exists in `features/common/messages.ts`)

**Checkpoint**: `npm run typecheck`, `npm run lint`, `npm run test` pass; the endpoints are tested against MSW.

---

## Phase 3: User Story 1 - Être prévenu de l'avancement d'une commande (Priority: P1) 🎯 MVP

**Goal**: From the order confirmation page, one click subscribes the browser; the service worker shows the backend notifications and opens the order on click.

**Independent Test**: sign in, place an order, click « Activer les notifications » on the confirmation page and accept, pay the test order with the Stripe CLI: « Paiement confirmé » shows up; clicking it opens `/account/orders/{uuid}` (quickstart §2–3).

### Tests for User Story 1 ⚠️

> Write these tests FIRST and make sure they FAIL before the implementation.

- [X] T010 [P] [US1] Service-worker core tests `tests/unit/push/sw-core.test.ts`: load the served `public/sw-core.js` in `node:vm` with a fake `self` (`location.origin = "http://localhost:3000"`) and test `self.ctPushCore`: `parsePushMessage` (valid JSON → object; invalid JSON, missing or empty `title` / `url`, non-UUID `orderUuid`, non-object → `null`; extra fields ignored), `safeNotificationPath` (accepts `/account/orders/{uuid}`; rejects `https://evil.test/x`, `//evil.test`, `/\evil.test`, `javascript:alert(1)`, `http://localhost:3000/x` absolute, empty string), `notificationTag(uuid)` = `"order-" + uuid`, `pickClientToFocus` (first same-origin window client, else `null`), `sameKey` (byte-by-byte `ArrayBuffer` vs `Uint8Array`, different length → `false`, `null` → `false`); constants test: `ORDER_TAG_PREFIX` in `sw-core.js` equals `PUSH_NOTIFICATION_TAG_PREFIX`, `SUBSCRIPTION_CHANGED_MESSAGE` equals `PushSwMessageType.SUBSCRIPTION_CHANGED`
- [X] T011 [P] [US1] Service-worker listener tests `tests/unit/push/sw-listeners.test.ts`: load `public/sw-core.js` then `public/sw.js` in `node:vm` (fake `importScripts` evaluating the core file, fake `self.registration.showNotification`, `self.clients`, `addEventListener` capturing listeners); dispatch fake events with `waitUntil`: `push` valid → `showNotification(title, { body, icon: "/icons/notification-192.png", badge: "/icons/notification-badge-96.png", tag: "order-{uuid}", renotify: true, data: { url } })`; `push` invalid → nothing; `notificationclick` with an open same-origin window → `close`, `focus`, `navigate(path)`; without window → `openWindow(path)`; unsafe url → `close` only; `install` → `skipWaiting`, `activate` → `clients.claim`
- [X] T012 [P] [US1] Route tests `tests/unit/api/bff-push-routes.test.ts` (MSW, session mocked like the other route tests) for `GET /api/notifications/push/public-key` (`200 { publicKey }`, 503 → `unavailable`) and `POST /api/notifications/push/subscriptions` (`201 { uuid }`; invalid body (http endpoint, extra field, missing keys) → `400 invalid` without backend call; no session → `401 unauthenticated`; 409 → `conflict`; 503 → `unavailable`); assert the spied logger never receives the endpoint nor the keys
- [X] T013 [P] [US1] Unit tests `tests/unit/push/push-support.test.ts` (`detectPushSupport` with injected environment: Chrome desktop → `SUPPORTED`; no `PushManager` → `UNSUPPORTED`; insecure context → `UNSUPPORTED`; iPhone UA or `MacIntel` + touch points, not standalone → `INSTALL_REQUIRED`; iOS standalone with `PushManager` → `SUPPORTED`) and `tests/unit/push/push-record.test.ts` (`readPushRecord` validates with `PushRecordSchema`, corrupt value → `null` and key removed, storage throwing → `null`; `writePushRecord`, `clearPushRecord`; `hasSyncedThisTab` / `markSyncedThisTab` on `sessionStorage`; `base64UrlToBytes` round-trip and padding)
- [X] T014 [P] [US1] Hook tests `tests/unit/push/usePushNotifications.test.tsx` with fake `Notification`, `navigator.serviceWorker` (`register`, `ready`), `PushManager` (`subscribe`, `getSubscription`) and MSW on the BFF: initial state per support / permission / record (`UNSUPPORTED`, `INSTALL_REQUIRED`, `DENIED`, `ENABLED`, `IDLE`); `enable()` calls `requestPermission` first, then `register(SERVICE_WORKER_PATH, { scope: SERVICE_WORKER_SCOPE })`, public key, `subscribe({ userVisibleOnly: true, applicationServerKey: <decoded bytes> })`, POST with `subscription.toJSON()`, stores the uuid → `ENABLED`; permission `default` → `IDLE` without message; `denied` → `DENIED`; POST 503 → `UNAVAILABLE` and `subscription.unsubscribe()` called (FR-003); POST 409 → `CONFLICT`, then `reclaim()` unsubscribes, subscribes again and POSTs → `ENABLED`; 401 → `ERROR` with the session message; `requestPermission` never called on mount
- [X] T015 [P] [US1] Component tests `tests/unit/push/PushOptIn.test.tsx` (+ `jest-axe`): nothing rendered before hydration nor in `UNSUPPORTED`; `IDLE` → title, body and button; click → `enable`; `ENABLED`, `DENIED`, `UNAVAILABLE`, `CONFLICT` (button « Activer pour mon compte » → `reclaim`), `INSTALL_REQUIRED`, `ERROR` texts; state changes announced in an `aria-live="polite"` region; no amount in any text
- [X] T016 [US1] E2E `tests/e2e/push-notifications.spec.ts` (chromium project only, like the account-creating specs): init script replacing `PushManager.prototype.subscribe` / `getSubscription` with a fake subscription (`endpoint: "https://fcm.googleapis.com/fcm/send/e2e-…"`, base64url keys, `toJSON`, `unsubscribe`, `options.applicationServerKey`) and spying on `Notification.requestPermission`; `context.grantPermissions(["notifications"])`; `page.route` on `**/api/notifications/push/subscriptions` returning `201 { uuid }`; `registerUser(context, { withBankCard: true })`, `signIn`, `placePaidOrder`: on the confirmation page the opt-in is visible and `requestPermission` was not called on load; click → POST body equals the fake `toJSON()`, text « Notifications activées », `localStorage["ct_push_v1"]` holds the uuid; `/sw.js` answers with `Cache-Control: no-cache` and `Service-Worker-Allowed: /`; axe has no blocking violation

### Implementation for User Story 1

- [X] T017 [P] [US1] Create `public/sw-core.js` (`// @ts-check`, module JSDoc citing research R1, R10 and `contracts/bff-routes.md` §6): constants `ORDER_TAG_PREFIX = "order-"`, `UUID_PATTERN`, `SUBSCRIPTION_CHANGED_MESSAGE = "push-subscription-changed"`, `NOTIFICATION_ICON_PATH = "/icons/notification-192.png"`, `NOTIFICATION_BADGE_PATH = "/icons/notification-badge-96.png"`; pure functions `parsePushMessage(text)`, `safeNotificationPath(url, origin)` (string starting with `/`, not `//` nor `/\`, same origin after `new URL(url, origin)`, returns `pathname + search + hash` or `null`), `notificationTag(orderUuid)`, `pickClientToFocus(clients, origin)`, `sameKey(a, b)`; attached to `self.ctPushCore` (frozen object); each function ≤ 40 lines with JSDoc
- [X] T018 [US1] Create `public/sw.js` (`// @ts-check`, module JSDoc): `importScripts("/sw-core.js")`; `install` → `self.skipWaiting()`; `activate` → `event.waitUntil(self.clients.claim())`; `push` → `event.waitUntil(...)` showing the notification from `parsePushMessage(event.data?.text())` (contracts §6, `renotify: true`, `data: { url }`), nothing when `null`; `notificationclick` → `close()`, `safeNotificationPath`, then `clients.matchAll({ type: "window", includeUncontrolled: true })`, `pickClientToFocus` → `focus()` + `navigate(path)`, else `clients.openWindow(path)`; the `pushsubscriptionchange` listener comes in US3 (T042)
- [X] T019 [P] [US1] Create `public/icons/notification.svg` (cybertech monogram, brand colours of `lib/theme/theme.config.ts`) and `scripts/generate-notification-icons.mjs` (sharp: `notification-192.png` 192 × 192 colour, `notification-badge-96.png` 96 × 96 white silhouette on transparent, research R11); run it and commit the two PNG files in `public/icons/`
- [X] T020 [P] [US1] Security headers: add `worker-src 'self'` to `buildCsp` in `lib/security/csp.ts` (comment: without it `script-src` with nonce and `'strict-dynamic'` would block the un-nonced worker script, R13) and extend `tests/unit/security/csp.test.ts`; add `SERVICE_WORKER_HEADERS` (`Cache-Control: no-cache`, `Service-Worker-Allowed: /` for `/sw.js`; `Cache-Control: no-cache` for `/sw-core.js`) to `lib/constants/security.ts` and the two `headers()` entries to `next.config.ts`
- [X] T021 [US1] Create the route handlers `app/api/notifications/push/public-key/route.ts` (`GET`, public, `getPushPublicKey`, `jsonOk({ publicKey })`, `dynamic = "force-dynamic"`) and `app/api/notifications/push/subscriptions/route.ts` (`POST`, `parseJsonBody(request, PushSubscriptionBodySchema)`, `getAccessTokenOrThrow`, `savePushSubscription`, `201 { uuid }`, `jsonError`), module TSDoc citing `contracts/bff-routes.md` §1–2 and the backend `PushNotificationController`
- [X] T022 [P] [US1] Create `features/notifications/push-support.ts` (`detectPushSupport(env = browserEnv())` returning `PushSupport`, injectable environment for tests, research R3) and `features/notifications/push-record.ts` (`readPushRecord`, `writePushRecord`, `clearPushRecord`, `hasSyncedThisTab`, `markSyncedThisTab`, every storage access in `try/catch`, Zod validation on read, research R6)
- [X] T023 [US1] Create `features/notifications/push-client.ts` (`"use client"` helpers, no React): `base64UrlToBytes(value): Uint8Array<ArrayBuffer>`, `registerServiceWorker(): Promise<ServiceWorkerRegistration>` (`register(SERVICE_WORKER_PATH, { scope: SERVICE_WORKER_SCOPE })` then `navigator.serviceWorker.ready`), `fetchPublicKey()` (`bffGet(BFF_ROUTES.pushPublicKey, PushPublicKeySchema)`), `subscribeBrowser(registration, publicKey)`, `sendSubscription(subscription): Promise<string>` (`bffSend` POST, `PushSubscriptionSavedSchema`), `removeSubscription(uuid)` (`bffSend` DELETE, used in US2); each ≤ 40 lines with TSDoc
- [X] T024 [US1] Create `features/notifications/push-store.ts` (tiny external store for `PushStatus`, `subscribe` / `getSnapshot` / `getServerSnapshot` for `useSyncExternalStore`, so the opt-in, the toggle and `PushSync` share one state per tab) and `features/notifications/hooks/usePushNotifications.ts` (`initialPushState()` from support, `Notification.permission` and the record; `enable()` with the sequence of research R4 — `requestPermission` FIRST, inside the click; failure after `subscribe` → `unsubscribe` (FR-003); error mapping by `BffError.code` with an exhaustive `switch` + `assertNever`; `reclaim()` per research R5; `disable` left as a stub that throws until US2), returning `UsePushNotificationsResult`
- [X] T025 [US1] Create `features/notifications/components/PushOptIn.tsx` (`"use client"`, `glass` card, `cta-gradient` button, one branch per `PushState` with an exhaustive `switch` + `assertNever`, renders `null` until mounted and in `UNSUPPORTED`, `aria-live="polite"` status line, `Bell` / `BellRing` / `BellOff` icons from lucide) and add it to `app/(account)/checkout/confirmation/[uuid]/page.tsx` under the payment tracker (section labelled by its title)
- [X] T026 [US1] Verify US1 against the real backend: `npm run typecheck`, `npm run lint`, `npm run test`; `npx playwright test tests/e2e/push-notifications.spec.ts`; manual quickstart §1–3 in Chrome (real subscription, Stripe CLI payment, notification « Paiement confirmé », click opens the order, shipping notification replaces it); screenshots of the confirmation page (idle, enabled, denied) reviewed; commit `feat(notifications): opt in to order notifications from the confirmation page`; stop and report in French

**Checkpoint**: a customer can opt in after an order and receives the backend notifications.

---

## Phase 4: User Story 2 - Gérer les notifications depuis mon profil (Priority: P2)

**Goal**: A « Notifications du navigateur » switch in the profile turns notifications on and off for this browser, with an explanation for every refusal.

**Independent Test**: on `/account/profile`, turn the switch on (subscription saved), off (DELETE then `unsubscribe`, `ct_push_v1` removed), and check the denied, unavailable and conflict messages (quickstart §4).

### Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] Route tests: extend `tests/unit/api/bff-push-routes.test.ts` for `DELETE /api/notifications/push/subscriptions/{uuid}` (`204`; backend `404 PUSH_SUBSCRIPTION_NOT_FOUND` → `204`; non-UUID param → `400 invalid` without backend call; `403` → `forbidden`; no session → `401`; 503 → `unavailable`)
- [X] T028 [P] [US2] Extend `tests/unit/push/usePushNotifications.test.tsx` for `disable()`: DELETE with the stored uuid, then `subscription.unsubscribe()`, record cleared → `IDLE`; DELETE answering 204 for an already-gone subscription → `IDLE`; DELETE failing (503) → stays `ENABLED` with the disable error message, browser subscription kept; no record (storage cleared) → `unsubscribe()` only → `IDLE`
- [X] T029 [P] [US2] Component tests `tests/unit/push/PushToggle.test.tsx` (+ `jest-axe`): switch with the accessible name « Notifications du navigateur », checked in `ENABLED`, unchecked in `IDLE`, disabled in `PENDING`, `DENIED`, `UNAVAILABLE`, `INSTALL_REQUIRED`; toggling calls `enable` / `disable`; the description text under the switch follows the state; conflict shows « Activer pour mon compte »; nothing rendered in `UNSUPPORTED`; keyboard (Space) toggles
- [X] T030 [US2] Extend `tests/e2e/push-notifications.spec.ts`: on `/account/profile` with the fake subscription and an intercepted BFF, the switch turns on (POST), then off → `DELETE /api/notifications/push/subscriptions/{uuid}` sent with the stored uuid and `ct_push_v1` removed; a context with `permissions: []` and `Notification.permission` forced to `denied` shows the re-authorisation steps and no active switch

### Implementation for User Story 2

- [X] T031 [US2] Create `app/api/notifications/push/subscriptions/[uuid]/route.ts` (`DELETE`, `PushSubscriptionUuidParamSchema` on the param, `getAccessTokenOrThrow`, `deletePushSubscription`, `204` with an empty body, `jsonError`; contracts §3)
- [X] T032 [US2] Implement `disable()` in `features/notifications/hooks/usePushNotifications.ts` (FR-008: `removeSubscription(uuid)` when a record exists, then `getSubscription()?.unsubscribe()`, `clearPushRecord()`; failure of the DELETE keeps `ENABLED` and sets the disable error message)
- [X] T033 [US2] Create `features/notifications/components/PushToggle.tsx` (`"use client"`, `Switch` from `components/ui/switch.tsx` with `<label htmlFor>`, description `aria-describedby` + `aria-live="polite"`, exhaustive `switch` on `PushState`, `null` in `UNSUPPORTED`) and add a « Notifications du navigateur » section (`glass`, `aria-labelledby`) to `app/(account)/account/profile/page.tsx`, under the identity card
- [X] T034 [US2] Verify US2: unit tests, `npx playwright test tests/e2e/push-notifications.spec.ts`, manual quickstart §4 (switch off → no notification after a paid order; blocked in the site settings → denied text), screenshots of the profile section reviewed; commit `feat(notifications): browser notifications switch in the profile`; stop and report in French

**Checkpoint**: notifications can be turned on and off from the profile.

---

## Phase 5: User Story 3 - Un abonnement toujours juste (Priority: P3)

**Goal**: The subscription is resent at session start, renewed when the VAPID key or the browser subscription changes, and removed from the backend at sign-out without blocking it.

**Independent Test**: with notifications on, sign out → the backend subscription is deleted and `ct_push_v1` cleared; sign in again → no subscription is sent without a click; with a record and permission granted, opening the site resends the subscription once; changing the key triggers a re-subscription (quickstart §5).

### Tests for User Story 3 ⚠️

- [X] T035 [P] [US3] Component tests `tests/unit/push/PushSync.test.tsx` (fakes of T014, `useSession` mocked): nothing happens when unauthenticated, unsupported, permission not granted, no record, or already synced this tab; with a record and a matching key → POST of `getSubscription().toJSON()` and new uuid stored, tab marked synced; no browser subscription → silent `subscribe` (no `requestPermission`) then POST; different key (`options.applicationServerKey` ≠ decoded public key) → `unsubscribe`, `subscribe`, POST; POST 409 → record cleared; a `message` event `{ type: "push-subscription-changed" }` from `navigator.serviceWorker` reruns the sync even when already synced; every failure is silent (`clientLogger` only)
- [X] T036 [P] [US3] Extend `tests/unit/push/sw-listeners.test.ts` for `pushsubscriptionchange`: with `oldSubscription.options.applicationServerKey` → `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` then `postMessage({ type: "push-subscription-changed" })` to every window client; without key or when `subscribe` rejects → no message, no throw
- [X] T037 [P] [US3] Sign-out tests `tests/unit/auth/sign-out.test.ts` (mock `signOut`, `readSessionToken`, `redirect`, MSW): `signOutEverywhere(formData)` with a valid `pushSubscriptionUuid` → `DELETE` sent with the session token **before** `signOut`, `timeoutMs = PUSH_SIGN_OUT_TIMEOUT_MS`; backend 503 or timeout → `log.warn`, `signOut` and the Keycloak redirect still happen; invalid or missing uuid → no backend call; no session → no backend call; the uuid is masked in logs
- [X] T038 [P] [US3] Component tests `tests/unit/push/PushSignOutField.test.tsx` and extend `tests/unit/auth/account-menu.test.tsx`: the hidden input `pushSubscriptionUuid` carries the stored uuid (empty without record); submitting the sign-out form clears `ct_push_v1` and `ct_push_sync_v1` and calls `unsubscribe()` without waiting for it
- [X] T039 [US3] Extend `tests/e2e/push-notifications.spec.ts`: after enabling, « Se déconnecter » → the sign-out request carries `pushSubscriptionUuid`, `ct_push_v1` is gone after the redirect; sign in again with the permission still granted → no POST to `/api/notifications/push/subscriptions` is sent (no record), the opt-in shows `IDLE`

### Implementation for User Story 3

- [X] T040 [US3] Create `features/notifications/push-sync.ts` (`syncPushSubscription(): Promise<void>` implementing research R7: registration, `getSubscription`, public key, `sameKey` comparison through `base64UrlToBytes`, re-subscription without permission prompt, POST, record update, 409 → `clearPushRecord`; each step ≤ 40 lines) and `features/notifications/components/PushSync.tsx` (`"use client"`, renders `null`, runs once per tab when `useSession().status === "authenticated"` and the guards of T035 pass, listens to `navigator.serviceWorker` `message` events of type `PushSwMessageType.SUBSCRIPTION_CHANGED`, updates the push store); mount `<PushSync />` in `app/providers.tsx` inside `SessionProvider`
- [X] T041 [US3] Sign-out: add `features/notifications/components/PushSignOutField.tsx` (`"use client"`, hidden input `name={PUSH_SIGN_OUT_FIELD}` filled from `readPushRecord()` after mount) and `clearLocalPushSubscription()` in `features/notifications/push-client.ts` (fire-and-forget `unsubscribe`, `clearPushRecord`, clear the sync flag); use both in `features/auth/components/AccountMenuPanel.tsx` (field inside the sign-out form, cleanup in `onSubmit` before the existing `onSignOut`); change `signOutEverywhere` in `features/auth/actions.ts` to `signOutEverywhere(formData: FormData)` that validates the field with `PushSubscriptionUuidParamSchema` and calls `deletePushSubscription(uuid, token.accessToken, { timeoutMs: PUSH_SIGN_OUT_TIMEOUT_MS })` before `signOut`, swallowing and logging (`warn`, masked uuid) any error (research R8, contracts §4); update every other caller of `signOutEverywhere` (`grep -rn signOutEverywhere`)
- [X] T042 [US3] Add the `pushsubscriptionchange` listener to `public/sw.js` (research R9): `event.waitUntil(...)` re-subscribing with `event.oldSubscription?.options.applicationServerKey`, then `postMessage({ type: SUBSCRIPTION_CHANGED_MESSAGE })` to every window client (`includeUncontrolled: true`); no key or failure → resolve silently
- [X] T043 [US3] Verify US3: unit tests, `npx playwright test tests/e2e/push-notifications.spec.ts` then `tests/e2e/auth.spec.ts` (sign-out unchanged), manual quickstart §5 (sign-out deletes the subscription in the backend logs; sign-out with the backend stopped finishes in < 3 s); commit `feat(notifications): keep the push subscription in sync and drop it at sign-out`; stop and report in French

**Checkpoint**: subscriptions follow the account and never leak to the next person on the browser.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T044 [P] Documentation: README section « Notifications du navigateur » (HTTPS required except on `localhost`, VAPID variables `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` / `WEB_PUSH_SUBJECT` set in the backend run configuration, `npx web-push generate-vapid-keys`, Chrome / Windows notification settings); new « Notifications push » section in `docs/backend/api-map.md` (3 endpoints, DTOs, error codes, message payload, 5 browsers per account, push is not a favourite channel)
- [ ] T045 [P] TSDoc and constants audit of every file touched by the feature (including `public/sw.js` and `public/sw-core.js`): no magic value, no raw visual value, `@see` to spec / contract / research / backend file, no endpoint or key in any log; fix what `npm run lint` does not catch
- [ ] T046 [P] Visual audit with the **frontend-design** skill: screenshots of the opt-in (every state) and of the profile section next to the existing confirmation and profile cards; fix spacing, hierarchy and icon consistency with theme tokens only
- [ ] T047 Full run: `npm run typecheck`, `npm run lint`, `npm run test`, then `tests/e2e/push-notifications.spec.ts` and the existing specs touching the confirmation page, the profile and sign-out one by one (`--workers=1`); Lighthouse desktop on `/` to confirm no service worker or extra request for an anonymous visitor; complete `quickstart.md` with the date, counts and remaining manual points
- [ ] T048 Final commit `docs: wrap up feature 005` and checkpoint with the user (in French)

---

## Phase 7: Logo de la marque (demande du 2026-10-26)

**Goal**: the user's logo (`styles/cybertech-logo-1-fond-sombre.png`, 2253×810, opaque dark background) replaces the text wordmark of the header, signs the footer and becomes the favicon.

**Independent Test**: every page shows the logo in the header (link « Accueil de cybertech »), the footer shows the full lockup with « Premium tech store », the browser tab shows the « C » mark; no visible rectangle around the logo on the dark theme.

- [ ] T049 Create `scripts/brand-assets.mjs` (sharp, run once with `node scripts/brand-assets.mjs`, outputs committed): remove the dark background with a colour-to-alpha pass against a background estimated from the image borders (glow kept as partial transparency), trim, then write `public/brand/cybertech-lockup.png` (mark, wordmark and tagline), `public/brand/cybertech-wordmark.png` (mark and wordmark, no tagline) and `app/icon.png` + `app/apple-icon.png` (the « C » mark alone, square); the source PNG stays in `styles/`
- [ ] T050 Add `lib/constants/brand.ts` (asset paths and intrinsic sizes of each image, documented), the logo heights as theme tokens (`lib/theme/theme.config.ts` → CSS variables → Tailwind `h-logo-header`, `h-logo-footer`), the alt text in `SITE_MESSAGES`; create `components/layout/BrandLogo.tsx` (`next/image`, variant enum `BrandLogoVariant { WORDMARK = "wordmark", LOCKUP = "lockup" }`, `priority` in the header)
- [ ] T051 Use it in `components/layout/Header.tsx` (replaces the `cybertech` text, accessible name unchanged) and `components/layout/Footer.tsx` (lockup above the note); unit tests (`Header`/`Footer`: the link keeps the name « Accueil de cybertech », the image has its alt text; `BrandLogo` variants)
- [ ] T052 Verify: typecheck, lint, unit tests, screenshots of the header (home, product, profile), footer and favicon reviewed on the dark theme (and the light theme if enabled); commit `feat(ui): cybertech logo in the header, footer and favicon`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: after Setup — blocks every story
- **US1 (Phase 3)**: after Foundational; creates the service worker, the client helpers, the store and the hook
- **US2 (Phase 4)**: after US1 (reuses the hook, the store and `push-client.ts`)
- **US3 (Phase 5)**: after US1 (service worker, record, client helpers); independent of US2 except `push-client.ts` (`removeSubscription` not needed)
- **Polish (Phase 6)**: last

### Within Each User Story

- Tests first (must fail) → pure functions and service-worker files → server code (endpoints, routes, action) → client helpers and hook → components → pages → e2e run, manual quickstart, screenshots, commit, stop and report

### Parallel Opportunities

- Setup: T001 and T002 in parallel
- Foundational: T003–T007 and T009 in parallel; then T008
- US1: tests T010–T015 in parallel (T016 after the fixtures exist); T017, T019, T020, T022 in parallel; then T018 → T021 → T023 → T024 → T025 → T026
- US2: T027–T029 in parallel; then T031 → T032 → T033 → T034
- US3: T035–T038 in parallel; T040, T041 and T042 touch disjoint files and can run in parallel; then T043
- Polish: T044–T046 in parallel; then T047 → T048

---

## Parallel Example: User Story 1

```bash
Task: "Service-worker core tests tests/unit/push/sw-core.test.ts"
Task: "Service-worker listener tests tests/unit/push/sw-listeners.test.ts"
Task: "Route tests tests/unit/api/bff-push-routes.test.ts"
Task: "Support and record tests tests/unit/push/push-support.test.ts, push-record.test.ts"
Task: "Hook tests tests/unit/push/usePushNotifications.test.tsx"
Task: "Component tests tests/unit/push/PushOptIn.test.tsx"
Task: "public/sw-core.js"
Task: "Icons public/icons/ + scripts/generate-notification-icons.mjs"
Task: "CSP worker-src and service-worker headers"
```

## Parallel Example: User Story 3

```bash
Task: "PushSync tests tests/unit/push/PushSync.test.tsx"
Task: "pushsubscriptionchange tests in tests/unit/push/sw-listeners.test.ts"
Task: "Sign-out action tests tests/unit/auth/sign-out.test.ts"
Task: "Sign-out field tests tests/unit/push/PushSignOutField.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup, Phase 2 Foundational
2. Phase 3 US1: opt-in on the confirmation page, service worker, real notifications
3. **Stop and validate** with a real subscription, the Stripe CLI and the backend on 8081, commit, report

### Incremental Delivery

1. US1 → customers are notified of payment and shipping (MVP)
2. US2 → the profile switch and every refusal explained
3. US3 → resync, key change, subscription renewal, clean sign-out
4. Polish → docs, audit, full run, wrap-up

One user story per conversation; each ends with a commit and a report in French.
