---

description: "Task list for lot 1 — catalog, authentication and cart"
---

# Tasks: Lot 1 — Catalogue, authentification et panier

**Input**: Design documents from `specs/001-catalog-auth-cart/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R17), data-model.md, contracts/bff-routes.md, contracts/errors.md, quickstart.md

**Tests**: REQUIRED — constitution principle VII (« un comportement sans test n'est pas terminé »). Unit tests (Vitest + Testing Library + MSW) and Playwright journeys are included per story.

**Organization**: Tasks are grouped by user story (priority order: US1 P1, US4 P1, US3 P2, US2 P2, US5 P3) so each story can be implemented and tested independently.

**Rules applying to EVERY task** (constitution XI–XII, `CLAUDE.md`):
- Code, comments, TSDoc and logs in **English**; user-facing text in **French** (tutoiement) in `features/*/messages.ts` only.
- No magic number/string: use `lib/constants/*`; closed sets are **string enums** in `lib/enums/*`; Zod built from enums (`z.enum(MyEnum)`); exhaustive `switch` + `assertNever`.
- TSDoc on every export and at the top of every module (`@param`, `@returns`, `@throws`, `@see`).
- Server logs via `lib/logger.ts` child loggers only; never log tokens, passwords, cookies or full emails.
- Every visual value comes from `lib/theme/theme.config.ts` through CSS variables / Tailwind tokens; no raw hex, px, ms or arbitrary Tailwind values in `components/` or `features/` (constitution XIII).
- A task is done when `npm run typecheck`, `npm run lint` (0 warning) and `npm run test` pass.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 catalogue · US2 inscription · US3 session · US4 panier · US5 préférences
- IDs T120+ were added after the first generation; **execution order is the order of appearance in this file**, not the numeric order

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Scaffold Next.js 16.4 App Router project at repo root (TypeScript, no `src/`, alias `@/*`), no `output: "standalone"` (no container, constitution X), Node 24 engines in `package.json`
- [X] T002 Configure `tsconfig.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`, path alias `@/*`
- [X] T003 Install runtime deps pinned: `next-auth@5.0.0-beta.32`, `zod@4.6.7`, `@tanstack/react-query@5.104.2`, `motion@14.1.0`, `lenis@1.3.26`, `pino`, `server-only`, `cmdk`; dev deps: `openapi-typescript@7.13.0`, `pino-pretty`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `msw`, `@playwright/test`, `@axe-core/playwright`, `jest-axe` in `package.json`
- [X] T004 Configure ESLint flat config in `eslint.config.mjs` (typescript-eslint type-checked, eslint-plugin-jsdoc, eslint-plugin-import) with rules from research R17: `no-explicit-any`, `no-magic-numbers` (ignore 0/1/-1, enums, array indexes, readonly class props; off in `tests/**`), `switch-exhaustiveness-check`, `explicit-module-boundary-types`, `prefer-readonly`, `naming-convention`, `jsdoc/require-jsdoc` (exports) + `require-param` + `require-returns`, `no-console`, `max-depth: 3`, `max-lines-per-function: 40` (80 for `*.tsx`), `no-nested-ternary`, `import/no-cycle`, and `no-restricted-syntax` forbidding hex colour, `px`/`ms` string literals and arbitrary Tailwind values (`[…]`) in `components/**` and `features/**` (constitution XIII); all as errors
- [X] T005 [P] Add Prettier config `.prettierrc.json` and `.editorconfig`; scripts `dev`, `build`, `start`, `typecheck` (`tsc --noEmit`), `lint` (`eslint . --max-warnings 0`), `test`, `test:e2e`, `gen:api` in `package.json`
- [X] T006 [P] Configure Vitest in `vitest.config.ts` (jsdom, alias `@/`, setup file `tests/setup.ts` with Testing Library matchers, jest-axe and MSW server lifecycle) and create `tests/msw/handlers.ts` + `tests/msw/server.ts`
- [X] T007 [P] Configure Playwright in `playwright.config.ts` (baseURL `http://localhost:3000`, projects `chromium` and `reduced-motion` with `reducedMotion: 'reduce'`, `webServer` → `npm run dev` with `E2E=1`)
- [X] T008 [P] Add `npm run gen:api` script running `openapi-typescript http://localhost:8081/v3/api-docs -o lib/api/schema.d.ts` and commit an initial `lib/api/schema.d.ts` generated from the backend copy `docs/openapi/openapi.yaml` (backend repo, read-only)
- [X] T009 [P] Initialize shadcn/ui for Tailwind 4 (`components.json`, `components/ui/`), add primitives: button, input, label, checkbox, slider, dialog, command, toast (sonner), skeleton, select, radio-group
- [X] T010 [P] Create `.env.example` listing `API_BASE_URL`, `API_VERSION`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_KEYCLOAK_ID`, `AUTH_KEYCLOAK_SECRET`, `AUTH_KEYCLOAK_ISSUER`, `IMAGES_REMOTE_HOST`, `NEXT_PUBLIC_SITE_URL`, `E2E`, `LOG_LEVEL` with dev values from plan.md §Variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Constants, enums, logger, env, API client, schemas, auth core, design system, layout — required by every story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Constants, enums, utilities

- [X] T011 [P] Create `lib/assert-never.ts` exporting `assertNever(value: never): never` (throws with the unexpected value)
- [X] T012 [P] Create `lib/constants/api.ts`: `API_BASE_PATH = "/api/v1/services"`, `API_VERSION_HEADER = "X-API-VERSION"`, `REQUEST_ID_HEADER = "X-Request-Id"`, `RETRY_AFTER_HEADER = "Retry-After"`, `BACKEND_TIMEOUT_MS = 8_000`, `BACKEND_MAX_RETRIES = 1`, and one documented constant per backend path used (product get/search/best-sellers/availability, category schema, discounts active, user register/me, cart get/add/update/remove/clear), each TSDoc citing `docs/backend/api-map.md`
- [X] T013 [P] Create `lib/constants/auth.ts`: `ACCESS_TOKEN_REFRESH_MARGIN_MS = 30_000` (Keycloak `accessTokenLifespan` 300 s), `KEYCLOAK_PROVIDER_ID = "keycloak"`, `CALLBACK_URL_PARAM = "callbackUrl"`, Keycloak OIDC path segments (token, logout)
- [X] T014 [P] Create `lib/constants/cart.ts`: `GUEST_CART_MAX_LINES = 50`, `CART_LINE_MIN_QUANTITY = 1`, `CART_LINE_MAX_QUANTITY = 99`, `CART_STALE_TIME_MS = 30_000`, `AVAILABILITY_MAX_UUIDS_PER_REQUEST = 50`, `MERGE_LOCK_NAME = "ct-guest-cart-merge"`
- [X] T015 [P] Create `lib/constants/catalog.ts`: `SEARCH_PAGE_SIZE = 24`, `BEST_SELLERS_SIZE = 8`, `COMMAND_PALETTE_RESULT_SIZE = 6`, `COMMAND_PALETTE_DEBOUNCE_MS = 200`, `SEARCH_KEYWORD_MAX_LENGTH = 100`, `PRICE_MIN_EUR = 100`, `PRICE_MAX_EUR = 1_000_000`, `LOW_STOCK_THRESHOLD = 5`, `RECENTLY_VIEWED_MAX = 8`, `PRODUCTS_REVALIDATE_SECONDS = 60`, `DISCOUNTS_REVALIDATE_SECONDS = 300`, `CATEGORY_SCHEMA_REVALIDATE_SECONDS = 3_600`, `PRODUCTS_CACHE_TAG = "products"`
- [X] T016 [P] Create `lib/constants/storage-keys.ts` (documented values `ct_guest_cart_v1`, `ct_recent_v1`, `ct_pending_action_v1`) and `lib/constants/preferences.ts` (`PREFERENCES_COOKIE_NAME = "ct_prefs_v1"`, `PREFERENCES_VERSION = 1`, `PREFERENCES_COOKIE_MAX_AGE_SECONDS = 31_536_000`); **no visual value here**: durations, sizes and effect parameters live in `lib/theme/theme.config.ts` (T120)
- [X] T017 [P] Create enums in `lib/enums/`: `brand.ts` (`Brand`, 13 values exactly as backend: ASUS, HP, LENOVO, DELL, AORUS, MSI, ACER, TOSHIBA, ALIENWARE, MICROSOFT, ALTYK, GIGABYTE, SAMSUNG), `category-key.ts` (`CategoryKey`: COMPUTER, MONITOR), `sex.ts` (`Sex`: M, F), `communication-channel.ts` (`CommunicationChannel`: EMAIL, SMS, PUSH_NOTIFICATION), `discount-calculation-type.ts` (NONE, PERCENTAGE, FIXED_AMOUNT, BUY_ONE_GET_ONE_FREE)
- [X] T018 [P] Create enums in `lib/enums/`: `cart.ts` (`CartSource` guest/account, `CartLineStatus` ok/insufficient-stock/unavailable, `MergeDropReason` out-of-stock/not-found, `PendingActionType` add/set/remove), `availability-level.ts` (`AvailabilityLevel` in/low/out), `log-level.ts` (`LogLevel` debug/info/warn/error), `session-error.ts` (`SessionError`: REFRESH_TOKEN_ERROR = "RefreshTokenError", the value Auth.js examples use), `theme.ts` (`AccentVariant` violet/blue/cyan, `EffectsLevel` full/reduced/off, `MotionIntensity` normal/soft, `SoundSetting` on/off, `UiSound` add-to-cart/merge-success/error, `ThemeDataAttribute` data-accent/data-effects/data-motion), `query-key.ts` (`QueryKey` cart/availability/search/recent-products), `storage-key.ts` (`StorageKey` built from `lib/constants/storage-keys.ts`)
- [X] T019 [P] Create `lib/enums/error-code.ts`: `ErrorCodeType` (TECHNICAL, FUNCTIONAL — backend `ErrorCodeType.java`), `BackendErrorCode` (string enum mirroring every value of `ErrorResponseDto.errorCode` in the OpenAPI) and `FrontErrorCode` (invalid, unauthenticated, forbidden, not-found, insufficient-stock, conflict, empty-cart, already-exists, rate-limited, unavailable, unknown) per `contracts/errors.md`
- [X] T020 [P] Type-level test `tests/unit/enums/error-code.test-d.ts` (Vitest `expectTypeOf`, typecheck mode enabled in `vitest.config.ts`) asserting `` `${BackendErrorCode}` `` and the `errorCode` union of `components["schemas"]["ErrorResponseDto"]` in `lib/api/schema.d.ts` are mutually assignable (detects backend drift at `npm run test`)

### Env, logger

- [X] T021 Create `lib/env.ts`: Zod schema for all variables of plan.md §Variables (URLs validated, `LOG_LEVEL` = `z.enum(LogLevel)` default `info`, `API_VERSION` default `1.0`, `E2E` boolean default `false`, all others required), parsed once, throws a readable error listing missing variables; `server-only`
- [X] T022 Create `instrumentation.ts` importing `lib/env.ts` at server start so the app refuses to boot on invalid env (principle VI)
- [X] T023 Create `lib/logger.ts`: pino logger (level from env, `pino-pretty` transport in dev only, `redact` on `authorization`, `cookie`, `*.password`, `*.accessToken`, `*.refreshToken`, `*.idToken`), `createModuleLogger(module: string)` returning a child logger, `maskUuid` (keep first 8 chars) and `maskEmail` (`j***@domain`), `server-only`; add `pino` to `serverExternalPackages` in `next.config.ts`
- [X] T024 [P] Create `lib/client-logger.ts`: `clientLogger.error(message, context)` only in production, `warn`/`debug` in development; no direct `console` usage elsewhere (single eslint-disable with justification inside this file)
- [X] T025 [P] Unit tests `tests/unit/logger.test.ts` for `maskUuid`, `maskEmail` and redaction of token fields

### Schemas (Zod) — data-model.md §1–§3

- [X] T026 [P] Create `lib/schemas/product.ts`: `ProductSchema` (`uuid` z.uuid(), `name` min 1, `price` nonnegative, `brand` z.enum(Brand), `category` string, `photoUrls` array of z.url() possibly empty, `description` string, `attributes` record<string, unknown>), `ProductCardSchema` (`uuid, name, brand, category, price, imageUrl: string|null`), `ProductAvailabilitySchema` (`productUuid` uuid, `availableStock` int ≥ 0, `inStock` boolean) and `toAvailabilityLevel()` (`inStock=false` → OUT, `availableStock ≤ LOW_STOCK_THRESHOLD` → LOW, else IN)
- [X] T027 [P] Create `lib/schemas/paged.ts`: generic `pagedSchema(item)` = `{ content: T[], page: { size, number, totalElements, totalPages } }`
- [X] T028 [P] Create `lib/schemas/error.ts`: `ApiErrorBodySchema` = `{ message: string, httpStatusCode: int, errorCodeType: z.enum(ErrorCodeType), errorCode: z.enum(BackendErrorCode), fieldErrors?: { field, message }[] }`
- [X] T029 [P] Create `lib/schemas/storage.ts`: `GuestCartStorageSchema` (`items` max `GUEST_CART_MAX_LINES`, `quantity` int `CART_LINE_MIN_QUANTITY..CART_LINE_MAX_QUANTITY`, `updatedAt` ISO), `RecentlyViewedSchema` (`uuids` max `RECENTLY_VIEWED_MAX`, unique), `PendingActionSchema` (`type` z.enum(PendingActionType), `productUuid`, `quantity?`)
- [X] T030 [P] Unit tests `tests/unit/schemas/product.test.ts`, `paged.test.ts`, `error.test.ts`, `storage.test.ts` (valid and invalid cases, boundaries 0/1/99/100, 50/51 lines)

### API client and error mapping — contracts/errors.md

- [X] T031 Create `lib/api/errors.ts`: class `ApiError { status, backendCode?, frontCode: FrontErrorCode, message, fieldErrors?, retryAfterSeconds?, requestId? }`, `toFrontErrorCode(backendCode, status)` implementing every row of `contracts/errors.md` with an exhaustive switch, `parseErrorResponse(response)` (JSON via `ApiErrorBodySchema`, non-JSON → UNAVAILABLE, `Retry-After` header → `retryAfterSeconds`)
- [X] T032 Create `lib/api/client.ts` (`server-only`): `backendFetch<T>(path, { method, body, schema, accessToken?, cache?, next?, forwardedFor? })` adding `X-API-VERSION`, `Authorization`, JSON headers, `AbortSignal.timeout(BACKEND_TIMEOUT_MS)`, validating the body with the given Zod schema (mismatch → `error` log + UNAVAILABLE), logging every call (`method`, `path`, `status`, `durationMs`, `requestId`, `errorCode`), allowing a body on DELETE
- [X] T033 Create `lib/api/retry.ts`: `withSingleRetry(fn, shouldRetry)` retrying once when `frontCode` is CONFLICT (`CONCURRENT_MODIFICATION`) or UNAVAILABLE on writes; `warn` log on retry
- [X] T034 [P] Unit tests `tests/unit/api/errors.test.ts` (one case per row of `contracts/errors.md`, both JSON and non-JSON bodies, `Retry-After`) and `tests/unit/api/client.test.ts` (headers, timeout, Zod mismatch, logging without token) with MSW
- [X] T035 Create `lib/api/bff-response.ts`: helpers `jsonOk(data, status)`, `jsonError(apiError)` producing `{ error: { code, message, fieldErrors?, retryAfterSeconds? } }` with `Cache-Control: no-store`, and `parseJsonBody(request, schema)` returning 400 `invalid` on Zod failure (contracts/bff-routes.md §Règles communes)

### Auth core — research R2–R4

- [X] T036 Create `lib/auth/refresh.ts`: `refreshAccessToken(token)` calling the Keycloak token endpoint with `grant_type=refresh_token`, deduplicating concurrent refreshes with a `Map<refreshToken, Promise>`, returning `error: SessionError.REFRESH_TOKEN_ERROR` on failure (`warn` log, masked subject)
- [X] T037 Create `lib/auth/config.ts`: Auth.js v5 with Keycloak provider (`AUTH_KEYCLOAK_*`, PKCE S256), session strategy `jwt`, callback `jwt` storing `accessToken`, `refreshToken`, `idToken`, `expiresAt` and refreshing when `expiresAt - ACCESS_TOKEN_REFRESH_MARGIN_MS < now`, callback `session` exposing only `user.name`, `user.email`, `roles`, `error` (typed `SessionError | undefined` via module augmentation of `next-auth` types); export `{ handlers, auth, signIn, signOut }`
- [X] T038 Create `app/api/auth/[...nextauth]/route.ts` exporting `GET`/`POST` from `lib/auth/config.ts`
- [X] T039 Create `lib/auth/guards.ts`: `getAccessTokenOrThrow()` (server-only; throws `ApiError` UNAUTHENTICATED when no session or `session.error === SessionError.REFRESH_TOKEN_ERROR`) and `requireSession(callbackPath)` for layouts (redirects to `/login?callbackUrl=`)
- [X] T040 [P] Unit tests `tests/unit/auth/refresh.test.ts` (refresh before margin, dedup of concurrent calls, failure → RefreshTokenError) and `tests/unit/auth/session-callback.test.ts` (no token leaked to the session object)

### Theme configuration — constitution XIII, research R18

- [X] T120 Create `lib/theme/types.ts` (`ThemeConfig` type indexed by `AccentVariant`, `MotionIntensity`, `EffectsLevel`, `UiSound`) and `lib/theme/theme.config.ts` exporting `THEME` (`as const satisfies ThemeConfig`, fully TSDoc'd) with **every** visual value: palette from the spec annex (`bg #0A0E1F`, `surface #121833`, `surface2 #1A2142`, `border #2A3150`, `text #E6E8F2`, `textMuted #8B93B0`, `gold #D4AF6A`, `rose #F08BB8`), accents, each a token set `{ accent, accentText, onAccent, accentGlow, gradientFrom, gradientTo, success }`: VIOLET (default) `accent #8B7CF6`, `accentText #8B7CF6`, `success #5EEAD4`; BLUE `accent #4F7BFF` (fills, glows, gradients) with `accentText #6B8FFF` (text and focus on surfaces: 4.19:1 → 5.22:1 on `surface2`), `success #5EEAD4`; CYAN `accent #5EEAD4`, `accentText #5EEAD4`, `success #7BE0A8` (mint, so success/active states stay distinct from the accent); `onAccent #0A0E1F` for every accent (text on accent fills and on the CTA gradient: 5.1 to 13:1; light text on accent fails AA at 1.2 to 3.1:1), typography (Sora 500–600 −0.02em, Inter 400–500 line-height 1.6–1.7, JetBrains Mono), shape (radii 16–20 px, glass opacity 0.7, blur 12 px), media sizes (`card`, `gallery`, `thumbnail` width/height used by every `next/image`), violet-tinted shadows, motion per intensity (NORMAL: 150/250/350 ms, reveal 12 px; SOFT: longer and smaller), effects per level (FULL / REDUCED / OFF for dotGrid radius 120 px spacing 28 px, aurora 2–3 blobs 20–30 s, tilt, magnetic, smoothScroll, viewTransitions), sound (volume, duration, frequency per `UiSound`)
- [X] T121 Create `lib/theme/css-variables.ts`: `buildThemeCss(theme): string` emitting `:root { --color-bg: …; --accent: …; --radius-card: …; --duration-base: …; … }` plus one block per variant (`[data-accent="blue"]`, `[data-motion="soft"]`, `[data-effects="off"]`), variable names as constants
- [X] T122 [P] Create `lib/theme/contrast.ts` (`contrastRatio(foreground, background)`, WCAG relative luminance) and `tests/unit/theme/contrast.test.ts` asserting, for every `AccentVariant`: `accentText`, `success`, `text`, `textMuted`, `gold`, `rose` on each surface (`bg`, `surface`, `surface2`) ≥ 4.5:1; `onAccent` on `accent`, `gradientFrom` and `gradientTo` ≥ 4.5:1; focus ring (`accentText`) ≥ 3:1 on every surface; SC-011
- [X] T123 [P] Unit test `tests/unit/theme/css-variables.test.ts`: every token of `THEME` is emitted, every enum variant has its block, no `undefined`/`NaN` in the output
- [X] T124 Create `lib/schemas/preferences.ts` (`PreferencesSchema`: `version` literal `PREFERENCES_VERSION`, `effects` z.enum(EffectsLevel) default FULL, `motion` z.enum(MotionIntensity) default NORMAL, `accent` z.enum(AccentVariant) default VIOLET, `sound` z.enum(SoundSetting) default OFF; `DEFAULT_PREFERENCES`) and `lib/preferences/read-preferences.ts` (`readPreferences(cookieStore)`, invalid or old version → defaults), with `tests/unit/preferences/read-preferences.test.ts`

- [X] T131 Create the read-only half of preferences in `features/preferences/PreferencesProvider.tsx`: React context initialised with the server-read preferences, hooks `usePreferences()` (read), `useMotionIntensity()`, `useAccent()` and `useEffectiveEffects()` (effective level = min(preference, OS `prefers-reduced-motion` via `matchMedia`, updated on change)), plus `tests/unit/preferences/useEffectiveEffects.test.tsx`; US5 (T128) adds writing

### Design system and layout — spec annexe « Aurora Glow » (use the frontend-design skill)

- [X] T041 Create `styles/globals.css` **without any literal value**: Tailwind 4 `@import "tailwindcss"` + `@theme inline` mapping every token to the CSS variables emitted by `buildThemeCss` (colours incl. `accent`, radii, shadows, fonts, durations), glass card utility (`--glass-opacity`, `--glass-blur`), accent-tinted shimmer keyframes, visible focus ring (`:focus-visible`, outline in `var(--accent)` with width/offset tokens, AA contrast verified by T122), global `prefers-reduced-motion` rules
- [X] T042 [P] Create `styles/motion.ts`: Motion variants (fade + reveal offset, stagger) built from `THEME.motion[intensity]`, exposed through `useMotionTokens()` which reads the current `MotionIntensity` from preferences
- [X] T043 Create `app/layout.tsx`: `next/font` Sora (variable `wght`), Inter, JetBrains Mono; `lang="fr"`; metadata from `features/common/messages.ts` with `metadataBase` = `NEXT_PUBLIC_SITE_URL`; reads preferences with `readPreferences(cookies())`, sets `data-accent`/`data-effects`/`data-motion` on `<html>` and injects `buildThemeCss(THEME)` in a `<style nonce>` in `<head>` (no flash on first paint, FR-034); `<Providers>`; skip link; `Header`; main landmark
- [X] T044 Create `lib/query/query-client.ts` — `createQueryClient()` (default options from `lib/constants/cart.ts`, no automatic retry on mutations) and `resetClientState(queryClient)` clearing every cached query (used at sign-out, FR-017) — then `app/providers.tsx` (`"use client"`): `QueryClientProvider` built with `createQueryClient()`, `SessionProvider`, `MotionConfig reducedMotion="user"`, toast provider, and the read-only `PreferencesProvider` (T131) initialised with the server-read preferences
- [X] T045 [P] Create `features/common/messages.ts` (French, tutoiement: site name, generic errors, retry, not found, loading labels) and `lib/format.ts` (`formatPrice` via `Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })`)
- [X] T046 Create `components/layout/Header.tsx` (logo, nav, search trigger slot, cart badge slot, account slot) and `components/layout/Footer.tsx`, `components/layout/SkipLink.tsx`
- [X] T047 Create `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx` (messages from `features/common/messages.ts`, « Réessayer » button, violet shimmer skeleton, static when reduced motion)
- [X] T048 Create `proxy.ts`: per-request CSP nonce passed to the app via the `x-nonce` request header (`default-src 'self'`; `script-src 'self' 'nonce-…' 'strict-dynamic'` plus `'unsafe-eval'` in development only, required by React dev tooling; `style-src 'self' 'unsafe-inline'`, required by Next.js, Motion and Radix inline styles; `img-src 'self' blob: data: <IMAGES_REMOTE_HOST>`; `font-src 'self'`; `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self' <AUTH_KEYCLOAK_ISSUER origin>`; `frame-ancestors 'none'`; directive values as constants in `lib/constants/security.ts`) and a guard placeholder for future private routes (`/account/**`), matcher excluding static assets
- [X] T049 Update `next.config.ts`: security headers (`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling camera, microphone, geolocation and gyroscope, `X-Content-Type-Options: nosniff`), `images.remotePatterns` from `IMAGES_REMOTE_HOST` (`/cybertech-products/**`)
- [X] T050 [P] Unit test `tests/unit/query/query-client.test.ts`: `resetClientState` removes every cached query (cart, availability, recent products) and `createQueryClient` applies the documented defaults (FR-017)

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
- [ ] T063 [P] [US1] Create `features/catalog/components/ProductCard.tsx` (Server Component: image via `next/image` with dimensions from `THEME.media.card` and fallback, name, brand, gold mono price, glass card, `view-transition-name` = `product-{uuid}`)
- [ ] T064 [P] [US1] Create `features/catalog/components/AvailabilityBadge.tsx` (`"use client"`, TanStack Query `QueryKey.AVAILABILITY`, `staleTime: 0`, refetch on focus, batched UUIDs) and `features/catalog/hooks/useAvailability.ts`
- [ ] T065 [US1] Create `features/catalog/components/Filters.tsx` (category radio, brands checkboxes, price range 100–1 000 000, dynamic facets; updates URL via `buildSearchUrl`; works as a GET `<form>` without JavaScript) and `features/catalog/components/Pagination.tsx` (links, `aria-current`)
- [ ] T066 [US1] Create `app/(shop)/products/page.tsx`: parse `searchParams`, load category schema when a category is set, render filters, grid, pagination, empty state with reset link; `generateMetadata` in French
- [ ] T067 [US1] Create `app/(shop)/products/[uuid]/page.tsx` (gallery sized with `THEME.media.gallery` / `THEME.media.thumbnail`, brand, gold price, description, technical attributes rendered with facet labels, `AvailabilityBadge`, add-to-cart slot) and `app/(shop)/products/[uuid]/not-found.tsx` (« produit introuvable » + back to catalog)
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
- [ ] T086 [P] [US4] Create `features/cart/components/AddToCartButton.tsx` (quantity selector 1–99 in dark neumorphism with `success`-token active border (never colour alone: icon or text also signals the state, WCAG 1.4.1), disabled when availability OUT, error messages with available quantity) and mount it on product page and cards
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
- [ ] T091 [P] [US3] E2E `tests/e2e/auth.spec.ts`: login via Keycloak returns to origin page; welcome « Content de te revoir, {prénom} »; token refresh is transparent (`/api/test/expire-session?mode=access` then navigate: still signed in, no redirect); logout closes Keycloak session (re-login asks credentials) and back button shows neither the account cart nor the first name (client cache cleared, FR-017); after logout `ct_guest_cart_v1` is absent or empty (FR-027); unrecoverable session (`/api/test/expire-session?mode=all`) during cart add → redirected to login then action replayed

### Implementation for User Story 3

- [ ] T092 [P] [US3] Create `lib/schemas/user.ts` (`CurrentUserSchema`: `uuid`, `email`, `firstName`, `lastName` only; other fields stripped) and `lib/api/endpoints/users.ts` (`getMe(accessToken)` no-store, `registerUser(input, forwardedFor)` placeholder used by US2)
- [ ] T093 [P] [US3] Create `features/auth/messages.ts` (French, tutoiement: sign in, sign out, « Content de te revoir, {prénom} », session expired « Ta session a expiré, reconnecte-toi. », signed out confirmation)
- [ ] T094 [US3] Create `app/(auth)/login/page.tsx` + Server Action `signInWithKeycloak(formData)` in `features/auth/actions.ts`: the page (Server Component) reads `callbackUrl` (same-origin only, otherwise `/`) and renders a `<form action={signInWithKeycloak}>` with a hidden `callbackUrl` and a visible « Se connecter » button; a tiny client component submits the form automatically on mount (so JS users go straight to Keycloak, no-JS users click). The action calls `signIn(KEYCLOAK_PROVIDER_ID, { redirectTo })` — `signIn` must never run during Server Component render, because cookies can only be written in Server Actions and Route Handlers
- [ ] T095 [US3] Create `features/auth/actions.ts` with Server Action `signOutEverywhere()` (read `idToken`, `signOut({ redirect: false })`, redirect to Keycloak `end_session_endpoint` with `id_token_hint` and `post_logout_redirect_uri = AUTH_URL`); `info` log with masked subject
- [ ] T096 [US3] Create `features/auth/components/AccountMenu.tsx` (sign-in link with current path as `callbackUrl`, or first name + sign-out button that calls `resetClientState(queryClient)` before invoking `signOutEverywhere`) and mount it in `Header.tsx`; private responses send `Cache-Control: no-store`
- [ ] T097 [US3] Create `features/auth/components/Welcome.tsx`: for an authenticated user, « Content de te revoir, {prénom} » (from `getMe`) + recently viewed products via `GET /api/products?uuids=`; mount in `app/(shop)/page.tsx`
- [ ] T098 [US3] Create `features/auth/session-expiry.ts` + `features/cart/pending-action.ts`: on UNAUTHENTICATED from a cart mutation, store the action in `ct_pending_action_v1`, redirect to `/login?callbackUrl=<current>`; after login (and after guest merge) replay once via `useCart` and clear
- [ ] T099 [US3] Create `app/api/test/expire-session/route.ts` active only when `env.E2E` is true (404 otherwise), with `mode` from an `ExpireSessionMode` enum: `access` forces `expiresAt` in the past (the next request must refresh successfully), `all` also replaces the refresh token with an invalid value (the refresh must fail → `SessionError.REFRESH_TOKEN_ERROR`)

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

**Checkpoint**: US1–US4 independently functional

---

## Phase 7: User Story 5 — Personnaliser l'interface (Priority: P3)

**Goal**: panneau « Préférences » (effets, intensité, accent, sons), application immédiate, mémorisation sans flash, priorité à `prefers-reduced-motion`

**Independent Test**: désactiver les effets, choisir l'accent bleu, recharger : la page s'affiche directement avec effets coupés et accent bleu ; les prix restent dorés

### Tests for User Story 5 ⚠️ (write first, must fail)

- [ ] T125 [P] [US5] Unit tests `tests/unit/preferences/usePreferences.test.tsx` (update writes the `ct_prefs_v1` cookie with constants and updates `<html>` data attributes immediately; reset → `DEFAULT_PREFERENCES`), and `PreferencesPanel.test.tsx` (radio groups labelled, keyboard operable, state announced, reduced-motion notice shown when the OS asks for it, jest-axe)
- [ ] T126 [P] [US5] E2E `tests/e2e/preferences.spec.ts`: choose BLUE → accent changes without reload and prices stay gold (FR-037); reload → initial HTML already has `data-accent="blue"` (no flash, FR-034); effects OFF → no canvas and no tilt; `reduced-motion` project with FULL → effects static + notice (FR-036); sound ON → add to cart plays (AudioContext spy); reset → defaults; time between the click on an accent and the `data-accent` change on `<html>` < 200 ms (SC-011)

### Implementation for User Story 5

- [ ] T127 [P] [US5] Create `features/preferences/messages.ts` (French, tutoiement: panel title « Préférences », labels and descriptions for each option and value, reduced-motion notice « Ton système demande moins d'animations, on les garde figées. », reset, saved confirmation)
- [ ] T128 [US5] Extend `features/preferences/PreferencesProvider.tsx` (T131) with writing: `update(partial)` and `reset()` exposed by `usePreferences()`; `update` validates with `PreferencesSchema`, writes the cookie (`SameSite=Lax`, `Path=/`, max-age constant; try/catch when storage is refused) and sets `document.documentElement.dataset` immediately
- [ ] T129 [US5] Create `features/preferences/components/PreferencesPanel.tsx` (shadcn Sheet/Dialog, radio groups for effects/motion/accent with colour swatches from `THEME.accents`, switch for sound, « Réinitialiser » button, reduced-motion notice) and a trigger button in `components/layout/Header.tsx`
- [ ] T130 [US5] Create `lib/sound/ui-sounds.ts` (`playUiSound(sound: UiSound)` with a Web Audio oscillator, parameters from `THEME.sound`, lazily created `AudioContext`, no-op when `SoundSetting.OFF`) and `useUiSound()`; call it on add-to-cart success (`AddToCartButton`), merge success (`GuestCartMerger`) and error toasts

**Checkpoint**: all five user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns (Aurora Glow signature, perf, a11y)

**Purpose**: signature effects (desktop only), performance budgets, accessibility audit and docs — use the **frontend-design** skill with the spec annex as reference

- [ ] T108 [P] Create `components/effects/DotGrid.tsx` (Canvas 2D, point count ∝ screen area with spacing constant, reveal + repulsion within radius constant, inertia, soft shadow under cursor, excluded over `[data-dotgrid-exclude]` cards/text, parameters from `THEME.effects[level].dotGrid` via `useEffectiveEffects()` (renders nothing when disabled), paused on `visibilitychange` and via IntersectionObserver, disabled with reduced motion) loaded with `next/dynamic({ ssr: false })` in `app/layout.tsx`
- [ ] T109 [P] Create `components/effects/AuroraBlobs.tsx` (blob count, colours (current accent + gold), blur and cycle from `THEME.effects[level].aurora`, 20–30 s drift cycles, slow cursor follow, paused when hidden, static with reduced motion)
- [ ] T110 [P] Create `components/effects/MagneticButton.tsx`, `TiltCard.tsx` (3D tilt, inner spotlight, gold reflection on border) and `LiveTitle.tsx` (letter-by-letter reveal, cursor-reactive `wght`), each reading its parameters from `THEME.effects[level]` via `useEffectiveEffects()` and degrading to a static element when disabled, applied to primary CTAs, product cards and page titles
- [ ] T111 [P] Add smooth scroll with Lenis in `app/providers.tsx` (initialized only when `THEME.effects[level].smoothScroll.enabled`, re-evaluated when preferences change) and the card → product view transition (`document.startViewTransition`, fade fallback) in `features/catalog/components/ProductCard.tsx`
- [ ] T112 [P] Add cart micro-interactions: « fly to cart » animation, gold counter bounce, in `features/cart/components/AddToCartButton.tsx` and `components/layout/CartBadge.tsx`
- [ ] T113 [P] Animated empty and error states (illustration + French copy) in `app/error.tsx`, `app/not-found.tsx`, cart empty state and catalog empty state
- [ ] T114 [P] Unit tests `tests/unit/effects/effects-levels.test.tsx`: for each effect, FULL animates, REDUCED uses the reduced parameters, OFF and `prefers-reduced-motion: reduce` render static with no RAF loop
- [ ] T115 Create `tests/e2e/a11y.spec.ts` (axe on home, list, product, cart, register — no serious/critical) `tests/e2e/backend-down.spec.ts` (backend unreachable → friendly message + « Réessayer », no blank page) and `tests/e2e/long-tasks.spec.ts` (`PerformanceObserver` on `longtask` during 5 s of cursor movement over the home page: no entry > 50 ms, constitution IX)
- [ ] T116 Run Lighthouse manually (Chrome DevTools, Desktop mode) on `/`, `/products` and one product page; check LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms; fix regressions and record the scores in `specs/001-catalog-auth-cart/quickstart.md` §3
- [ ] T117 [P] Update `README.md` (local setup: backend services via docker-compose, Spring from IntelliJ, `npm run dev`; scripts, env, architecture, conventions summary pointing to `CLAUDE.md` and the constitution)
- [ ] T118 Audit pass: no magic numbers/strings, every closed set is an enum, every export has TSDoc, no `console.*`, no hard-coded French string outside `messages.ts`, no raw visual value outside `lib/theme/` (change the default accent in `THEME` and check every screen follows, SC-012) (`npm run lint` 0 warning + grep check)
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
- **US5 (Phase 7)**: depends on Foundational theme tasks (T120–T124, T131) only; T130 hooks into US4 components when present. T131 (read-only preferences) is Foundational because T042, T044 and the effects need it
- **Polish (Phase 8)**: depends on the stories it decorates; effects (T108–T112) read `useEffectiveEffects()` from T128

### Within Each User Story

- Tests first (must fail) → schemas → endpoints → BFF routes / actions → components → pages → logging
- Story complete before moving to the next priority when working sequentially

### Parallel Opportunities

- Setup: T005–T010 in parallel after T001–T004
- Foundational: all constants/enums (T011–T020), schemas (T026–T030) in parallel; then env/logger, API client, auth core, theme (T120 → T121, then T122 and T123 in parallel, then T124 → T131) and design system tracks in parallel
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
6. US5 → preferences panel
7. Polish → signature effects (driven by theme + preferences), budgets, docs

---

## Notes

- [P] tasks = different files, no dependency on incomplete tasks
- Commit after each task or logical group (English commit messages)
- UI tasks (T041–T047, T063–T069, T086–T088, T106, T129, T108–T113) are implemented with the **frontend-design** skill using the spec annex « Aurora Glow » as reference — restart Claude Code before `/speckit-implement` so the plugin is loaded
