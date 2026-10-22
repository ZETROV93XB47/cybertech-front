# Contrat : routes BFF, Server Actions et appels backend de la feature 004

Complète les contrats des features 001 à 003 : format, règles communes et corps d'erreur
inchangés (`{ error: { code: FrontErrorCode, message, fieldErrors?, retryAfterSeconds? } }`,
statut HTTP d'origine). Schémas : [`../data-model.md`](../data-model.md). Décisions :
[`../research.md`](../research.md). Backend vérifié au commit `bddcafd` (2026-10-21).

## 1. Nouvelle route exposée au navigateur

| Méthode | Route | Accès | Entrée (Zod) | Sortie 2xx | Endpoint Spring | Cache |
|---|---|---|---|---|---|---|
| GET | `/api/products/[uuid]/reviews` | public | `uuid` (chemin, `z.uuid()`), `page` (query, int ≥ 0) | `200 ProductReviews` (vue, page demandée) | `GET /review/product/{uuid}?page=&size=10` | données 60 s, tag `product-reviews:{uuid}` |

Erreurs : `uuid` ou `page` invalide → `400 invalid` sans appel ; `404 PRODUCT_NOT_FOUND` →
`404 not-found` ; indisponibilité → `503 unavailable`. Log `reviews.product` : produit masqué
(`maskUuid`), page, nombre d'avis renvoyés.

## 2. Server Actions (`features/reviews/actions.ts`)

Toutes exigent une session (`getAccessTokenOrThrow`) ; corps validés par Zod avant tout appel ;
résultat `ActionResult<T>` du lot 1 (`{ ok: true, data }` ou `{ ok: false, code, fieldErrors?,
message? }`). Aucun commentaire ni prénom dans les logs (`reviews.write` : UUID masqués, note,
résultat).

| Action | Entrée | Endpoint Spring | Succès | Revalidation |
|---|---|---|---|---|
| `createReview` | `ReviewCreateBodySchema` | `POST /review/create` | `201` → `{ reviewUuid }` | `/account/reviews`, `/account/orders/{orderUuid}`, tag `product-reviews:{productUuid}` |
| `updateReview` | `ReviewUpdateBodySchema` | `PATCH /review/update/{uuid}` | `200` | `/account/reviews`, tag `product-reviews:{productUuid}` |
| `deleteReview` | `{ reviewUuid, productUuid }` | `DELETE /review/delete/{uuid}` | `204` (un `404` compte comme supprimé) | `/account/reviews`, tag `product-reviews:{productUuid}` |

### 2.1 Erreurs

| Cas backend | `FrontErrorCode` | Conduite |
|---|---|---|
| `400` validation | `invalid` | erreurs de champ (note, commentaire) |
| `403 COMMENT_POST_NOT_ALLOWED` | `review-rejected` (+) | message bienveillant, note et commentaire gardés (FR-017) |
| `503 MODERATION_UNAVAILABLE` (backend `b5811c5`) | `moderation-unavailable` (+) | « réessaie dans un instant », note et commentaire gardés, pas d'invitation à reformuler |
| `409 ORDER_NOT_REVIEWABLE` (contrat du backend), `403 ORDER_DOESNT_BELONGS_TO_USER`, `404 PRODUCT_NOT_FOUND` (« pas dans ta commande ») | `review-not-allowed` (+) / `not-found` | message dédié, liste rafraîchie ; aiguillage sur `errorCode`, jamais sur le statut |
| `403 USER_NOT_AUTHOR_OF_REVIEW` | `forbidden` | message générique, liste rafraîchie |
| `404 REVIEW_NOT_FOUND` (modification) | `not-found` | « cet avis n'existe plus », retiré de la liste |
| `401` | `unauthenticated` | saisie gardée, invitation à se reconnecter, aucune publication automatique |
| `429` | `rate-limited` | délai annoncé |
| `5xx`, réseau | `unavailable` | réessayer |

## 3. Appels serveur (Server Components), sans route

| Appel | Endpoint Spring | Cache | Utilisé par |
|---|---|---|---|
| `getActiveCategories()` | `GET /product-category-schemas` (public, backend `28a15ae`) | 3 600 s, tag `categories` | menu « Catalogue », tuiles, carrousel, filtre du catalogue |
| `getCategoryCounts(categories)` (étendu) | `POST /product/search/facets` × catégories actives | 300 s (existant) | accueil, menu « Catalogue », carrousel |
| `getCategoryPhotos()` (étendu) | `POST /product/search` × 5 | 300 s (existant) | tuiles de l'accueil |
| `getCategorySchema(key)` (existant) | `GET /product-category-schemas/{key}` | 3 600 s | filtres du catalogue, fiche |
| `getActiveDiscounts()` (existant) | `GET /discounts/active` | existant, tag `discounts` | accueil (carrousel), `/promotions`, `/promotions/[key]` |
| `getProductReviews(uuid, page)` | `GET /review/product/{uuid}` | 60 s, tag `product-reviews:{uuid}` | fiche produit (page 0) |
| `getReviewableProducts(token)` | `GET /review/reviewable` | `no-store` | « Mes avis », détail d'une commande (« Donner mon avis ») |
| `getMyReviews(token, page)` | `GET /review/mine?page=&size=10&sort=createdAt,desc` | `no-store` | « Mes avis » |

## 4. Pages

| Page | Accès | Données | Garde |
|---|---|---|---|
| `/` (modifiée) | public | comptes, campagnes → carrousel | — |
| `/products` (modifiée) | public | 5 catégories filtrables | — |
| `/promotions` | public | campagnes actives | — |
| `/promotions/[key]` | public | campagne ; inconnue → `not-found` du segment | — |
| `/account/reviews` | USER | notables + mes avis (`?page=`, `?product=&order=` ouvre le formulaire) | `proxy.ts` (préfixe `/account` existant) + layout `(account)` |
| `/account/orders/[uuid]` (modifiée) | USER | + notables de la commande | existante |

## 5. CSP et images

Aucune origine ajoutée : les photos du carrousel et des promotions sont servies par le site
(`public/images/`, import statique). `remotePatterns` inchangé.
