---

description: "Task list for lot 1 — catalog, authentication and cart"
---

# Tasks: Lot 1 — Catalogue, authentification et panier

**Input**: Design documents from `specs/001-catalog-auth-cart/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R17), data-model.md, contracts/bff-routes.md, contracts/errors.md, quickstart.md

**Tests**: REQUIRED — constitution principle VII (« un comportement sans test n'est pas terminé »). Unit tests (Vitest + Testing Library + MSW) and Playwright journeys are included per story.

**Organization**: Tasks are grouped by user story (priority order: US1 P1, US4 P1, US3 P2, US2 P2) so each story can be implemented and tested independently.

**Rules applying to EVERY task** (constitution XI–XII, `CLAUDE.md`):
- Code, comments, TSDoc and logs in **English**; user-facing text in **French** (tutoiement) in `features/*/messages.ts` only.
- No magic number/string: use `lib/constants/*`; closed sets are **string enums** in `lib/enums/*`; Zod built from enums (`z.enum(MyEnum)`); exhaustive `switch` + `assertNever`.
- TSDoc on every export and at the top of every module (`@param`, `@returns`, `@throws`, `@see`).
- Server logs via `lib/logger.ts` child loggers only; never log tokens, passwords, cookies or full emails.
- A task is done when `npm run typecheck`, `npm run lint` (0 warning) and `npm run test` pass.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 catalogue · US2 inscription · US3 session · US4 panier

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [ ] T001 Scaffold Next.js 16.4 App Router project at repo root (TypeScript, no `src/`, alias `@/*`), `output: "standalone"` in `next.config.ts`, Node 24 engines in `package.json`
- [ ] T002 Configure `tsconfig.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`, path alias `@/*`
- [ ] T003 Install runtime deps pinned: `next-auth@5.0.0-beta.32`, `zod@4.6.7`, `@tanstack/react-query@5.104.2`, `motion@14.1.0`, `lenis@1.3.26`, `pino`, `server-only`, `cmdk`; dev deps: `openapi-typescript@7.13.0`, `pino-pretty`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `msw`, `@playwright/test`, `@axe-core/playwright`, `jest-axe` in `package.json`
- [ ] T004 Configure ESLint flat config in `eslint.config.mjs` (typescript-eslint type-checked, eslint-plugin-jsdoc, eslint-plugin-import) with rules from research R17: `no-explicit-any`, `no-magic-numbers` (ignore 0/1/-1, enums, array indexes, readonly class props; off in `tests/**`), `switch-exhaustiveness-check`, `explicit-module-boundary-types`, `prefer-readonly`, `naming-convention`, `jsdoc/require-jsdoc` (exports) + `require-param` + `require-returns`, `no-console`, `max-depth: 3`, `max-lines-per-function: 40` (80 for `*.tsx`), `no-nested-ternary`, `import/no-cycle`; all as errors
- [ ] T005 [P] Add Prettier config `.prettierrc.json` and `.editorconfig`; scripts `dev`, `build`, `start`, `typecheck` (`tsc --noEmit`), `lint` (`eslint . --max-warnings 0`), `test`, `test:e2e`, `gen:api` in `package.json`
- [ ] T006 [P] Configure Vitest in `vitest.config.ts` (jsdom, alias `@/`, setup file `tests/setup.ts` with Testing Library matchers, jest-axe and MSW server lifecycle) and create `tests/msw/handlers.ts` + `tests/msw/server.ts`
- [ ] T007 [P] Configure Playwright in `playwright.config.ts` (baseURL `http://localhost:3000`, projects `chromium` and `reduced-motion` with `reducedMotion: 'reduce'`, `webServer` → `npm run dev` with `E2E=1`)
- [ ] T008 [P] Add `npm run gen:api` script running `openapi-typescript http://localhost:8081/v3/api-docs -o lib/api/schema.d.ts` and commit an initial `lib/api/schema.d.ts` generated from the backend copy `docs/openapi/openapi.yaml` (backend repo, read-only)
- [ ] T009 [P] Initialize shadcn/ui for Tailwind 4 (`components.json`, `components/ui/`), add primitives: button, input, label, checkbox, slider, dialog, command, toast (sonner), skeleton, select, radio-group
- [ ] T010 [P] Create `.env.example` listing `API_BASE_URL`, `API_VERSION`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_KEYCLOAK_ID`, `AUTH_KEYCLOAK_SECRET`, `AUTH_KEYCLOAK_ISSUER`, `IMAGES_REMOTE_HOST`, `NEXT_PUBLIC_SITE_URL`, `E2E`, `LOG_LEVEL` with dev values from plan.md §Variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Constants, enums, logger, env, API client, schemas, auth core, design system, layout — required by every story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Constants, enums, utilities

- [ ] T011 [P] Create `lib/assert-never.ts` exporting `assertNever(value: never): never` (throws with the unexpected value)
- [ ] T012 [P] Create `lib/constants/api.ts`: `API_BASE_PATH = "/api/v1/services"`, `API_VERSION_HEADER = "X-API-VERSION"`, `REQUEST_ID_HEADER = "X-Request-Id"`, `RETRY_AFTER_HEADER = "Retry-After"`, `BACKEND_TIMEOUT_MS = 8_000`, `BACKEND_MAX_RETRIES = 1`, and one documented constant per backend path used (product get/search/best-sellers/availability, category schema, discounts active, user register/me, cart get/add/update/remove/clear), each TSDoc citing `docs/backend/api-map.md`
- [ ] T013 [P] Create `lib/constants/auth.ts`: `ACCESS_TOKEN_REFRESH_MARGIN_MS = 30_000` (Keycloak `accessTokenLifespan` 300 s), `KEYCLOAK_PROVIDER_ID = "keycloak"`, `CALLBACK_URL_PARAM = "callbackUrl"`, Keycloak OIDC path segments (token, logout)
- [ ] T014 [P] Create `lib/constants/cart.ts`: `GUEST_CART_MAX_LINES = 50`, `CART_LINE_MIN_QUANTITY = 1`, `CART_LINE_MAX_QUANTITY = 99`, `CART_STALE_TIME_MS = 30_000`, `AVAILABILITY_MAX_UUIDS_PER_REQUEST = 50`, `MERGE_LOCK_NAME = "ct-guest-cart-merge"`
- [ ] T015 [P] Create `lib/constants/catalog.ts`: `SEARCH_PAGE_SIZE = 24`, `BEST_SELLERS_SIZE = 8`, `COMMAND_PALETTE_RESULT_SIZE = 6`, `COMMAND_PALETTE_DEBOUNCE_MS = 200`, `SEARCH_KEYWORD_MAX_LENGTH = 100`, `PRICE_MIN_EUR = 100`, `PRICE_MAX_EUR = 1_000_000`, `LOW_STOCK_THRESHOLD = 5`, `RECENTLY_VIEWED_MAX = 8`, `PRODUCTS_REVALIDATE_SECONDS = 60`, `DISCOUNTS_REVALIDATE_SECONDS = 300`, `CATEGORY_SCHEMA_REVALIDATE_SECONDS = 3_600`, `PRODUCTS_CACHE_TAG = "products"`
- [ ] T016 [P] Create `lib/constants/storage-keys.ts` (documented values `ct_guest_cart_v1`, `ct_recent_v1`, `ct_pending_action_v1`) and `lib/constants/ui.ts` (motion durations 150/250/350 ms, reveal offset 12 px, dot-grid radius 120 px and spacing 28 px, aurora cycle 20–30 s, breakpoints)
- [ ] T017 [P] Create enums in `lib/enums/`: `brand.ts` (`Brand`, 13 values exactly as backend: ASUS, HP, LENOVO, DELL, AORUS, MSI, ACER, TOSHIBA, ALIENWARE, MICROSOFT, ALTYK, GIGABYTE, SAMSUNG), `category-key.ts` (`CategoryKey`: COMPUTER, MONITOR), `sex.ts` (`Sex`: M, F), `communication-channel.ts` (`CommunicationChannel`: EMAIL, SMS, PUSH_NOTIFICATION), `discount-calculation-type.ts` (NONE, PERCENTAGE, FIXED_AMOUNT, BUY_ONE_GET_ONE_FREE)
- [ ] T018 [P] Create enums in `lib/enums/`: `cart.ts` (`CartSource` guest/account, `CartLineStatus` ok/insufficient-stock/unavailable, `MergeDropReason` out-of-stock/not-found, `PendingActionType` add/set/remove), `availability-level.ts` (`AvailabilityLevel` in/low/out), `log-level.ts` (`LogLevel` debug/info/warn/error), `query-key.ts` (`QueryKey` cart/availability/search/recent-products), `storage-key.ts` (`StorageKey` built from `lib/constants/storage-keys.ts`)
- [ ] T019 [P] Create `lib/enums/error-code.ts`: `BackendErrorCode` (string enum mirroring every value of `ErrorResponseDto.errorCode` in the OpenAPI) and `FrontErrorCode` (invalid, unauthenticated, forbidden, not-found, insufficient-stock, conflict, empty-cart, already-exists, rate-limited, unavailable, unknown) per `contracts/errors.md`
- [ ] T020 [P] Unit test `tests/unit/enums/error-code.test.ts` asserting `BackendErrorCode` values equal the `errorCode` union in `lib/api/schema.d.ts` (detects backend drift)

### Env, logger

- [ ] T021 Create `lib/env.ts`: Zod schema for all variables of plan.md §Variables (URLs validated, `LOG_LEVEL` = `z.enum(LogLevel)` default `info`, `API_VERSION` default `1.0`, `E2E` boolean default `false`, all others required), parsed once, throws a readable error listing missing variables; `server-only`
- [ ] T022 Create `instrumentation.ts` importing `lib/env.ts` at server start so the app refuses to boot on invalid env (principle VI)
- [ ] T023 Create `lib/logger.ts`: pino logger (level from env, `pino-pretty` transport in dev only, `redact` on `authorization`, `cookie`, `*.password`, `*.accessToken`, `*.refreshToken`, `*.idToken`), `createModuleLogger(module: string)` returning a child logger, `maskUuid` (keep first 8 chars) and `maskEmail` (`j***@domain`), `server-only`; add `pino` to `serverExternalPackages` in `next.config.ts`
- [ ] T024 [P] Create `lib/client-logger.ts`: `clientLogger.error(message, context)` only in production, `warn`/`debug` in development; no direct `console` usage elsewhere (single eslint-disable with justification inside this file)
- [ ] T025 [P] Unit tests `tests/unit/logger.test.ts` for `maskUuid`, `maskEmail` and redaction of token fields

### Schemas (Zod) — data-model.md §1–§3

- [ ] T026 [P] Create `lib/schemas/product.ts`: `ProductSchema` (`uuid` z.uuid(), `name` min 1, `price` nonnegative, `brand` z.enum(Brand), `category` string, `photoUrls` array of z.url() possibly empty, `description` string, `attributes` record<string, unknown>), `ProductCardSchema` (`uuid, name, brand, category, price, imageUrl: string|null`), `ProductAvailabilitySchema` (`productUuid` uuid, `availableStock` int ≥ 0, `inStock` boolean) and `toAvailabilityLevel()` (`inStock=false` → OUT, `availableStock ≤ LOW_STOCK_THRESHOLD` → LOW, else IN)
- [ ] T027 [P] Create `lib/schemas/paged.ts`: generic `pagedSchema(item)` = `{ content: T[], page: { size, number, totalElements, totalPages } }`
- [ ] T028 [P] Create `lib/schemas/error.ts`: `ApiErrorBodySchema` = `{ message: string, httpStatusCode: int, errorCodeType: "TECHNICAL"|"FUNCTIONAL" (enum), errorCode: z.enum(BackendErrorCode), fieldErrors?: { field, message }[] }`
- [ ] T029 [P] Create `lib/schemas/storage.ts`: `GuestCartStorageSchema` (`items` max `GUEST_CART_MAX_LINES`, `quantity` int `CART_LINE_MIN_QUANTITY..CART_LINE_MAX_QUANTITY`, `updatedAt` ISO), `RecentlyViewedSchema` (`uuids` max `RECENTLY_VIEWED_MAX`, unique), `PendingActionSchema` (`type` z.enum(PendingActionType), `productUuid`, `quantity?`)
- [ ] T030 [P] Unit tests `tests/unit/schemas/product.test.ts`, `paged.test.ts`, `error.test.ts`, `storage.test.ts` (valid and invalid cases, boundaries 0/1/99/100, 50/51 lines)

### API client and error mapping — contracts/errors.md

- [ ] T031 Create `lib/api/errors.ts`: class `ApiError { status, backendCode?, frontCode: FrontErrorCode, message, fieldErrors?, retryAfterSeconds?, requestId? }`, `toFrontErrorCode(backendCode, status)` implementing every row of `contracts/errors.md` with an exhaustive switch, `parseErrorResponse(response)` (JSON via `ApiErrorBodySchema`, non-JSON → UNAVAILABLE, `Retry-After` header → `retryAfterSeconds`)
- [ ] T032 Create `lib/api/client.ts` (`server-only`): `backendFetch<T>(path, { method, body, schema, accessToken?, cache?, next?, forwardedFor? })` adding `X-API-VERSION`, `Authorization`, JSON headers, `AbortSignal.timeout(BACKEND_TIMEOUT_MS)`, validating the body with the given Zod schema (mismatch → `error` log + UNAVAILABLE), logging every call (`method`, `path`, `status`, `durationMs`, `requestId`, `errorCode`), allowing a body on DELETE
- [ ] T033 Create `lib/api/retry.ts`: `withSingleRetry(fn, shouldRetry)` retrying once when `frontCode` is CONFLICT (`CONCURRENT_MODIFICATION`) or UNAVAILABLE on writes; `warn` log on retry
- [ ] T034 [P] Unit tests `tests/unit/api/errors.test.ts` (one case per row of `contracts/errors.md`, both JSON and non-JSON bodies, `Retry-After`) and `tests/unit/api/client.test.ts` (headers, timeout, Zod mismatch, logging without token) with MSW
- [ ] T035 Create `lib/api/bff-response.ts`: helpers `jsonOk(data, status)`, `jsonError(apiError)` producing `{ error: { code, message, fieldErrors?, retryAfterSeconds? } }` with `Cache-Control: no-store`, and `parseJsonBody(request, schema)` returning 400 `invalid` on Zod failure (contracts/bff-routes.md §Règles communes)

### Auth core — research R2–R4

- [ ] T036 Create `lib/auth/refresh.ts`: `refreshAccessToken(token)` calling the Keycloak token endpoint with `grant_type=refresh_token`, deduplicating concurrent refreshes with a `Map<refreshToken, Promise>`, returning `error: "RefreshTokenError"` on failure (`warn` log, masked subject)
- [ ] T037 Create `lib/auth/config.ts`: Auth.js v5 with Keycloak provider (`AUTH_KEYCLOAK_*`, PKCE S256), session strategy `jwt`, callback `jwt` storing `accessToken`, `refreshToken`, `idToken`, `expiresAt` and refreshing when `expiresAt - ACCESS_TOKEN_REFRESH_MARGIN_MS < now`, callback `session` exposing only `user.name`, `user.email`, `roles`, `error`; export `{ handlers, auth, signIn, signOut }`
- [ ] T038 Create `app/api/auth/[...nextauth]/route.ts` exporting `GET`/`POST` from `lib/auth/config.ts`
- [ ] T039 Create `lib/auth/guards.ts`: `getAccessTokenOrThrow()` (server-only; throws `ApiError` UNAUTHENTICATED when no session or `RefreshTokenError`) and `requireSession(callbackPath)` for layouts (redirects to `/login?callbackUrl=`)
- [ ] T040 [P] Unit tests `tests/unit/auth/refresh.test.ts` (refresh before margin, dedup of concurrent calls, failure → RefreshTokenError) and `tests/unit/auth/session-callback.test.ts` (no token leaked to the session object)

### Design system and layout — spec annexe « Aurora Glow » (use the frontend-design skill)

- [ ] T041 Create `styles/globals.css`: Tailwind 4 `@import "tailwindcss"` + `@theme` with tokens `--bg #0A0E1F`, `--surface #121833`, `--surface-2 #1A2142`, `--border #2A3150`, `--text #E6E8F2`, `--text-muted #8B93B0`, `--violet #8B7CF6`, `--blue #4F7BFF`, `--gold #D4AF6A`, `--cyan #5EEAD4`, `--rose #F08BB8`, radii 16–20 px, violet-tinted shadows, glass card utility (surface 70 %, blur 12 px), violet shimmer keyframes, visible focus ring (`:focus-visible`, 2 px cyan outline + offset, AA contrast on every surface), global `prefers-reduced-motion` rules
- [ ] T042 [P] Create `styles/motion.ts`: shared durations/easings re-exported from `lib/constants/ui.ts` and Motion variants (fade + 12 px reveal, stagger)
- [ ] T043 Create `app/layout.tsx`: `next/font` Sora (variable `wght`), Inter, JetBrains Mono; `lang="fr"`; metadata from `features/common/messages.ts`; `<Providers>`; skip link; `Header`; main landmark
- [ ] T044 Create `app/providers.tsx` (`"use client"`): `QueryClientProvider`, `SessionProvider`, `MotionConfig reducedMotion="user"`, toast provider
- [ ] T045 [P] Create `features/common/messages.ts` (French, tutoiement: site name, generic errors, retry, not found, loading labels) and `lib/format.ts` (`formatPrice` via `Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })`)
- [ ] T046 Create `components/layout/Header.tsx` (logo, nav, search trigger slot, cart badge slot, account slot) and `components/layout/Footer.tsx`, `components/layout/SkipLink.tsx`
- [ ] T047 Create `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx` (messages from `features/common/messages.ts`, « Réessayer » button, violet shimmer skeleton, static when reduced motion)
- [ ] T048 Create `proxy.ts`: per-request CSP nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `img-src 'self' data: <IMAGES_REMOTE_HOST>`, `connect-src 'self'`, `frame-ancestors 'none'`) and a guard placeholder for future private routes (`/account/**`), matcher excluding static assets
- [ ] T049 Update `next.config.ts`: security headers (`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling camera, microphone, geolocation and gyroscope, `X-Content-Type-Options: nosniff`), `images.remotePatterns` from `IMAGES_REMOTE_HOST` (`/cybertech-products/**`)
- [ ] T050 [P] Create `lib/query/query-client.ts`: `createQueryClient()` (default options from `lib/constants/cart.ts`, no automatic retry on mutations) and `resetClientState(queryClient)` clearing every cached query (used at sign-out, FR-017); use it in `app/providers.tsx`

**Checkpoint**: Foundation ready — `npm run dev` boots with valid env, refuses to boot without it; typecheck, lint and tests green

---

## Phase 3: User Story 1 — Parcourir le catalogue (Priority: P1) 🎯 MVP

**Goal**: Accueil, liste filtrée par URL, fiche produit avec disponibilité en direct, palette ⌘K, page introuvable, lisible sans JavaScript

**Independent Test**: un visiteur non connecté trouve « lenvo » via ⌘K, combine catégorie + marque + prix, recharge la page, ouvre une fiche (y compris en rupture) et une fiche inexistante

### Tests for User Story 1 ⚠️ (write first, must fail)

- [ ] T051 [P] [US1] Unit tests `tests/unit/catalog/search-params.test.ts`: URL ↔ `SearchFilters` (`q` ≤ 100 chars trimmed, `category` z.enum(CategoryKey), repeated `brand` ⊂ Brand, `min` int ≥ 100 else omitted, `max` ≤ 1 000 000 and ≥ min, `a.<key>`/`r.<key>=min-max` only when a category is set, `page` 1-based → 0-based, invalid params ignored)
- [ ] T052 [P] [US1] Unit tests `tests/unit/catalog/facets.test.ts`: JSON Schema string → facets (string+enum → checkboxes, number/integer → range, boolean → toggle, string without enum ignored, `title` label fallback to humanized key)
- [ ] T053 [P] [US1] Component tests `tests/unit/catalog/AvailabilityBadge.test.tsx` (IN / LOW « Plus que N » / OUT « Rupture », jest-axe) and `CommandPalette.test.tsx` (⌘K/Ctrl+K opens, debounce, keyboard navigation, Escape closes)
- [ ] T054 [P] [US1] E2E `tests/e2e/catalog.spec.ts`: « lenvo » → LENOVO results; filters + reload keep results and URL; empty state reset; unknown uuid → « produit introuvable »; out-of-stock product → « Rupture » badge; with `javaScriptEnabled: false`, home, filtered list (GET form) and product page stay readable (FR-010); axe without serious/critical violations

### Implementation for User Story 1

- [ ] T055 [P] [US1] Create `lib/schemas/search.ts`: `SearchFiltersSchema` and `toProductSearchRequest(filters)` (size `SEARCH_PAGE_SIZE`, page 0-based) matching `ProductSearchRequestDto`
- [ ] T056 [P] [US1] Create `lib/schemas/category.ts`: `CategorySchemaResponseSchema` (`uuid, categoryKey, label, jsonSchema: string, active: boolean`) and `parseCategoryFacets(jsonSchema)` returning typed facets (`FacetKind` enum: ENUM, RANGE, BOOLEAN)
- [ ] T057 [P] [US1] Create `lib/schemas/discount.ts`: `ActiveDiscountSchema` (`discountKey`, `calculationType` z.enum(DiscountCalculationType), `percentage`, `fixedAmount`, `minOrderAmount`, `maxDiscountAmount`: number|null, `startsAt`, `endsAt`: string|null)
- [ ] T058 [US1] Create `lib/api/endpoints/products.ts`: `getBestSellers()`, `searchProducts(filters)`, `getProductByUuid(uuid)` (404 → null), `getProductsByUuids(uuids)` (parallel, unknown omitted), `getAvailability(uuids)` (`cache: "no-store"`, chunks of `AVAILABILITY_MAX_UUIDS_PER_REQUEST`); catalog fetches with `next: { revalidate: PRODUCTS_REVALIDATE_SECONDS, tags: [PRODUCTS_CACHE_TAG] }` and no `Authorization`
- [ ] T059 [P] [US1] Create `lib/api/endpoints/categories.ts` (`getCategorySchema(key)`, revalidate `CATEGORY_SCHEMA_REVALIDATE_SECONDS`) and `lib/api/endpoints/discounts.ts` (`getActiveDiscounts()`, revalidate `DISCOUNTS_REVALIDATE_SECONDS`)
- [ ] T060 [P] [US1] Create `features/catalog/messages.ts` (French, tutoiement: greetings by time of day, best sellers, filters labels, empty state « Aucun produit ne correspond… », reset, availability labels, not found, command palette placeholder/empty)
- [ ] T061 [P] [US1] Create `features/catalog/search-params.ts`: `parseSearchParams(searchParams)` and `buildSearchUrl(filters)` (canonical URL)
- [ ] T062 [US1] Create `app/api/search/route.ts` (GET `q` 1–100 chars → `POST /product/search { keyword, size: COMMAND_PALETTE_RESULT_SIZE }` → `{ results: ProductCard[] }`), `app/api/availability/route.ts` (GET `uuids` 1–50 → `{ items }`, no-store) and `app/api/products/route.ts` (GET `uuids` 1–`RECENTLY_VIEWED_MAX` → `{ products }`) per `contracts/bff-routes.md`
- [ ] T063 [P] [US1] Create `features/catalog/components/ProductCard.tsx` (Server Component: image via `next/image` with fixed dimensions and fallback, name, brand, gold mono price, glass card, `view-transition-name` = `product-{uuid}`)
- [ ] T064 [P] [US1] Create `features/catalog/components/AvailabilityBadge.tsx` (`"use client"`, TanStack Query `QueryKey.AVAILABILITY`, `staleTime: 0`, refetch on focus, batched UUIDs) and `features/catalog/hooks/useAvailability.ts`
- [ ] T065 [US1] Create `features/catalog/components/Filters.tsx` (category radio, brands checkboxes, price range 100–1 000 000, dynamic facets; updates URL via `buildSearchUrl`; works as a GET `<form>` without JavaScript) and `features/catalog/components/Pagination.tsx` (links, `aria-current`)
- [ ] T066 [US1] Create `app/(shop)/products/page.tsx`: parse `searchParams`, load category schema when a category is set, render filters, grid, pagination, empty state with reset link; `generateMetadata` in French
- [ ] T067 [US1] Create `app/(shop)/products/[uuid]/page.tsx` (gallery, brand, gold price, description, technical attributes rendered with facet labels, `AvailabilityBadge`, add-to-cart slot) and `app/(shop)/products/[uuid]/not-found.tsx` (« produit introuvable » + back to catalog)
- [ ] T068 [US1] Create `app/(shop)/page.tsx`: best sellers grid, active discounts banner, `Greeting` slot (neutral server text « Bienvenue », replaced client-side by time-based greeting from `features/catalog/messages.ts`)
- [ ] T069 [US1] Create `features/catalog/components/CommandPalette.tsx` (`"use client"`, cmdk dialog, ⌘K/Ctrl+K, debounce `COMMAND_PALETTE_DEBOUNCE_MS`, `AbortController`, results link to product pages, fully keyboard-operable) and mount its trigger in `components/layout/Header.tsx`
- [ ] T070 [US1] Create `features/catalog/recently-viewed.ts` (read/write `ct_recent_v1` via `RecentlyViewedSchema`, most recent first, dedup, max `RECENTLY_VIEWED_MAX`, invalid → reset) and record views from a small client component on the product page
- [ ] T071 [US1] Add US1 logging: `catalog.search` child logger (`debug` filters summary — category, brand count, price range, page — never the raw keyword; `warn` on Zod mismatch) in `lib/api/endpoints/products.ts`

**Checkpoint**: US1 fully functional and testable independently (MVP)

---

## Phase 4: User Story 4 — Gérer mon panier (Priority: P1)

**Goal**: panier invité (navigateur) et panier de compte (backend) derrière une même vue `CartView`, fusion unique à la connexion, compteur d'en-tête, annonces `aria-live`

**Independent Test**: un visiteur ajoute 2 produits, modifie une quantité, supprime une ligne ; demander plus que le stock affiche « Il n'en reste que N » ; après connexion, le panier est fusionné avec un récapitulatif (requires the Auth core from Phase 2; login UI from US3 or a direct `/api/auth/signin`)

### Tests for User Story 4 ⚠️ (write first, must fail)

- [ ] T072 [P] [US4] Unit tests `tests/unit/cart/guest-storage.test.ts` (read/write `ct_guest_cart_v1`, corrupted JSON → reset, > 50 lines rejected, quantity 1–99, `storage` event sync)
- [ ] T073 [P] [US4] Unit tests `tests/unit/cart/normalize.test.ts` (`CartResponseDto` with null `cartUuid/items/totalPrice` → empty `CartView` `total: 0`; account view `totalIsEstimate: false`; guest view estimated total)
- [ ] T074 [P] [US4] Unit tests `tests/unit/cart/merge.test.ts` (MSW: batch 201 → all merged; 409 `NOT_ENOUGH_STOCK` → line-by-line capped; availability 0 → dropped out-of-stock; unknown product → dropped not-found; 5xx → failed kept)
- [ ] T075 [P] [US4] Hook tests `tests/unit/cart/useCart.test.tsx` (guest vs account source, optimistic update + rollback on error, replacement by server `CartView`, `aria-live` announcement)
- [ ] T076 [P] [US4] E2E `tests/e2e/cart.spec.ts`: guest add 1 then 2 → line shows 3; quantity > stock → message and unchanged cart; remove line; clear; login → merged cart + toast; two tabs → single merge (SC-007); second browser context same account → same cart; out-of-stock product → add button disabled on card and product page (US4-7)

### Implementation for User Story 4

- [ ] T077 [P] [US4] Create `lib/schemas/cart.ts`: `AccountCartSchema` (`cartUuid` uuid|null, `userUuid` uuid|null, `items` CartItem[]|null, `totalPrice` number|null; `CartItem = { cartItemUuid, productUuid, productName, quantity int ≥ 1, unitPrice, lineItemTotalPrice }`), `CartViewSchema` (`source` z.enum(CartSource), lines with `status` z.enum(CartLineStatus)), `GuestLineSchema` (`productUuid` uuid, `quantity` int 1..99), `MergeReportSchema` (`dropped[].reason` z.enum(MergeDropReason))
- [ ] T078 [US4] Create `lib/api/endpoints/cart.ts`: `getAccountCart`, `addToCart(lines)`, `replaceCartLines(cartUuid, lines)`, `removeCartLine(productUuid)`, `clearCart()` — all `cache: "no-store"`, bearer token, wrapped in `withSingleRetry` for writes
- [ ] T079 [US4] Create `features/cart/server/cart-view.ts`: `toAccountCartView(accountCart)` (normalization `items ?? []`, `totalPrice ?? 0`, enrich with image via cached `getProductsByUuids` and stock via `getAvailability`) and `toGuestCartView(lines)` (prices re-read, status per line, estimated total, `totalIsEstimate: true`)
- [ ] T080 [US4] Create `features/cart/server/merge-guest-cart.ts`: `mergeGuestCart(lines, accessToken)` per `docs/guest-cart.md` §4 (batch add; on INSUFFICIENT_STOCK fetch availability and add line by line capped; build `MergeReport`; `info` log with counters, `warn` per capped line)
- [ ] T081 [US4] Create BFF routes: `app/api/cart/route.ts` (GET, POST `{ productUuid, quantity }` 201, DELETE), `app/api/cart/items/[productUuid]/route.ts` (PATCH absolute `{ quantity }` via `GET /cart/get` + `PATCH /cart/update/{cartUuid}`; DELETE via `PATCH /cart/remove/{productUuid}`), `app/api/cart/preview/route.ts` (public), `app/api/cart/merge/route.ts` (USER) — all returning `CartView`/`MergeReport` per `contracts/bff-routes.md`, 401 `unauthenticated` without session
- [ ] T082 [P] [US4] Create `features/cart/messages.ts` (French, tutoiement: add success, « Il n'en reste que {n}. », « Ce produit est en rupture. », line removed, empty cart, estimated total label, merge summary « {n} articles ajoutés à ton panier, {m} limité(s) au stock », conflict, unavailable, aria-live templates)
- [ ] T083 [US4] Create `features/cart/guest-storage.ts`: typed read/write of `ct_guest_cart_v1` (Zod-validated, try/catch, max lines/quantity), `subscribeToGuestCart(callback)` on the `storage` event
- [ ] T084 [US4] Create `features/cart/hooks/useCart.ts`: single hook returning `CartView` for both sources (guest → localStorage + `POST /api/cart/preview`; account → `GET /api/cart`), `QueryKey.CART`, `staleTime: CART_STALE_TIME_MS`, refetch on focus; mutations `add`, `setQuantity`, `remove`, `clear` with optimistic updates and rollback; stock check through preview before guest writes
- [ ] T085 [US4] Create `features/cart/components/GuestCartMerger.tsx` (`"use client"`, mounted once in `app/layout.tsx`): when session becomes authenticated and guest cart not empty, `navigator.locks.request(MERGE_LOCK_NAME)`, re-read storage inside the lock, `POST /api/cart/merge`, keep only `failed` lines, invalidate `QueryKey.CART`, show merge toast
- [ ] T086 [P] [US4] Create `features/cart/components/AddToCartButton.tsx` (quantity selector 1–99 in dark neumorphism with cyan active border, disabled when availability OUT, error messages with available quantity) and mount it on product page and cards
- [ ] T087 [P] [US4] Create `components/layout/CartBadge.tsx` (reserved fixed width to avoid CLS, count shown after hydration, gold bounce on change unless reduced motion) and mount it in `Header.tsx`
- [ ] T088 [US4] Create `app/(shop)/cart/page.tsx` + `features/cart/components/CartLines.tsx`, `CartSummary.tsx` (lines with name, unit price, quantity controls, subtotal, status messages; total from server or « estimé » for guests; clear button with confirmation; empty state; `aria-live="polite"` region announcing every change)
- [ ] T089 [US4] Handle removed products: lines with status UNAVAILABLE are removed from guest storage / shown as unavailable for account with an explanatory message (spec edge case « produit supprimé »)

**Checkpoint**: US1 + US4 work independently (guest cart without login; merge once auth is available)

---

## Phase 5: User Story 3 — Se connecter, rester connecté, se déconnecter (Priority: P2)

**Goal**: connexion Keycloak avec retour à la page d'origine, refresh transparent, déconnexion complète, accueil personnalisé, rejeu d'action après expiration

**Independent Test**: avec un compte existant, se connecter, naviguer > 5 min, se déconnecter, « retour » n'affiche rien de privé

### Tests for User Story 3 ⚠️ (write first, must fail)

- [ ] T090 [P] [US3] Unit tests `tests/unit/auth/pending-action.test.ts` (store/replay once/clear `ct_pending_action_v1`, invalid → cleared)
- [ ] T091 [P] [US3] E2E `tests/e2e/auth.spec.ts`: login via Keycloak returns to origin page; welcome « Content de te revoir, {prénom} »; session survives > 5 min (forced refresh); logout closes Keycloak session (re-login asks credentials) and back button shows neither the account cart nor the first name (client cache cleared, FR-017); expired session (`/api/test/expire-session`) during cart add → redirected to login then action replayed

### Implementation for User Story 3

- [ ] T092 [P] [US3] Create `lib/schemas/user.ts` (`CurrentUserSchema`: `uuid`, `email`, `firstName`, `lastName` only; other fields stripped) and `lib/api/endpoints/users.ts` (`getMe(accessToken)` no-store, `registerUser(input, forwardedFor)` placeholder used by US2)
- [ ] T093 [P] [US3] Create `features/auth/messages.ts` (French, tutoiement: sign in, sign out, « Content de te revoir, {prénom} », session expired « Ta session a expiré, reconnecte-toi. », signed out confirmation)
- [ ] T094 [US3] Create `app/(auth)/login/page.tsx`: Server Component reading `callbackUrl` (same-origin only), triggering `signIn(KEYCLOAK_PROVIDER_ID, { redirectTo })`; fallback button for no-JS
- [ ] T095 [US3] Create `features/auth/actions.ts` with Server Action `signOutEverywhere()` (read `idToken`, `signOut({ redirect: false })`, redirect to Keycloak `end_session_endpoint` with `id_token_hint` and `post_logout_redirect_uri = AUTH_URL`); `info` log with masked subject
- [ ] T096 [US3] Create `features/auth/components/AccountMenu.tsx` (sign-in link with current path as `callbackUrl`, or first name + sign-out button that calls `resetClientState(queryClient)` before invoking `signOutEverywhere`) and mount it in `Header.tsx`; private responses send `Cache-Control: no-store`
- [ ] T097 [US3] Create `features/auth/components/Welcome.tsx`: for an authenticated user, « Content de te revoir, {prénom} » (from `getMe`) + recently viewed products via `GET /api/products?uuids=`; mount in `app/(shop)/page.tsx`
- [ ] T098 [US3] Create `features/auth/session-expiry.ts` + `features/cart/pending-action.ts`: on UNAUTHENTICATED from a cart mutation, store the action in `ct_pending_action_v1`, redirect to `/login?callbackUrl=<current>`; after login (and after guest merge) replay once via `useCart` and clear
- [ ] T099 [US3] Create `app/api/test/expire-session/route.ts` active only when `env.E2E` is true (404 otherwise): forces `expiresAt` in the past and invalidates the refresh token in the session

**Checkpoint**: US1, US4 and US3 work independently

---

## Phase 6: User Story 2 — Créer un compte (Priority: P2)

**Goal**: formulaire d'inscription validé champ par champ, erreurs backend projetées, invitation à se connecter

**Independent Test**: email invalide → erreur sans appel réseau ; email existant → message sur le champ ; 6 essais/min → délai ; données valides → compte créé puis connexion possible

### Tests for User Story 2 ⚠️ (write first, must fail)

- [ ] T100 [P] [US2] Unit tests `tests/unit/auth/register-schema.test.ts` (`email` z.email(); `firstName`/`lastName` trimmed 2–50; `sex` z.enum(Sex); `phoneNumber` non-empty; `favoriteCommunicationChanel` z.enum(CommunicationChannel); `street`, `city`, `zipCode`, `country` non-empty; `birthDate` optional past date → `YYYY-MM-DDT00:00:00`; `password` ≥ 8)
- [ ] T101 [P] [US2] Unit tests `tests/unit/auth/register-action.test.ts` (MSW: 201 → ok; 400 with `fieldErrors` → mapped to fields; 409 `USER_ALREADY_EXISTS` → email field « Un compte existe déjà avec cet email. »; 429 → `retryAfterSeconds`; `X-Forwarded-For` forwarded; password never logged)
- [ ] T102 [P] [US2] E2E `tests/e2e/register.spec.ts`: invalid email shows field error without network call; existing email; successful registration → invitation to sign in; keyboard-only completion; axe clean

### Implementation for User Story 2

- [ ] T103 [P] [US2] Create `lib/schemas/register.ts`: `RegisterInputSchema` with the exact constraints of T100 and French messages from `features/auth/messages.ts`; `toUserCreateRequest(input)` (never sends `bankCardCreationRequestDto`)
- [ ] T104 [US2] Implement `registerUser` in `lib/api/endpoints/users.ts` (`POST /user/register`, `X-Forwarded-For` from incoming headers, `info` log with `maskEmail`)
- [ ] T105 [US2] Create Server Action `registerUserAction` in `features/auth/actions.ts` returning `{ ok: true }` or `{ ok: false, fieldErrors, formError, retryAfterSeconds? }` (backend `fieldErrors` mapped by field name)
- [ ] T106 [US2] Create `features/auth/components/RegisterForm.tsx` (`"use client"`, client-side Zod validation on blur/submit, labels and `aria-describedby` errors, focus first invalid field, progressive enhancement via the Server Action) and `app/(auth)/register/page.tsx` (success state with « Se connecter » link)
- [ ] T107 [US2] Add registration messages to `features/auth/messages.ts` (field errors, « Un compte existe déjà avec cet email. », « Doucement ! Réessaie dans {n} s. », success)

**Checkpoint**: all four user stories independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns (Aurora Glow signature, perf, a11y)

**Purpose**: signature effects (desktop only), performance budgets, accessibility audit and docs — use the **frontend-design** skill with the spec annex as reference

- [ ] T108 [P] Create `components/effects/DotGrid.tsx` (Canvas 2D, point count ∝ screen area with spacing constant, reveal + repulsion within radius constant, inertia, soft shadow under cursor, excluded over `[data-dotgrid-exclude]` cards/text, paused on `visibilitychange` and via IntersectionObserver, disabled with reduced motion) loaded with `next/dynamic({ ssr: false })` in `app/layout.tsx`
- [ ] T109 [P] Create `components/effects/AuroraBlobs.tsx` (2–3 blurred blobs violet/blue/gold, 20–30 s drift cycles, slow cursor follow, paused when hidden, static with reduced motion)
- [ ] T110 [P] Create `components/effects/MagneticButton.tsx`, `TiltCard.tsx` (3D tilt, inner spotlight, gold reflection on border) and `LiveTitle.tsx` (letter-by-letter reveal, cursor-reactive `wght`), applied to primary CTAs, product cards and page titles
- [ ] T111 [P] Add smooth scroll with Lenis in `app/providers.tsx` (not initialized with reduced motion) and the card → product view transition (`document.startViewTransition`, fade fallback) in `features/catalog/components/ProductCard.tsx`
- [ ] T112 [P] Add cart micro-interactions: « fly to cart » animation, gold counter bounce, in `features/cart/components/AddToCartButton.tsx` and `components/layout/CartBadge.tsx`
- [ ] T113 [P] Animated empty and error states (illustration + French copy) in `app/error.tsx`, `app/not-found.tsx`, cart empty state and catalog empty state
- [ ] T114 [P] Unit tests `tests/unit/effects/reduced-motion.test.tsx`: each effect renders static / no RAF loop when `prefers-reduced-motion: reduce`
- [ ] T115 Create `tests/e2e/a11y.spec.ts` (axe on home, list, product, cart, register — no serious/critical) `tests/e2e/backend-down.spec.ts` (backend unreachable → friendly message + « Réessayer », no blank page) and `tests/e2e/long-tasks.spec.ts` (`PerformanceObserver` on `longtask` during 5 s of cursor movement over the home page: no entry > 50 ms, constitution IX)
- [ ] T116 Run Lighthouse manually (Chrome DevTools, Desktop mode) on `/`, `/products` and one product page; check LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms; fix regressions and record the scores in `specs/001-catalog-auth-cart/quickstart.md` §3
- [ ] T117 [P] Update `README.md` (local setup: backend services via docker-compose, Spring from IntelliJ, `npm run dev`; scripts, env, architecture, conventions summary pointing to `CLAUDE.md` and the constitution)
- [ ] T118 Audit pass: no magic numbers/strings, every closed set is an enum, every export has TSDoc, no `console.*`, no hard-coded French string outside `messages.ts` (`npm run lint` 0 warning + grep check)
- [ ] T119 Run `specs/001-catalog-auth-cart/quickstart.md` end to end (automatic checks, Lighthouse, 18 manual scenarios) and record results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependency
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational
- **US4 (Phase 4)**: depends on Foundational; uses `ProductCard`/`AvailabilityBadge`/product endpoints from US1 (T058, T063, T064) — start after T058–T064
- **US3 (Phase 5)**: depends on Foundational (auth core T036–T039); T098 integrates with `useCart` (T084)
- **US2 (Phase 6)**: depends on Foundational only; reuses `lib/api/endpoints/users.ts` (T092)
- **Polish (Phase 7)**: depends on the stories it decorates

### Within Each User Story

- Tests first (must fail) → schemas → endpoints → BFF routes / actions → components → pages → logging
- Story complete before moving to the next priority when working sequentially

### Parallel Opportunities

- Setup: T005–T010 in parallel after T001–T004
- Foundational: all constants/enums (T011–T020), schemas (T026–T030) in parallel; then env/logger, API client, auth core, design system tracks in parallel
- US1: T051–T054 tests in parallel; T055–T057, T059–T061, T063–T064 in parallel
- US2 and US3 can be developed in parallel once Foundational is done
- Polish: T108–T114 and T117 in parallel

---

## Parallel Example: User Story 1

```bash
# Tests first, together:
Task: "Unit tests tests/unit/catalog/search-params.test.ts"
Task: "Unit tests tests/unit/catalog/facets.test.ts"
Task: "Component tests tests/unit/catalog/AvailabilityBadge.test.tsx and CommandPalette.test.tsx"
Task: "E2E tests/e2e/catalog.spec.ts"

# Schemas and messages, together:
Task: "Create lib/schemas/search.ts"
Task: "Create lib/schemas/category.ts"
Task: "Create lib/schemas/discount.ts"
Task: "Create features/catalog/messages.ts"
```

## Parallel Example: User Story 4

```bash
Task: "Unit tests tests/unit/cart/guest-storage.test.ts"
Task: "Unit tests tests/unit/cart/normalize.test.ts"
Task: "Unit tests tests/unit/cart/merge.test.ts"
Task: "Create lib/schemas/cart.ts"
Task: "Create features/cart/messages.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **STOP and VALIDATE** (quickstart scenarios 1–5, catalog e2e)
3. Demo: public catalog with live availability and ⌘K

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → catalogue (MVP)
3. US4 → guest cart, then account cart + merge
4. US3 → login UI, welcome, pending action replay
5. US2 → registration
6. Polish → signature effects, budgets, docs

---

## Notes

- [P] tasks = different files, no dependency on incomplete tasks
- Commit after each task or logical group (English commit messages)
- UI tasks (T041–T047, T063–T069, T086–T088, T106, T108–T113) are implemented with the **frontend-design** skill using the spec annex « Aurora Glow » as reference — restart Claude Code before `/speckit-implement` so the plugin is loaded
