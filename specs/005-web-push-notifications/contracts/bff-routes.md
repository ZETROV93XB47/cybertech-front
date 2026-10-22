# Contrats : routes BFF, Server Action, Service Worker

Erreurs au format habituel du BFF (`{ code: FrontErrorCode, message }`, `lib/api/bff-response.ts`).
Le navigateur n'appelle jamais `/api/v1/services/...` directement (constitution III).

## 1. `GET /api/notifications/push/public-key` (public)

- Backend : `GET /api/v1/services/notifications/push/public-key` (sans jeton), `cache: no-store`
  (un changement de clé doit se voir au démarrage suivant, research R7).
- `200` `{ publicKey: string }` (base64url).
- Erreurs : `503 unavailable` (`PUSH_SERVICE_NOT_CONFIGURED`, backend injoignable, réponse non
  conforme).
- Log : `info` « Push public key read » sans la clé (elle est publique mais inutile au log).

## 2. `POST /api/notifications/push/subscriptions` (USER)

- Body : `PushSubscriptionBodySchema` (= `PushSubscription.toJSON()`), `.strict()`.
- Backend : `POST /api/v1/services/notifications/push/subscriptions`, `Authorization: Bearer`,
  body sans `expirationTime` quand il vaut `null`.
- `201` `{ uuid: string }` — même adresse renvoyée = même UUID (mise à jour) ; 6ᵉ navigateur =
  remplacement silencieux du plus ancien.
- Erreurs : `400 invalid` (body non conforme, `INVALID_PUSH_ENDPOINT`, clés refusées) ;
  `401 unauthenticated` ; `409 conflict` (`PUSH_SUBSCRIPTION_CONFLICT`) ; `503 unavailable`.
- Log : `info` `{ pushHost: maskPushEndpoint(endpoint), subscription: maskUuid(uuid) }`
  « Push subscription saved » ; jamais l'adresse complète ni les clés.

## 3. `DELETE /api/notifications/push/subscriptions/{uuid}` (USER)

- `uuid` validé (`PushSubscriptionUuidParamSchema`), sinon `400 invalid`.
- Backend : `DELETE /api/v1/services/notifications/push/subscriptions/{uuid}`.
- `204` — y compris quand le backend répond `404 PUSH_SUBSCRIPTION_NOT_FOUND` (déjà supprimé ou
  remplacé ; log `info` « Push subscription already gone »).
- Erreurs : `401 unauthenticated` ; `403 forbidden` (`PUSH_SUBSCRIPTION_NOT_OWNED`) ;
  `503 unavailable`.

## 4. Server Action `signOutEverywhere(formData)` (modifiée)

- Lit `formData.get(PUSH_SIGN_OUT_FIELD)` ; si c'est un UUID valide et qu'une session existe :
  `deletePushSubscription(uuid, token, { timeoutMs: PUSH_SIGN_OUT_TIMEOUT_MS })` **avant**
  `signOut`. Toute erreur (dont le délai dépassé) → `log.warn` et on continue.
- Comportement inchangé sinon (cookie supprimé, redirection vers la déconnexion Keycloak).

## 5. Endpoints serveur (`lib/api/endpoints/push.ts`, `server-only`)

| Fonction | Backend | Retour | Erreurs (`ApiError.frontCode`) |
|---|---|---|---|
| `getPushPublicKey()` | `GET …/push/public-key` | `string` | `UNAVAILABLE` |
| `savePushSubscription(body, token)` | `POST …/push/subscriptions` | `{ uuid }` | `INVALID`, `UNAUTHENTICATED`, `CONFLICT`, `UNAVAILABLE` |
| `deletePushSubscription(uuid, token, options?)` | `DELETE …/push/subscriptions/{uuid}` | `void` (404 → `void`) | `UNAUTHENTICATED`, `FORBIDDEN`, `UNAVAILABLE` |

## 6. Service Worker (`public/sw.js`)

| Événement | Entrée | Effet |
|---|---|---|
| `install` | — | `skipWaiting()` |
| `activate` | — | `clients.claim()` |
| `push` | `event.data` JSON `{ title, body, url, orderUuid }` | `parsePushMessage` ; valide → `showNotification(title, { body, icon, badge, tag: "order-{orderUuid}", renotify: true, data: { url } })` ; sinon rien |
| `notificationclick` | `notification.data.url` | `close()` ; `safeNotificationPath` ; chemin sûr → focus + `navigate` d'une fenêtre de même origine, sinon `openWindow` ; chemin refusé → rien |
| `pushsubscriptionchange` | `oldSubscription` | réabonnement avec la même `applicationServerKey`, puis `postMessage({ type: "push-subscription-changed" })` à toutes les fenêtres ; échec → rien |

Fonctions pures exposées par `public/sw-core.js` sur `self.ctPushCore` : `parsePushMessage`,
`safeNotificationPath`, `pickClientToFocus`, `sameKey`, `notificationTag`.

## 7. En-têtes HTTP

| Chemin | En-têtes |
|---|---|
| `/sw.js` | `Cache-Control: no-cache`, `Service-Worker-Allowed: /` |
| `/sw-core.js` | `Cache-Control: no-cache` |
| toutes les pages | CSP + `worker-src 'self'` |

## 8. Pages

| Page | Changement |
|---|---|
| `/checkout/confirmation/[uuid]` | encart `PushOptIn` sous le suivi du paiement |
| `/account/profile` | section « Notifications du navigateur » avec `PushToggle` |
| toutes (client connecté) | `PushSync` monté dans `Providers` ; champ caché de déconnexion dans `AccountMenuPanel` |
