# Cartographie de l'API backend cybertech

> Source : repo backend `cybertech-dev-develop_cybertech`, branche `develop_back`, commit `7623204` (lu en lecture seule le 2026-10-13), mis à jour après les commits backend `0b4a600` (client Keycloak front) et `d50e661` (`GET /user/me`, `GET /product/availability`, codes d'erreur machine).
> Abréviation des chemins : `{pkg}` = `src/main/java/com/novatech/cybertech`, `{ctrl}` = `{pkg}/api/controllers/implementation`, `{res}` = `src/main/resources`.
> Contrat OpenAPI de référence : `docs/openapi/openapi.yaml` du backend (généré par springdoc, 64 opérations) et `/v3/api-docs` à l'exécution.

## 0. Conventions transverses

| Sujet | Valeur réelle | Source |
|---|---|---|
| Base URL locale | `http://localhost:8081` (pas de context-path) | `{res}/application.properties` (`server.port=8081`) |
| Préfixe | `/api/v1/services/...` (sauf `/api/v1/events`, `/api/v1/webhooks/stripe`) | `{pkg}/constants/CyberTechAppConstants.java:5-42` |
| Versioning | **Double** : `/v1` dans le chemin **et** en-tête `X-API-VERSION` (défaut `1.0`, supportées `1.0,2.0,3.0`). Sans en-tête → `1.0`. | `application.properties` (`spring.mvc.apiversion.*`), `CyberTechAppConstants.java:59` |
| Authentification | `Authorization: Bearer <access_token Keycloak>` (OAuth2 resource server, JWT RS256 vérifié via JWKS) | `{pkg}/config/SecurityConfig.java:168` |
| Rôles | Claim `realm_access.roles` → `ROLE_<NOM>` ; rôles métier `USER`, `ADMIN` | `{pkg}/converter/KeycloakRoleConverter.java:20-31` |
| Pagination (entrée) | Query params Spring `page` (0-based), `size`, `sort=champ,(asc|desc)` ; `size` plafonné à **100** | `application.properties` (`spring.data.web.pageable.max-page-size=100`) |
| Pagination (sortie) | `PagedModel` : `{ "content": [...], "page": { "size", "number", "totalElements", "totalPages" } }` | `application.properties` (`serialization-mode=via-dto`) |
| Exception : recherche produit | Pagination dans le **body** (`page`, `size`), pas en query | `{pkg}/dto/request/search/ProductSearchRequestDto.java` |
| Montants | `BigDecimal` sérialisé en nombre JSON, **sans devise** dans les réponses. Devise des commandes : **EUR** (codée en dur) | `{pkg}/services/implementation/OrderManagementServiceImp.java:302` |
| Dates | `LocalDate` → `"2026-10-13"`, `LocalDateTime` → `"2026-10-13T10:15:30"` (sans fuseau), `Instant` → ISO-8601 UTC, `java.util.Date` (`UserResponseDto.birthDate`) ⚠️ À CONFIRMER (format Jackson 3 par défaut) | DTO cités ci-dessous |
| Identifiants | UUID v7 (time-ordered) en chaîne | `CartWriteTransactionalDelegateImp.java:79` |
| Images produit | URL absolues S3 (LocalStack `http://localhost:4566/cybertech-products/...` en dev) dans `photoUrls` | `{pkg}/services/implementation/S3ServiceImp.java:57` |
| Compression | gzip pour JSON > 1 KB | `application.properties` (`server.compression.*`) |
| CORS | Origines `cybertech.cors.allowed-origins` (défaut `http://localhost:3000`), credentials autorisés, en-têtes exposés `Location`, `X-API-VERSION` | `SecurityConfig.java:225-244` |
| CSRF | Désactivé (API stateless JWT) | `SecurityConfig.java:157` |
| Corrélation | En-tête de réponse `X-Request-Id` (8 caractères) | `{pkg}/filter/LoggingFilter.java` |

### 0.1 Format des erreurs

Toutes les erreurs (controllers, 401, 403, **et 429**) renvoient `ErrorResponseDto` (`{pkg}/api/error/model/ErrorResponseDto.java`) :

```json
{
  "message": "Validation failed: email (Email should be valid)",
  "httpStatusCode": 400,
  "errorCodeType": "TECHNICAL",
  "errorCode": "INVALID_REQUEST",
  "fieldErrors": [ { "field": "email", "message": "Email should be valid" } ]
}
```

- **`errorCode`** = nom de l'enum `ErrorCode` (liste complète dans l'OpenAPI, schéma `ErrorResponseDto`) : **c'est sur lui que le front doit brancher sa logique**, jamais sur `message` (texte anglais susceptible de changer).
- `errorCodeType` ∈ `TECHNICAL | FUNCTIONAL`.
- `fieldErrors` : présent **uniquement** sur les erreurs de validation Bean Validation (`INVALID_REQUEST` issu de `@Valid`), un élément par champ, **sans la valeur rejetée** (pas de mot de passe renvoyé). Champs imbriqués au format `cartItemAddRequestDtos[0].quantity`.
- `401` : `errorCode = AUTHENTICATION_REQUIRED` (`CustomAuthenticationEntryPoint.java`).
- `403` (rôle insuffisant) : `errorCode = ACCESS_DENIED` (`CustomAccessDeniedHandler.java`).
- `429` : `errorCode = TOO_MANY_REQUESTS`, délai dans l'en-tête **`Retry-After`** (secondes) (`RateLimitFilter.java`).
- `500` générique : `APPLICATION_ERROR`, message assaini.

### 0.2 Table des erreurs métier (exception → statut)

Source : `{pkg}/api/error/enumpackage/ErrorCode.java:11-69` + `ErrorManagementController.java`.

| Statut | Cas (ErrorCode) |
|---|---|
| 400 | `INVALID_REQUEST` (validation, `IllegalArgumentException`, `NegativeQuantityException`, `ProductConstraintsViolationException`, propriété JSON inconnue), `MALFORMED_JSON`, `METHOD_ARGUMENT_TYPE_MISMATCH`, `BANK_CARD_EXPIRED`, `DISCOUNT_TYPE_NOT_ACTIVE`, `UNKNOWN_PRODUCT_CATEGORY`, `INVALID_PRODUCT_CATEGORY_SCHEMA`, `DISCOUNT_CAMPAIGN_MISSING_REQUIRED_FIELD` |
| 402 | `PAYMENT_FAILED` |
| 401 | `AUTHENTICATION_REQUIRED` |
| 403 | `ACCESS_DENIED`, `ORDER_DOESNT_BELONGS_TO_USER`, `UNAUTHORIZED_CART_ACCESS`, `USER_NOT_ACTIVE`, `USER_NOT_AUTHOR_OF_REVIEW`, `COMMENT_POST_NOT_ALLOWED` (modération) |
| 404 | `RESOURCE_NOT_FOUND`, `ACCOUNT_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `CART_NOT_FOUND`, `CART_ITEM_NOT_FOUND`, `ORDER_NOT_FOUND`, `NO_PREVIOUS_PAYMENT_ATTEMPT_FOUND`, `REVIEW_NOT_FOUND`, `USER_NOT_FOUND`, `WISHLIST_NOT_FOUND`, `BANK_CARD_NOT_FOUND`, `PAYMENT_NOT_FOUND`, `DISCOUNT_CAMPAIGN_NOT_FOUND` |
| 409 | `CANNOT_CANCEL_ORDER`, `ORDER_ALREADY_SHIPPED`, `ORDER_NOT_FUNDED`, `ORDER_REFUND_FAILED`, `PRODUCT_ALREADY_IN_WISHLIST`, **`NOT_ENOUGH_STOCK`**, `CONCURRENT_MODIFICATION` (optimistic lock **ou verrou panier occupé**, rejouable), **`CART_IS_EMPTY`**, **`CANNOT_REMOVE_ITEM_FROM_EMPTY_CART`** (403 → 409 depuis `d50e661`), `PAYMENT_ALREADY_COMPLETED`, `ORDER_NOT_REVIEWABLE`, `DISCOUNT_CAMPAIGN_ALREADY_EXISTS`, `USER_ALREADY_EXISTS` |
| 422 | `FAILED_UPDATING_ORDER` (échec de `retryPayment`) |
| 429 | `TOO_MANY_REQUESTS` (+ `Retry-After`) |
| 500 | `APPLICATION_ERROR`, `ACCESS_TOKEN_RETRIEVAL_FAILED`, `IDEMPOTENCY_KEY_GENERATION_FAILED`, `NO_STRATEGY_FOUND`, `PAYMENT_PROCESSING_ERROR`, `ORDER_SUMMARY_REPORT_JOB_FAILED` |

---

## 1. Authentification

**Le backend Spring n'expose aucun endpoint de login, logout ni refresh.** L'authentification est entièrement déléguée à **Keycloak** (realm `cybertech`), le backend n'est qu'un *resource server* (`RateLimitFilter.java:289-292`, `SecurityConfig.java:168`).

| Méthode | Chemin | Fournisseur | Auth | Notes |
|---|---|---|---|---|
| GET | `{KC}/realms/cybertech/protocol/openid-connect/auth` | Keycloak | — | Authorization Code + PKCE S256 avec le client confidentiel **`cybertech-front-client`** (secret dev `dev-keycloak-front-secret-change-me`, redirect `http://localhost:3000/api/auth/callback/keycloak`, post-logout `http://localhost:3000/*`) — importé avec le realm depuis `0b4a600` ; sur une base Keycloak existante : `src/main/resources/bash/createKeycloakFrontClient.ps1`. |
| POST | `{KC}/realms/cybertech/protocol/openid-connect/token` | Keycloak | client | `grant_type=authorization_code` / `refresh_token`. |
| GET/POST | `{KC}/realms/cybertech/protocol/openid-connect/logout` | Keycloak | — | RP-initiated logout (`id_token_hint`). |
| GET | `{KC}/realms/cybertech/protocol/openid-connect/certs` | Keycloak | — | JWKS utilisé par le backend. |

`{KC}` = `http://localhost:8080` en local (docker-compose), `http://keycloak:8080` dans le cluster, `keycloak.cybertech.local` via ingress.

Durées de vie (`{res}/keycloak/import/cybertech-realm.json`) : `accessTokenLifespan = 300 s` (5 min), `ssoSessionIdleTimeout = 1800 s` (30 min, borne du refresh token), `ssoSessionMaxLifespan = 36000 s` (10 h), `revokeRefreshToken = false`, `registrationAllowed = false`, `bruteForceProtected = false`.

L'**inscription** passe par le backend (§2, `POST /user/register`), qui crée l'utilisateur dans Keycloak (`enabled=true`, `emailVerified=true`, rôle `USER`) puis en base (`KeycloakUserManagementServiceImp.java:84-85`, `UserManagementServiceImp.java:68`). Le compte est utilisable immédiatement.

---

## 2. Utilisateurs

Controller : `{ctrl}/UserManagementController.java` (base `/api/v1/services/user`).

| Méthode | Chemin | Controller#méthode | Auth / rôle | Params | Body | Réponse | Codes HTTP | Pagination | Notes |
|---|---|---|---|---|---|---|---|---|---|
| POST | `/api/v1/services/user/register` | `UserManagementController#register` (:111) | **Public** | — | `UserCreateRequestDto` (§D.1) | `201` `{ "id": uuid, "email": string, "username": string }` (`Map`) | 201, 400, 409 `USER_ALREADY_EXISTS`, 429 (5 req/min/IP), 500 (échec Keycloak) | — | Saga Keycloak + DB. `bankCardCreationRequestDto` optionnel. |
| GET | `/api/v1/services/user/get/{userUuid}` | `#getUserByUuid` (:81) | USER ou ADMIN ; USER limité à **son propre** profil | path `userUuid` (UUID) | — | `UserResponseDto` (§D.20) | 200, 401, 403, 404 | — | Le front ne connaît pas l'UUID local après un login Keycloak (voir §11 « GET /me manquant »). |
| GET | `/api/v1/services/user/me` | `UserManagementController#getMe` | USER ou ADMIN | — | — | `UserResponseDto` (§D.20) | 200, 401 `AUTHENTICATION_REQUIRED`, 404 `USER_NOT_FOUND` | — | Profil de l'appelant résolu par le `sub` du JWT. **À utiliser pour obtenir l'UUID local et le profil.** |
| PATCH | `/api/v1/services/user/me` | `#updateMe` (:147) | USER ou ADMIN | — | `UserSelfUpdateRequestDto` (§D.3) | `UserResponseDto` | 200, 400, 401, 404 | — | Utilisateur résolu par le `sub` du JWT (pas d'IDOR). Pas d'email ni mot de passe modifiables. |
| GET | `/api/v1/services/user/ok` | `#healthCheck` (:135) | Authentifié | — | — | `200` chaîne `"Hello Guys !!! 😁🔥🔥🔥"` | 200, 401 | — | Ping de debug JWT. |

---

## 3. Catalogue produits (public)

Controller : `{ctrl}/ProductSearchController.java` (base `/api/v1/services/product`, **public** via `SecurityConfig.java:96`).

| Méthode | Chemin | Controller#méthode | Auth | Params | Body | Réponse | Codes HTTP | Pagination | Notes |
|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/v1/services/product/get/{productUuid}` | `ProductSearchController#getProductByUuid` (:30) | Public | path `productUuid` (UUID) | — | `ProductResponseDto` (§D.12) | 200, 400 (UUID invalide), 404 | — | Lu depuis MySQL. |
| POST | `/api/v1/services/product/search` | `#searchProducts` (:39) | Public | — | `ProductSearchRequestDto` (§D.10) | `PagedModel<ProductResponseDto>` | 200, 400 | **Dans le body** (`page` défaut 0, `size` défaut 20) | Elasticsearch : `multiMatch` fuzzy (`AUTO`) sur le mot-clé, filtres catégorie / marques / attributs / plages. **Pas de tri** paramétrable (pertinence). `ProductSearchServiceImp.java:42-161`. |
| GET | `/api/v1/services/product/availability` | `#getAvailability` | Public | query `uuids` (1 à 50 UUID, séparés par des virgules ou répétés) | — | `ProductAvailabilityDto[]` (§D.12b) | 200, 400 `INVALID_REQUEST` (vide / > 50) ou `METHOD_ARGUMENT_TYPE_MISMATCH` (UUID invalide) | — | **Stock en direct** (`max(0, stock - reservedStock)`, lu en base), réponse `Cache-Control: no-store`. UUID inconnus absents du résultat. À ne **jamais** mettre en cache côté front. |
| GET | `/api/v1/services/product/best-sellers` | `#getBestSellers` (:45) | Public | query `page`, `size` (défaut 15), `sort` | — | `PagedModel<ProductResponseDto>` | 200 | Query | — |

Recherche vide (tous champs `null`) = liste de tout le catalogue ⚠️ À CONFIRMER (comportement ES avec `musts` vide non vérifié à l'exécution).

## 4. Catégories (schémas d'attributs)

| Méthode | Chemin | Controller#méthode | Auth | Params | Body | Réponse | Codes HTTP | Notes |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/v1/services/product-category-schemas/{categoryKey}` | `ProductCategorySchemaController#getByCategoryKey` (:33) | Public | path `categoryKey` (ex. `COMPUTER`, `MONITOR`) | — | `ProductCategorySchemaResponseDto` (§D.13) | 200, 404/400 `UNKNOWN_PRODUCT_CATEGORY` | `jsonSchema` = JSON Schema **en chaîne** décrivant `attributes` → utile pour générer filtres et fiches techniques. |

Catégories seedées au démarrage : `COMPUTER` (« Computers »), `MONITOR` (« Monitors ») (`{pkg}/config/ProductCategorySchemaInitializer.java:53-54`). **Aucun endpoint public ne liste les catégories** (seul `GET /admin/product-category-schemas/get/all`, ADMIN).

## 5. Remises

| Méthode | Chemin | Controller#méthode | Auth | Body | Réponse | Codes | Notes |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/services/discounts/active` | `DiscountController#getActiveCampaigns` (:44) | Public | — | `DiscountContext[]` (§D.15) | 200 | Expose le record interne `DiscountContext`. Le front peut proposer la `discountKey` lors de la commande. |

---

## 6. Panier

Controller : `{ctrl}/CartManagementController.java` (base `/api/v1/services/cart`). **Tous les endpoints exigent `USER` ou `ADMIN`** : il n'existe **pas de panier anonyme**. Le panier est identifié par le `sub` du JWT. Rate limit : **60 req/min** par utilisateur (`RateLimitFilter.java:420-425`).

| Méthode | Chemin | Controller#méthode | Auth | Params | Body | Réponse | Codes HTTP | Notes |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/v1/services/cart/get` | `CartManagementController#getCart` (:47) | USER/ADMIN | — | — | `CartResponseDto` (§D.16) | 200, 401, 404 `USER_NOT_FOUND` | Cache Redis puis MySQL. **Panier inexistant → objet avec tous les champs `null`** (`CartServiceImp.java:180,197-199`). |
| POST | `/api/v1/services/cart/add` | `#addToCart` (:63) | USER/ADMIN | — | `CartCreateRequestDto` (§D.5) | `201` `CartResponseDto` | 201, 400, 404 `PRODUCT_NOT_FOUND`, 409 `NOT_ENOUGH_STOCK`, 409 `CONCURRENT_MODIFICATION` si verrou Redis occupé (rejouable) | **Additif** : quantité ajoutée à la ligne existante. Crée le panier au premier ajout. Même produit 2× dans la requête → quantités sommées. |
| PATCH | `/api/v1/services/cart/update/{cartUuid}` | `#updateCart` (:40) | USER/ADMIN, propriétaire | path `cartUuid` | `CartUpdateRequestDto` (§D.6) | `CartResponseDto` | 200, 400, 403 `UNAUTHORIZED_CART_ACCESS`, 404 `CART_NOT_FOUND`/`PRODUCT_NOT_FOUND`, 409 `NOT_ENOUGH_STOCK` | **Remplace** toutes les lignes (quantités absolues). Idéal pour « modifier la quantité ». |
| PATCH | `/api/v1/services/cart/remove/{productUuid}` | `#removeFromCart` (:70) | USER/ADMIN | path `productUuid` | — | `CartResponseDto` | 200, 409 `CANNOT_REMOVE_ITEM_FROM_EMPTY_CART`, 404 | Supprime la ligne entière. |
| DELETE | `/api/v1/services/cart/decreaseQuantity` | `#decreaseQuantity` (:77) | USER/ADMIN | — | `CartItemRemoveRequestDto` (§D.7) | `CartResponseDto` | 200, 400, 409 `CART_IS_EMPTY`, 404 `CART_ITEM_NOT_FOUND` | **DELETE avec body JSON**. |
| DELETE | `/api/v1/services/cart/clear` | `#clearCart` (:55) | USER/ADMIN | — | — | `204` | 204, 401 | — |

## 7. Commandes

Controller : `{ctrl}/OrderManagementController.java` (base `/api/v1/services/management/order`). Rate limit `POST /place*` : **30 req/min**.

| Méthode | Chemin | Controller#méthode | Auth | Params | Body | Réponse | Codes HTTP | Pagination | Notes |
|---|---|---|---|---|---|---|---|---|---|
| POST | `/api/v1/services/management/order/place` | `#placeOrder` (:44) | USER/ADMIN | — | `OrderPlacingRequestDto` (§D.8) | `201` `OrderResponseDto` (§D.17) | 201, 400, 402 `PAYMENT_FAILED`, 403 `USER_NOT_ACTIVE`, 409 `CART_IS_EMPTY`/`NOT_ENOUGH_STOCK`, 500 | — | Convertit le **panier serveur** en commande et **déclenche le paiement Stripe côté serveur** (PaymentIntent confirmé avec le moyen de paiement configuré, voir analysis §6). Statut initial souvent `AWAITING_PAYMENT`, puis `PAID` via webhook. |
| GET | `/api/v1/services/management/order/status/{uuid}` | `#getOrderStatusByUuid` (:96) | USER/ADMIN, propriétaire | path `uuid` | — | `OrderStatusDto` (§D.18) | 200, 403, 404 | — | Prévu pour le **polling** de la page de confirmation. |
| GET | `/api/v1/services/management/order/get/{uuid}` | `#getOrderByUuid` (:84) | USER/ADMIN, propriétaire | path `uuid` | — | `OrderResponseDto` | 200, 403, 404 | — | — |
| GET | `/api/v1/services/management/order/mine` | `#getMyOrders` (:119) | USER/ADMIN | query `status` (multi, `OrderStatus`), `page`, `size` (20), `sort` (`createdAt,desc`) | — | `PagedModel<OrderResponseDto>` | 200, 400 | Query | — |
| POST | `/api/v1/services/management/order/update` | `#updateOrder` (:60) | USER/ADMIN, propriétaire | — | `OrderUpdateRequestDto` (§D.9) | `OrderResponseDto` | 200, 400, 402, 403, 404, 409 `ORDER_ALREADY_SHIPPED`/`NOT_ENOUGH_STOCK`/`ORDER_NOT_FUNDED` | — | Possible tant que la commande n'est pas expédiée (fenêtre de grâce `cybertech.shipping.grace-period=30m` après paiement). Complément / remboursement partiel automatique. |
| POST | `/api/v1/services/management/order/cancel` | `#cancelOrder` (:52) | USER/ADMIN, propriétaire | — | `OrderCancellationRequestDto` (§D.9b) | `200` `OrderResponseDto` | 200, 403, 404, 409 `CANNOT_CANCEL_ORDER`/`ORDER_REFUND_FAILED` | — | Refusé dès `AWAITING_SHIPPING` (`OrderCancellationTransactionalDelegateImp.java:76-77`). Annuler une commande déjà annulée = no-op. |
| POST | `/api/v1/services/management/order/retry-payment/{uuid}` | `#retryPayment` (:67) | USER/ADMIN, propriétaire | path `uuid` | — | `OrderResponseDto` | 200, 402, 404 `NO_PREVIOUS_PAYMENT_ATTEMPT_FOUND`, 409 `PAYMENT_ALREADY_COMPLETED`, 422 | — | Après `PAYMENT_FAILED`. |

Cycle de vie `OrderStatus` (`{pkg}/entities/enums/OrderStatus.java`) : `CREATED → AWAITING_PAYMENT → (PAYMENT_FAILED | PAID) → AWAITING_SHIPPING → SHIPPED → DELIVERED`, + `RETURNED`, `CANCELED`, `REFUNDED`.

## 8. Carte bancaire enregistrée (une par utilisateur)

Controller : `{ctrl}/BankCardManagementController.java` (base `/api/v1/services/bank-card`).

| Méthode | Chemin | Controller#méthode | Auth | Body | Réponse | Codes | Notes |
|---|---|---|---|---|---|---|---|
| POST | `/bank-card/add` | `#addBankCard` (:35) | USER/ADMIN | `BankCardCreationRequestDto` (§D.4) | `201` `BankCardResponseDto` (§D.21) | 201, 400 (`BANK_CARD_EXPIRED`), 401 | PAN chiffré AES-256 côté serveur. **Le front ne devrait pas manipuler de PAN** (PCI-DSS) — voir analysis §7. |
| GET | `/bank-card/get` | `#getBankCard` (:60) | USER/ADMIN | — | `BankCardResponseDto` | 200, 404 | `maskedNumber` uniquement. |
| PUT | `/bank-card/update` | `#updateBankCard` (:50) | USER/ADMIN | `BankCardUpdateRequestDto` (§D.4b) | `BankCardResponseDto` | 200, 400, 404 | Nom du titulaire + expiration. |
| DELETE | `/bank-card/delete` | `#deleteBankCard` (:42) | USER/ADMIN | — | `204` | 204, 404 | — |

## 9. Wishlist

Controller : `{ctrl}/WishlistManagementController.java` (base `/api/v1/services/wishlist`).

| Méthode | Chemin | Controller#méthode | Auth | Params | Réponse | Codes | Pagination |
|---|---|---|---|---|---|---|---|
| POST | `/wishlist/add/{productUuid}` | `#addProductToWishlist` (:36) | `isAuthenticated()` | path `productUuid` | `201` `WishlistResponseDto` (§D.19) | 201, 404, 409 `PRODUCT_ALREADY_IN_WISHLIST` | — |
| DELETE | `/wishlist/remove/{productUuid}` | `#removeProductFromWishlist` (:44) | `isAuthenticated()` | path `productUuid` | `204` | 204, 404 | — |
| GET | `/wishlist/my-wishlist` | `#getMyWishlist` (:52) | `isAuthenticated()` | `page`, `size` (20), `sort` (`createdAt,desc`) | `PagedModel<WishlistResponseDto>` | 200 | Query |

## 10. Avis (reviews) — modération IA synchrone

Controller : `{ctrl}/ReviewCrudController.java` (base `/api/v1/services/review`). **Tous `hasRole('USER')` uniquement** (un ADMIN sans rôle USER est refusé).

| Méthode | Chemin | Controller#méthode | Body | Réponse | Codes | Notes |
|---|---|---|---|---|---|---|
| GET | `/review/reviewable` | `#getReviewableProducts` (:73) | — | `ReviewableProductDto[]` (§D.23) | 200 | Produits achetés et notables (commandes `PAID`/`SHIPPED`/`DELIVERED`). |
| POST | `/review/create` | `#createReview` (:46) | `ReviewCreateRequestDto` (§D.11) | `201` `ReviewResponseDto` (§D.22) | 201, 400, 403 `COMMENT_POST_NOT_ALLOWED` / `ORDER_DOESNT_BELONGS_TO_USER`, 404, 409 `ORDER_NOT_REVIEWABLE` | Appel **synchrone** au service Python ; **fail-closed** : modération indisponible → 403 (`ReviewManagementServiceImp.java:87-96`, `CommentModerationClient.java:37-62`). |
| GET | `/review/get/{reviewUuid}` | `#getReviewByUuid` (:39) | — | `ReviewResponseDto` | 200, 404 | — |
| PATCH | `/review/update/{reviewUuid}` | `#updateReview` (:53) | `ReviewUpdateRequestDto` (§D.11b) | `ReviewResponseDto` | 200, 403 `USER_NOT_AUTHOR_OF_REVIEW` | `reviewUuid` du **body** fait foi, le path est ignoré ⚠️ À CONFIRMER. |
| DELETE | `/review/delete/{reviewUuid}` | `#deleteReviewByUuid` (:60) | — | `204` | 204, 403, 404 | — |

**Aucun endpoint ne liste les avis d'un produit**, ni ne fournit de note moyenne.

## 11. Recommandations & événements comportementaux

| Méthode | Chemin | Controller#méthode | Auth | Params / Body | Réponse | Codes | Notes |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/services/recommendations/my-recommendations` | `RecommendationController#getMyRecommendations` (:33) | `isAuthenticated()` | query `n` (défaut 10) | `ProductResponseDto[]` | 200 | Gorse : personnalisé → derniers → best-sellers (cache Redis 900 s). |
| POST | `/api/v1/events/consume-event` | `UserEventController#collectEvent` (:48) | `hasRole('USER')` | `UserEventDto` (§D.14) | `201` `UserEventResponseDto` (§D.24) | 201, 400 | Stocké dans MongoDB, alimente Gorse. `userId` ignoré en entrée (pris du JWT). |

## 12. Paiement (webhook — hors front)

| Méthode | Chemin | Controller#méthode | Auth | Notes |
|---|---|---|---|---|
| POST | `/api/v1/webhooks/stripe` | `StripeWebhookController#handleStripeEvent` (:80) | Public, signature HMAC `Stripe-Signature` | Appelé par Stripe uniquement. Le front **n'appelle jamais** ce endpoint. |

## 13. Administration (résumé — hors lot 1 du front)

Tous `hasRole('ADMIN')`.

| Méthode | Chemin | Controller#méthode | Body / Params | Réponse |
|---|---|---|---|---|
| GET | `/api/v1/services/admin/user/get/all` | `UserManagementAdminController#getAllUsers` (:49) | pageable (20, `createdAt,desc`) | `PagedModel<UserResponseDto>` |
| POST | `/api/v1/services/admin/user/create` | `#createUser` (:57) | `UserCreateRequestDto` | `UserResponseDto` |
| PATCH | `/api/v1/services/admin/user/update` | `#updateUser` (:63) | `UserUpdateRequestDto` (§D.2) | `UserResponseDto` |
| PATCH | `/api/v1/services/admin/user/update-role/{userUuid}` | `#updateUserRole` (:69) | `{ "role": "USER"|"ADMIN" }` | `UserResponseDto` |
| DELETE | `/api/v1/services/admin/user/delete/{userUuid}` | `#deleteUserByUuid` (:78) | — | 204 |
| POST | `/api/v1/services/admin/user/register/auto/single` | `#registerAuto` (:85) | — | `Map` (données de test Datafaker) |
| GET | `/api/v1/services/admin/management/product/get/all` | `ProductManagementAdminController#getAllProducts` (:45) | pageable | `PagedModel<ProductResponseDto>` |
| POST | `/api/v1/services/admin/management/product/create` | `#createProduct` (:53) | `ProductCreateRequestDto` (§D.25) | `ProductResponseDto` |
| POST | `/api/v1/services/admin/management/product/create-with-image` | `#createProductWithImage` (:81) | multipart `product` (JSON) + `images[]` (≤ 10 MB) | `ProductResponseDto` |
| PATCH | `/api/v1/services/admin/management/product/update/{productUuid}` | `#updateProduct` (:59) | `ProductUpdateRequestDto` | `ProductResponseDto` |
| DELETE | `/api/v1/services/admin/management/product/delete/{productUuid}` | `#deleteProductByUuid` (:73) | — | 204 |
| GET | `/api/v1/services/admin/management/order/get/all` | `OrderManagementAdminController#getAllOrders` (:55) | `status` (multi), `userKeycloakId`, pageable | `PagedModel<OrderResponseDto>` |
| POST | `/api/v1/services/admin/management/order/place/auto` | `#placeOrder2` (:64) | — | `OrderResponseDto` |
| DELETE | `/api/v1/services/admin/management/order/delete/{uuid}` | `#deleteOrderByUuid` (:70) | — | 204 |
| GET/POST/PATCH/DELETE | `/api/v1/services/admin/discounts[/{discountKey}]` | `DiscountAdminController` (:44-78) | `DiscountCampaign{Create,Update}RequestDto` | `DiscountCampaignResponseDto` ; 404 / 409 |
| GET/POST/PATCH/DELETE | `/api/v1/services/admin/product-category-schemas/{get/all,get/{k},create,update/{k},delete/{k}}` | `ProductCategorySchemaAdminController` (:38-64) | `ProductCategorySchema{Create,Update}RequestDto` | `ProductCategorySchemaResponseDto` |
| GET/DELETE | `/api/v1/services/admin/bank-card/{get/all,get/{uuid},delete/{uuid}}` | `BankCardAdminController` (:46-61) | pageable (10) | `BankCardResponseDto` |
| GET/DELETE | `/api/v1/services/wishlist/admin/{all,delete/{uuid}}` | `WishlistManagementController` (:65-74) | — | `WishlistResponseDto[]` |

---

## D. Catalogue des DTO (pour les schémas Zod)

Légende : **req** = obligatoire. Les contraintes sont celles de Jakarta Bean Validation. Les noms de fichiers sont relatifs à `{pkg}/dto/`.

### D.1 `UserCreateRequestDto` — `request/user/UserCreateRequestDto.java`
| Champ | Type | Contraintes |
|---|---|---|
| `email` | string | req, `@NotBlank`, `@Email` |
| `firstName` | string | req, `@NotBlank`, `@Size(2..50)` |
| `lastName` | string | req, `@NotBlank`, `@Size(2..50)` |
| `sex` | enum `Sex` = `M` \| `F` | req |
| `phoneNumber` | string | req, `@NotBlank` (aucun format) |
| `favoriteCommunicationChanel` | enum `EMAIL` \| `SMS` \| `PUSH_NOTIFICATION` | req (orthographe « Chanel » à respecter) |
| `street`, `city`, `zipCode`, `country` | string | req, `@NotBlank` (aucun format) |
| `birthDate` | LocalDateTime `"YYYY-MM-DDTHH:mm:ss"` | optionnel, `@Past` |
| `password` | string | req, `@NotBlank`, `@Size(min=8)` (la politique Keycloak peut être plus stricte ⚠️ À CONFIRMER) |
| `bankCardCreationRequestDto` | `BankCardCreationRequestDto` | optionnel, `@Valid` |

### D.2 `UserUpdateRequestDto` (admin) — `request/user/UserUpdateRequestDto.java`
`uuid` (req, UUID), `firstName`/`lastName` (`@Size(2..50)`), `sex`, `email` (`@Email`), `street`, `city`, `zipCode`, `country`, `birthDate` (`@Past`), `role` (`USER`|`ADMIN`) — tous optionnels sauf `uuid`.

### D.3 `UserSelfUpdateRequestDto` — `request/user/UserSelfUpdateRequestDto.java`
| Champ | Type | Contraintes |
|---|---|---|
| `firstName`, `lastName` | string | optionnel, `@Size(2..50)` |
| `phoneNumber`, `street`, `city`, `zipCode`, `country` | string | optionnels, sans contrainte (mise à jour partielle) |

### D.4 `BankCardCreationRequestDto` — `request/user/BankCardCreationRequestDto.java`
| Champ | Type | Contraintes |
|---|---|---|
| `cardHolderName` | string | req, `@NotBlank` |
| `cardNumber` | string | req, `@Size(13..19)`, `@Pattern("\d{13,19}")` |
| `expiryDate` | string | req, `@Pattern("(0[1-9]|1[0-2])/[0-9]{4}")` → `MM/YYYY` |
| `cardType` | enum `VISA` \| `MASTERCARD` \| `AMERICAN_EXPRESS` \| `DISCOVER` \| `OTHER` | req |

### D.4b `BankCardUpdateRequestDto`
`cardHolderName` (req, `@NotBlank`), `expiryDate` (req, `MM/YYYY`).

### D.5 `CartCreateRequestDto` — `request/cart/CartCreateRequestDto.java`
| Champ | Type | Contraintes |
|---|---|---|
| `cartItemAddRequestDtos` | `CartItemAddRequestDto[]` | req, `@NotNull`, `@Valid` (liste vide acceptée ⚠️) |
| ↳ `productUuid` | UUID | req |
| ↳ `quantity` | integer | req, `@Min(1)` |

### D.6 `CartUpdateRequestDto`
Même forme que D.5 (`cartItemAddRequestDtos`), sémantique **remplacement complet**. Liste vide → panier vidé.

### D.7 `CartItemRemoveRequestDto`
`productUuid` (req, UUID), `quantity` (req, integer `@Min(1)`).

### D.8 `OrderPlacingRequestDto` — `request/order/OrderPlacingRequestDto.java`
| Champ | Type | Contraintes |
|---|---|---|
| `paymentType` | enum `MASTERCARD` \| `VISA` \| `APPLE_PAY` \| `GOOGLE_PAY` | req |
| `shippingType` | enum `STANDARD` \| `EXPRESS` | req |
| `shippingProvider` | enum `DHL` \| `FEDEX` | req |
| `shippingStreet`, `shippingCity`, `shippingZipCode`, `shippingCountry` | string | req, `@NotBlank` |
| `discountKey` | string | `@NotBlank`, défaut `"NO_DISCOUNT"` (`CyberTechAppConstants.java:39`) ; **ne pas envoyer `null`** (Jackson écraserait le défaut → 400) ; clé inconnue/inactive → 400 |

### D.9 `OrderUpdateRequestDto` — `request/order/OrderUpdateRequestDto.java`
`uuid` (req), `paymentType`, `shippingType`, `shippingProvider` (req, enums ci-dessus), `shippingStreet|City|ZipCode|Country` (req, `@NotBlank`), `itemUpdateRequestDtoList` (req, `@NotEmpty`, `@Valid`, éléments `{ productUuid: UUID req, quantity: int @Min(1) req }`).

### D.9b `OrderCancellationRequestDto`
`orderUuid` (req, UUID).

### D.10 `ProductSearchRequestDto` — `request/search/ProductSearchRequestDto.java`
| Champ | Type | Contraintes |
|---|---|---|
| `keyword` | string | optionnel |
| `priceMin` | number | optionnel, **`@Min(100)`** (impossible de filtrer sous 100) |
| `priceMax` | number | optionnel, `@Max(1000000)` |
| `category` | string | optionnel (clé de catégorie, ex. `COMPUTER`) |
| `brands` | `Brand[]` | optionnel ; `Brand` = `ASUS, HP, LENOVO, DELL, AORUS, MSI, ACER, TOSHIBA, ALIENWARE, MICROSOFT, ALTYK, GIGABYTE, SAMSUNG` |
| `attributes` | `Record<string, string[]>` | optionnel (match `attributes.<k>.keyword`) |
| `numericRanges` | `Record<string, { min?: number, max?: number }>` | optionnel |
| `page` | integer | optionnel, `@Min(0)`, défaut 0 |
| `size` | integer | optionnel, `@Min(1)`, défaut 20 (pas de max explicite ⚠️) |

### D.11 `ReviewCreateRequestDto`
`orderUuid` (req), `productUuid` (req), `rating` (req, int `1..5`), `comment` (optionnel, `@Size(max=1000)`).

### D.11b `ReviewUpdateRequestDto`
`reviewUuid` (req), `rating` (optionnel, `1..5`), `comment` (optionnel, ≤ 1000).

### D.12 `ProductResponseDto` — `response/product/ProductResponseDto.java`
| Champ | Type | Remarque |
|---|---|---|
| `uuid` | **string** (UUID) | — |
| `name` | string | — |
| `price` | number | EUR implicite |
| `brand` | string | valeur de `Brand` |
| `category` | string | clé de catégorie |
| `photoUrls` | string[] | URL S3 absolues, possiblement vide |
| `description` | string | — |
| `attributes` | `Record<string, unknown>` | conforme au `jsonSchema` de la catégorie |

**Absents** : note moyenne, nombre d'avis, prix barré / remise. Le stock est servi à part par `GET /product/availability` (§D.12b), volontairement : le payload produit est mis en cache, la disponibilité jamais.

### D.12b `ProductAvailabilityDto` — `response/product/ProductAvailabilityDto.java`
`productUuid` (UUID), `availableStock` (int ≥ 0), `inStock` (boolean).

### D.13 `ProductCategorySchemaResponseDto`
`uuid`, `categoryKey`, `label`, `jsonSchema` (**string** JSON), `active` (boolean).

### D.14 `UserEventDto` — `request/event/UserEventDto.java`
| Champ | Type | Contraintes |
|---|---|---|
| `eventType` | enum `UserEventType` (`PURCHASE`, `ADD_TO_CART`, `WISHLIST_ADD`, `RATING_POSITIVE`, `RATING_NEGATIVE`, `REVIEW_POSITIVE`, `REVIEW_NEGATIVE`, `VIEW`, `CLICK`, `SCROLL_DEPTH_HIGH`, `HOVER`, `SEARCH_QUERY`, `SEARCH_RESULT_CLICK`, `REMOVE_FROM_CART`, `IGNORE_RECOMMENDATION`, `BOUNCE` — `entities/enums/UserEventType.java`) | req |
| `productId` | string | req |
| `sessionId` | string | req |
| `metadata` | `Record<string, unknown>` | optionnel |
| `userId` | string | ignoré en entrée |

### D.15 `DiscountContext` — `dto/data/DiscountContext.java`
`discountKey`, `calculationType` (`NONE|PERCENTAGE|FIXED_AMOUNT|BUY_ONE_GET_ONE_FREE`), `percentage`, `fixedAmount`, `minOrderAmount`, `maxDiscountAmount` (number | null), `startsAt`, `endsAt` (LocalDateTime | null).

### D.16 `CartResponseDto` / `CartItemResponseDto` — `response/cart/`
| Champ | Type | Remarque |
|---|---|---|
| `cartUuid` | UUID \| **null** | null si aucun panier |
| `userUuid` | UUID \| null | — |
| `items` | `CartItemResponseDto[]` \| **null** | — |
| `totalPrice` | number \| null | — |
| ↳ `cartItemUuid`, `productUuid` | UUID | — |
| ↳ `productName` | string | **pas d'image** dans la ligne |
| ↳ `quantity` | int | — |
| ↳ `unitPrice`, `lineItemTotalPrice` | number | — |

### D.17 `OrderResponseDto` / `OrderItemResponseDto` — `response/order/`
| Champ | Type |
|---|---|
| `uuid`, `userUuid` | UUID |
| `orderDate` | LocalDate (jour seulement) |
| `status` | `OrderStatus` |
| `totalAmount` | number |
| `refundedAmount` | number (dérivé) |
| `shippingAddress` | string (adresse **aplatie**) |
| `orderItems[]` | `{ orderItemUuid, productUuid, productName, quantity, unitPrice, lineItemTotalPrice }` |

Absents : devise, frais de port, montant de remise, `discountKey`, statut de paiement, numéro de suivi.

### D.18 `OrderStatusDto`
`{ uuid: UUID, status: OrderStatus }`.

### D.19 `WishlistResponseDto`
`uuid` (UUID), `product` (`ProductResponseDto`), `addedAt` (LocalDateTime).

### D.20 `UserResponseDto` — `response/user/UserResponseDto.java`
`uuid`, `email`, `firstName`, `lastName`, `username`, `sex`, `address` (**string aplatie**), `birthDate` (`java.util.Date`), `role` (`USER|ADMIN`). `keycloakId` est `@JsonIgnore`. Absents : `phoneNumber`, `favoriteCommunicationChanel`, adresse structurée.

### D.21 `BankCardResponseDto`
`uuid`, `cardHolderName`, `maskedNumber`, `expiryDate` (`MM/YYYY`), `cardType`, `userUuid`.

### D.22 `ReviewResponseDto`
`uuid`, `userUuid`, `productUuid`, `productName`, `rating` (1..5), `comment` (string | null). Pas de date, pas de nom d'auteur.

### D.23 `ReviewableProductDto`
`productUuid`, `orderUuid`, `productName`, `orderDate` (LocalDate).

### D.24 `UserEventResponseDto`
`id`, `userId`, `sessionId`, `eventType`, `productId`, `timestamp` (Instant), `metadata`.

### D.25 `ProductCreateRequestDto` (admin)
`name` (req, `@Size(3..255)`), `price` (req, `@DecimalMin(0.01)`), `brand` (req), `category` (req, `@NotBlank`), `stock` (int `@Min(0)`, défaut 0), `description` (req), `attributes` (req, validé contre le JSON Schema de la catégorie).

---

## E. Incohérences et points faibles relevés

| # | Constat | Source | Impact front |
|---|---|---|---|
| 1 | Entrées mortes dans `PUBLIC_URLS` : `/api/public/**`, `/auth/register`, `/auth/login`, `/products/list`, `/test/upload-image/**` (aucun controller). | `SecurityConfig.java:74-104` | Aucun ; ne pas s'y fier. |
| 2 | ~~Verrou panier non obtenu → 500~~ **Corrigé (`d50e661`)** : `CartLockedException` → 409 `CONCURRENT_MODIFICATION`. | `CartServiceImp.java` | Rejouer une fois. |
| 3 | ~~Panier vide / ligne absente → 403~~ **Corrigé (`d50e661`)** : 409. | `ErrorCode.java` | — |
| 4 | ~~Pas de code d'erreur machine~~ **Corrigé (`d50e661`)** : `errorCode` + `fieldErrors`. | `ErrorResponseDto.java` | Brancher sur `errorCode` ; Zod reste la première ligne de validation. |
| 5 | ~~429 au format différent~~ **Corrigé (`d50e661`)** : `ErrorResponseDto` `TOO_MANY_REQUESTS` + `Retry-After`. | `RateLimitFilter.java` | Un seul parseur. |
| 6 | `priceMin @Min(100)` et message de `priceMax` incohérent. | `ProductSearchRequestDto.java` | Slider prix : minimum 100 ou omettre `priceMin`. |
| 7 | `ProductResponseDto.uuid` typé `String` alors que les autres UUID sont `UUID` ; stock exposé à part via `GET /product/availability` (`d50e661`). | `ProductResponseDto.java` | Typer `uuid` en `z.string().uuid()`. |
| 8 | Avis : lecture unitaire réservée à `USER`, aucune liste par produit. | `ReviewCrudController.java:37-41` | Pas d'avis sur la fiche produit dans le lot 1. |
| 9 | `ReviewCrudController` en `hasRole('USER')` seul, alors que le reste accepte `USER or ADMIN`. | `ReviewCrudController.java:37-72` | Un admin pur ne peut pas tester les avis. |
| 10 | Wishlist en `isAuthenticated()`, le reste en `hasRole(...)`. | `WishlistManagementController.java:37-53` | Aucun. |
| 11 | Verbes HTTP atypiques : `PATCH /cart/remove/{id}`, `DELETE /cart/decreaseQuantity` **avec body**, `POST /order/update`, `POST /order/cancel`. | `CartManagementController.java:70-78`, `OrderManagementController.java:52-61` | Le client HTTP du BFF doit autoriser un body sur DELETE. |
| 12 | `PATCH /cart/update/{cartUuid}` exige l'UUID du panier alors que les autres opérations panier se basent sur le JWT. | `CartManagementController.java:40` | Lire `cartUuid` via `GET /cart/get` avant ; impossible si panier inexistant (`cartUuid=null`) → utiliser `/cart/add`. |
| 13 | Panier inexistant renvoyé comme objet aux champs `null` (pas 404, pas `items: []`). | `CartServiceImp.java:180,197-199` | Schéma Zod `nullable()` + normalisation. |
| 14 | `UserResponseDto` : `address` aplatie et `birthDate` en `java.util.Date`, alors que l'entrée est structurée (`street/city/...`) et en `LocalDateTime`. | `UserResponseDto.java` vs `UserCreateRequestDto.java` | Formulaire « mon profil » impossible à pré-remplir champ par champ. |
| 15 | `OrderResponseDto` sans devise, frais de port, remise ; `orderDate` sans heure. | `OrderResponseDto.java` | Récapitulatif de commande incomplet. |
| 16 | `DiscountController` expose le record interne `DiscountContext`. | `DiscountController.java:44-46` | Acceptable ; schéma à figer. |
| 17 | Versioning double (`/v1` + en-tête `X-API-VERSION`). | `application.properties` | Envoyer `X-API-VERSION: 1.0` explicitement depuis le BFF. |
| 18 | `application.frontend.url=http://localhost:4200` (port Angular) utilisé dans les liens d'emails. | `application.properties` | Liens d'email cassés avec Next.js (port 3000) → à corriger côté backend. |
| 19 | Le chart Helm `front-app-chart` attend un client Keycloak `cybertech-front-client` (Auth.js), ~~absent du realm exporté~~ **Corrigé (`0b4a600`)**. | `cybertech-realm.json` | — |
| 20 | `GET /user/ok` renvoie une chaîne avec emojis et n'est pas public. | `UserManagementController.java:135-138` | Ne pas l'utiliser comme health check public ; préférer `/actuator/health`. |
| 21 | Paiement confirmé **côté serveur** avec un `payment_method` fixé par configuration (`stripe.payment-method=pm_card_visa`), `allow_redirects=never`. `paymentType` n'influence pas le moyen réellement débité. | `StripePaymentAttemptProcessor.java:42,179-195`, `application.properties` | Aucun formulaire de paiement réel possible dans le lot actuel (pas de Stripe Elements, pas de 3DS). |
| 22 | Le prompt initial décrit PostgreSQL et un JWT maison : le code utilise **MySQL** et **Keycloak**. | `pom.xml`, `application.properties`, `SecurityConfig.java` | La doc et le docker-compose du front suivent le code. |

---

## F. Endpoints manquants pour un front e-commerce complet

| Besoin front | Endpoint proposé (backend) | Contournement possible aujourd'hui |
|---|---|---|
| ~~Profil de l'utilisateur connecté~~ | **Fait** : `GET /api/v1/services/user/me` | — |
| Liste publique des catégories | `GET /api/v1/services/product-category-schemas` | Liste codée en dur (`COMPUTER`, `MONITOR`). |
| ~~Disponibilité / stock produit~~ | **Fait** : `GET /api/v1/services/product/availability` | — |
| Tri du catalogue (prix, nouveautés) | param `sort` sur `/product/search` | Aucun (pertinence ES uniquement). |
| Facettes (marques, plages de prix, attributs avec compteurs) | agrégations ES sur `/product/search` | `jsonSchema` de la catégorie + enum `Brand` statique. |
| Suggestions / autocomplétion (palette ⌘K) | `GET /product/suggest?q=` | `POST /product/search` avec `size` réduit + debounce. |
| Avis publics d'un produit + note moyenne | `GET /api/v1/services/review/product/{uuid}` (public, paginé) | Aucun. |
| Panier invité + fusion à la connexion | `POST /cart/merge` idempotent (optionnel) | **Retenu** : panier invité en `localStorage` puis rejoué via le BFF → `/cart/add` à la connexion — voir [`../guest-cart.md`](../guest-cart.md). |
| Récapitulatif de prix avant commande (remise, port) | `POST /order/quote` (le DTO `PriceCalculationRequestDto` existe déjà, sans controller) | Total panier uniquement ; montant final connu après `/order/place`. |
| Paiement côté client (Stripe Payment Element, 3DS) | `POST /order/{uuid}/payment-intent` → `client_secret` | Paiement serveur simulé. |
| Derniers produits consultés (« Content de te revoir ») | `GET /api/v1/events/recently-viewed` | Historique local (cookie / localStorage non sensible) côté front. |
| Changement de mot de passe / mot de passe oublié | Keycloak account console ou action `UPDATE_PASSWORD` | Lien vers la console Keycloak. |
| Suppression de compte self-service (RGPD) | `DELETE /user/me` | Aucun. |
| Suivi de livraison | `trackingNumber` sur `OrderResponseDto` | Aucun. |
