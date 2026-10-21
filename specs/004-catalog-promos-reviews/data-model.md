# Data model — 004 Catalogue élargi, promotions et avis

Aucune donnée n'est stockée côté serveur front. Les types sont des schémas Zod (réponses du
backend, corps envoyés, paramètres d'URL) ou des vues préparées par des fonctions pures. Les
ensembles fermés sont des enums string (constitution XII) ; les schémas sont construits depuis
les enums. Champs vérifiés contre l'OpenAPI du backend `bddcafd` (`lib/api/schema.d.ts`,
régénéré le 2026-10-21).

## 1. Enums

| Enum | Fichier | Valeurs | Source |
|---|---|---|---|
| `CategoryKey` (complété) | `lib/enums/category-key.ts` | `COMPUTER`, `DESKTOP`, `MONITOR`, `SMARTPHONE`, `SMARTWATCH` | schémas actifs du backend (R1) |
| `NavSection` (modifié) | `lib/enums/nav-section.ts` | `HOME`, `CATALOG`, `PROMOTIONS` (+), `ACCOUNT`, `NONE` ; `COMPUTER` et `MONITOR` retirés | R3 |
| `SlideKind` | `lib/enums/home.ts` | `CATEGORY = "category"`, `CAMPAIGN = "campaign"` | R6 |
| `CarouselPlayback` | `lib/enums/home.ts` | `PLAYING = "playing"`, `PAUSED = "paused"` (pause explicite de l'utilisateur), `DISABLED = "disabled"` (effets réduits, une seule diapositive) | R4 |
| `CampaignImageKey` | `lib/enums/promotions.ts` | `BLACK_FRIDAY`, `WINTER_SALES`, `SPRING_SALES`, `BUY_ONE_GET_ONE_FREE` (clés codées dans `DiscountTypeResolver` du backend) | R5 |
| `ApplyCampaignOutcome` | `lib/enums/promotions.ts` | `APPLIED = "applied"`, `SIGN_IN_NEEDED = "sign-in-needed"`, `STORAGE_UNAVAILABLE = "storage-unavailable"` | R7 |
| `ReviewFormStatus` | `lib/enums/review.ts` | `IDLE = "idle"`, `SUCCESS = "success"`, `ERROR = "error"` | FR-016 à FR-018 |
| `AccountSection` (complété) | navigation du compte | `REVIEWS = "reviews"` (+) | R10 |
| `FrontErrorCode` (complété) | `lib/enums/error-code.ts` | `REVIEW_REJECTED = "review-rejected"`, `REVIEW_NOT_ALLOWED = "review-not-allowed"` | R8 |

Mapping `BackendErrorCode` → `FrontErrorCode` modifié dans `lib/api/errors.ts` :

| Backend | Avant | Après |
|---|---|---|
| `COMMENT_POST_NOT_ALLOWED` | `UNKNOWN` | `REVIEW_REJECTED` |
| `ORDER_NOT_REVIEWABLE` | `UNKNOWN` | `REVIEW_NOT_ALLOWED` |
| `USER_NOT_AUTHOR_OF_REVIEW` | `UNKNOWN` | `FORBIDDEN` |
| `REVIEW_NOT_FOUND` | `NOT_FOUND` | inchangé |

## 2. Catégories

### 2.1 Table de référence (R1)

| Élément | Fichier | Type |
|---|---|---|
| `CATEGORY_ORDER` | `lib/constants/categories.ts` | `readonly CategoryKey[]` : `COMPUTER`, `DESKTOP`, `MONITOR`, `SMARTPHONE`, `SMARTWATCH` (ordre du menu, des tuiles et du carrousel) |
| `CATEGORY_LABELS` | `features/catalog/messages.ts` | `Record<CategoryKey, string>` : « Ordinateurs portables », « Ordinateurs de bureau », « Écrans », « Smartphones », « Montres connectées » ; `GENERIC_CATEGORY_LABEL` « Autres produits » |
| `CATEGORY_ICONS` | `features/catalog/category-icons.ts` | `Record<CategoryKey, LucideIcon>` : `Laptop`, `PcCase`, `Monitor`, `Smartphone`, `Watch` ; `GENERIC_CATEGORY_ICON` = `Package` |
| `CATEGORY_TAGLINES` | `features/home/messages.ts` | `Record<CategoryKey, string>` : accroche de la diapositive |
| `CATEGORY_IMAGES` | `features/home/slide-images.ts` | `Record<CategoryKey, StaticImageData>` (photos de `public/images/categories/`) |

`categoryLabel(raw: string): string` et `categoryIcon(raw: string): LucideIcon` lisent une
catégorie brute (`ProductResponseDto.category`, chaîne libre) via `toCategoryKey` et renvoient
le générique pour une clé inconnue (FR-003, cas limite « catégorie inconnue »).

### 2.2 Catégories actives, comptes et photos

- `CategorySummarySchema` (`lib/schemas/category.ts`) : `ProductCategoryResponseDto` =
  `{ categoryKey: string (≥ 1), label: string }` ; `z.array` pour la liste.
- `getActiveCategories(): Promise<readonly CategoryKey[]>` : clés actives connues, dans
  l'ordre de `CATEGORY_ORDER` ; clé inconnue ignorée (`warn`) ; échec → `CATEGORY_ORDER`.
- `getCategoryCounts(categories): Promise<Partial<Record<CategoryKey, number | null>>>` :
  `totalHits` des facettes de chaque catégorie active, `null` en cas d'échec (compte masqué).
- `getCategoryPhotos(categories)` : photos produits des tuiles, catégories actives.

## 3. Accueil — diapositives

`HomeSlide` (vue, `features/home/home-slides.ts`), union discriminée sur `kind` :

| Champ | Type | Règle |
|---|---|---|
| `kind` | `SlideKind` | — |
| `id` | `string` | `category:{key}` ou `campaign:{discountKey}`, unique |
| `title` | `string` | nom de la catégorie, ou avantage de la campagne (« −20 % sur ta commande ») |
| `tagline` | `string` | accroche (catégorie) ou conditions résumées (campagne) |
| `cta` | `string` | « Voir les ordinateurs de bureau », « Voir la promotion » |
| `href` | `string` | `buildSearchUrl({ category })` ou `promotionRoute(discountKey)` |
| `image` | `StaticImageData` | `CATEGORY_IMAGES[key]`, `CAMPAIGN_IMAGES[key]` ou `GENERIC_CAMPAIGN_IMAGE` |
| `imageAlt` | `string` | texte alternatif français, décrit la photo |
| `count` | `number \| null` | catégorie seulement : nombre de produits |

`buildHomeSlides(counts, campaigns): readonly HomeSlide[]` : catégories dans `CATEGORY_ORDER`,
campagnes affichables dans l'ordre du backend, alternées puis complétées (R6).

État du carrousel (`useCarousel`) : `{ index: number, playback: CarouselPlayback,
isHovered: boolean, isFocused: boolean, isHidden: boolean }` ; la lecture est effective si
`playback === PLAYING` et ni survol, ni focus, ni onglet caché.

## 4. Promotions

Réutilise `ActiveDiscountSchema` (`lib/schemas/discount.ts`) : `discountKey`,
`calculationType` (`DiscountCalculationType`), `percentage`, `fixedAmount`, `minOrderAmount`,
`maxDiscountAmount`, `startsAt`, `endsAt` (tous nullables sauf clé et type).

`CampaignView` (vue, `features/promotions/campaign-view.ts`) :

| Champ | Type | Règle |
|---|---|---|
| `key` | `DiscountKey` | — |
| `name` | `string` | `CAMPAIGN_NAMES[key]` si connue (« Black Friday »), sinon la clé mise en forme (`SPRING_SALES` → « Spring sales ») |
| `benefit` | `string` | `PERCENTAGE` → « −20 % », `FIXED_AMOUNT` → « −10,00 € », `BUY_ONE_GET_ONE_FREE` → « 1 acheté = 1 offert » ; `NONE` jamais affiché ; switch exhaustif |
| `conditions` | `readonly string[]` | minimum de commande, plafond de remise, fin (« jusqu'au 30 novembre ») ou « Sans date de fin » ; montants du backend formatés, jamais calculés |
| `image`, `imageAlt` | `StaticImageData`, `string` | R5 |
| `href` | `string` | `promotionRoute(key)` = `/promotions/{key}` |

Paramètre de route : `[key]` validé par `DiscountKeySchema` (1–64, `[A-Z0-9_]`, majuscules) ;
invalide ou absent des campagnes actives → `notFound()`.

Appliquer à mon panier : `writeDiscountKey(sessionStorage, key)` (existant, `ct_discount_v1`) ;
résultat `ApplyCampaignOutcome` : `APPLIED`, `SIGN_IN_NEEDED` (visiteur : clé gardée),
`STORAGE_UNAVAILABLE` (navigation privée stricte).

## 5. Avis

### 5.1 Réponses du backend (`lib/schemas/review.ts`)

| Schéma | DTO | Champs (Zod) |
|---|---|---|
| `PublicReviewSchema` | `PublicReviewDto` | `uuid` (uuid), `rating` (int 1–5), `comment` (string nullable), `authorFirstName` (string), `createdAt` (string ISO) |
| `ProductReviewsResponseSchema` | `ProductReviewsResponseDto` | `averageRating` (number nullable), `reviewCount` (int ≥ 0), `distribution` (`z.record` des clés « 1 » à « 5 » → int ≥ 0, clés toutes présentes), `reviews` = `pagedSchema(PublicReviewSchema)` |
| `ReviewableProductSchema` | `ReviewableProductDto` | `productUuid`, `orderUuid` (uuid), `productName` (string), `orderDate` (`z.iso.date()` nullable) |
| `MyReviewSchema` | `MyReviewDto` | `uuid`, `productUuid`, `orderUuid` (uuid), `productName`, `rating` (1–5), `comment` (nullable), `createdAt`, `updatedAt` (nullable) |
| `ReviewResponseSchema` | `ReviewResponseDto` | `uuid`, `userUuid`, `productUuid`, `productName`, `rating`, `comment` (réponse de create / update) |

Tests de type (comme `order.test-d.ts`) : noms de champs égaux à ceux de l'OpenAPI.

### 5.2 Corps envoyés

| Schéma | Vers | Règles (= Bean Validation) |
|---|---|---|
| `ReviewCreateBodySchema` | `POST /review/create` | `orderUuid`, `productUuid` (uuid) ; `rating` int 1–`REVIEW_MAX_RATING` (5) ; `comment` : `trim()`, ≤ `REVIEW_COMMENT_MAX_LENGTH` (1 000), vide → omis |
| `ReviewUpdateBodySchema` | `PATCH /review/update/{uuid}` | `reviewUuid` (uuid, = chemin) ; `rating` et `comment` comme ci-dessus |

### 5.3 Vues

- `ProductReviews` (existant, `features/catalog/reviews.ts`) : rempli par
  `toProductReviews(response)` (moyenne, nombre, répartition, avis paginés) au lieu de
  `NO_REVIEWS` ; `ProductReview` gagne `authorFirstName` et `createdAt`.
- `MyReviewsView` (`features/reviews/my-reviews-view.ts`) : `toReview` (liste des produits
  notables, triée par date de commande décroissante) et `published` (page de mes avis :
  produit, lien fiche, note, commentaire, date, `isEdited` = `updatedAt` postérieur à
  `createdAt`), `pagination`.
- `ReviewFormState` : `{ status: ReviewFormStatus, rating: number | null, comment: string,
  fieldErrors, formError? }` ; la saisie est gardée sur toute erreur (FR-017).

### 5.4 Transitions

```text
produit notable ──publier──▶ avis publié ──modifier──▶ avis publié (isEdited)
       ▲                          │
       └────────supprimer─────────┘   (le produit redevient notable si sa commande l'est)
```

## 6. Constantes

| Constante | Fichier | Valeur | Origine |
|---|---|---|---|
| `CATEGORY_ORDER` | `lib/constants/categories.ts` | 5 clés | R1 |
| `CAROUSEL_AUTOPLAY_INTERVAL_MS` | `lib/theme/theme.config.ts` | `6_000` | spec, hypothèses |
| `HOME_CAMPAIGN_SLIDES_MAX` | `lib/constants/home.ts` | `4` | garde le carrousel court si le backend active beaucoup de campagnes |
| `REVIEW_MAX_RATING` | `features/catalog/reviews.ts` (existant) | `5` | `@Max(5)` |
| `REVIEW_COMMENT_MAX_LENGTH` | `lib/constants/reviews.ts` | `1_000` | `@Size(max = 1000)` |
| `PRODUCT_REVIEWS_PAGE_SIZE` | `lib/constants/reviews.ts` | `10` | taille par défaut du backend |
| `MY_REVIEWS_PAGE_SIZE` | `lib/constants/reviews.ts` | `10` | prompt §13 |
| `PRODUCT_REVIEWS_REVALIDATE_SECONDS` | `lib/constants/reviews.ts` | `60` | fraîcheur de la fiche, revalidée par tag après chaque écriture |
| `PROMOTIONS_PATH`, `promotionRoute(key)`, `ACCOUNT_REVIEWS_PATH` | `lib/constants/routes.ts` | `/promotions`, `/promotions/{key}`, `/account/reviews` | — |
| `BACKEND_PATHS.review*` | `lib/constants/api.ts` | `reviewCreate`, `reviewUpdate`, `reviewDelete`, `reviewReviewable`, `reviewMine`, `reviewProduct` | OpenAPI |
