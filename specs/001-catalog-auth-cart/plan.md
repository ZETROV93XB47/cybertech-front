# Implementation Plan: Lot 1 — Catalogue, authentification et panier

**Branch**: `001-catalog-auth-cart` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-catalog-auth-cart/spec.md`

## Summary

Construire le front Next.js de cybertech pour le lot 1 : catalogue public (accueil, recherche
filtrée, fiche produit avec disponibilité en direct, palette ⌘K), inscription, session Keycloak
(connexion, refresh transparent, déconnexion complète) et panier (compte multi-appareil + panier
invité fusionné à la connexion). Approche : Server Components pour le catalogue, BFF (Route
Handlers + Server Actions) pour tout appel au backend Spring, Auth.js v5 pour la session en cookie
chiffré, TanStack Query pour l'état panier côté client, direction artistique « Aurora Glow »
implémentée avec Tailwind 4, shadcn/ui, Motion et des effets Canvas 2D différés. Décisions
détaillées : [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x strict, Node 24 LTS, React 19, Next.js 16.4 (App Router)

**Primary Dependencies**: next-auth 5.0.0-beta.32 (provider Keycloak), zod 4.6, @tanstack/react-query 5.104,
tailwindcss 4.3, shadcn/ui (Radix + cmdk), motion 14.1, lenis 1.3, openapi-typescript 7.13,
server-only, pino (logs JSON serveur, `pino-pretty` en dev) ; qualité : typescript-eslint
(type-checked), eslint-plugin-jsdoc

**Storage**: aucune base côté front. Session : cookie chiffré httpOnly (Auth.js). Navigateur :
`localStorage` (`ct_guest_cart_v1`, `ct_recent_v1`) et `sessionStorage` (`ct_pending_action_v1`),
données non sensibles. Source de vérité : backend Spring (MySQL/Redis).

**Testing**: Vitest + Testing Library + MSW (unitaire), Playwright + @axe-core/playwright (e2e,
contre la stack locale), Lighthouse manuel en mode desktop (budgets CWV)

**Target Platform**: navigateurs desktop récents (Chrome, Firefox, Edge), fenêtre ≥ 1024 px ;
exécution locale uniquement (`npm run dev`), backend Spring depuis IntelliJ, services backend
via docker-compose

**Project Type**: application web (front Next.js + BFF intégré), backend externe existant

**Performance Goals**: LCP < 2,5 s (Lighthouse desktop), INP < 200 ms, CLS < 0,1 ; effets à 60 fps,
aucune tâche > 50 ms due aux effets

**Constraints**: aucun appel navigateur → Spring/Keycloak hors redirections OIDC ; tokens jamais
côté client ; access token 5 min ; rate limit backend `cart/**` 60/min/utilisateur et inscription
5/min/IP ; recherche sans tri ; `priceMin ≥ 100` ; WCAG 2.1 AA ; `prefers-reduced-motion`

**Scale/Scope**: 6 pages (accueil, liste, fiche, panier, inscription, connexion), 8 fichiers de
Route Handlers (11 opérations), 2 Server Actions, ~15 endpoints Spring/Keycloak ; catalogue de quelques centaines de produits

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification dans ce plan | Statut |
|---|---|---|
| I. TypeScript strict | `tsconfig` strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` ; ESLint `no-explicit-any` en erreur ; types API générés | ✅ |
| II. App Router | Server Components par défaut ; `"use client"` limité à `features/*/components/*Client*`, `components/effects/`, providers ; aucune page privée au lot 1 : `proxy.ts` prêt pour `/account/**` (lot 2) et chaque route BFF USER revérifie la session côté serveur (`getAccessTokenOrThrow`) | ✅ |
| III. BFF | Navigateur → `app/api/*` / Server Actions uniquement ; `lib/api/client.ts` unique, `server-only`, en-têtes `Authorization` + `X-API-VERSION: 1.0` | ✅ |
| IV. Session et tokens | Auth.js JWT chiffré httpOnly/Secure/Lax ; `session` callback n'expose pas les tokens ; refresh serveur (R3) ; localStorage uniquement pour données non sensibles (amendement IV) | ✅ |
| V. Contrat d'API | `npm run gen:api` → `lib/api/schema.d.ts` ; Zod sur chaque réponse (`lib/schemas/`) ; total compte = `totalPrice` backend ; total invité marqué estimé | ✅ |
| VI. Configuration | `lib/env.ts` Zod, import au démarrage via `instrumentation.ts` ; une seule variable publique `NEXT_PUBLIC_SITE_URL` | ✅ |
| VII. Tests | Unitaires listés + 9 parcours Playwright + projet reduced-motion + axe | ✅ |
| VIII. Accessibilité | `aria-live` panier/erreurs, focus visible, palette clavier, `MotionConfig reducedMotion="user"`, canvas figé | ✅ |
| IX. Performance | Effets en `next/dynamic` `ssr:false`, pause visibilité/viewport ; `next/image` ; Lighthouse desktop manuel en fin de story ; mesure des longues tâches en e2e | ✅ |
| X. Exécution locale | `npm run dev` ; backend IntelliJ + services docker-compose du backend ; aucun Dockerfile, CI ni chart ; variables `AUTH_*` conservées | ✅ |
| XI. Code pédagogique | Code, commentaires, TSDoc et logs en anglais ; textes UI en français dans `features/*/messages.ts` ; pas de couche d'abstraction au-delà de `lib/api/endpoints/*` | ✅ |
| XII. Code propre et observable | Constantes dans `lib/constants/*` ; enums string dans `lib/enums/*` (Zod dérivé) ; `assertNever` ; TSDoc sur tous les exports ; `lib/logger.ts` (pino, `maskUuid`/`maskEmail`) ; ESLint : `no-magic-numbers`, `switch-exhaustiveness-check`, `explicit-module-boundary-types`, `jsdoc/require-jsdoc`, `no-console`, `max-depth` 3, `max-lines-per-function` 40, `no-nested-ternary` (R17) | ✅ |
| Contraintes (tutoiement, CSP, aiguillage `errorCode`) | `messages.ts` au tutoiement ; CSP avec nonce (R7) ; `contracts/errors.md` | ✅ |

Gate initial : **PASS**. Re-vérification après Phase 1 : **PASS** (un écart au prompt 4.3, pas à
la constitution, consigné dans Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/001-catalog-auth-cart/
├── plan.md              # ce fichier
├── research.md          # Phase 0 : décisions R1–R16
├── data-model.md        # Phase 1 : schémas Zod, vues BFF, états
├── quickstart.md        # Phase 1 : guide de validation
├── contracts/
│   ├── bff-routes.md    # routes BFF + Server Actions (et endpoints Spring appelés)
│   └── errors.md        # errorCode backend → code front → message
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                         # polices, Providers, GuestCartMerger, effets différés
├── providers.tsx                      # "use client" : QueryClient, SessionProvider, MotionConfig, Lenis
├── error.tsx · not-found.tsx · loading.tsx
├── (shop)/
│   ├── page.tsx                       # accueil : best-sellers, remises, accueil contextuel
│   ├── products/page.tsx              # liste + recherche (searchParams → SearchFilters)
│   ├── products/[uuid]/page.tsx       # fiche produit (+ not-found.tsx)
│   └── cart/page.tsx                  # panier (invité ou compte)
├── (auth)/
│   ├── register/page.tsx              # formulaire + Server Action registerUser
│   └── login/page.tsx                 # déclenche signIn("keycloak", { redirectTo })
└── api/
    ├── auth/[...nextauth]/route.ts
    ├── search/route.ts
    ├── products/route.ts
    ├── availability/route.ts
    ├── cart/route.ts                  # GET, POST, DELETE
    ├── cart/items/[productUuid]/route.ts  # PATCH, DELETE
    ├── cart/preview/route.ts
    ├── cart/merge/route.ts
    └── test/expire-session/route.ts   # E2E=1 uniquement
components/
├── ui/                                # shadcn restylé
├── layout/                            # Header, CartBadge, Footer, SkipLink
└── effects/                           # DotGrid, AuroraBlobs, MagneticButton, TiltCard, LiveTitle
features/
├── catalog/   (components, filters, availability, command-palette, recent, messages.ts)
├── cart/      (components, useCart, guest-storage, GuestCartMerger, pending-action, messages.ts)
└── auth/      (register-form, actions.ts, sign-out, messages.ts)
lib/
├── env.ts
├── logger.ts  # pino, logger enfant par module, maskUuid / maskEmail ; clientLogger séparé
├── assert-never.ts
├── query/     query-client.ts (createQueryClient, resetClientState)
├── constants/ api · auth · cart · catalog · security · storage-keys · ui (constantes nommées et documentées)
├── enums/     brand · category · cart · availability · error-code · log-level · … (enums string)
├── api/       client.ts · errors.ts · endpoints/{products,categories,discounts,cart,users}.ts · schema.d.ts
├── schemas/   product · paged · search · cart · user · error · storage
├── auth/      config.ts · refresh.ts · guards.ts
└── format.ts  # Intl.NumberFormat fr-FR EUR
styles/        globals.css (@theme Aurora Glow) · motion.ts (durées, easings)
proxy.ts       # CSP avec nonce + garde des routes privées (aucune au lot 1, /account/** au lot 2)
instrumentation.ts  # valide env au démarrage
tests/
├── unit/      (schemas, errors, guest-cart, merge, useCart, components a11y)
├── e2e/       (catalog, search, register, auth, guest-cart-merge, stock, session-expired, backend-down, a11y)
└── msw/       handlers.ts
.env.example · README.md
```

**Structure Decision** : projet unique Next.js à la racine (le backend vit dans un autre repo).
Découpage par domaine dans `features/`, primitives partagées dans `components/`, tout le code
serveur d'accès au backend dans `lib/api/` (`server-only`). `/cart` reste public (le panier
invité y est affiché) ; `proxy.ts` porte la CSP et protège les futures routes privées
(`/account/**`, lot 2), le contrôle de session des routes BFF USER se fait dans chaque handler.

## Mapping page → BFF → endpoint Spring

| Page / composant | Côté Next | Endpoint Spring | Auth | Cache |
|---|---|---|---|---|
| Accueil – meilleures ventes | RSC → `products.getBestSellers` | `GET /product/best-sellers?page=0&size=8` | public | 60 s, tag `products` |
| Accueil – remises | RSC → `discounts.getActive` | `GET /discounts/active` | public | 300 s |
| Accueil – « Content de te revoir » | RSC → `users.getMe` (si session) ; récents : client → `GET /api/products` | `GET /user/me` ; `GET /product/get/{uuid}` | USER / public | no-store / 60 s |
| Liste / recherche | RSC → `products.search(filters)` | `POST /product/search` (page/size dans le body) | public | 60 s |
| Filtres caractéristiques | RSC → `categories.getSchema(key)` | `GET /product-category-schemas/{key}` | public | 3600 s |
| Palette ⌘K | client → `GET /api/search` | `POST /product/search` | public | no-store |
| Fiche produit | RSC → `products.getByUuid` | `GET /product/get/{uuid}` | public | 60 s |
| Disponibilité | client → `GET /api/availability` | `GET /product/availability?uuids=` | public | **jamais** |
| Inscription | Server Action `registerUser` | `POST /user/register` (+ `X-Forwarded-For`) | public | — |
| Connexion / déconnexion | Auth.js `signIn` / `signOutEverywhere` | Keycloak OIDC | — | — |
| Panier (compte) | client → `/api/cart*` | `GET /cart/get`, `POST /cart/add`, `PATCH /cart/update/{cartUuid}`, `PATCH /cart/remove/{productUuid}`, `DELETE /cart/clear` | USER | no-store |
| Panier (invité) | localStorage + `POST /api/cart/preview` | `GET /product/get/{uuid}` + `GET /product/availability` | public | fiches 60 s, dispo jamais |
| Fusion | `GuestCartMerger` → `POST /api/cart/merge` | `POST /cart/add` (+ availability si 409) | USER | — |

Détail des entrées/sorties : [contracts/bff-routes.md](./contracts/bff-routes.md).

## Stratégie de cache et revalidation

- Catalogue : cache de données Next (`fetch` + `next: { revalidate, tags }`), pages rendues
  dynamiquement à cause du nonce CSP (R7). Aucune donnée utilisateur dans les fetchs cachés
  (requêtes sans `Authorization`).
- Disponibilité : `cache: "no-store"` côté BFF ; TanStack Query `staleTime: 0`, refetch au focus.
- Panier : `no-store` ; TanStack Query clé `['cart']`, `staleTime` 30 s, refetch au focus,
  mutations optimistes avec rollback et remplacement par la `CartView` renvoyée.
- Session : lue côté serveur à chaque requête privée.

## Gestion centralisée des erreurs

`lib/api/errors.ts` (`ApiError`), aiguillage sur `errorCode`, timeout 8 s, rejeu unique sur
`CONCURRENT_MODIFICATION` et 5xx d'écriture panier ; messages au tutoiement dans
`features/*/messages.ts` ; logs avec `X-Request-Id`. Table complète :
[contracts/errors.md](./contracts/errors.md). `app/error.tsx` et `not-found.tsx` illustrés,
animés sobrement (figés si reduced-motion).

## Refresh du token et déconnexion

R3 et R4 de [research.md](./research.md) : refresh à `expiresAt − 30 s` dans le callback `jwt`,
mutualisé par processus ; échec → `RefreshTokenError` → redirection connexion avec `callbackUrl`
et rejeu de l'action en attente (R14) ; déconnexion via `end_session_endpoint` avec
`id_token_hint`.

## Sécurité

- Cookies httpOnly / Secure (hors localhost) / SameSite=Lax.
- `proxy.ts` : CSP avec nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'`, plus
  `'unsafe-eval'` en dev uniquement ; `style-src 'self' 'unsafe-inline'` car Next.js, Motion et
  Radix injectent des styles en ligne ; `img-src 'self' blob: data: <S3>`, `font-src 'self'`,
  `connect-src 'self'`, `form-action 'self' <Keycloak>`, `frame-ancestors 'none'`) ;
  `next.config` : `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  (caméra, micro, géolocalisation, gyroscope désactivés), `X-Content-Type-Options: nosniff`.
- `images.remotePatterns` : `http://localhost:4566/cybertech-products/**` (LocalStack), hôte lu
  dans `IMAGES_REMOTE_HOST`.
- Aucune donnée privée dans un fetch caché.

## Variables d'environnement (`lib/env.ts`)

| Variable | Exemple dev | Public |
|---|---|---|
| `API_BASE_URL` | `http://localhost:8081` | non |
| `API_VERSION` | `1.0` | non |
| `AUTH_SECRET` | 32 octets aléatoires | non |
| `AUTH_URL` | `http://localhost:3000` | non |
| `AUTH_KEYCLOAK_ID` | `cybertech-front-client` | non |
| `AUTH_KEYCLOAK_SECRET` | `dev-keycloak-front-secret-change-me` | non |
| `AUTH_KEYCLOAK_ISSUER` | `http://localhost:8080/realms/cybertech` | non |
| `IMAGES_REMOTE_HOST` | `localhost:4566` | non (lu au build par `next.config`) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | oui |
| `E2E` | `0` | non |
| `LOG_LEVEL` | `debug` (défaut `info`) | non |

`API_VERSION` (défaut `1.0`), `LOG_LEVEL` (défaut `info`) et `E2E` (défaut `false`) ont une
valeur par défaut ; les autres sont obligatoires.

## Tests

- Unitaires (Vitest + MSW) : chaque schéma Zod (valide / invalide, miroir Bean Validation),
  `errors.ts` (chaque ligne de `contracts/errors.md`), normalisation panier, stockage invité
  (corruption, limites), algorithme de fusion (merged / capped / dropped / failed), `useCart`
  (optimistic + rollback), parsing des facettes depuis `jsonSchema`, composants clés avec
  jest-axe.
- E2E (Playwright, stack réelle) : recherche « lenvo », filtres + URL, fiche + rupture,
  inscription (erreurs champ, email existant), login/logout Keycloak, panier invité → fusion,
  stock insuffisant, session expirée (`/api/test/expire-session`), backend coupé ; axe-core sans
  violation `serious`/`critical` ; projet `reduced-motion` ; navigation sans JavaScript sur le
  catalogue ; aucune longue tâche > 50 ms due aux effets ; vidage du cache client à la
  déconnexion.
- Lighthouse (Chrome DevTools, mode desktop), lancé à la main en fin de story : `/`,
  `/products`, une fiche ; LCP ≤ 2500 ms, CLS ≤ 0,1, TBT ≤ 200 ms.

## Dev local

Voir [quickstart.md](./quickstart.md) et R16 : services du backend via son docker-compose,
backend Spring depuis IntelliJ, front avec `npm run dev`, `npm run gen:api`, `.env.example`.
L'UI est implémentée avec le skill **frontend-design** en prenant
l'annexe « Direction artistique » de la spec comme référence (redémarrer Claude Code avant
`/speckit-implement` pour charger le plugin).

## Complexity Tracking

| Écart | Pourquoi | Alternative plus simple rejetée parce que |
|---|---|---|
| Pages catalogue rendues dynamiquement au lieu de l'ISR demandé au prompt 4.3 | La CSP avec nonce (contraintes de sécurité de la constitution) rend les pages dynamiques ; le cache de données garde les performances | ISR + CSP sans nonce imposerait `'unsafe-inline'` sur les scripts |
| Route de test `/api/test/expire-session` | Rend testable le cas limite « session expirée » (principe VII) | Attendre 5 min d'expiration réelle en e2e : lent et fragile |
