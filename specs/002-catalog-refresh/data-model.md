# Data model — 002 Catalogue et navigation

Aucune donnée n'est stockée côté serveur front. Les types ci-dessous sont des schémas Zod
(réponses backend, stockage navigateur, entrées de route) ou des vues préparées par le BFF.
Toutes les valeurs fermées sont des enums string (constitution XII). Les noms suivent le code
(anglais) ; les libellés visibles viennent de `features/*/messages.ts`.

## 1. Réponse backend des facettes

Source : `ProductFacetsResponseDto` (backend, `dto/response/search/`), endpoint
`POST /api/v1/services/product/search/facets`. Schéma `ProductFacetsResponseSchema` dans
`lib/schemas/facets.ts`.

| Champ | Type | Règle |
|---|---|---|
| `totalHits` | entier ≥ 0 | même valeur que `page.totalElements` de `/search` |
| `brands` | `FacetValue[]` | trié par compteur décroissant puis alphabétique |
| `price` | `RangeFacet` | bornes de prix des produits correspondants |
| `attributes` | `Record<string, FacetValue[]>` \| absent | présent seulement avec une catégorie ; chaque attribut texte du schéma est une clé, liste éventuellement vide |
| `numericAttributes` | `Record<string, RangeFacet>` \| absent | présent seulement avec une catégorie |

- `FacetValue` = `{ value: string (non vide), count: entier ≥ 0 }`.
- `RangeFacet` = `{ min: number | null, max: number | null }` (les deux à `null` si aucun
  produit ne correspond).
- Au plus `FACET_MAX_VALUES` (50, backend) valeurs par facette ; le schéma Zod n'impose pas ce
  plafond (contrat backend susceptible d'évoluer) mais le front n'en affiche jamais plus.

## 2. Données de facettes normalisées (BFF)

`FacetData` — ce que `lib/api/endpoints/facets.ts` renvoie aux pages, quelle que soit la source.

| Champ | Type | Remarque |
|---|---|---|
| `source` | enum `FacetSource` : `BACKEND = "backend"`, `FALLBACK = "fallback"`, `UNAVAILABLE = "unavailable"` | pilote l'affichage des compteurs et le message discret |
| `hasCounts` | boolean | vrai seulement pour `BACKEND` |
| `totalHits` | entier ≥ 0 \| `null` | `null` si `UNAVAILABLE` |
| `values` | `Record<string, FacetValue[]>` | valeurs texte par clé ; compteur absent (`count: null`) en repli |
| `ranges` | `Record<string, { min: number \| null; max: number \| null }>` | bornes observées |

Règles du repli (`FALLBACK`) : valeurs distinctes non vides des produits de la catégorie,
triées avec `localeCompare` (`fr`), plafonnées à `FACET_MAX_VALUES` ; bornes = min / max des
valeurs numériques ; un dépassement de `FACET_FALLBACK_SCAN_SIZE` est loggé en `warn`.

## 3. Facette prête à afficher

`FilterFacet` — sortie de `buildFilterFacets(schema, facetData, filters)`
(`features/catalog/filter-facets.ts`), union discriminée par `kind` (enum `FacetKind`, complété
de `TEXT = "text"`).

| `kind` | Champs |
|---|---|
| `TEXT` / `ENUM` | `key`, `label` (français, unité exclue), `values: FilterValue[]`, `visibleCount` (≤ `FACET_VISIBLE_VALUES`), `isExpanded` (une valeur cachée est cochée) |
| `RANGE` | `key`, `label`, `unit` \| absent, `lower` / `upper` (bornes autorisées), `selected: NumericRange` |
| `BOOLEAN` | `key`, `label`, `isChecked` |

`FilterValue` = `{ value, label, count: number | null, isChecked, isDisabled }`.

Règles :
- l'ordre des facettes suit le schéma de catégorie ; les clés de `FILTER_EXCLUDED_ATTRIBUTES`
  sont retirées ;
- `TEXT` sans aucune valeur (catégorie vide, données indisponibles) et sans valeur cochée →
  facette omise ;
- `isDisabled` = `count === 0 && !isChecked` ;
- une valeur cochée absente des données est ajoutée à la fin avec `count: 0` (avec compteurs)
  ou `null` (sans) ;
- `RANGE` : `lower` = max(`minimum` du schéma, borne observée basse), `upper` = borne observée
  haute ; sans borne observée, seules celles du schéma s'appliquent.

## 4. Filtre actif (pastille)

`ActiveFilter` — sortie de `describeActiveFilters(filters, facets)`.

| Champ | Type |
|---|---|
| `kind` | enum `ActiveFilterKind` : `KEYWORD`, `CATEGORY`, `BRAND`, `PRICE`, `ATTRIBUTE`, `RANGE` |
| `label` | texte de la pastille (« Processeur : AMD Ryzen 7 », « Mémoire vive : 16 – 32 Go ») |
| `removeHref` | adresse canonique sans ce filtre (`buildSearchUrl`) |

La pastille du mot-clé n'est pas retirée par « Tout effacer » (FR-009) ; retirer la catégorie
retire aussi ses filtres de caractéristiques (FR-011, règle existante de
`features/catalog/search-params.ts`).

## 5. Sélection de comparaison (navigateur)

Clé `sessionStorage` : `ct_compare_v1` (`StorageKey.COMPARE`). Schéma `CompareSelectionSchema`
dans `lib/schemas/storage.ts`.

| Champ | Type | Règle |
|---|---|---|
| `category` | enum `CategoryKey` | catégorie du premier produit ajouté |
| `uuids` | `string[]` | UUID valides, 1 à `COMPARE_MAX_PRODUCTS` (3), sans doublon, ordre d'ajout |

Transitions (fonctions pures de `features/compare/selection.ts`) :

| Action | Sélection vide | Même catégorie, < 3 | Même catégorie, 3 | Autre catégorie |
|---|---|---|---|---|
| `add(uuid, category)` | crée `{category, [uuid]}` | ajoute | refus `CompareRefusal.FULL` | refus `CompareRefusal.OTHER_CATEGORY` |
| `remove(uuid)` | — | retire ; vide → clé supprimée | retire | — |
| `clear()` | — | clé supprimée | clé supprimée | — |

`CompareRefusal` (enum) : `FULL = "full"`, `OTHER_CATEGORY = "other_category"` ; chaque valeur a
son message dans `features/compare/messages.ts`. Lecture invalide (JSON cassé, schéma non
respecté) → clé supprimée, sélection vide, aucune erreur visible.

## 6. Vue de comparaison (BFF)

`ComparisonView` — réponse de `GET /api/compare?uuids=` (voir `contracts/bff-routes.md`),
construite par `lib/api/compare.ts` à partir de `getProductByUuid` (cache catalogue) et
`getCategorySchema`.

| Champ | Type | Remarque |
|---|---|---|
| `category` | `CategoryKey` | catégorie commune |
| `products` | `ComparedProduct[]` | ordre de la demande, produits trouvés seulement |
| `rows` | `ComparisonRow[]` | ordre : propriétés du schéma, puis attributs hors schéma |
| `missing` | `string[]` | UUID demandés introuvables (à retirer de la sélection) |

- `ComparedProduct` = `ProductCard` du lot 1 (`uuid`, `name`, `brand`, `category`, `price`,
  `imageUrl`) ; disponibilité lue à part (jamais en cache).
- `ComparisonRow` = `{ key, label, values: (string | null)[], differs: boolean }` ; `values`
  alignées sur `products`, `null` affiché « — » ; libellés et unités produits par la même
  fonction que la fiche produit (`formatSpecValue`, extraite de `buildProductSpecs`) ;
  `differs` = au moins deux valeurs distinctes, une valeur absente comptant comme distincte.
- Produits de catégories différentes dans la demande (sélection trafiquée) : seuls ceux de la
  catégorie majoritaire, à défaut celle du premier, sont gardés ; les autres vont dans
  `missing`.

## 7. Rubrique de navigation

Enum `NavSection` (`lib/enums/nav-section.ts`) : `HOME = "home"`, `CATALOG = "catalog"`,
`COMPUTER = "computer"`, `MONITOR = "monitor"`, `NONE = "none"`.

| Adresse | Rubrique |
|---|---|
| `/` | `HOME` |
| `/products?category=COMPUTER` | `COMPUTER` |
| `/products?category=MONITOR` | `MONITOR` |
| `/products` (autres) | `CATALOG` |
| `/products/{uuid}` | rubrique de la catégorie publiée par `NavSectionMarker`, sinon `CATALOG` |
| autres (`/cart`, `/register`, `/login`…) | `NONE` |

Fonction pure `resolveNavSection(pathname, searchParams, productCategory)` ; `switch`
exhaustif terminé par `assertNever`.

## 8. Constantes ajoutées

| Constante | Valeur | Fichier | Raison |
|---|---|---|---|
| `FILTER_EXCLUDED_ATTRIBUTES` | `["connectivity"]` | `lib/constants/catalog.ts` | R2 |
| `FACET_VISIBLE_VALUES` | 6 | `lib/constants/catalog.ts` | R4 |
| `FACET_MAX_VALUES` | 50 | `lib/constants/catalog.ts` | aligné sur le backend |
| `FACET_FALLBACK_SCAN_SIZE` | 1 000 | `lib/constants/catalog.ts` | R1, au-dessus des 531 produits |
| `FACETS_FALLBACK_REVALIDATE_SECONDS` | 300 | `lib/constants/catalog.ts` | R1 |
| `COMPARE_MAX_PRODUCTS` | 3 | `lib/constants/compare.ts` | FR-014 |
| `COMPARE_MIN_PRODUCTS` | 2 | `lib/constants/compare.ts` | bouton « Comparer » |
| `COMPARE_CHANGED_EVENT` | `"ct:compare-changed"` | `features/compare/selection.ts` | R8 |
| `BFF_ROUTES.compare` | `"/api/compare"` | `lib/constants/routes.ts` | R11 |
| `BACKEND_PATHS.productFacets` | `/api/v1/services/product/search/facets` | `lib/constants/api.ts` | R1 |
