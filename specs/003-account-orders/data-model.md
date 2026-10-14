# Data model — 003 Mon compte et mes commandes

Aucune donnée n'est stockée côté serveur front. Les types ci-dessous sont des schémas Zod
(réponses backend, corps envoyés, stockage navigateur, entrées de route) ou des vues préparées
par le BFF ou par des fonctions pures. Toutes les valeurs fermées sont des enums string
(constitution XII) ; les schémas sont construits depuis les enums (`z.enum(OrderStatus)`). Les
noms suivent le code (anglais) ; les libellés visibles viennent de `features/*/messages.ts`.
Champs vérifiés contre `lib/api/schema.d.ts` (backend `84dc038`, 2026-10-14).

## 1. Enums

| Enum | Fichier | Valeurs | Source |
|---|---|---|---|
| `OrderStatus` | `lib/enums/order.ts` | `CREATED`, `AWAITING_PAYMENT`, `PAYMENT_FAILED`, `PAID`, `AWAITING_SHIPPING`, `SHIPPED`, `DELIVERED`, `RETURNED`, `CANCELED`, `REFUNDED` (valeurs = noms backend) | `entities/enums/OrderStatus.java` |
| `PaymentType` | `lib/enums/order.ts` | `MASTERCARD`, `VISA`, `APPLE_PAY`, `GOOGLE_PAY` | §D.8 |
| `BankCardType` | `lib/enums/bank-card.ts` | `VISA`, `MASTERCARD`, `AMERICAN_EXPRESS`, `DISCOVER`, `OTHER` | §D.21 (lecture seule) |
| `CheckoutStep` | `lib/enums/checkout.ts` | `ADDRESS = "address"`, `SHIPPING = "shipping"`, `PAYMENT = "payment"` | R3 |
| `OrderOutcome` | `lib/enums/order.ts` | `CANCELED = "canceled"`, `REFUNDED = "refunded"`, `RETURNED = "returned"`, `PAYMENT_FAILED = "payment-failed"` | R13, FR-024 |
| `ShippingChoiceKind` | `lib/enums/checkout.ts` | `CARRIER = "carrier"`, `PICKUP_PLACEHOLDER = "pickup-placeholder"` | R8 |
| `DelaySource` | `lib/enums/checkout.ts` | `BACKEND = "backend"`, `ESTIMATE = "estimate"` | R8 |
| `CartIssue` | `lib/enums/cart.ts` (complété) | `STOCK = "stock"`, `EMPTY = "empty"` | R10 (`/cart?issue=`) |
| `DiscountBlockMode` | `lib/enums/checkout.ts` | `CART = "cart"` (sous-total et remise seulement), `CHECKOUT = "checkout"` (récapitulatif complet) | clarification Q3 |
| `OrderChangeKind` | `lib/enums/order.ts` | `REFUNDED = "refunded"`, `CHARGED = "charged"`, `UNCHANGED = "unchanged"` | FR-025 : comparaison de l'ancien et du nouveau `totalAmount` / `refundedAmount` du backend, sans calcul de montant |

Enums existants réutilisés sans changement : `ShippingType`, `ShippingProvider`,
`ExpressPromise` (`lib/enums/shipping.ts`), `DiscountCalculationType`.

Compléments d'enums existants :

| Enum | Ajouts |
|---|---|
| `StorageKey` | `DISCOUNT = "ct_discount_v1"` (sessionStorage, R7), `CHECKOUT = "ct_checkout_v1"` (sessionStorage, R9), `ORDER_EDIT = "ct_order_edit_v1"` (sessionStorage : UUID de la commande, lignes, livraison, paiement, sans adresse ; restauré après reconnexion, jamais renvoyé automatiquement, FR-002) |
| `QueryKey` | `QUOTE = "quote"`, `ORDER_STATUS = "order-status"`, `ORDER_SEARCH = "order-search"` |
| `FrontErrorCode` | `DISCOUNT_INVALID = "discount-invalid"`, `PAYMENT_FAILED = "payment-failed"`, `PAYMENT_ALREADY_COMPLETED = "payment-already-completed"`, `ORDER_LOCKED = "order-locked"`, `REFUND_FAILED = "refund-failed"`, `ACCOUNT_INACTIVE = "account-inactive"`, `CARD_EXPIRED = "card-expired"` |
| `NavSection` | `ACCOUNT = "account"` (rubrique courante des pages `/account/**` et `/checkout`) |

Mapping `BackendErrorCode` → `FrontErrorCode` ajouté dans `lib/api/errors.ts` (R18) :

| Backend | Front |
|---|---|
| `DISCOUNT_TYPE_NOT_ACTIVE` | `DISCOUNT_INVALID` |
| `PAYMENT_FAILED` (402), `FAILED_UPDATING_ORDER` (422) | `PAYMENT_FAILED` |
| `PAYMENT_ALREADY_COMPLETED` | `PAYMENT_ALREADY_COMPLETED` |
| `ORDER_ALREADY_SHIPPED`, `CANNOT_CANCEL_ORDER`, `ORDER_NOT_FUNDED` | `ORDER_LOCKED` |
| `ORDER_REFUND_FAILED` | `REFUND_FAILED` |
| `USER_NOT_ACTIVE` | `ACCOUNT_INACTIVE` |
| `BANK_CARD_EXPIRED` | `CARD_EXPIRED` |
| `ORDER_NOT_FOUND`, `ORDER_DOESNT_BELONGS_TO_USER`, `BANK_CARD_NOT_FOUND`, `NO_PREVIOUS_PAYMENT_ATTEMPT_FOUND` | `NOT_FOUND` (une commande d'un autre utilisateur est présentée comme introuvable) |
| `CART_IS_EMPTY` / `NOT_ENOUGH_STOCK` | `EMPTY_CART` / `INSUFFICIENT_STOCK` (existants) |

## 2. Réponses backend

### 2.1 Commande — `OrderResponseSchema` (`lib/schemas/order.ts`)

Source : `OrderResponseDto` (§D.17), endpoints `place`, `get/{uuid}`, `mine`, `update`,
`cancel`, `retry-payment`.

| Champ | Zod | Règle |
|---|---|---|
| `uuid`, `userUuid` | `z.uuid()` | — |
| `orderDate` | `z.iso.date()` | jour seulement |
| `createdAt` | `z.string()` (LocalDateTime sans fuseau) | tri et affichage date + heure |
| `status` | `z.enum(OrderStatus)` | — |
| `totalAmount` | `z.number().nonnegative()` | fait foi, toujours affiché |
| `refundedAmount` | `z.number().nonnegative()` | affiché si > 0 |
| `currency` | `z.string().length(CURRENCY_CODE_LENGTH)` | ISO 4217 |
| `subtotalAmount`, `discountAmount`, `shippingCost` | `z.number().nonnegative().nullable()` | `null` sur les commandes antérieures au détail |
| `discountKey` | `z.string().min(1)` | jamais `null` (colonne `NOT NULL`, `NO_DISCOUNT` par défaut) |
| `discountCalculationType` | `z.enum(DiscountCalculationType).nullable()` | `null` sur les commandes anciennes |
| `shippingType`, `shippingProvider` | `z.enum(ShippingType)`, `z.enum(ShippingProvider)` | — |
| `shippingAddress` | `z.string()` | adresse aplatie, découpée par `parseFlatAddress` (§4.6) |
| `orderItems` | `z.array(OrderItemSchema).min(1)` | — |

`OrderItemSchema` = `{ orderItemUuid: uuid, productUuid: uuid, productName: string min 1,
quantity: int ≥ 1, unitPrice: number ≥ 0, lineItemTotalPrice: number ≥ 0 }`.

Absents du DTO : moyen de paiement (`paymentType`), statut de paiement, numéro de suivi. Le
moyen de paiement n'est donc ni affiché dans le détail ni prérempli en modification (R14).

`OrdersPageSchema` = schéma de page existant (`lib/schemas/paged.ts`) paramétré par
`OrderResponseSchema` (`PagedModel` : `content`, `page.{ size, number, totalElements,
totalPages }`).

### 2.2 Statut — `OrderStatusSchema`

`{ uuid: z.uuid(), status: z.enum(OrderStatus) }` (§D.18), pour le sondage de la confirmation.

### 2.3 Devis — `OrderQuoteResponseSchema` (`lib/schemas/order.ts`)

Source : `OrderQuoteResponseDto` (§D.27).

| Champ | Zod | Règle |
|---|---|---|
| `subtotalAmount` | `number ≥ 0` | — |
| `discountKey` | `string min 1` | clé effectivement chiffrée |
| `discountCalculationType` | `z.enum(DiscountCalculationType)` | — |
| `discountAmount` | `number ≥ 0` | 0 si la remise n'est pas appliquée |
| `discountApplied` | `boolean` | toujours présent ; faux sous `minOrderAmount` ou pour `NO_DISCOUNT` |
| `minOrderAmount` | `number ≥ 0`, `nullable` | — |
| `shippingCost` | `number ≥ 0` | — |
| `totalAmount` | `number ≥ 0` | invariant backend `max(0, sous-total − remise) + port`, jamais recalculé |
| `currency` | ISO 4217 | `EUR` |

### 2.4 Option de livraison — `ShippingOptionSchema` (complété, `lib/schemas/shipping.ts`)

Champs existants `provider`, `type`, `cost`, `currency`, plus deux champs **optionnels**
anticipant la demande backend (`backend-prompts-lot2.md` §9, délais fixes de configuration) :
`minDeliveryDays`, `maxDeliveryDays` (`z.number().int().nonnegative().optional()`,
`max ≥ min` vérifié par `refine`). Les noms définitifs seront confirmés par `npm run gen:api`
(test de type schéma ↔ `schema.d.ts`) ; absents, le délai vient de `SHIPPING_DELAYS`.

### 2.5 Profil — `UserProfileSchema` (`lib/schemas/user.ts`)

Source : `UserResponseDto` (§D.20). Étend `CurrentUserSchema` : `username: string min 1`,
`address: string.nullable().optional()` (aplatie), `role`. `sex` et `birthDate` ne sont pas
lus (non affichés). Le téléphone n'est jamais renvoyé.

### 2.6 Carte — `BankCardSchema` (`lib/schemas/bank-card.ts`)

Source : `BankCardResponseDto` (§D.21) : `uuid`, `cardHolderName` (min 1), `maskedNumber`
(min 1, jamais de numéro complet), `expiryDate` (regex `MM/YYYY`), `cardType`
(`z.enum(BankCardType)`), `userUuid`. `404 BANK_CARD_NOT_FOUND` → « aucune carte » (pas une
erreur).

### 2.7 Campagnes actives

`ActiveDiscountSchema` existant (§D.15) réutilisé tel quel ; `isDisplayableDiscount` écarte
`NONE` (`NO_DISCOUNT`).

## 3. Corps envoyés et entrées validées

Contraintes recopiées de Bean Validation (constitution V) ; chaque schéma valide l'entrée du
navigateur dans la route BFF ou la Server Action avant tout appel backend.

| Schéma | Fichier | Champs et règles | Envoyé à |
|---|---|---|---|
| `DiscountKeySchema` | `lib/schemas/discount.ts` | chaîne `trim().toUpperCase()`, 1 à `DISCOUNT_KEY_MAX_LENGTH`, regex `DISCOUNT_KEY_PATTERN` (`^[A-Z0-9_]+$`) | quote, place |
| `OrderQuoteBodySchema` | `lib/schemas/order.ts` | `shippingType`, `shippingProvider` (enums, requis), `discountKey` (`DiscountKeySchema`, défaut `NO_DISCOUNT_KEY`, jamais `null`) | `POST /order/quote` |
| `ShippingAddressSchema` | `lib/schemas/address.ts` | `street`, `city`, `zipCode`, `country` : `trim()`, non vides (`@NotBlank`), ≤ `ADDRESS_FIELD_MAX_LENGTH` | — (composé) |
| `OrderPlaceBodySchema` | `lib/schemas/order.ts` | `paymentType`, `shippingType`, `shippingProvider` (enums), adresse (`ShippingAddressSchema`), `discountKey` (défaut `NO_DISCOUNT_KEY`) ; le BFF le traduit en `shippingStreet/City/ZipCode/Country` | `POST /order/place` |
| `OrderUpdateBodySchema` | `lib/schemas/order.ts` | idem place sans `discountKey` (la remise d'origine est conservée) + `items` : tableau 1..`ORDER_MAX_LINES` de `{ productUuid: uuid, quantity: int 1..CART_LINE_MAX_QUANTITY }`, sans doublon de `productUuid` (`refine`) ; l'UUID vient du chemin | `POST /order/update` (`uuid` + `itemUpdateRequestDtoList`) |
| `OrderUuidParamSchema` | `lib/schemas/order.ts` | `z.uuid()` | chemins `/api/orders/[uuid]/…`, pages |
| `OrdersListParamsSchema` | `lib/schemas/order.ts` | `status` : tableau d'`OrderStatus` (valeurs inconnues ignorées, doublons retirés), `page` : entier ≥ 1 (défaut 1, converti en index 0 pour le backend) | `GET /order/mine?status=&page=&size=ORDERS_PAGE_SIZE&sort=ORDERS_SORT` |
| `ProfileUpdateSchema` | `lib/schemas/user.ts` | `firstName`, `lastName` : `trim()`, 2..50 (`@Size`) ; `phoneNumber` : optionnel, envoyé seulement s'il est saisi, regex `PHONE_PATTERN` ; `street`, `city`, `zipCode`, `country` : optionnels (mise à jour partielle), chaîne vide → champ omis | `PATCH /user/me` |
| `BankCardUpdateSchema` | `lib/schemas/bank-card.ts` | `cardHolderName` : `trim()`, non vide ; `expiryDate` : `MM/YYYY` (`@Pattern`) et `refine` « mois courant ou futur » (fuseau `SHOP_TIME_ZONE`), sinon `CARD_EXPIRED` côté champ | `PUT /bank-card/update` |

Le formulaire de carte saisit le mois (`01`–`12`) et l'année (4 chiffres) dans deux listes ; la
Server Action les assemble en `expiryDate` `MM/YYYY` avant `BankCardUpdateSchema` (contracts
§2 : `expiryMonth`, `expiryYear` = champs du formulaire, `expiryDate` = valeur validée et envoyée).

`fieldErrors` du backend (validation `@Valid`) sont reportés sur les champs du formulaire par
leur nom (correspondance `shippingStreet` → `street`, etc.).

## 4. Vues

### 4.1 Devis affiché — `QuoteView` (`features/checkout/quote-view.ts`)

Sortie de `toQuoteView(quote)` :

| Champ | Type | Règle |
|---|---|---|
| `subtotal`, `discount`, `shippingCost`, `total` | number | copiés du devis, jamais recalculés |
| `currency` | string | — |
| `discountKey` | string \| `null` | `null` si `NO_DISCOUNT_KEY` |
| `isDiscountApplied` | boolean | `discountApplied` |
| `missingAmount` | number \| `null` | `roundToCents(minOrderAmount − subtotal)` si remise non appliquée, `minOrderAmount` non nul et clé ≠ `NO_DISCOUNT_KEY` ; sinon `null` (R6) ; information non facturée |
| `isStale` | boolean | vrai tant qu'un devis plus récent est attendu (montants en cours de mise à jour, `aria-busy`) |

Sur le panier (clarification Q3), seuls `subtotal`, `discount`, `discountKey`,
`isDiscountApplied` et `missingAmount` sont rendus.

### 4.2 Choix de livraison — `ShippingChoice` (`features/checkout/shipping-choices.ts`)

Sortie de `buildShippingChoices(options, now)`, union discriminée par `kind` :

| `kind` | Champs |
|---|---|
| `CARRIER` | `type`, `provider`, `cost`, `currency`, `delay: { minDays, maxDays }`, `delaySource: DelaySource`, `expressPromise: ExpressPromise \| null` (type `EXPRESS` seulement) |
| `PICKUP_PLACEHOLDER` | `isDisabled: true` (toujours) ; aucun prix, aucun envoi au backend |

Règles : un `CARRIER` par couple renvoyé par le backend, ordonné `STANDARD` puis `EXPRESS`,
puis par transporteur (ordre de l'enum) ; le `PICKUP_PLACEHOLDER` toujours en dernier ;
options indisponibles (erreur) → liste vide et message, validation impossible.

### 4.3 Brouillon du tunnel — `CheckoutDraftSchema` (`lib/schemas/storage.ts`)

Stocké sous `StorageKey.CHECKOUT` (sessionStorage), revalidé par Zod à chaque lecture ; valeur
invalide → supprimée. **Aucune donnée personnelle** (pas d'adresse, R9).

| Champ | Type |
|---|---|
| `step` | `CheckoutStep` |
| `shippingType`, `shippingProvider` | enums, optionnels |
| `paymentType` | `PaymentType`, optionnel |
| `hadCustomAddress` | boolean (affiche « ton adresse a été réinitialisée » après reconnexion) |

La clé de réduction est stockée à part sous `StorageKey.DISCOUNT` (`DiscountKeySchema`), car le
panier la lit aussi (R7).

### 4.4 Ligne de liste — `OrderSummaryRow` (`features/orders/order-view.ts`)

`{ uuid, createdAt, status, statusTone, itemCount (Σ quantités), total, currency }` ;
`statusTone` (enum `StatusTone` : `PROGRESS`, `SUCCESS`, `WARNING`, `NEUTRAL`) pilote la
pastille de statut via les tokens du thème, jamais la seule couleur (libellé toujours présent).

### 4.5 Détail — `OrderView` (`features/orders/order-view.ts`)

Sortie de `toOrderView(order)` :

| Champ | Type | Règle |
|---|---|---|
| `uuid`, `createdAt`, `status`, `currency` | — | — |
| `lines` | `{ productUuid, productName, quantity, unitPrice, lineTotal, isInCatalog }[]` | `isInCatalog` : l'UUID figure dans la réponse de `GET /product/availability` (un seul appel pour toutes les lignes, `getAvailability` existant ; UUID inconnus absents de la réponse) ; lien vers la fiche seulement si vrai, sinon nom et prix d'achat en texte seul ; disponibilité indisponible (erreur) → aucun lien |
| `address` | `ParsedAddress` + `raw` | `raw` affiché tel quel, les champs servent à la modification |
| `shipping` | `{ type, provider }` | — |
| `breakdown` | `{ subtotal, discount, discountKey \| null, shippingCost }` \| `null` | `null` si l'un de `subtotalAmount`, `discountAmount`, `shippingCost` est `null` (commande ancienne) : seul `total` s'affiche (FR-023) ; `discountKey` `null` si `NO_DISCOUNT` |
| `total`, `refunded` | number | `refunded` affiché si > 0 |
| `timeline` | `{ steps: { status, state: "done" \| "current" \| "upcoming" }[], outcome: OrderOutcome \| null }` | §5 |
| `canEdit`, `canCancel`, `canRetryPayment` | boolean | §5, indicatifs (le backend reste juge, FR-027) |

### 4.6 Adresse découpée — `ParsedAddress` (`lib/address.ts`)

Sortie de `parseFlatAddress(text)` (R16) : `{ street, zipCode, city, country }`, chaque champ
`string` (vide si inconnu). Format source : `"%s, %s %s, %s"` (`UserMapper#mapAddressToString`,
`OrderMapper#mapAddressToString`).

Règles : `null`/vide → tous vides ; moins de 3 segments séparés par `", "` → tous vides
(format inattendu) ; dernier segment = pays ; avant-dernier = code postal (jusqu'au premier
espace) + ville (reste) ; segments précédents rejoints par `", "` = rue ; tout segment ou
sous-partie égal à `"null"` (sortie de `String.format` sur un champ nul) → vide.

### 4.7 Profil — `ProfileView` (`features/account/profile-view.ts`)

`{ firstName, lastName, email, username, address: ParsedAddress, rawAddress: string | null }` ;
l'email est affiché en lecture seule (jamais loggué, `maskEmail`).

## 5. Cycle de vie d'une commande et actions permises

Règles lues dans le backend (`OrderManagementServiceImp`,
`OrderCancellationTransactionalDelegateImp`, `OrderStatus` codes 1 à 10) :

| Statut (code) | Frise | `canEdit` | `canCancel` | `canRetryPayment` | Ton |
|---|---|---|---|---|---|
| `CREATED` (1) | étape 1 | ✅ | ✅ | — | `PROGRESS` |
| `AWAITING_PAYMENT` (2) | étape 2 | ✅ | ✅ | — | `PROGRESS` |
| `PAYMENT_FAILED` (3) | issue (après étape 2) | ✅ | ✅ | ✅ | `WARNING` |
| `PAID` (4) | étape 3 | ✅ | ✅ | — | `SUCCESS` |
| `AWAITING_SHIPPING` (5) | étape 4 | ✅ | ❌ (`CANNOT_CANCEL_ORDER`) | — | `PROGRESS` |
| `SHIPPED` (6) | étape 5 | ❌ (`ORDER_ALREADY_SHIPPED`) | ❌ | — | `PROGRESS` |
| `DELIVERED` (7) | étape 6 | ❌ | ❌ | — | `SUCCESS` |
| `RETURNED` (8) | issue | ❌ | ❌ | — | `NEUTRAL` |
| `CANCELED` (9) | issue | ❌ | ❌ (re-annuler = sans effet) | — | `NEUTRAL` |
| `REFUNDED` (10) | issue | ❌ | ❌ (sans effet) | — | `NEUTRAL` |

- Modification : refusée dès que le code ≥ `SHIPPED` (6), donc aussi pour `RETURNED`,
  `CANCELED`, `REFUNDED` ; permise en `AWAITING_SHIPPING` (fenêtre de grâce de 30 min après
  paiement, relancée par chaque modification d'une commande payée).
- Annulation : refusée pour `AWAITING_SHIPPING`, `SHIPPED`, `DELIVERED`, `RETURNED` ;
  `CANCELED` / `REFUNDED` = sans effet (le front ne propose pas le bouton).
- Relance de paiement : le backend l'accepte aussi en `CREATED` et `AWAITING_PAYMENT`, mais le
  front ne la propose qu'en `PAYMENT_FAILED` (spec FR-014) ; `PAID` → `409
  PAYMENT_ALREADY_COMPLETED`, affiché comme payé.
- Frise nominale `ORDER_TIMELINE_STEPS` : `CREATED → AWAITING_PAYMENT → PAID →
  AWAITING_SHIPPING → SHIPPED → DELIVERED` ; une issue (`OrderOutcome`) est affichée à part,
  après la dernière étape atteinte connue (au plus l'étape 2 pour `PAYMENT_FAILED`).
- Statuts terminaux pour le sondage de la confirmation (`CONFIRMATION_TERMINAL_STATUSES`) :
  tous sauf `CREATED` et `AWAITING_PAYMENT`.

## 6. Constantes ajoutées

| Constante | Valeur | Fichier | Raison |
|---|---|---|---|
| `PRIVATE_PATH_PREFIXES` | `["/account", "/checkout"]` | `lib/constants/security.ts` (remplace `PRIVATE_PATH_PREFIX`) | R1 |
| `CHECKOUT_PATH` | `"/checkout"` | `lib/constants/routes.ts` | R2 |
| `checkoutConfirmationPath(uuid)` | `/checkout/confirmation/{uuid}` | `lib/constants/routes.ts` | R2, R10 |
| `ACCOUNT_PATHS` | `{ root: "/account", orders: "/account/orders", profile: "/account/profile", card: "/account/card" }` | `lib/constants/routes.ts` | R2 |
| `orderPath(uuid)`, `orderEditPath(uuid)` | `/account/orders/{uuid}`, `…/edit` | `lib/constants/routes.ts` | R2 |
| `BFF_ROUTES.checkoutQuote`, `.checkoutPlace` | `/api/checkout/quote`, `/api/checkout/place` | `lib/constants/routes.ts` | R4, R9 |
| `BFF_ROUTES.order(uuid)`, `.orderStatus(uuid)`, `.orderCancel(uuid)`, `.orderRetryPayment(uuid)` | `/api/orders/{uuid}`, `…/status`, `…/cancel`, `…/retry-payment` | `lib/constants/routes.ts` | R11, R14, R15 |
| `BACKEND_PATHS.order*` | `/management/order/{quote,place,update,cancel,mine,get/{uuid},status/{uuid},retry-payment/{uuid}}` | `lib/constants/api.ts` | api-map §7 |
| `BACKEND_PATHS.userMe` (PATCH réutilise le chemin existant), `.bankCard*` | `/user/me`, `/bank-card/{get,update,delete}` | `lib/constants/api.ts` | api-map §2, §8 |
| `NO_DISCOUNT_KEY` | `"NO_DISCOUNT"` | `lib/constants/discount.ts` | `CyberTechAppConstants.java:39` |
| `DISCOUNT_KEY_MAX_LENGTH` | 64 | `lib/constants/discount.ts` | garde front (clés backend ≤ 25 caractères aujourd'hui) |
| `DISCOUNT_KEY_PATTERN` | `/^[A-Z0-9_]+$/` | `lib/constants/discount.ts` | forme des clés `DiscountCampaignInitializer` |
| `CART_QUOTE_SHIPPING` | `{ type: STANDARD, provider: DHL }` | `lib/constants/checkout.ts` | R5 : sous-total et remise indépendants de la livraison |
| `ORDER_STATUS_POLL_INTERVAL_MS` | 2_000 | `lib/constants/orders.ts` | R11 |
| `ORDER_STATUS_POLL_TIMEOUT_MS` | 60_000 | `lib/constants/orders.ts` | R11, hypothèse de la spec |
| `CONFIRMATION_TERMINAL_STATUSES` | §5 | `lib/constants/orders.ts` | R11 |
| `ORDER_TIMELINE_STEPS` | §5 | `lib/constants/orders.ts` | R13 |
| `ORDERS_PAGE_SIZE` | 10 | `lib/constants/orders.ts` | R12 |
| `ORDERS_SORT` | `"createdAt,desc"` | `lib/constants/orders.ts` | api-map §7 |
| `ORDER_MAX_LINES` | 50 | `lib/constants/orders.ts` | aligné sur `GUEST_CART_MAX_LINES` |
| `ORDER_EDIT_SEARCH_DEBOUNCE_MS` | 300 | `lib/constants/orders.ts` | R14 |
| `ORDER_EDIT_SEARCH_SIZE` | 8 | `lib/constants/orders.ts` | R14, résultats proposés à l'ajout |
| `ADDRESS_FIELD_MAX_LENGTH` | 255 | `lib/constants/account.ts` | longueur de colonne `VARCHAR(255)` par défaut côté JPA |
| `NAME_MIN_LENGTH`, `NAME_MAX_LENGTH` | 2, 50 | `lib/constants/account.ts` | `@Size(2..50)` §D.3 |
| `PHONE_PATTERN` | `/^\+?[0-9 .-]{6,20}$/` | `lib/constants/account.ts` | garde front (aucune contrainte backend) |
| `CARD_EXPIRY_PATTERN` | `/^(0[1-9]\|1[0-2])\/[0-9]{4}$/` | `lib/constants/account.ts` | `@Pattern` §D.4b |
| `KEYCLOAK_ACCOUNT_PATH` | `"/account"` | `lib/constants/auth.ts` | R17, ajouté à `AUTH_KEYCLOAK_ISSUER` |
| `PICKUP_PLACEHOLDER` | entrée d'affichage grisée | `lib/constants/checkout.ts` | R8, clarification Q2 |
