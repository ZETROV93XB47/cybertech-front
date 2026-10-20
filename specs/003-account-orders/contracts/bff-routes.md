# Contrat : routes BFF, Server Actions et appels backend de la feature 003

Complète `specs/001-catalog-auth-cart/contracts/bff-routes.md` et
`specs/002-catalog-refresh/contracts/bff-routes.md` : le format, les règles communes et le corps
d'erreur sont inchangés (`{ error: { code: FrontErrorCode, message, fieldErrors?,
retryAfterSeconds?, … } }`, statut HTTP d'origine, voir `specs/001-catalog-auth-cart/contracts/errors.md`).
Schémas : [`../data-model.md`](../data-model.md). Décisions : [`../research.md`](../research.md).
Backend vérifié au commit `84dc038` (`docs/backend/api-map.md` §2, §5, §7, §7b, §8).

## 1. Nouvelles routes exposées au navigateur

Toutes sont réservées à un utilisateur connecté (USER), same-origin, JSON,
`Cache-Control: no-store`. Le jeton est ajouté côté serveur par `getAccessTokenOrThrow()` ; le
navigateur n'appelle jamais Spring.

| Méthode | Route | Entrée (Zod) | Sortie 2xx | Endpoint Spring |
|---|---|---|---|---|
| POST | `/api/checkout/quote` | `OrderQuoteBodySchema` : `{ shippingType: ShippingType, shippingProvider: ShippingProvider, discountKey?: DiscountKey }` (clé omise → `NO_DISCOUNT` côté backend, jamais `null`) | `200 QuoteView` | `POST /management/order/quote` (`OrderQuoteRequestDto`, §D.27) |
| POST | `/api/checkout/place` | `OrderPlaceBodySchema` : `{ shippingType, shippingProvider, paymentType: PaymentType, address: AddressInput, discountKey?: DiscountKey }` | `201 { orderUuid: uuid, status: OrderStatus }` | `POST /management/order/place` (`OrderPlacingRequestDto`, §D.8 ; adresse aplatie en `shippingStreet/City/ZipCode/Country`) |
| GET | `/api/orders/[uuid]/status` | `uuid` (chemin, `z.uuid()`) | `200 { uuid, status: OrderStatus }` | `GET /management/order/status/{uuid}` (§D.18) |
| POST | `/api/orders/[uuid]/retry-payment` | `uuid` (chemin) | `200 { uuid, status: OrderStatus }` | `POST /management/order/retry-payment/{uuid}` |
| POST | `/api/orders/[uuid]` | `OrderUpdateBodySchema` : `{ items: { productUuid, quantity 1..99 }[] (≥ 1, sans doublon), address: AddressInput, shippingType, shippingProvider, paymentType }` | `200 OrderChangeResult` `{ uuid, status, total, refunded }` (montants du backend, la page relit la commande) | `POST /management/order/update` (`OrderUpdateRequestDto`, §D.9 : `uuid` pris dans le chemin, liste **complète** des lignes) |
| POST | `/api/orders/[uuid]/cancel` | `uuid` (chemin) | `200 OrderChangeResult` `{ uuid, status, total, refunded }` (montants du backend, la page relit la commande) | `POST /management/order/cancel` (`{ orderUuid }`, §D.9b) |

| GET | `/api/wishlist/ids` | — | `200 { productUuids: uuid[] }` (≤ `WISHLIST_IDS_MAX`) ; visiteur → `401` (lu comme « vide ») | `GET /services/wishlist/my-wishlist?size=100&sort=createdAt,desc` (§9) |
| PUT | `/api/wishlist/[productUuid]` | `productUuid` (chemin, `z.uuid()`) | `200 { productUuid, isInWishlist: true }` (aussi sur `409 PRODUCT_ALREADY_IN_WISHLIST`) ; `404` produit inconnu | `POST /services/wishlist/add/{productUuid}` |
| DELETE | `/api/wishlist/[productUuid]` | `productUuid` (chemin) | `200 { productUuid, isInWishlist: false }` (aussi sur `404`) | `DELETE /services/wishlist/remove/{productUuid}` |

`AddressInput = { street, zipCode, city, country }`, chaque champ chaîne non vide après `trim`
(équivalent `@NotBlank`). `DiscountKey` : chaîne 1–64, `[A-Z0-9_]`, normalisée en majuscules.
`QuoteView` et `OrderView` sont décrits dans `data-model.md`.

### 1.1 Erreurs par route

Mapping `errorCode` backend → statut → `FrontErrorCode` (les codes marqués **+** sont ajoutés
par la feature, research R18 ; le mapping de `lib/api/errors.ts` et le test d'exhaustivité T020
sont mis à jour).

| Route | Cas backend (`errorCode`) | Statut renvoyé | `FrontErrorCode` | Conduite côté client |
|---|---|---|---|---|
| toutes | entrée Zod invalide (aucun appel backend) | 400 | `invalid` (+ `fieldErrors`) | erreurs sur les champs |
| toutes | `AUTHENTICATION_REQUIRED` / session absente | 401 | `unauthenticated` | brouillon non personnel rangé (R9), redirection connexion, **pas de rejeu automatique** de place |
| toutes | `TOO_MANY_REQUESTS` | 429 | `rate-limited` (+ `retryAfterSeconds` depuis `Retry-After`) | message d'attente, bouton réactivé après le délai |
| toutes | 5xx, délai dépassé, réponse non conforme à Zod | 503 | `unavailable` | « Réessayer » ; aucun montant affiché ni inventé |
| quote, place | `DISCOUNT_TYPE_NOT_ACTIVE` (400, clé inconnue, inactive ou expirée) | 400 | **+** `discount-invalid` | quote : clé précédente rétablie ; place : clé effacée, devis refait, nouvelle validation explicite (FR-020) |
| quote, place | `CART_IS_EMPTY` (409) | 409 | `empty-cart` | retour au panier (`?issue=empty`) |
| quote, place | `USER_NOT_FOUND` (404) | 404 | `not-found` | message « profil introuvable », lien vers le support |
| place | `NOT_ENOUGH_STOCK` (409) | 409 | `insufficient-stock` | retour au panier (`?issue=stock`), lignes relues et signalées |
| place | `USER_NOT_ACTIVE` (403) | 403 | **+** `account-inactive` | message dédié |
| place, retry | `BANK_CARD_NOT_FOUND` (404, aucune carte enregistrée) | 404 | **+** `no-saved-card` | « Ajouter une carte » vers `/account/card?returnTo=/checkout` |
| status, retry, update, cancel | `ORDER_NOT_FOUND` (404) ou `ORDER_DOESNT_BELONGS_TO_USER` (403) | 404 | `not-found` | page « commande introuvable », sans révéler l'existence (le 403 est volontairement rendu en 404) |
| retry | `NO_PREVIOUS_PAYMENT_ATTEMPT_FOUND` (404) | 404 | `not-found` | message « relance impossible », lien vers le détail |
| retry | `PAYMENT_ALREADY_COMPLETED` (409) | 409 | **+** `payment-already-completed` | affiché comme payé, sondage arrêté |
| retry | `PAYMENT_FAILED` (402) | 402 | **+** `payment-failed` | nouvel échec expliqué, bouton relance conservé |
| retry | `FAILED_UPDATING_ORDER` (422) | 422 | **+** `payment-failed` | message « relance impossible pour l'instant », lien vers le détail |
| update | `PAYMENT_FAILED` (402, complément refusé) | 402 | **+** `payment-failed` | complément refusé expliqué, formulaire conservé |
| update | `NOT_ENOUGH_STOCK` (409) | 409 | `insufficient-stock` (+ `productUuid` si connu) | ligne signalée, formulaire conservé |
| update | `ORDER_ALREADY_SHIPPED` (409), `ORDER_NOT_FUNDED` (409) | 409 | **+** `order-locked` | retour au détail rafraîchi |
| cancel | `CANNOT_CANCEL_ORDER` (409) | 409 | **+** `order-locked` | message, détail rafraîchi |
| cancel | `ORDER_REFUND_FAILED` (409) | 409 | **+** `refund-failed` | message avec marche à suivre, détail rafraîchi |

`status` n'échoue normalement que sur 401, 404 et 503 ; le sondage s'arrête sur toute erreur
autre que `unavailable` (qui est réessayée au tour suivant, dans la limite de
`ORDER_STATUS_POLL_TIMEOUT_MS`).

### 1.2 Règles propres à ces routes

- **Aucun rejeu automatique** des écritures de commande (`place`, `retry-payment`, `update`,
  `cancel`) : `isRetryableWrite` est faux pour elles (pas de clé d'idempotence côté backend,
  research R9). `quote` et `status` sont des lectures : une seule nouvelle tentative sur 5xx,
  comme les lectures du lot 1.
- `quote` ne vérifie ni le stock ni l'activité du compte (api-map §7) : ces erreurs
  n'apparaissent qu'à `place`.
- Après `place` réussi, la réponse ne contient que l'UUID et le statut ; le client vide le
  cache du panier (`setQueryData(accountCartQueryKey, emptyCartView)`) puis
  `router.replace('/checkout/confirmation/{uuid}')`.
- `PICKUP_PLACEHOLDER` (retrait en magasin) n'est jamais accepté par les schémas d'entrée :
  `shippingType` est `z.enum(ShippingType)` (`STANDARD | EXPRESS`).
- Méthodes non listées → 405.

## 2. Server Actions

Formulaires avec `useActionState`, validation Zod côté serveur reprenant Bean Validation,
`revalidatePath` après succès. Résultat commun : `{ ok: true }` ou `{ ok: false, fieldErrors?,
formError?: FrontErrorCode, retryAfterSeconds? }`. Session absente → redirection connexion
(`requireSession`).

| Action | Entrée | Endpoint Spring | Erreurs spécifiques |
|---|---|---|---|
| `updateProfile(formData)` | `ProfileInput` : `firstName`, `lastName` (2–50, `@Size`), `phoneNumber?` (envoyé seulement s'il est saisi), `street`, `zipCode`, `city`, `country` (optionnels, envoyés seulement s'ils sont non vides : mise à jour partielle) | `PATCH /user/me` (`UserSelfUpdateRequestDto`, §D.3) | `INVALID_REQUEST` + `fieldErrors` → reportés sur les champs ; `USER_NOT_FOUND` → `not-found` ; revalide `/account/profile` et `/checkout` |
| `updateBankCard(formData)` | `BankCardUpdateInput` : `cardHolderName` (non vide), `expiryMonth` (1–12), `expiryYear` (4 chiffres), assemblés en `MM/YYYY`, refusé s'il est passé | `PUT /bank-card/update` (§D.4b) | `BANK_CARD_EXPIRED` (400) → **+** `card-expired` sur le champ expiration ; `BANK_CARD_NOT_FOUND` → `not-found` (état « aucune carte ») ; revalide `/account/card` |
| `deleteBankCard()` | — (confirmation par `AlertDialog`) | `DELETE /bank-card/delete` (`204`) | `BANK_CARD_NOT_FOUND` → traité comme un succès (carte déjà absente) ; revalide `/account/card` |

L'ajout et le remplacement de la carte ne sont pas des Server Actions : ils passent par Stripe
Elements et les deux routes de la section 2 bis (constitution V v2.3.0, FR-032, research R21).

## 2 bis. Ajout de la carte (R21 révisée)

| Méthode | Route | Entrée (Zod) | Sortie 2xx | Endpoint Spring |
|---|---|---|---|---|
| POST | `/api/bank-card` | `BankCardAddBodySchema` : `{ cardHolderName, cardNumber, expiryDate, cardType, replace?: boolean }` (strict) | `201 BankCard` (masquée) | `replace` → `DELETE /bank-card/delete` puis `POST /bank-card/add` |

Règles :
- USER, same-origin, `Cache-Control: no-store` ;
- le corps n'est **jamais** loggué ni mis en cache ; le log `account.card` ne porte que le
  réseau, `replace` et le résultat (jamais titulaire, numéro, 4 derniers chiffres, expiration) ;
- corps invalide → `400 invalid` avec les erreurs de champ, sans appel backend ;
- `400` backend → `invalid` ; carte expirée → `card-expired` ; carte déjà présente sans
  `replace` → `409 conflict` ;
- la réponse ne contient que la carte masquée (`maskedNumber`, réseau, expiration), jamais le
  numéro reçu.

## 3. Appels serveur (Server Components), sans route BFF

| Appel | Endpoint Spring | Cache | Utilisé par |
|---|---|---|---|
| `getMe(token)` (existant) | `GET /user/me` | `no-store` | profil, préremplissage du tunnel (adresse découpée, R16) |
| `getAccountCart(token)` (existant) | `GET /cart/get` | `no-store` | tunnel (panier vide → redirection `/cart`) |
| `getShippingOptions()` (existant) | `GET /shipping/options` | données 600 s (`SHIPPING_OPTIONS_REVALIDATE_SECONDS`), public, sans jeton | tunnel, modification de commande, fiche produit |
| `getActiveDiscounts()` (existant) | `GET /discounts/active` | cache existant, public, sans jeton | bloc réduction (panier et tunnel) |
| `getMyOrders(token, { statuses, page })` | `GET /management/order/mine?status=…&page=…&size=ORDERS_PAGE_SIZE&sort=createdAt,desc` | `no-store` | `/account/orders` |
| `getOrder(token, uuid)` | `GET /management/order/get/{uuid}` | `no-store` | détail, modification, confirmation |
| `getBankCard(token)` | `GET /bank-card/get` | `no-store` ; `404 BANK_CARD_NOT_FOUND` → `null` (« aucune carte ») | `/account/card` |

Règles :
- les appels privés portent `Authorization` et ne sont jamais mis en cache partagé (aucune
  donnée privée dans une page statique ou ISR) ;
- les appels publics (livraison, réductions) n'envoient jamais de jeton ;
- `X-API-VERSION: 1.0`, timeout et logs par `lib/api/client.ts` (inchangé) ; chaque réponse
  est validée par Zod, non conforme → `error` loggé et `unavailable` ;
- `getOrder` : `ORDER_NOT_FOUND` ou `ORDER_DOESNT_BELONGS_TO_USER` → `notFound()` ;
- `/account/orders` : les statuts inconnus présents dans l'adresse sont ignorés (pas d'appel
  en 400).

## 4. Proxy et pages privées

- `proxy.ts` : toute requête dont le chemin commence par un élément de
  `PRIVATE_PATH_PREFIXES` (`/account`, `/checkout`) sans cookie de session Auth.js
  (`authjs.session-token` ou `__Secure-authjs.session-token`, nom fourni par
  `lib/auth/session-cookie.ts`) est redirigée (307) vers `/login?callbackUrl=<chemin et
  recherche d'origine>`. Les routes `/api/checkout/**` et `/api/orders/**` ne sont pas
  redirigées : elles répondent `401 unauthenticated` (règle commune du lot 1).
- Chaque layout privé (`app/(account)/layout.tsx`) appelle `requireSession(pathname)`, qui
  valide réellement la session (constitution II) ; pages dynamiques, `no-store`.
- `callbackUrl` passe par `safeCallbackPath` (chemin relatif same-origin uniquement).

## 5. Logs

Logger enfant par module (`lib/logger.ts`) : `checkout.quote`, `checkout.place`,
`orders.status`, `orders.retry-payment`, `orders.update`, `orders.cancel`, `orders.read`,
`account.profile`, `account.card`. `wishlist.ids`, `wishlist.toggle`, `wishlist.page` (UUID de produit en clair : donnée
publique ; UUID d'utilisateur jamais loggué).

- En plus du log de chaque appel backend (méthode, route, statut, durée, `X-Request-Id`,
  `errorCode`, déjà fait par `lib/api/client.ts`) :
  - `info` : commande créée (`orderUuid` masqué, statut, nombre de lignes, type et
    transporteur, `discountApplied`) ; commande modifiée ou annulée (`orderUuid` masqué,
    nouveau statut) ; profil ou carte mis à jour (aucune valeur de champ) ;
  - `warn` : `discount-invalid` à `place`, `payment-failed`, `order-locked`,
    `refund-failed`, `account-inactive`, 429 ;
  - `error` : 5xx et réponse non conforme à Zod.
- UUID de commande et d'utilisateur masqués (`maskUuid`).
- **Jamais** dans un log : adresse, téléphone, nom, email, titulaire ou numéro (même masqué)
  de carte, date d'expiration, corps de formulaire, jeton, cookie. Les montants et la clé de
  réduction peuvent être loggués.

## 6. Limites de débit

| Endpoint | Limite backend | Comportement du front |
|---|---|---|
| `POST /management/order/quote` | 60 req/min par utilisateur (compartiment `order.quote`) | les devis sont dédupliqués par TanStack (clé = choix + version du panier) et les obsolètes annulés ; un 429 affiche « Trop de calculs d'un coup : réessaie dans N s » dans le récapitulatif, garde les derniers montants marqués « non à jour » et bloque la validation jusqu'au prochain devis réussi |
| `POST /management/order/place` | 30 req/min | bouton désactivé pendant l'envoi ; un 429 affiche le délai `retryAfterSeconds` et réactive le bouton après |
| autres (`status`, `retry-payment`, `update`, `cancel`, panier) | limites générales du backend | 429 → message d'attente ; le sondage du statut s'interrompt jusqu'au délai indiqué puis reprend dans la limite de `ORDER_STATUS_POLL_TIMEOUT_MS` |

Le 429 est toujours relayé avec son statut et `retryAfterSeconds` (lu dans `Retry-After`),
jamais rejoué automatiquement par le BFF.
