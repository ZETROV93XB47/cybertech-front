# Implementation Plan: Catalogue et navigation

**Branch**: `002-catalog-refresh` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-catalog-refresh/spec.md`

## Summary

Rendre le catalogue utile pour choisir : filtres sur toutes les caractéristiques de la
catégorie (valeurs et compteurs fournis par le nouvel endpoint de facettes du backend, repli
sans compteurs s'il est absent, connectique exclue), pastilles de filtres actifs, comparateur
de 2 à 3 produits d'une même catégorie (case sur le catalogue, bouton sur la fiche, barre en bas
d'écran, grand cadre modal au-dessus de la page), barre de navigation unique avec rubrique
courante, et gabarit commun accueil / catalogue. Approche : Server Components et liens pour
tout ce qui touche à l'adresse (filtres, pastilles, « Voir tout » natif), îlots client
uniquement pour la comparaison et la rubrique courante, une nouvelle route BFF
(`GET /api/compare`) et un nouvel appel serveur (facettes). Aucune nouvelle dépendance npm.
Décisions : [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x strict, Node 24 LTS, React 19, Next.js 16.4 (App Router) —
inchangé depuis le lot 1

**Primary Dependencies**: celles du lot 1, sans ajout : zod 4.6, @tanstack/react-query 5.104,
tailwindcss 4.3, shadcn/ui (Radix Dialog), motion 14.1, openapi-typescript 7.13, pino

**Storage**: aucune base. Navigateur : nouvelle clé `sessionStorage` `ct_compare_v1`
(identifiants de produits et catégorie, non sensibles) ; clés du lot 1 inchangées

**Testing**: Vitest + Testing Library + MSW (unitaire), Playwright + @axe-core/playwright
(e2e contre la stack locale), Lighthouse desktop manuel

**Target Platform**: navigateurs desktop récents, fenêtre ≥ 1 024 px ; exécution locale

**Project Type**: application web (front Next.js + BFF intégré), backend externe existant

**Performance Goals**: budgets du lot 1 (LCP < 2,5 s, CLS < 0,1, TBT ≤ 200 ms) sur l'accueil et
le catalogue filtré ; ouverture du cadre de comparaison sans tâche > 50 ms

**Constraints**: backend en lecture seule ; endpoint de facettes livré mais non committé au
moment du plan (repli obligatoire) ; filtrage d'attributs par égalité exacte ; `priceMin ≥ 100` ;
pas de tri ; catalogue sans écrans en local ; fonctionnement sans JavaScript des filtres

**Scale/Scope**: 2 pages modifiées (accueil, catalogue), 1 page enrichie (fiche produit), en-tête
global ; 1 route BFF ajoutée, 1 endpoint backend nouvellement consommé ; ~531 produits,
9 caractéristiques connues, au plus 50 valeurs par facette

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification dans ce plan | Statut |
|---|---|---|
| I. TypeScript strict | Aucun relâchement ; nouveaux schémas Zod typés, unions discriminées pour `FilterFacet` | ✅ |
| II. App Router | Filtres, pastilles, accueil en Server Components ; `"use client"` limité à `CompareToggle`, `CompareBar`, `CompareDialog`, `MainNav`, `NavSectionMarker` ; aucune page privée ajoutée | ✅ |
| III. BFF | Facettes appelées côté serveur ; cadre de comparaison via `GET /api/compare` ; le navigateur n'appelle jamais Spring | ✅ |
| IV. Session et tokens | Aucune donnée de session touchée ; `sessionStorage` limité à des identifiants de produits, revalidés par Zod | ✅ |
| V. Contrat d'API | `ProductFacetsResponseSchema` écrit depuis le DTO backend puis comparé au type généré (`gen:api`) ; aucune valeur ni montant recalculé (les bornes et compteurs viennent du backend, le repli ne fait que lister des valeurs existantes) | ✅ |
| VI. Configuration | Aucune nouvelle variable d'environnement | ✅ |
| VII. Tests | Unitaires (facettes, pastilles, sélection, vue de comparaison, rubrique, effets par niveau) + 4 parcours Playwright + axe + longues tâches | ✅ |
| VIII. Accessibilité | `aria-disabled` + raison liée (R9), `role="status"` de la barre, dialogue Radix (focus, Échap), tableau à en-têtes, `aria-current`, différences non signalées par la seule couleur, reduced-motion | ✅ |
| IX. Performance | Pas de nouvel effet lourd ; cadre chargé à la demande ; facettes en cache serveur ; Lighthouse en fin de story | ✅ |
| X. Exécution locale | Inchangé | ✅ |
| XI. Code pédagogique | Code et logs en anglais, textes dans `features/catalog/messages.ts`, `features/compare/messages.ts`, `features/common/messages.ts` | ✅ |
| XII. Code propre et observable | Constantes listées (data-model §8), enums `FacetSource`, `ActiveFilterKind`, `CompareRefusal`, `NavSection`, `FacetKind.TEXT` ; `switch` exhaustifs ; logs des facettes (source, repli, durée) et de la vue de comparaison, UUID masqués | ✅ |
| XIII. Interface paramétrable | Barre, cadre, pastilles, soulignement de rubrique et gabarit en tokens du thème ; animations via `useMotionTokens()` / `useEffectiveEffects()` avec version statique et test par niveau | ✅ |
| Contraintes (tutoiement, CSP, `errorCode`) | Messages au tutoiement ; aucune ressource externe ajoutée (CSP inchangée) ; erreurs de `/api/compare` par le mapping existant | ✅ |

Gate initial : **PASS**. Re-vérification après Phase 1 : **PASS** (aucune dérogation).

## Project Structure

### Documentation (this feature)

```text
specs/002-catalog-refresh/
├── plan.md              # ce fichier
├── research.md          # Phase 0 : décisions R1–R14
├── data-model.md        # Phase 1 : facettes, pastilles, sélection, vue de comparaison, rubrique
├── quickstart.md        # Phase 1 : guide de validation
├── contracts/
│   └── bff-routes.md    # GET /api/compare, appels serveur des facettes
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Fichiers ajoutés (+) ou modifiés (~) ; le reste du lot 1 est inchangé.

```text
app/
├── (shop)/
│   ├── page.tsx                         ~ PageShell, PageHeader, CategoryTiles, EmptyState
│   ├── products/page.tsx                ~ facettes, ActiveFilters, comparable, CompareBar
│   └── products/[uuid]/page.tsx         ~ CompareToggle (bouton), CompareBar, NavSectionMarker
└── api/compare/route.ts                 + GET /api/compare
components/
├── layout/
│   ├── Header.tsx                       ~ MainNav dans un Suspense
│   ├── MainNav.tsx                      + liens, rubrique courante (client)
│   ├── NavSectionMarker.tsx             + publie la catégorie d'une fiche (client)
│   ├── PageShell.tsx · PageHeader.tsx · SectionHeading.tsx   +
│   └── EmptyState.tsx                   + StateIllustration + phrase + action
features/
├── catalog/
│   ├── filter-facets.ts                 + buildFilterFacets (R3–R5, R7)
│   ├── active-filters.ts                + describeActiveFilters (R6)
│   ├── components/Filters.tsx           ~ facettes TEXT, compteurs, <details>
│   ├── components/FacetFieldset.tsx     ~ valeurs avec compteurs, plages bornées
│   ├── components/ActiveFilters.tsx     + pastilles (serveur)
│   ├── components/CategoryTiles.tsx     + accueil
│   ├── components/ProductCard.tsx       ~ prop comparable
│   ├── product-specs.ts                 ~ formatSpecValue exporté
│   └── messages.ts                      ~ pastilles, compteurs, « Voir tout », bornes
├── compare/                             + nouveau domaine
│   ├── selection.ts                     sessionStorage, transitions, événement
│   ├── hooks/useCompareSelection.ts     useSyncExternalStore
│   ├── hooks/useComparison.ts           TanStack Query → /api/compare
│   ├── components/CompareToggle.tsx · CompareBar.tsx · CompareDialog.tsx · CompareTable.tsx
│   └── messages.ts
└── common/messages.ts                   ~ libellés de navigation
lib/
├── api/endpoints/facets.ts              + getFacets, getFallbackFacets, getCategoryCounts
├── api/compare.ts                       + buildComparisonView (server-only)
├── schemas/facets.ts                    + ProductFacetsResponseSchema, FacetData
├── schemas/category.ts                  ~ FacetKind.TEXT
├── schemas/storage.ts                   ~ CompareSelectionSchema
├── constants/catalog.ts · compare.ts · api.ts · routes.ts   ~ / +
└── enums/ facet-kind ~ · facet-source + · active-filter-kind + · compare-refusal + · nav-section + · storage-key ~
tests/
├── unit/catalog/ filter-facets · active-filters · facets-endpoint (MSW, repli) +
├── unit/compare/ selection · comparison-view · compare-components (axe) +
├── unit/layout/ nav-section · main-nav +
├── unit/effects/ compare-effects-levels +
└── e2e/ catalog-filters · compare · navigation · home + ; a11y · long-tasks ~
```

**Structure Decision** : même projet unique Next.js. La comparaison devient un domaine
`features/compare/` (sélection, composants, messages) car elle vit sur deux pages et n'est pas
une simple vue du catalogue. Les briques de gabarit partagées par toutes les pages
(`PageShell`, `PageHeader`, `SectionHeading`, `EmptyState`, `MainNav`) vont dans
`components/layout/`, prêtes pour les features 003 à 005.

## Mapping page → BFF → endpoint Spring

| Page / composant | Côté Next | Endpoint Spring | Cache |
|---|---|---|---|
| Catalogue – facettes | RSC → `facets.getFacets(filters)` | `POST /product/search/facets` | 60 s, tag `products` |
| Catalogue – facettes (repli) | RSC → `facets.getFallbackFacets(category)` | `POST /product/search { category, size: 1000 }` | 300 s, tag `products` |
| Catalogue – résultats, pagination | inchangé (lot 1) | `POST /product/search` | 60 s |
| Accueil – tuiles de catégories | RSC → `facets.getCategoryCounts()` | `POST /product/search/facets` (ou repli) | 60 s |
| Accueil – meilleures ventes, offre, récents | inchangé (lot 1) | inchangé | inchangé |
| Barre de comparaison | client → `GET /api/products?uuids=` | `GET /product/get/{uuid}` | 60 s |
| Cadre de comparaison | client → `GET /api/compare?uuids=` | `GET /product/get/{uuid}` + `GET /product-category-schemas/{key}` | 60 s / 3 600 s |
| Cadre – disponibilité, panier | composants existants | `GET /product/availability`, `/cart/*` | jamais / no-store |

Détail : [contracts/bff-routes.md](./contracts/bff-routes.md).

## Ordre de livraison (une user story par conversation)

1. **US1 Filtres (P1)** : schéma et appel des facettes, repli, `buildFilterFacets`, filtres
   texte et plages bornées, pastilles. Livrable seul.
2. **US2 Comparateur (P1)** : sélection, case et bouton, barre, route `/api/compare`, cadre.
   Indépendant de US1.
3. **US3 Navigation (P2)** : `MainNav`, rubrique courante, `NavSectionMarker`, vérification du
   lien d'évitement.
4. **US4 Accueil et catalogue cohérents (P3)** : `PageShell`, `PageHeader`, `SectionHeading`,
   `EmptyState`, `CategoryTiles` ; appliqués à l'accueil et au catalogue.
5. **Phase « Interface vivante et cohérente »** (`docs/speckit-prompts-lot2.md` §6) : audit
   avec captures, animation orchestrée par surface, tests par niveau d'effet, axe, longues
   tâches, Lighthouse.

## Tests

- Unitaires : `buildFilterFacets` (exclusion connectique, ordre schéma, tri avec et sans
  compteurs, valeur à 0 grisée, valeur cochée conservée, bornes de plage), `describeActiveFilters`
  (libellés, adresses de retrait, « Tout effacer » garde le mot-clé), endpoint de facettes avec
  MSW (succès, 404 → repli, réponse non conforme → repli, repli en erreur → `UNAVAILABLE`),
  test de type schéma Zod ↔ `schema.d.ts`, sélection (transitions, refus, nettoyage d'une
  valeur trafiquée), `buildComparisonView` (ordre des lignes, « — », `differs`, `missing`,
  catégories mélangées), `resolveNavSection`, composants avec jest-axe, effets par niveau.
- E2E (stack réelle, `--workers=1`) : filtres + pastilles + adresse + sans JavaScript ;
  comparaison de 3 ordinateurs sur deux pages, cadre, différences, Échap, fiche produit ;
  barre de navigation sur les 7 pages et rubrique courante ; accueil → catalogue préfiltré ;
  axe sur les nouvelles surfaces ; longues tâches.
- Lighthouse desktop en fin de story (quickstart §4).

## Complexity Tracking

Aucune violation de la constitution à justifier.
