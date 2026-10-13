# Research — 002 Catalogue et navigation

Décisions techniques de la feature, numérotées R1 à R14. Le socle (Next.js 16 App Router, BFF,
Zod, TanStack Query, thème unique, effets) est celui du lot 1 : voir
`specs/001-catalog-auth-cart/research.md`. Rien n'est ajouté aux dépendances npm.

## R1 — Source des valeurs de filtres : endpoint de facettes du backend, avec repli

- **Decision** : les valeurs, compteurs et bornes viennent de
  `POST /api/v1/services/product/search/facets` (même corps que `/search`, `page` et `size`
  ignorés), appelé côté serveur par `lib/api/endpoints/facets.ts`, mis en cache 60 s avec le tag
  `products` (comme la recherche). Si l'endpoint répond 404 (backend pas encore à jour) ou
  échoue, repli : `POST /product/search` sur la catégorie seule, `size = FACET_FALLBACK_SCAN_SIZE`
  (1 000, au-dessus des 531 ordinateurs actuels), mis en cache 300 s avec le même tag ; le BFF
  en déduit les valeurs distinctes (ordre alphabétique) et les bornes numériques observées,
  **sans compteurs**. Si le repli échoue aussi, les filtres texte se réduisent aux valeurs déjà
  présentes dans l'adresse (cas limite de la spec) et la liste de produits s'affiche quand même.
- **Rationale** : le backend a livré le contrat le 2026-10-13 (DTO `ProductFacetsResponseDto`,
  `FacetValueDto`, `RangeFacetDto`, plafond `FACET_MAX_VALUES = 50`, comptage disjonctif),
  encore non committé au moment du plan ; le repli garde la feature livrable sans lui (FR-005).
  Le schéma Zod est écrit à partir du DTO, puis comparé au type généré par `npm run gen:api`
  dès que l'endpoint est exposé (test de type, comme T020 au lot 1).
- **Alternatives considered** : déduire les valeurs côté navigateur (fuite de tout le catalogue
  au client, lent) ; parcourir la page de résultats courante (valeurs incomplètes) ; coder les
  valeurs en dur (interdit par FR-002).

## R2 — Caractéristiques exclues des filtres

- **Decision** : constante `FILTER_EXCLUDED_ATTRIBUTES: readonly string[] = ["connectivity"]`
  dans `lib/constants/catalog.ts`, documentée (90 valeurs composées, décision du 2026-10-13).
  Elle filtre uniquement la liste des facettes ; la fiche produit et le comparateur affichent
  toujours la connectique.
- **Rationale** : FR-001 exige une configuration unique, pas une condition dispersée.
- **Alternatives considered** : un champ dans le JSON Schema (backend en lecture seule) ; un
  seuil automatique de cardinalité (exclurait un jour la carte graphique, 35 valeurs).

## R3 — Modèle des facettes : schéma de catégorie + données de facettes

- **Decision** : `parseCategorySchema` produit désormais un `FacetKind.TEXT` pour une chaîne sans
  `enum` (au lieu de l'ignorer). Une fonction pure `buildFilterFacets(schema, facetData,
  filters)` fusionne l'ordre et les libellés du schéma avec les valeurs, compteurs et bornes,
  et produit des `FilterFacet` prêtes à afficher (voir `data-model.md`). Les valeurs cochées
  absentes des données (disparues du catalogue, ou hors des 50 premières) sont ajoutées avec un
  compteur 0 pour rester visibles et décochables.
- **Rationale** : une seule fonction testable porte toutes les règles (exclusion, tri, valeurs à
  0 grisées, valeurs sélectionnées conservées) ; les composants ne font qu'afficher.
- **Alternatives considered** : faire porter la fusion par les composants (règles dispersées,
  tests de composants lourds).

## R4 — Ordre, valeurs nombreuses et « Voir tout » sans JavaScript

- **Decision** : avec compteurs, ordre du backend (compteur décroissant puis alphabétique) ;
  sans compteurs, ordre alphabétique (`localeCompare` `fr`). Les `FACET_VISIBLE_VALUES` (6)
  premières valeurs sont affichées, les suivantes dans un `<details>` natif « Voir tout (n) »,
  ouvert d'office si l'une d'elles est cochée.
- **Rationale** : `<details>` fonctionne sans JavaScript (FR-010) et au clavier, sans état client.
- **Alternatives considered** : bouton client « Voir plus » (inutilisable sans JS) ; champ de
  recherche dans la liste (inutile à 35 valeurs).

## R5 — Valeur à 0 : grisée et non cochable

- **Decision** : une valeur dont le compteur vaut 0 et qui n'est pas cochée est rendue
  `disabled` avec son compteur « (0) » ; une valeur cochée reste toujours active.
- **Rationale** : FR-004 ; le comptage disjonctif du backend garantit qu'une valeur à 0 ne
  donnerait aucun résultat avec les autres filtres.
- **Alternatives considered** : masquer les valeurs à 0 (l'utilisateur ne comprend plus
  pourquoi une valeur disparaît).

## R6 — Pastilles de filtres actifs sans JavaScript

- **Decision** : composant serveur `ActiveFilters` : chaque pastille est un lien vers l'adresse
  canonique sans ce filtre (`buildSearchUrl`), « Tout effacer » est un lien vers l'adresse ne
  gardant que le mot-clé. Libellés de pastilles calculés par une fonction pure
  `describeActiveFilters(filters, facets)` (« Processeur : AMD Ryzen 7 », « Prix : 500 – 1 500 € »).
  Le compteur de résultats existant reste dans sa région `aria-live`.
- **Rationale** : liens = partage, retour arrière et lecture sans JS gratuits ; la page est déjà
  rendue côté serveur à chaque changement de filtre.
- **Alternatives considered** : boutons client modifiant le formulaire (dépend de JS).

## R7 — Bornes des plages numériques

- **Decision** : les champs min / max reçoivent `min` = max(minimum du schéma, borne observée
  basse) et `max` = borne observée haute, et les bornes en indication (« 8 – 64 Go ») ; une
  saisie hors bornes ou minimum > maximum est refusée sur le champ (validation native du
  formulaire, message au tutoiement), comme le prix au lot 1.
- **Rationale** : même comportement avec ou sans JS ; aucune réécriture silencieuse de la saisie.
- **Alternatives considered** : ramener silencieusement la saisie aux bornes côté serveur
  (l'utilisateur ne comprend pas pourquoi sa valeur change) — la spec est alignée sur ce choix.

## R8 — Sélection de comparaison : `sessionStorage` + store externe

- **Decision** : clé `ct_compare_v1` (nouvelle valeur de l'enum `StorageKey`) dans
  `sessionStorage`, valeur `{ category, uuids }` validée par Zod à chaque lecture (UUID, 1 à 3
  éléments, sans doublon, catégorie de l'enum) ; une valeur invalide est supprimée sans erreur
  visible. Module `features/compare/selection.ts` (fonctions pures sur un `Storage`) et hook
  `useCompareSelection()` fondé sur `useSyncExternalStore`, avec un événement
  `ct:compare-changed` pour synchroniser les composants de la page. Rendu serveur : sélection
  vide (aucune case cochée côté serveur, hydratation sans écart grâce au `getServerSnapshot`).
- **Rationale** : clarification 3 (durée de l'onglet) ; même mécanisme que
  `ct_pending_action_v1` ; aucune donnée personnelle. Conforme à la constitution IV : des
  identifiants de produits sont des données non sensibles, de même nature que le panier
  invité et les derniers produits consultés cités en exemple, revalidées par Zod et ne faisant
  jamais foi.
- **Alternatives considered** : état React en contexte (perdu au rechargement) ; paramètre
  d'URL (pollue toutes les adresses du catalogue) ; `localStorage` (durée de vie rejetée).

## R9 — Case « Comparer » sur la carte et bouton sur la fiche

- **Decision** : îlot client `CompareToggle` (variantes `checkbox` sur la carte, `button` sur
  la fiche), placé au-dessus du lien qui recouvre la carte (`relative z-10`). `ProductCard`
  reçoit une prop `comparable` (vraie seulement dans la grille du catalogue). Un choix
  impossible garde le focus : `aria-disabled="true"` plutôt que `disabled`, raison liée par
  `aria-describedby` et affichée en infobulle au survol et au focus ; un clic ou Espace annonce
  la raison au lieu de cocher.
- **Rationale** : un contrôle `disabled` sort de l'ordre de tabulation, sa raison devient
  invisible au clavier (FR-014).
- **Alternatives considered** : attribut `title` (inaccessible au clavier et aux lecteurs
  d'écran de façon fiable) ; nouvelle dépendance Tooltip Radix (inutile pour un texte statique).

## R10 — Barre de comparaison

- **Decision** : îlot client `CompareBar` rendu par la page catalogue et la fiche produit,
  fixé en bas d'écran dans la largeur du site ; vignettes chargées par `GET /api/products`
  (route existante, cartes en cache), retrait d'un produit, « Tout effacer », « Comparer » dès
  2 produits. Région `role="status"` annonçant les changements. Entrée en glissement depuis le
  bas (tokens Motion), fondu seul si effets réduits ; espace réservé en bas de page pour ne pas
  masquer la pagination.
- **Rationale** : FR-015 ; route existante réutilisée, aucune nouvelle requête backend.
- **Alternatives considered** : barre dans le layout de la boutique (visible sur l'accueil et le
  panier, rejeté par la clarification 2).

## R11 — Cadre de comparaison : dialogue Radix + vue préparée par le BFF

- **Decision** : `components/ui/dialog.tsx` (Radix : piège de focus, Échap, retour du focus,
  titre obligatoire) en grande taille. Contenu chargé par une nouvelle route
  `GET /api/compare?uuids=` (TanStack Query, `staleTime` 60 s) qui renvoie une
  `ComparisonView` construite côté serveur : produits (carte + photo), lignes ordonnées selon le
  schéma de catégorie avec libellés et unités de `buildProductSpecs`, indicateur `differs` par
  ligne, et `missing` (UUID introuvables). Disponibilité et ajout au panier : composants
  existants `AvailabilityBadge` (batcher) et `AddToCartButton`. Tableau HTML (`th scope="col"`
  par produit, `th scope="row"` par caractéristique) dans un conteneur à défilement horizontal
  interne. « Afficher seulement les différences » : interrupteur client ; ligne différente
  marquée par une icône et un texte masqué « valeurs différentes », pas seulement une couleur.
- **Rationale** : un seul aller-retour, les règles de libellé de la fiche produit sont
  réutilisées telles quelles (FR-018), aucune donnée inventée.
- **Alternatives considered** : charger chaque fiche côté client (3 requêtes + schéma, règles de
  libellé dupliquées) ; page dédiée `/compare` (rejetée par la clarification 3).

## R12 — Rubrique courante dans la barre de navigation

- **Decision** : `components/layout/MainNav` (client) lit `usePathname()` et
  `useSearchParams()` : `/` → Accueil, `/products?category=COMPUTER` → Ordinateurs, idem
  MONITOR, `/products` sinon → Catalogue. Sur une fiche produit, la page rend
  `<NavSectionMarker category=… />` qui publie la catégorie dans un petit store externe lu par
  `MainNav`. Rubrique courante : `aria-current="page"` et indicateur visuel (soulignement
  doré, pas seulement la couleur). Enum `NavSection`. `MainNav` est enveloppée dans un
  `Suspense` (exigence de `useSearchParams`). Le lien d'évitement `SkipLink` existe déjà
  (lot 1) : il est vérifié, pas recréé.
- **Rationale** : le layout racine ne reçoit pas les `searchParams` ; seul un composant client
  connaît l'adresse courante sur toutes les pages.
- **Alternatives considered** : passer la rubrique par chaque page via un contexte (le layout
  est au-dessus des pages) ; ne rien signaler sur la fiche (FR-026 l'exige).

## R13 — Gabarit commun accueil / catalogue

- **Decision** : nouveaux composants serveur `components/layout/PageShell` (largeur
  `max-w-site`, marges et rythme vertical uniques), `PageHeader` (fil d'Ariane optionnel,
  `LiveTitle`, sous-titre, zone d'actions) et `SectionHeading` ; `EmptyState` partagé
  (`StateIllustration` + phrase + action) remplace l'état vide du catalogue et sert à
  l'accueil. Accueil : pas de fil d'Ariane (c'est la racine), titre vivant = salutation
  existante ; nouveau bloc `CategoryTiles` (une tuile par catégorie vers le catalogue
  préfiltré, avec le nombre réel de produits issu de `totalHits` des facettes ou du repli, ou
  « Aucun produit pour l'instant » à 0). Les squelettes restent ceux des îlots client (pas de
  `loading.tsx`, choix du lot 1 pour garder les vrais statuts HTTP et la lecture sans JS).
- **Rationale** : FR-028 et FR-029 ; une seule source de largeur et d'espacement.
- **Alternatives considered** : harmoniser à la main dans chaque page (la dérive reviendrait).

## R14 — Animation orchestrée et tests d'effets

- **Decision** : une animation par surface, toutes pilotées par `useMotionTokens()` et
  `useEffectiveEffects()` : apparition en cascade de la grille de résultats et des sections de
  l'accueil (`RevealGroup` existant), glissement de la barre de comparaison, ouverture du
  cadre (fondu + légère mise à l'échelle), pastilles en fondu. Version statique pour les
  niveaux « réduits » / « désactivés » et `prefers-reduced-motion`. Un test par niveau
  d'effet pour chaque nouvel effet (même modèle que `tests/unit/effects/effects-levels.test.tsx`)
  et extension de `tests/e2e/long-tasks.spec.ts` au catalogue avec comparaison ouverte.
- **Rationale** : constitution VIII, IX et XIII ; phase « Interface vivante et cohérente ».
- **Alternatives considered** : animer chaque carte et chaque pastille indépendamment (bruit
  visuel, risque de tâches longues).
