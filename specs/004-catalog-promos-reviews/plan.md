# Implementation Plan: Catalogue élargi, promotions et avis

**Branch**: `004-catalog-promos-reviews` (pas de branche git, travail sur `main`) | **Date**:
2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-catalog-promos-reviews/spec.md`

## Summary

Rendre visibles les cinq catégories du backend partout où un produit apparaît, ranger la
navigation dans un menu « Catalogue » à côté d'un lien « Promotions », ouvrir l'accueil sur un
carrousel qui alterne catégories et campagnes actives, donner une page à chaque campagne avec
« Appliquer à mon panier », et brancher les avis : fiche produit (moyenne, répartition, avis
paginés), « Mes avis » (produits à noter et mes avis publiés, modifiables et supprimables à
tout moment grâce à `GET /review/mine`), « Donner mon avis » sur le détail d'une commande.
Approche : une table de référence des catégories typée par l'enum ; Radix NavigationMenu pour le
menu ; carrousel maison accessible (motif WAI-ARIA), photos libres de droits servies par le
site ; pages promotions en Server Components sur les données déjà en cache ; avis lus en RSC,
écrits par Server Actions avec revalidation ciblée, une seule route BFF publique pour la
pagination des avis d'une fiche. Aucune dépendance ajoutée. Décisions :
[research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x strict, Node 24 LTS, React 19.3, Next.js 16.4 (App Router)
— inchangé

**Primary Dependencies**: inchangées : zod 4.6, @tanstack/react-query 5.104, next-auth 5 beta,
tailwindcss 4.3, radix-ui 1.8 (NavigationMenu, AlertDialog, RadioGroup), motion 14.1,
lucide-react, sonner, pino, openapi-typescript

**Storage**: aucune base ; `sessionStorage` `ct_discount_v1` (existant, 003) réutilisé par
« Appliquer à mon panier » ; photos dans `public/images/`

**Testing**: Vitest + Testing Library + MSW + jest-axe ; Playwright + @axe-core/playwright
contre la stack locale (`--workers=1`) ; tests de type contre `schema.d.ts` ; Lighthouse
desktop

**Target Platform**: navigateurs desktop récents ; exécution locale

**Project Type**: application web (Next.js + BFF intégré), backend externe en lecture seule

**Performance Goals**: budgets du lot 1 (LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms) sur l'accueil
avec carrousel, `/promotions` et une fiche avec avis (SC-006)

**Constraints**: catégories actives lues sur `GET /product-category-schemas` (libellés
anglais : traduction côté front) ; un avis par produit seulement côté `reviewable` (doublon
accepté, R9) ; `reviewable` exclut `AWAITING_SHIPPING` ; campagnes sans visuel ; 5
inscriptions par minute pour les e2e

**Scale/Scope**: 3 pages ajoutées (`/promotions`, `/promotions/[key]`, `/account/reviews`),
5 pages ou composants majeurs modifiés (accueil, catalogue, fiche, en-tête, détail de
commande) ; 1 route BFF, 3 Server Actions, 7 endpoints backend nouvellement consommés ;
10 photos ; 5 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification dans ce plan | Statut |
|---|---|---|
| I. TypeScript strict | `Record<CategoryKey, …>` exhaustifs, unions discriminées (`HomeSlide`), schémas Zod pour chaque DTO d'avis | ✅ |
| II. App Router | Lectures en Server Components ; `"use client"` limité à `CatalogMenu`, `HomeCarousel`, `ApplyCampaignButton`, `ReviewForm`, `MoreReviews`, dialogues ; `/account/reviews` gardée par `proxy.ts` et le layout `(account)` | ✅ |
| III. BFF | Navigateur → `/api/products/[uuid]/reviews` et Server Actions ; jamais d'appel direct à Spring | ✅ |
| IV. Session et tokens | Aucun jeton côté client ; seule la clé de réduction (non sensible) est en `sessionStorage` | ✅ |
| V. Contrat d'API | Types régénérés, tests de type des avis, Zod sur chaque réponse ; avantages et conditions des campagnes affichés tels que le backend les donne, aucun montant calculé (FR-014) | ✅ |
| VI. Configuration | Aucune variable ajoutée | ✅ |
| VII. Tests | Unitaires (table des catégories, `buildHomeSlides`, `useCarousel`, vues de campagne, schémas et vues d'avis, actions avec MSW, composants + axe, niveaux d'effet) ; 5 parcours Playwright | ✅ |
| VIII. Accessibilité | Menu Radix (clavier, Échap, focus rendu), carrousel WAI-ARIA (pause, annonces, pastilles), étoiles en groupe radio, refus annoncés, reduced-motion | ✅ |
| IX. Performance | Une seule image prioritaire, photos locales dimensionnées, rotation suspendue onglet caché, pas d'effet lourd ajouté ; Lighthouse en fin de story | ✅ |
| X. Exécution locale | Inchangé | ✅ |
| XI. Code pédagogique | Code en anglais ; textes dans `features/{catalog,home,promotions,reviews}/messages.ts` | ✅ |
| XII. Code propre et observable | Constantes listées (data-model §6) ; enums `SlideKind`, `CarouselPlayback`, `CampaignImageKey`, `ReviewFormStatus`, compléments `CategoryKey`, `NavSection`, `FrontErrorCode` ; logs `reviews.*` sans commentaire ni prénom, UUID masqués | ✅ |
| XIII. Interface paramétrable | Intervalle et transitions du carrousel dans `theme.config.ts`, `useEffectiveEffects()` / `useMotionTokens()`, version statique de chaque effet | ✅ |
| Contraintes (tutoiement, CSP, `errorCode`) | Messages au tutoiement ; aucune origine ajoutée à la CSP ; erreurs d'avis aiguillées sur `errorCode` | ✅ |

Gate initial : **PASS**. Re-vérification après Phase 1 : **PASS** (aucune dérogation).

## Project Structure

### Documentation (this feature)

```text
specs/004-catalog-promos-reviews/
├── plan.md              # ce fichier
├── research.md          # Phase 0 : R1–R11
├── data-model.md        # Phase 1 : enums, tables, vues, schémas, constantes
├── quickstart.md        # Phase 1 : guide de validation
├── contracts/
│   └── bff-routes.md    # route BFF, Server Actions, appels serveur, pages
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Fichiers ajoutés (+) ou modifiés (~).

```text
app/
├── (shop)/page.tsx                          ~ HomeCarousel à la place de la bannière photo
├── (shop)/products/page.tsx                 ~ 5 catégories (filtres existants)
├── (shop)/products/[uuid]/page.tsx          ~ avis réels (page 0)
├── (shop)/promotions/page.tsx               + liste des campagnes (R7)
├── (shop)/promotions/[key]/page.tsx         + page de campagne
├── (shop)/promotions/[key]/not-found.tsx    + campagne introuvable ou terminée
├── (account)/account/reviews/page.tsx       + Mes avis (R8, R10)
├── (account)/account/orders/[uuid]/page.tsx ~ « Donner mon avis »
└── api/products/[uuid]/reviews/route.ts     + GET public paginé
components/layout/
├── MainNav.tsx                              ~ Accueil · Catalogue (menu) · Promotions
├── CatalogMenu.tsx                          + Radix NavigationMenu (R3)
└── nav-section.ts                           ~ PROMOTIONS, catégorie courante à part
features/
├── catalog/                                 ~ category-icons.ts +, CATEGORY_LABELS (5),
│                                              CategoryTiles, ProductImage, ProductReviews,
│                                              reviews.ts (vue réelle), MoreReviews +
├── home/                                    + home-slides.ts · slide-images.ts ·
│                                              hooks/useCarousel.ts · components/HomeCarousel ·
│                                              messages.ts
├── promotions/                              + campaign-view.ts · campaign-images.ts ·
│                                              components/ CampaignCard · CampaignDetail ·
│                                              ApplyCampaignButton · messages.ts
├── reviews/                                 + actions.ts · my-reviews-view.ts ·
│                                              components/ ReviewForm · StarRatingInput ·
│                                              ReviewableList · MyReviewList ·
│                                              DeleteReviewDialog · messages.ts
├── account/components/AccountNav.tsx        ~ « Mes avis »
├── auth/components/AccountMenu.tsx          ~ « Mes avis »
└── orders/components/OrderDetail.tsx        ~ « Donner mon avis »
lib/
├── enums/ category-key ~ · nav-section ~ · home + · promotions + · review + · error-code ~
├── constants/ categories + · home + · reviews + · routes ~ · api ~
├── theme/theme.config.ts                    ~ intervalle et transition du carrousel
├── schemas/review.ts                        +
├── api/endpoints/ reviews.ts + · facets.ts ~ · products.ts ~
└── api/errors.ts                            ~ codes d'avis (data-model §1)
public/images/ categories/ + (5) · promotions/ + (5)
docs/credits.md                              ~ crédits des 10 photos
tests/
├── unit/catalog/ categories · category-tiles ~ · product-reviews ~
├── unit/home/ home-slides · use-carousel · home-carousel (+ axe, niveaux d'effet)
├── unit/promotions/ campaign-view · pages + axe · apply-campaign
├── unit/reviews/ schemas (+ test de type) · actions (MSW) · my-reviews-view · composants + axe
├── unit/layout/ nav-section ~ · catalog-menu +
└── e2e/ categories · catalog-menu · home-carousel · promotions · reviews + ;
        a11y · navigation · long-tasks ~
```

**Structure Decision** : projet Next.js unique. Deux domaines ajoutés, `features/home/`
(carrousel) et `features/promotions/`, et un troisième, `features/reviews/`, pour l'écriture
des avis et « Mes avis » ; la lecture publique des avis reste dans `features/catalog/` où vit
déjà la fiche. Le menu rejoint `components/layout/` avec la barre de navigation.

## Mapping page → BFF → endpoint Spring

| Page / composant | Côté Next | Endpoint Spring | Cache |
|---|---|---|---|
| Menu « Catalogue », tuiles, carrousel – catégories | RSC → `getActiveCategories()` | `GET /product-category-schemas` | 3 600 s |
| Menu « Catalogue », tuiles, carrousel – comptes | RSC → `getCategoryCounts(categories)` | `POST /product/search/facets` × catégories actives | 300 s |
| Catalogue – filtres | RSC → `getCategorySchema(key)` | `GET /product-category-schemas/{key}` | 3 600 s |
| Carrousel, promotions | RSC → `getActiveDiscounts()` | `GET /discounts/active` | existant |
| Fiche – avis | RSC → `getProductReviews(uuid, 0)` ; client → `GET /api/products/{uuid}/reviews?page=` | `GET /review/product/{uuid}` | 60 s, tag |
| Mes avis | RSC → `getReviewableProducts`, `getMyReviews` ; Server Actions | `GET /review/reviewable`, `GET /review/mine`, `POST /review/create`, `PATCH /review/update/{uuid}`, `DELETE /review/delete/{uuid}` | no-store |
| Détail de commande – « Donner mon avis » | RSC → `getReviewableProducts` | `GET /review/reviewable` | no-store |

Détail : [contracts/bff-routes.md](./contracts/bff-routes.md).

## Ordre de livraison (une user story à la fois, arrêt et compte rendu entre deux)

0. **Prérequis** : `npm run gen:api` (backend `8cc5ded`), `CategoryKey` à cinq valeurs et
   table de référence, `getActiveCategories()` (R1), `NavSection` remanié, codes d'erreur des
   avis, constantes et routes.
1. **US1 Catégories (P1)** : libellés, icônes, comptes et photos des cinq catégories partout
   (catalogue, fiche, fil d'Ariane, panier, comparateur, commandes, wishlist), générique pour
   une clé inconnue.
2. **US2 Menu « Catalogue » (P1)** : NavigationMenu, catégorie courante ; le lien
   « Promotions » de la barre est ajouté avec la US4, en même temps que sa page (aucun lien
   mort entre-temps).
3. **US3 Carrousel (P2)** : photos et crédits, `buildHomeSlides`, `useCarousel`,
   `HomeCarousel`, remplacement de la bannière photo.
4. **US4 Promotions (P2)** : `/promotions`, `/promotions/[key]`, « Appliquer à mon panier ».
5. **US5 Avis (P2)** : fiche produit, « Mes avis » (à noter, publiés, modifier, supprimer),
   « Donner mon avis » sur la commande ; note seule vérifiée en e2e (R9).
6. **Polish** : audit visuel (captures avant / après), effets par niveau, axe, longues tâches,
   Lighthouse, documentation (`api-map.md` : endpoints d'avis et schémas des catégories).

## Tests

- Unitaires : table des catégories (exhaustive, générique), `getActiveCategories` (ordre,
  catégorie désactivée, clé inconnue ignorée, repli en cas d'échec), `getCategoryCounts`
  (échec partiel) ; `resolveNavSection` / `resolveNavCategory` ; `buildHomeSlides` (alternance,
  0 campagne, campagne inconnue → image générique, plafond) ; `useCarousel` (minuterie, pause
  survol / focus / onglet caché, effets réduits, une diapositive) ; `toCampaignView` (chaque
  `calculationType`, conditions présentes ou absentes) ; schémas d'avis et test de type ;
  `toProductReviews`, `toMyReviewsView` ; Server Actions avec MSW (succès, chaque
  `errorCode`, 401) ; route des avis (validation, 404) ; composants avec jest-axe ; un test
  par niveau d'effet pour le menu et le carrousel.
- E2E : filtre de chaque catégorie avec le nombre exact ; menu au clavier ; carrousel (pause,
  navigation, clic vers catalogue et campagne) ; promotions (liste, page, application connecté
  et visiteur, clé inconnue) ; avis (commande payée → noter → fiche → modifier → supprimer) ;
  axe sur chaque nouvelle page.

## Complexity Tracking

Aucune violation de la constitution à justifier.
