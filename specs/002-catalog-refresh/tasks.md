---

description: "Task list for feature 002 — catalog filters, comparator, navigation and shared layout"
---

# Tasks: Catalogue et navigation

**Input**: Design documents from `specs/002-catalog-refresh/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R14), data-model.md, contracts/bff-routes.md, quickstart.md

**Tests**: REQUIRED — constitution principle VII (« un comportement sans test n'est pas terminé »). Unit tests (Vitest + Testing Library + MSW + jest-axe) and Playwright journeys are included per story, written first and failing before the implementation.

**Organization**: Tasks are grouped by user story in priority order (US1 filters P1, US2 comparator P1, US3 navigation P2, US4 home and catalog P3), then the « Interface vivante et cohérente » phase (`docs/speckit-prompts-lot2.md` §6) and the wrap-up. Each story can be implemented, tested and committed on its own, one story per conversation.

**Rules applying to EVERY task** (constitution XI–XIII, `CLAUDE.md`):
- Code, comments, TSDoc and logs in **English**; user-facing text in **French** (tutoiement) in `features/*/messages.ts` only.
- No magic number/string: use `lib/constants/*`; closed sets are **string enums** in `lib/enums/*`; Zod built from enums (`z.enum(MyEnum)`); exhaustive `switch` + `assertNever`.
- TSDoc on every export and at the top of every module (`@param`, `@returns`, `@throws`, `@see` to the spec, contract or backend file).
- Server logs via `lib/logger.ts` child loggers only; product UUIDs masked with `maskUuid`.
- Every visual value comes from `lib/theme/theme.config.ts` through CSS variables / Tailwind tokens; no raw hex, px, ms or arbitrary Tailwind values in `components/` or `features/`; animations read `useMotionTokens()` and `useEffectiveEffects()` and have a static version.
- Reuse lot 1 building blocks instead of re-creating them: `lib/api/client.ts` (`backendFetch`), `lib/api/bff-response.ts`, `lib/api/query-validation.ts`, `lib/schemas/uuid-list.ts`, `features/catalog/search-params.ts` (`buildSearchUrl`), `components/ui/dialog.tsx`, `components/effects/*`, `AvailabilityBadge`, `AddToCartButton`, `tests/e2e/support/*`.
- A task is done when `npm run typecheck`, `npm run lint` (0 warning) and `npm run test` pass.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 filtres · US2 comparateur · US3 navigation · US4 accueil et catalogue

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align the generated API types with the backend and record the starting state.

- [X] T001 With the backend running on `http://localhost:8081`, run `npm run gen:api`; if `ProductFacetsResponseDto` now appears in `lib/api/schema.d.ts`, keep the regenerated file, otherwise leave it unchanged and note « facets endpoint not yet exposed » in `specs/002-catalog-refresh/quickstart.md` §5; check with `npm run typecheck` that no existing type broke (the backend also changed `OrderResponseDto`, unused by this feature)
- [X] T002 [P] Capture « before » screenshots (Playwright, 1 440 × 900, effects at default level) of `/`, `/products`, `/products?category=COMPUTER`, one product page and `/cart` into `specs/002-catalog-refresh/screenshots/before/` with `tests/e2e/support/capture-screens.ts` + `tests/e2e/screenshots.spec.ts` (`CAPTURE_DIR=… npx playwright test screenshots --config playwright.capture.config.ts`, reused in T066 and T076)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Constants, enums and schemas shared by several stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Add to `lib/constants/catalog.ts` with TSDoc stating origin and unit: `FILTER_EXCLUDED_ATTRIBUTES: readonly string[] = ["connectivity"]` (90 composite values, decision of 2026-10-13, spec Edge Cases), `FACET_VISIBLE_VALUES = 6`, `FACET_MAX_VALUES = 50` (aligned with backend `CyberTechAppConstants.FACET_MAX_VALUES`), `FACET_FALLBACK_SCAN_SIZE = 1_000` (above the 531 products of 2026-10-13), `FACETS_FALLBACK_REVALIDATE_SECONDS = 300`
- [X] T004 [P] Create `lib/constants/compare.ts`: `COMPARE_MAX_PRODUCTS = 3`, `COMPARE_MIN_PRODUCTS = 2` (FR-014, FR-015), `COMPARE_QUERY_STALE_TIME_MS = 60_000`
- [X] T005 [P] Add `productFacets: \`${API_BASE_PATH}/product/search/facets\`` to `BACKEND_PATHS` in `lib/constants/api.ts` and `compare: "/api/compare"` to `BFF_ROUTES` in `lib/constants/routes.ts`, each with TSDoc (method, auth, `@see` contracts/bff-routes.md)
- [X] T006 [P] Enums with TSDoc per value: add `TEXT = "text"` to `FacetKind` in `lib/enums/facet-kind.ts`; create `lib/enums/facet-source.ts` (`BACKEND = "backend"`, `FALLBACK = "fallback"`, `UNAVAILABLE = "unavailable"`), `lib/enums/active-filter-kind.ts` (`KEYWORD`, `CATEGORY`, `BRAND`, `PRICE`, `ATTRIBUTE`, `RANGE`, lower-case values), `lib/enums/compare-refusal.ts` (`FULL = "full"`, `OTHER_CATEGORY = "other_category"`), `lib/enums/nav-section.ts` (`HOME`, `CATALOG`, `COMPUTER`, `MONITOR`, `NONE`, lower-case values); add `COMPARE = "ct_compare_v1"` to `StorageKey` in `lib/enums/storage-key.ts` and `COMPARE_STORAGE_KEY` to `lib/constants/storage-keys.ts`; extend `tests/unit/enums` coverage if an enum test exists there
- [X] T007 Extract the value formatting of `buildProductSpecs` into an exported `formatSpecValue(key: string, value: unknown): string | null` in `features/catalog/product-specs.ts` (same rules: units from `ATTRIBUTE_UNITS`, booleans, trimmed strings, `null` for empty or objects), with `buildProductSpecs` calling it; existing tests in `tests/unit/catalog/catalog-helpers.test.ts` stay green and one test per rule is added

**Checkpoint**: Foundation ready — user stories can now begin.

---

## Phase 3: User Story 1 - Filtrer sur toutes les caractéristiques (Priority: P1) 🎯 MVP

**Goal**: Every schema attribute of the category (connectivity excepted) is filterable with the values really present in the catalog, counts when the backend provides them, bounded ranges, active-filter pills, everything in the URL and usable without JavaScript.

**Independent Test**: choose « Ordinateurs », tick two processors and « OLED », check that only matching products are listed, remove a pill, reload, find the same state (quickstart scenarios 1–9).

### Tests for User Story 1 ⚠️

> Write these tests FIRST and make sure they FAIL before the implementation.

- [X] T008 [P] [US1] Schema tests in `tests/unit/schemas/facets.test.ts`: valid backend payload (`totalHits`, `brands`, `price`, `attributes`, `numericAttributes`), `attributes` / `numericAttributes` absent without category, `RangeFacet` with both bounds `null`, rejection of an empty `value` or a negative `count`; plus a type-level test that `ProductFacetsResponse` is assignable from `components["schemas"]["ProductFacetsResponseDto"]` when that type exists in `lib/api/schema.d.ts` (skip with a TODO comment referencing T001 otherwise)
- [X] T009 [P] [US1] Endpoint tests with MSW in `tests/unit/catalog/facets-endpoint.test.ts`: `getFacets` success → `FacetData` `source: BACKEND`, `hasCounts: true`; request body = `toProductSearchRequest(filters)` without `page` and `size`; 404 → fallback scan `POST /product/search { category, page: 0, size: 1000 }` → distinct non-empty values sorted with `localeCompare("fr")`, numeric min/max, `count: null`, `source: FALLBACK`; non-conforming payload → fallback; fallback error **or fallback response not matching the existing paged product schema** → `source: UNAVAILABLE`, `totalHits: null`, `error` logged; `brandCounts` built from `brands` (unknown brand ignored with a `warn`), `null` in fallback; the 404 warning is logged once per process
- [X] T010 [P] [US1] Unit tests in `tests/unit/catalog/filter-facets.test.ts` for `buildFilterFacets` (data-model §3): schema order kept, `connectivity` removed, `TEXT` facet omitted when it has no value and none is ticked, `isDisabled = count === 0 && !isChecked`, ticked value missing from data appended with `count: 0` (or `null` without counts), `visibleCount ≤ FACET_VISIBLE_VALUES` and `isExpanded` when a hidden value is ticked, `RANGE` `lower = max(schema minimum, observed min)` and `upper = observed max`, unknown key labelled with `humanizeKey`; brand filter: one value per `Brand` member in enum order, counts from `brandCounts` (`null` without counts), a 0-count unticked brand disabled, a ticked brand never disabled
- [X] T011 [P] [US1] Unit tests in `tests/unit/catalog/active-filters.test.ts` for `describeActiveFilters`: one pill per keyword, category, brand, price range, attribute value and numeric range; French labels (« Processeur : AMD Ryzen 7 », « Mémoire vive : 16 – 32 Go », « Prix : 500 – 1 500 € »); `removeHref` equals `buildSearchUrl` without that filter; removing the category also drops its attribute filters (FR-011); « Tout effacer » href keeps only the keyword (FR-009)
- [X] T012 [P] [US1] Update `tests/unit/catalog/facets.test.ts` (schema parsing): a `string` property without `enum` now yields a `FacetKind.TEXT` facet instead of being ignored; `enum`, `RANGE` and `BOOLEAN` cases unchanged
- [X] T013 [P] [US1] Component tests in `tests/unit/catalog/Filters.test.tsx` (with jest-axe): brand checkboxes show their count and a 0-count brand is disabled; text facet renders checkboxes with counts « (12) », a 0-count unticked value is disabled, extra values sit inside a `<details>` « Voir tout (n) » that is open when a hidden value is ticked, range inputs carry `min` / `max` from the facet and a bounds hint, a facets-unavailable notice is shown for `UNAVAILABLE`; no axe violation
- [X] T014 [P] [US1] E2E `tests/e2e/catalog-filters.spec.ts` against the real stack: COMPUTER shows Processeur, Carte graphique, Système, Type d'écran, Mémoire vive, Stockage and no Connectique; ticking two processors filters the grid and shows two pills; removing one pill; « Tout effacer » keeps the keyword; reload and shared URL keep the state; « Voir tout » on Carte graphique; the same journey with `javaScriptEnabled: false`; out-of-bounds RAM is refused on the field; counts asserted only when the facets endpoint answers (otherwise the test checks their absence); SC-002: from `/`, reaching computers filtered on one processor and one display type takes at most 4 user actions (counted in the test)

### Implementation for User Story 1

- [X] T015 [P] [US1] Create `lib/schemas/facets.ts`: `FacetValueSchema` (`value: string min 1`, `count: int ≥ 0`), `RangeFacetSchema` (`min`, `max`: `number | null`), `ProductFacetsResponseSchema` (data-model §1), and the `FacetData` type with `source: FacetSource`, `hasCounts`, `totalHits: number | null`, `values: Record<string, { value: string; count: number | null }[]>`, `ranges: Record<string, { min: number | null; max: number | null }>` (data-model §2)
- [X] T016 [US1] Extend `parseCategorySchema` in `lib/schemas/category.ts` so a `string` property without `enum` returns `{ kind: FacetKind.TEXT, key, label }` (add the variant to `CategoryFacet`), keeping the exhaustive `switch`
- [X] T017 [US1] Create `lib/api/endpoints/facets.ts` (`server-only`, child logger `catalog.facets`): `getFacets(filters)` → `POST BACKEND_PATHS.productFacets` with the search body minus `page`/`size`, cache `{ revalidate: PRODUCTS_REVALIDATE_SECONDS, tags: [PRODUCTS_CACHE_TAG] }`, Zod validation, normalisation to `FacetData`; on 404 / error / invalid payload → `getFallbackFacets(category)` (scan `size: FACET_FALLBACK_SCAN_SIZE`, cache `FACETS_FALLBACK_REVALIDATE_SECONDS`, **response validated with the existing paged product schema (`lib/schemas/paged.ts` + `ProductSchema`) like `searchProducts`, constitution V**, distinct values capped to `FACET_MAX_VALUES`, `warn` if `totalElements > FACET_FALLBACK_SCAN_SIZE`); fallback error or non-conforming fallback response → `UNAVAILABLE` with an `error` log; `brandCounts` mapped from `brands` (`z.enum(Brand)` per value, unknown brands skipped with a `warn`); the « facets endpoint missing » warning logged once per process; every call logged with source and duration (`@see` contracts/bff-routes.md §3, research R1)
- [X] T018 [US1] Create `features/catalog/filter-facets.ts` with `buildFilterFacets(schema: ParsedCategorySchema, data: FacetData, filters: SearchFilters): readonly FilterFacet[]`, `buildBrandFilter(data: FacetData, filters: SearchFilters): BrandFilter` and the `FilterFacet` / `FilterValue` / `BrandFilter` types exactly as data-model §3 (exclusion through `FILTER_EXCLUDED_ATTRIBUTES`, ordering, disabled and appended ticked values, visible count, range bounds), split into small functions (≤ 40 lines each)
- [X] T019 [US1] Create `features/catalog/active-filters.ts` with `describeActiveFilters(filters, facets): readonly ActiveFilter[]` and `clearAllHref(filters)` (data-model §4), reusing `buildSearchUrl` and `formatPrice`
- [X] T020 [P] [US1] Add to `features/catalog/messages.ts`: value count `(n)`, « Voir tout (n) », « Voir moins » (summary when open), bounds hint (« de 8 à 64 Go »), out-of-range message, facets-unavailable notice (« Certains filtres sont momentanément indisponibles. »), pill labels and their remove `aria-label` (« Retirer le filtre Processeur : AMD Ryzen 7 »), « Tout effacer », active filters region label
- [X] T021 [US1] Update `features/catalog/components/FacetFieldset.tsx`: render `TEXT` and `ENUM` facets from `FilterValue[]` (label + count, `disabled` when `isDisabled`), the first `visibleCount` values then a native `<details open={isExpanded}>` for the rest; `RANGE` inputs with `min={lower}`, `max={upper}`, bounds hint linked by `aria-describedby`, native validation messages set from messages.ts; keep each component ≤ 80 lines
- [X] T022 [US1] Update `features/catalog/components/Filters.tsx` to take `facets: readonly FilterFacet[]`, `brandFilter: BrandFilter` and `facetSource: FacetSource`; `BrandFieldset` renders each brand with its count « (n) » and `disabled` when `isDisabled`, keeping the enum order and the two columns; render the unavailable notice for `UNAVAILABLE`, keep the existing instant-apply behaviour and the no-JS submit button
- [X] T023 [P] [US1] Create `features/catalog/components/ActiveFilters.tsx` (Server Component): list of pill links (`removeHref`) with a visible « × » and an explicit `aria-label`, « Tout effacer » link, nothing rendered without active filter; pill style from theme tokens
- [X] T024 [US1] Update `app/(shop)/products/page.tsx`: load `getFacets(filters)` in parallel with `searchProducts(filters)` and the category schema, build facets with `buildFilterFacets` and the brand filter with `buildBrandFilter`, render `ActiveFilters` above the results next to the existing `aria-live` result count, pass facets and source to `Filters`
- [X] T025 [US1] Run `tests/e2e/catalog-filters.spec.ts` and the existing `tests/e2e/catalog.spec.ts` (`--workers=1`) against the real backend; fill quickstart §5 for scenarios 1–9 (OK / KO / non testable, with the facets source observed); commit `feat(catalog): filter on every category attribute with counts and active-filter pills`

**Checkpoint**: User Story 1 is fully functional and testable on its own.

---

## Phase 4: User Story 2 - Comparer 2 ou 3 produits (Priority: P1)

**Goal**: Select 2 or 3 products of one category from the catalog cards or the product page, see them in a bottom bar, open a large modal with aligned characteristics.

**Independent Test**: tick two computers on page 1 and a third on page 2, open the comparison and read each characteristic on one line with one value per product (quickstart scenarios 10–17).

### Tests for User Story 2 ⚠️

- [X] T026 [P] [US2] Unit tests in `tests/unit/compare/selection.test.ts` for `features/compare/selection.ts` on an in-memory `Storage`: transitions of data-model §5 (`add` creates / appends / refuses `FULL` / refuses `OTHER_CATEGORY`, `remove` down to an empty selection deletes the key, `clear`), « at most `COMPARE_MAX_PRODUCTS` (3), no duplicates, insertion order », invalid stored value (broken JSON, 4 UUIDs, unknown category, invalid UUID) → key removed and empty selection, `COMPARE_CHANGED_EVENT` dispatched on every write
- [X] T027 [P] [US2] Storage schema tests in `tests/unit/schemas/storage.test.ts` for `CompareSelectionSchema`: `category` from `CategoryKey`, `uuids` 1..3 valid UUIDs without duplicates
- [X] T028 [P] [US2] Unit tests in `tests/unit/compare/comparison-view.test.ts` for `buildComparisonView` (MSW for the product and schema endpoints): products in request order, rows in schema order then extra attributes, `null` for a missing value, `differs` true when two values differ or one is missing, connectivity present, unknown UUIDs in `missing`, mixed categories → majority category kept (first product's on a tie) and the others in `missing`, missing schema → `humanizeKey` labels and a `warn` log
- [X] T029 [P] [US2] Route tests in `tests/unit/compare/compare-route.test.ts` for `app/api/compare/route.ts`: 400 `invalid` without backend call for missing, empty, invalid, duplicated or more than 3 UUIDs; 200 `ComparisonView` with `Cache-Control: private, max-age=60`; 503 `unavailable` when the backend is down
- [X] T030 [P] [US2] Component tests with jest-axe in `tests/unit/compare/compare-components.test.tsx`: `CompareToggle` checkbox and button variants (label contains the product name, `aria-disabled` with the reason linked by `aria-describedby` for `FULL` and `OTHER_CATEGORY`, activation while refused announces the reason and does not change the selection); `CompareBar` hidden when empty, invitation with 1 product, « Comparer » visible from 2, remove and « Tout effacer », status region text, **a selected UUID absent from the `/api/products` answer removed from the selection with the removed-product toast as soon as the bar loads (modal not opened)**; `CompareTable` semantic headers (`th scope="col"` products, `th scope="row"` characteristics), « — » for `null`, differing rows marked by an icon plus hidden text, « Afficher seulement les différences » filtering, message when no row differs; no axe violation
- [X] T031 [P] [US2] E2E `tests/e2e/compare.spec.ts`: tick a computer → bar with invitation; tick a second → « Comparer » appears; tick a third on page 2 → other cards show « 3 produits maximum »; change filters and reload → selection kept; open the modal → 3 columns with image, name, brand, price, availability, add to cart, one row per characteristic including Connectique; « Afficher seulement les différences »; Escape closes and focus returns to « Comparer »; product page of another computer → « Ajouter à la comparaison » toggles to « Retirer de la comparaison »; corrupted `ct_compare_v1` is cleaned silently; a selection holding a well-formed but unknown product UUID loses it on the catalog page with the removed-product message, before any modal is opened; a new page in a new context starts empty; SC-003: comparing 3 products from the catalog takes at most 5 user actions (3 ticks, « Comparer », reading) counted in the test

### Implementation for User Story 2

- [X] T032 [P] [US2] Add `CompareSelectionSchema` to `lib/schemas/storage.ts` (data-model §5: `category: z.enum(CategoryKey)`, `uuids`: 1 to `COMPARE_MAX_PRODUCTS` valid UUIDs, no duplicates)
- [X] T033 [P] [US2] Create `features/compare/messages.ts`: toggle labels (« Comparer {nom} », « Ajouter à la comparaison », « Retirer de la comparaison »), refusal reasons (« Tu ne peux comparer que des produits de la même catégorie. », « 3 produits maximum : retire un produit pour en ajouter un autre. »), bar texts (invitation « Choisis un autre produit à comparer. », count, « Comparer », « Tout effacer », remove `aria-label`), modal title and close label, « Afficher seulement les différences », « Aucune différence entre ces produits. », « valeurs différentes » (hidden text), « — » placeholder, removed-product message (« Un produit de ta comparaison n'est plus disponible, on l'a retiré. »), loading and error texts
- [X] T034 [US2] Create `features/compare/selection.ts`: pure functions on a `Storage` (`readCompareSelection`, `addToComparison(storage, uuid, category): CompareResult`, `removeFromComparison`, `clearComparison`, `canAdd(selection, uuid, category): CompareRefusal | null`), Zod validation on every read with silent cleanup, `COMPARE_CHANGED_EVENT = "ct:compare-changed"` dispatched after each write (research R8)
- [X] T035 [US2] Create `features/compare/hooks/useCompareSelection.ts`: `useSyncExternalStore` over `sessionStorage` + `COMPARE_CHANGED_EVENT` + `storage` event, server snapshot = empty selection, returns the selection and bound actions; `try/catch` around storage access (private mode) falling back to an empty selection
- [X] T036 [US2] Create `lib/api/compare.ts` (`server-only`, child logger `compare.view`): `buildComparisonView(uuids): Promise<ComparisonView>` using `getProductByUuid` (catalog cache) and `getCategorySchema`, rows via `formatSpecValue` and the schema order, `differs`, `missing`, mixed-category rule (data-model §6); log requested / found / missing counts and category, UUIDs masked
- [X] T037 [US2] Create `app/api/compare/route.ts`: `GET` validating `uuids` with `readUuidListParam` + `uuidListSchema(COMPARE_MAX_PRODUCTS)` and a no-duplicate check, `jsonOk(view)` with `Cache-Control: private, max-age=60`, errors through `jsonError` (contracts/bff-routes.md §1)
- [X] T038 [P] [US2] Create `features/compare/hooks/useComparison.ts`: TanStack Query on `BFF_ROUTES.compare` keyed `["compare", ...uuids]`, `staleTime: COMPARE_QUERY_STALE_TIME_MS`, enabled only when the modal is open; when `missing` is not empty, remove those UUIDs from the selection and show the removed-product toast (sonner) once (second safety net: the bar already removes them on load, T040)
- [X] T039 [US2] Create `features/compare/components/CompareToggle.tsx` (client): variants `checkbox` (card) and `button` (product page), props `productUuid`, `productName`, `category`; `aria-disabled` + reason in a tooltip shown on hover / focus and linked by `aria-describedby` (research R9); positioned above the card link overlay (`relative z-10`, Tailwind's standard z-index scale as in `Header.tsx`, no arbitrary value)
- [X] T040 [US2] Create `features/compare/components/CompareBar.tsx` (client): fixed at the bottom within the site width, `z-30` (below the header `z-40` and the dialog `z-50`), thumbnails from `GET /api/products?uuids=` (existing route, unknown UUIDs omitted); **as soon as that answer arrives, every selected UUID it does not contain is removed from the selection and the removed-product toast is shown once (FR-021, US2 scenario 9), so the cleanup happens on the catalog and product pages without opening the modal**; remove buttons, « Tout effacer », « Comparer » from `COMPARE_MIN_PRODUCTS`, `role="status"` region announcing changes, a bottom spacer so the pagination is never hidden, renders nothing when the selection is empty; opens `CompareDialog`
- [X] T041 [US2] Create `features/compare/components/CompareTable.tsx`: header row per product (image with `next/image` and explicit sizes, name linking to the product page, brand, price with `formatPrice`, `AvailabilityBadge`, `AddToCartButton`), one `<tr>` per `ComparisonRow` with `th scope="row"`, « — » for `null`, differing rows with an icon and hidden « valeurs différentes » text, horizontal scroll inside the modal only; « differences only » filtering via a prop
- [X] T042 [US2] Create `features/compare/components/CompareDialog.tsx`: large `Dialog` from `components/ui/dialog.tsx` with title and close button, `Switch` « Afficher seulement les différences », loading skeleton (`skeleton-shimmer`), error state with « Réessayer », empty-differences message, focus returned to the « Comparer » button on close (Radix default, asserted in T030)
- [X] T043 [US2] Add a `comparable?: boolean` prop to `features/catalog/components/ProductCard.tsx` rendering `CompareToggle` (checkbox) only when true; pass `comparable` from `features/catalog/components/ProductGrid.tsx` only for the catalog results in `app/(shop)/products/page.tsx` (home and similar products unchanged, FR-013)
- [X] T044 [US2] Render `CompareBar` in `app/(shop)/products/page.tsx` and in `app/(shop)/products/[uuid]/page.tsx`, and `CompareToggle` (button variant) in the product summary of `app/(shop)/products/[uuid]/page.tsx` with the product category from `toCategoryKey(product.category)`
- [X] T045 [US2] Run `tests/e2e/compare.spec.ts` and the existing `tests/e2e/catalog.spec.ts` and `tests/e2e/cart.spec.ts` (`--workers=1`); fill quickstart §5 for scenarios 10–17; commit `feat(compare): compare 2 to 3 products of one category in a modal`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Une barre de navigation cohérente partout (Priority: P2)

**Goal**: One header on every page with Accueil, Catalogue, Ordinateurs, Écrans, the current section marked visually and with `aria-current`, search, preferences, account and cart; skip link first.

**Independent Test**: keyboard-only walk through home, catalog, Ordinateurs, a computer page, cart, register and login (quickstart scenarios 18–19).

### Tests for User Story 3 ⚠️

- [X] T046 [P] [US3] Unit tests in `tests/unit/layout/nav-section.test.ts` for `resolveNavSection(pathname, searchParams, productCategory)` covering every row of data-model §7 (`/` → `HOME`, `/products?category=COMPUTER` → `COMPUTER`, `MONITOR`, `/products` → `CATALOG`, product page with and without published category, `/cart`, `/register`, `/login` → `NONE`)
- [X] T047 [P] [US3] Component tests with jest-axe in `tests/unit/layout/main-nav.test.tsx`: four links in the order Accueil, Catalogue, Ordinateurs, Écrans with category hrefs, exactly one `aria-current="page"` matching the mocked pathname / search params, current marker not conveyed by colour only (presence of the underline element), `NavSectionMarker` updating the current section; no axe violation
- [X] T048 [P] [US3] E2E `tests/e2e/navigation.spec.ts`: on `/`, `/products`, `/products?category=COMPUTER`, a computer page, `/cart`, `/register` and `/login` the header shows the same links in the same order; `aria-current` on the expected link (Ordinateurs on a computer page); first Tab focuses « Aller au contenu » and activating it moves focus into `main`; every header control reachable with Tab

### Implementation for User Story 3

- [X] T049 [P] [US3] Add navigation labels to `SITE_MESSAGES` in `features/common/messages.ts` (« Accueil », « Catalogue », « Ordinateurs », « Écrans ») reusing `CATEGORY_LABELS` wording, and a « page actuelle » hidden suffix if needed
- [X] T050 [P] [US3] Create `components/layout/nav-section.ts` with `resolveNavSection` (exhaustive `switch` on `NavSection` with `assertNever`) and a tiny external store `publishNavCategory(category | null)` / `useNavCategory()` (`useSyncExternalStore`)
- [X] T051 [US3] Create `components/layout/MainNav.tsx` (client): links from a typed list (section, href, label), `usePathname()` + `useSearchParams()` + `useNavCategory()` → `aria-current="page"` and a gold underline indicator from theme tokens; identical hover / focus-visible states for every link
- [X] T052 [P] [US3] Create `components/layout/NavSectionMarker.tsx` (client, renders nothing): publishes the product category on mount and clears it on unmount
- [X] T053 [US3] Update `components/layout/Header.tsx`: replace the single catalog link with `<Suspense fallback={static links without aria-current}><MainNav /></Suspense>`, harmonise spacing, icon sizes and button heights of search, preferences, account and cart with shared theme tokens; render `NavSectionMarker` in `app/(shop)/products/[uuid]/page.tsx`; check that `SkipLink` in `app/layout.tsx` stays the first focusable element (no new skip link)
- [X] T054 [US3] Run `tests/e2e/navigation.spec.ts` plus `tests/e2e/auth.spec.ts` and `tests/e2e/preferences.spec.ts` (header changed); fill quickstart §5 scenarios 18–19; commit `feat(layout): one navigation bar with the current section on every page`

**Checkpoint**: User Stories 1, 2 and 3 work independently.

---

## Phase 6: User Story 4 - Un accueil et un catalogue qui se ressemblent (Priority: P3)

**Goal**: Home and catalog share the same page template, headings, cards, empty state and skeletons; the home page shows category tiles with real product counts and links to the pre-filtered catalog.

**Independent Test**: home and catalog side by side (same width, margins, title style, cards); one click from a home tile to the filtered catalog (quickstart scenario 20).

### Tests for User Story 4 ⚠️

- [X] T055 [P] [US4] Component tests with jest-axe in `tests/unit/layout/page-shell.test.tsx`: `PageHeader` with and without breadcrumb (one `h1`, subtitle, actions slot), `SectionHeading` (`h2` with id for `aria-labelledby`), `EmptyState` (illustration, sentence, action link); no axe violation
- [X] T056 [P] [US4] Component tests in `tests/unit/catalog/CategoryTiles.test.tsx`: one tile per `CategoryKey` linking to `/products?category=…`, real count « 531 produits », « Aucun produit pour l'instant » at 0, no count when the value is `null`
- [X] T057 [P] [US4] E2E `tests/e2e/home.spec.ts`: home and catalog main containers have the same computed width and horizontal padding; same heading classes; clicking the « Ordinateurs » tile lands on `/products?category=COMPUTER`; when `GET /api/v1/services/discounts/active` (read first by the test) returns only `NO_DISCOUNT`, no offer block is rendered

### Implementation for User Story 4

- [X] T058 [P] [US4] Create `components/layout/PageShell.tsx` (width `max-w-site`, horizontal padding and vertical rhythm from theme tokens, one place for both pages) and `components/layout/SectionHeading.tsx`
- [X] T059 [P] [US4] Create `components/layout/PageHeader.tsx`: optional breadcrumb slot, `LiveTitle` title, subtitle, optional actions, `aria-live` slot for the result count
- [X] T060 [P] [US4] Create `components/layout/EmptyState.tsx` (`StateIllustration` + sentence + optional action) and replace `EmptyResults` in `app/(shop)/products/page.tsx` with it; create `features/catalog/components/ProductCardSkeleton.tsx` (same dimensions as `ProductCard`, `skeleton-shimmer`, `aria-hidden`) and a `ProductGridSkeleton` (n cards in the 3-column grid) used by every client-loaded product list: `RecentlyViewed` while loading and the `CompareBar` thumbnails (FR-028 « mêmes squelettes »), with a component test in `tests/unit/layout/page-shell.test.tsx`
- [X] T061 [US4] Add `getCategoryCounts(): Promise<Record<CategoryKey, number | null>>` to `lib/api/endpoints/facets.ts` (one `getFacets({ category })` per category, `totalHits`, `null` when `UNAVAILABLE`) with a unit test case in `tests/unit/catalog/facets-endpoint.test.ts`
- [X] T062 [P] [US4] Create `features/catalog/components/CategoryTiles.tsx` (glass cards with `TiltCard`, category label from `CATEGORY_LABELS`, count text from messages.ts) and add its texts plus the home subtitle and catalog breadcrumb labels to `features/catalog/messages.ts`
- [X] T063 [US4] Rework `app/(shop)/page.tsx` with `PageShell`, `PageHeader` (greeting as live title, no breadcrumb), `CategoryTiles`, `DiscountBanner` only when a campaign is active, `RecentlyViewed`, best sellers under `SectionHeading`, `EmptyState` when there is no best seller
- [X] T064 [US4] Rework `app/(shop)/products/page.tsx` with `PageShell` and `PageHeader` (breadcrumb Accueil › Catalogue › catégorie, title, result count in the live slot), same `SectionHeading` and `EmptyState` as the home page; filters column and 3-column grid unchanged
- [X] T065 [US4] Run `tests/e2e/home.spec.ts` and `tests/e2e/catalog.spec.ts`; fill quickstart §5 scenario 20; commit `feat(layout): shared page template for home and catalog`

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Interface vivante et cohérente

**Purpose**: `docs/speckit-prompts-lot2.md` §6 applied to the home page, the catalog, the header and the comparator. Use the **frontend-design** skill and the « Aurora Glow » annex of `specs/001-catalog-auth-cart/spec.md`.

- [X] T066 Visual audit: screenshots with `tests/e2e/support/capture-screens.ts` of home, catalog (empty, filtered, no result, facets unavailable), comparison bar (1 and 3 products), comparison modal, product page with the compare button, header on each page, guest and signed-in, into `specs/002-catalog-refresh/screenshots/audit/`; list in `specs/002-catalog-refresh/quickstart.md` §5 what « fait vide » and what is inconsistent (spacing, radii, headings, buttons, widths)
- [X] T067 Fill without inventing: fix the audit findings with real data only (best sellers, offer, recently viewed, category counts, result count), nothing fictitious
- [X] T068 Consistency pass: same page headers, glass cards, primary CTA (gradient + `MagneticButton`), `EmptyState`, `skeleton-shimmer` skeletons and content width on home, catalog and product page; header controls aligned
- [X] T069 [P] One orchestrated animation per surface, all reading `useMotionTokens()` / `useEffectiveEffects()` with a static version: results grid and home sections cascade (`RevealGroup`), compare bar slides up, modal fades and scales in, pills fade, and in the header the current-section underline slides from one link to the next (shared layout animation, plain swap when effects are reduced); nothing else animated (FR-031)
- [X] T070 [P] Signature effects where they make sense: `TiltCard` on category tiles and comparison header cards, magnifier not added (no gallery in the modal)
- [X] T071 [P] Micro-interactions: ticked compare checkbox animated check, « Comparer » button with loading state while the view loads, optional `useUiSound` on adding to the comparison
- [X] T072 [P] Effect-level tests in `tests/unit/effects/compare-effects-levels.test.tsx` (same pattern as `tests/unit/effects/effects-levels.test.tsx`): compare bar, modal, pills and the header underline for each effect level and with `prefers-reduced-motion` (fade only, no transform)
- [X] T073 Extend `tests/e2e/a11y.spec.ts` (helper waits for fades) to the home page, the filtered catalog, the comparison modal open and the product page with the compare button: 0 `serious` / `critical` violation
- [X] T074 Extend `tests/e2e/long-tasks.spec.ts` to the catalog with three products selected and the modal opened and closed: no task > 50 ms due to the effects
- [X] T075 Lighthouse desktop on a production build (`NEXT_DIST_DIR=.next-prod npx next build`, `NEXT_DIST_DIR=.next-prod npx next start -p 3124`): `/` and `/products?category=COMPUTER`; LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms; results in `specs/002-catalog-refresh/quickstart.md` §4–5
- [X] T076 « After » screenshots of the same pages as T002 into `specs/002-catalog-refresh/screenshots/after/`; checkpoint with the user (before / after)

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T077 [P] Update `docs/backend/api-map.md`: §3 `POST /product/search/facets` (contract, cap 50, disjunctive counts) once committed on the backend side, §F facets row marked done; also record the other endpoints delivered by the backend (order price breakdown, shipping options, quote, `place/auto` removed) for feature 003
- [X] T078 [P] TSDoc and constants audit of every file touched by the feature (no magic value, no raw visual value, `@see` to spec / contract / backend file), fixing what `npm run lint` does not catch
- [X] T079 Full run: `npm run typecheck`, `npm run lint`, `npm run test`, then every Playwright spec one by one (`--workers=1`, one-minute pause between specs that create accounts); complete `specs/002-catalog-refresh/quickstart.md` §5 with the date, counts and remaining manual points (MONITOR scenarios if still not indexed)
- [X] T080 Final commit `docs: wrap up feature 002` and checkpoint with the user (in French)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: after Setup — blocks every story
- **US1 (Phase 3)**: after Foundational
- **US2 (Phase 4)**: after Foundational; independent of US1 (touches `ProductCard` and the catalog page too: if US1 is not merged yet, rebase the page change)
- **US3 (Phase 5)**: after Foundational; independent of US1 and US2 (only `NavSectionMarker` touches the product page)
- **US4 (Phase 6)**: after Foundational; best after US1 (catalog page header holds the pills and the result count) and uses `getFacets` from T017 for the category counts
- **Interface vivante (Phase 7)**: after the stories it decorates
- **Polish (Phase 8)**: last

### Within Each User Story

- Tests first (must fail) → schemas → server code (endpoints, view builders, routes) → hooks → components → pages → e2e run, quickstart update and commit

### Parallel Opportunities

- Foundational: T003–T006 in parallel, then T007
- US1: T008–T014 tests in parallel; T015 and T020 in parallel; T023 in parallel with T021–T022
- US2: T026–T031 tests in parallel; T032 and T033 in parallel; T038 in parallel with T039–T042
- US3: T046–T048 tests in parallel; T049, T050, T052 in parallel
- US4: T055–T057 tests in parallel; T058–T060 and T062 in parallel
- Phase 7: T069–T072 in parallel after T066–T068

---

## Parallel Example: User Story 1

```bash
# Tests first, together:
Task: "Schema tests tests/unit/schemas/facets.test.ts"
Task: "Endpoint tests tests/unit/catalog/facets-endpoint.test.ts"
Task: "Unit tests tests/unit/catalog/filter-facets.test.ts"
Task: "Unit tests tests/unit/catalog/active-filters.test.ts"
Task: "Component tests tests/unit/catalog/Filters.test.tsx"
Task: "E2E tests/e2e/catalog-filters.spec.ts"

# Then, together:
Task: "Create lib/schemas/facets.ts"
Task: "Add facet texts to features/catalog/messages.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Unit tests tests/unit/compare/selection.test.ts"
Task: "Unit tests tests/unit/compare/comparison-view.test.ts"
Task: "Route tests tests/unit/compare/compare-route.test.ts"
Task: "Component tests tests/unit/compare/compare-components.test.tsx"
Task: "E2E tests/e2e/compare.spec.ts"
Task: "Create features/compare/messages.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **STOP and VALIDATE** (quickstart scenarios 1–9, `catalog-filters.spec.ts`)
3. Demo: every characteristic filterable, with counts if the backend endpoint is live

### Incremental Delivery (one story per conversation, commit at the end of each)

1. Setup + Foundational
2. US1 → attribute filters (MVP)
3. US2 → comparator
4. US3 → navigation bar
5. US4 → shared template for home and catalog
6. Phase 7 → « Interface vivante et cohérente », before / after screenshots
7. Phase 8 → docs, full run, wrap-up

---

## Notes

- [P] tasks = different files, no dependency on incomplete tasks
- Verification method of `CLAUDE.md` and memory « local-env-quirks »: reuse the user's `next dev` on port 3000 if it runs, otherwise start one and stop only that PID; never kill other processes
- MONITOR products are missing from the local search index (2026-10-13): MONITOR scenarios are reported « non testable » until the backend reindexes, not simulated
- UI tasks (T021–T023, T039–T042, T051, T053, T058–T064, Phase 7) are implemented with the **frontend-design** skill and the « Aurora Glow » annex as reference
