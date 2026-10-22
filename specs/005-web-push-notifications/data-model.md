# Data Model: Notifications Web Push

Aucune donnée persistée côté serveur du site. Les abonnements vivent dans le backend ; le
navigateur garde sa souscription (gérée par lui) et l'UUID renvoyé par le backend.

## 1. Enums (`lib/enums/push.ts`)

| Enum | Valeurs | Rôle |
|---|---|---|
| `PushSupport` | `SUPPORTED = "supported"`, `INSTALL_REQUIRED = "install-required"`, `UNSUPPORTED = "unsupported"` | Capacité du navigateur (research R3) |
| `PushState` | `UNSUPPORTED`, `INSTALL_REQUIRED`, `IDLE` (à activer), `PENDING`, `ENABLED`, `DENIED`, `UNAVAILABLE`, `CONFLICT`, `ERROR` (valeurs kebab-case) | État affiché (FR-005) |
| `PushSwMessageType` | `SUBSCRIPTION_CHANGED = "push-subscription-changed"` | Message SW → pages (R9) |

Compléments d'enums existants :
- `StorageKey.PUSH = "ct_push_v1"` (`localStorage`), `StorageKey.PUSH_SYNC = "ct_push_sync_v1"`
  (`sessionStorage`) — research R6.
- `BackendErrorCode` : rien à ajouter (codes push déjà présents).

### Transitions de `PushState`

```text
(rendu) ──detect──▶ UNSUPPORTED | INSTALL_REQUIRED          (terminal pour l'onglet)
        ──permission denied──▶ DENIED                         (terminal : pas de bouton)
        ──record + granted──▶ ENABLED
        ──sinon──▶ IDLE
IDLE ──enable()──▶ PENDING ──ok──▶ ENABLED
                          ├─ permission default ─▶ IDLE
                          ├─ permission denied ──▶ DENIED
                          ├─ unavailable (503) ──▶ UNAVAILABLE ─enable()─▶ PENDING
                          ├─ conflict (409) ─────▶ CONFLICT ─reclaim()─▶ PENDING
                          └─ autre ─────────────▶ ERROR ─enable()─▶ PENDING
ENABLED ──disable()──▶ PENDING ──ok (204/404)──▶ IDLE
                              └─ échec ────────▶ ENABLED + message d'erreur
```

`unauthenticated` (session expirée) mène à `ERROR` avec le message de session expirée commun.

## 2. Schémas Zod (`lib/schemas/push.ts`)

| Schéma | Forme | Règles |
|---|---|---|
| `PushPublicKeySchema` | `{ publicKey: string }` | réponse backend et BFF ; base64url (`/^[A-Za-z0-9_-]+$/`), non vide |
| `PushSubscriptionBodySchema` | `{ endpoint, expirationTime, keys: { p256dh, auth } }` | `.strict()` ; `endpoint` URL `https:` ≤ `PUSH_ENDPOINT_MAX_LENGTH` ; `expirationTime` entier ≥ 0 ou `null` ; clés base64url non vides ≤ `PUSH_KEY_MAX_LENGTH` |
| `PushSubscriptionSavedSchema` | `{ uuid: string (uuid) }` | réponse backend (`uuid` optionnel dans l'OpenAPI : exigé ici) et BFF |
| `PushSubscriptionUuidParamSchema` | `z.uuid()` | paramètre de route `DELETE` et champ caché de déconnexion |
| `PushRecordSchema` | `{ subscriptionUuid: string (uuid) }` | lecture de `ct_push_v1` ; invalide → ignoré et effacé |

`toBackendSubscription(body)` retire `expirationTime` quand il vaut `null`. Test de type
(`tests/unit/push/push-contract.test-d.ts`) : `PushSubscriptionBody` assignable à
`components["schemas"]["PushSubscriptionRequestDto"]` après conversion.

## 3. Message de notification (contrat backend → SW)

| Champ | Type | Validation dans `sw-core.js` (`parsePushMessage`) |
|---|---|---|
| `title` | string | non vide |
| `body` | string | chaîne (peut être vide) |
| `url` | string | non vide ; contrôlé au clic par `safeNotificationPath` |
| `orderUuid` | string | format UUID ; sert au `tag` `order-{orderUuid}` |

Tout autre champ est ignoré ; un JSON illisible ou incomplet → `null` (rien d'affiché).

## 4. Vues et types TypeScript (`features/notifications/`)

- `PushStatus` : `{ state: PushState; message?: string }` — exposé par `usePushNotifications`.
- `UsePushNotificationsResult` : `{ status, enable(): Promise<void>, disable(): Promise<void>,
  reclaim(): Promise<void> }`.
- `PushRecord` : `{ subscriptionUuid: string }` (inféré de `PushRecordSchema`).

## 5. Constantes (`lib/constants/push.ts`, sauf mention)

| Constante | Valeur | Origine |
|---|---|---|
| `SERVICE_WORKER_PATH` | `"/sw.js"` | R1 |
| `SERVICE_WORKER_SCOPE` | `"/"` | R1, en-tête `Service-Worker-Allowed` |
| `SERVICE_WORKER_CORE_PATH` | `"/sw-core.js"` | R1 (en-têtes) |
| `PUSH_SIGN_OUT_TIMEOUT_MS` | `2_000` | R8 : déconnexion jamais retardée de plus de 2 s |
| `PUSH_ENDPOINT_MAX_LENGTH` | `2_048` | R12 : borne défensive (adresses FCM ≈ 200 car.) |
| `PUSH_KEY_MAX_LENGTH` | `256` | R12 : `p256dh` = 87 car., `auth` = 22 car. en base64url |
| `PUSH_NOTIFICATION_TAG_PREFIX` | `"order-"` | R10 (copie dans `sw-core.js`, test d'égalité) |
| `PUSH_SIGN_OUT_FIELD` | `"pushSubscriptionUuid"` | R8, champ caché du formulaire de déconnexion |
| `PUSH_ENDPOINT_LOG_PLACEHOLDER` | `"…"` | `maskPushEndpoint` (`lib/log-safety.ts`) |
| `BACKEND_PATHS.pushPublicKey` | `${API_BASE_PATH}/notifications/push/public-key` | `lib/constants/api.ts` |
| `BACKEND_PATHS.pushSubscriptions` | `${API_BASE_PATH}/notifications/push/subscriptions` | idem, + `pushSubscriptionPath(uuid)` |
| `BFF_ROUTES.pushPublicKey`, `BFF_ROUTES.pushSubscriptions` | `/api/notifications/push/public-key`, `/api/notifications/push/subscriptions` | `lib/constants/routes.ts`, + `pushSubscriptionRoute(uuid)` |
| `CSP_SOURCES` / directive `worker-src` | `'self'` | `lib/security/csp.ts` (R13) |
| `SERVICE_WORKER_HEADERS` | `Cache-Control: no-cache`, `Service-Worker-Allowed: /` | `lib/constants/security.ts`, lus par `next.config.ts` |

Constantes en tête de `public/sw-core.js` / `public/sw.js` : `NOTIFICATION_ICON_PATH`
(`/icons/notification-192.png`), `NOTIFICATION_BADGE_PATH` (`/icons/notification-badge-96.png`),
`ORDER_TAG_PREFIX`, `SUBSCRIPTION_CHANGED_MESSAGE`, `UUID_PATTERN`.
