---

description: "Task list for feature 004 — five categories, catalog menu, home carousel, promotions and reviews"
---

# Tasks: Catalogue élargi, promotions et avis

**Input**: Design documents from `specs/004-catalog-promos-reviews/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R11), data-model.md, contracts/bff-routes.md, quickstart.md

**Tests**: REQUIRED — constitution principle VII (« un comportement sans test n'est pas terminé »). Unit tests (Vitest + Testing Library + MSW + jest-axe) and Playwright journeys are included per story, written first and failing before the implementation.

**Organization**: Tasks are grouped by user story in priority order (US1 categories P1, US2 catalog menu P1, US4 promotions P2, US3 home carousel P2, US5 reviews P2; US4 comes before US3 so that the carousel never links to a missing campaign page), then the polish phase. Each story is implemented, verified against the real backend (`abe674d` or later on 8081), committed, then the work stops for a report in French before the next story.

**Rules applying to EVERY task** (constitution XI–XIII, `CLAUDE.md`):
- Code, comments, TSDoc and logs in **English**; user-facing text in **French** (tutoiement) in `features/*/messages.ts` only.
- No magic number/string: use `lib/constants/*`; closed sets are **string enums** in `lib/enums/*`; Zod built from enums (`z.enum(MyEnum)`); exhaustive `switch` + `assertNever`.
- TSDoc on every export and at the top of every module (`@param`, `@returns`, `@throws`, `@see` to the spec, contract or backend file).
- Server logs via `lib/logger.ts` child loggers only; UUIDs masked with `maskUuid`; **never** log a review comment, an author first name, a form body, a token or a cookie.
- Every visual value comes from `lib/theme/theme.config.ts` through CSS variables / Tailwind tokens; no raw hex, px, ms or arbitrary Tailwind values in `components/` or `features/`; animations read `useMotionTokens()` / `useSurfaceMotion()` and `useEffectiveEffects()` and have a static version; `prefers-reduced-motion` wins.
- No amount is computed by the front (constitution V): campaign benefits and conditions are the backend values, formatted only.
- Reuse existing building blocks: `lib/api/client.ts` (`backendFetch`), `lib/api/bff-response.ts`, `lib/api/bff-client.ts`, `lib/auth/guards.ts` (`requireSession`, `getAccessTokenOrThrow`), `lib/auth/callback-url.ts` (`loginPath`), `lib/api/endpoints/{categories,facets,products,discounts,orders}.ts`, `lib/schemas/{category,discount,paged}.ts`, `features/catalog/search-params.ts` (`buildSearchUrl`), `features/checkout/discount-storage.ts` (`writeDiscountKey`, `readDiscountKey`), `features/checkout/discount-offer.ts`, `features/catalog/reviews.ts`, `features/catalog/components/ProductReviews.tsx`, `components/layout/{PageShell,PageHeader,SectionHeading,EmptyState,MainNav,NavSectionMarker}.tsx`, `components/effects/{StateIllustration,Reveal,Enter,TiltCard,MagneticButton}.tsx`, `components/ui/*` (dialog, radio-group, button), `lib/format.ts` (`formatPrice`, `formatDay`), `tests/e2e/support/*` (`registerUser`, `signIn`, `firstProductPaths`, `expectNoBlockingViolations`).
- A task is done when `npm run typecheck`, `npm run lint` (0 warning) and `npm run test` pass.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 catégories · US2 menu · US3 carrousel · US4 promotions · US5 avis

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Up-to-date API types and the starting state.

- [X] T001 Run `npm run gen:api` against the backend on 8081 (commit `abe674d` or later) to refresh `lib/api/schema.d.ts`; check it contains `ProductCategoryResponseDto`, `ProductReviewsResponseDto`, `PublicReviewDto`, `ReviewableProductDto`, `MyReviewDto`, `PagedModelMyReviewDto` and `category` on `CartItemResponseDto` / `OrderItemResponseDto` (already added to `lib/schemas/cart.ts` and `lib/schemas/order.ts` on 2026-10-21); fix any drift reported by `tests/unit/enums/*.test-d.ts` (new `ErrorCode` values → `lib/enums/error-code.ts` and `lib/api/errors.ts`)
- [X] T002 [P] Capture « before » screenshots (1 440 × 900, default effects) of `/`, `/products`, `/products?category=COMPUTER`, a product page and the header into `specs/004-catalog-promos-reviews/screenshots/before/` with `CAPTURE_DIR=… npx playwright test screenshots --config playwright.capture.config.ts` (verification server on port 3123, `NEXT_DIST_DIR=.next-verify`, afterwards `git checkout -- tsconfig.json` and remove `.next-verify`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Category reference table, navigation sections, routes, constants, error codes, and the photos shared by the promotions and the carousel.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Extend `lib/enums/category-key.ts` to `COMPUTER`, `DESKTOP`, `MONITOR`, `SMARTPHONE`, `SMARTWATCH` (values = backend keys, TSDoc per value, module TSDoc citing `GET /product-category-schemas`, backend `28a15ae`); create `lib/constants/categories.ts` with `CATEGORY_ORDER: readonly CategoryKey[]` = `COMPUTER`, `DESKTOP`, `MONITOR`, `SMARTPHONE`, `SMARTWATCH` (menu, tiles and carousel order) and `CATEGORIES_REVALIDATE_SECONDS = 3_600` (same freshness as the schemas, research R1)
- [X] T004 [P] Update `CATEGORY_LABELS` in `features/catalog/messages.ts` to five entries: « Ordinateurs portables », « Ordinateurs de bureau », « Écrans », « Smartphones », « Montres connectées », and add `GENERIC_CATEGORY_LABEL` « Autres produits »; create `features/catalog/category-icons.ts` with `CATEGORY_ICONS: Readonly<Record<CategoryKey, LucideIcon>>` (`Laptop`, `PcCase`, `Monitor`, `Smartphone`, `Watch`), `GENERIC_CATEGORY_ICON` (`Package`), and `categoryLabel(raw: string): string` / `categoryIcon(raw: string): LucideIcon` that read a raw `ProductResponseDto.category` through `toCategoryKey` and fall back to the generic ones (FR-003)
- [X] T005 [P] Rework `lib/enums/nav-section.ts`: remove `COMPUTER` and `MONITOR`, add `PROMOTIONS = "promotions"` (TSDoc: `/promotions/**`); keep `HOME`, `CATALOG`, `ACCOUNT`, `NONE`
- [X] T006 [P] Add routes to `lib/constants/routes.ts`: `PROMOTIONS_PATH = "/promotions"`, `promotionRoute(key: DiscountKey): string` (`/promotions/{key}`, key URL-encoded), `ACCOUNT_PATHS.reviews = "/account/reviews"`, `accountReviewRoute({ productUuid, orderUuid })` (`/account/reviews?product=…&order=…`); add `BACKEND_PATHS.categoriesActive` (`/product-category-schemas`), `reviewCreate`, `reviewUpdate`, `reviewDelete`, `reviewReviewable`, `reviewMine`, `reviewProduct` to `lib/constants/api.ts` with TSDoc (method, auth, status codes from the OpenAPI)
- [X] T007 [P] Add `REVIEW_REJECTED = "review-rejected"` and `REVIEW_NOT_ALLOWED = "review-not-allowed"` to `FrontErrorCode` in `lib/enums/error-code.ts`; in `lib/api/errors.ts` map `COMMENT_POST_NOT_ALLOWED` → `REVIEW_REJECTED`, `ORDER_NOT_REVIEWABLE` → `REVIEW_NOT_ALLOWED`, `USER_NOT_AUTHOR_OF_REVIEW` → `FORBIDDEN` (previously `UNKNOWN`); add the two codes to every exhaustive `switch` on `FrontErrorCode` (e.g. `features/account/card-errors.ts`, checkout and orders error helpers) and extend the mapping tests in `tests/unit/api/`
- [X] T008 Make every former two-category place compile with five categories: `components/layout/nav-section.ts` (`resolveNavSection` returns `CATALOG` for `/products` and product pages, `PROMOTIONS` for `/promotions` and sub-paths; new exported `resolveNavCategory(searchParams, productCategory): CategoryKey | null` for the menu), `components/layout/MainNav.tsx` (temporarily: Accueil · Catalogue only, the menu comes in US2), `features/catalog/components/ProductImage.tsx` (icon from `categoryIcon`), and update `tests/unit/layout/nav-section.test.ts` (catalog, product page, promotions, account, none) and `tests/e2e/navigation.spec.ts` (bar = « Accueil », « Catalogue »; the « Ordinateurs » / « Écrans » cases are removed, the menu cases come in US2) so that no e2e stays red between phases
- [X] T009 [P] Download 5 category photos and 5 campaign photos (BLACK_FRIDAY, WINTER_SALES, SPRING_SALES, BUY_ONE_GET_ONE_FREE, generic « promotion ») from Unsplash or Pexels (free licences, no readable logo or brand, no merchant-site image), crop to 16:9, 1 920 px wide, JPEG ≤ 300 KB, into `public/images/categories/{computer,desktop,monitor,smartphone,smartwatch}.jpg` and `public/images/promotions/{black-friday,winter-sales,spring-sales,buy-one-get-one-free,generic}.jpg`; add each one (file, author, link, licence) to `docs/credits.md` (FR-011, research R5)
- [X] T010 [P] Add `CAROUSEL_AUTOPLAY_INTERVAL_MS = 6_000` and the carousel cross-fade transition tokens to `lib/theme/theme.config.ts` (exposed like the other motion tokens), `HOME_CAMPAIGN_SLIDES_MAX = 4` (« au plus quatre campagnes », spec Assumptions) to `lib/constants/home.ts`, enums `SlideKind` (`CATEGORY = "category"`, `CAMPAIGN = "campaign"`) and `CarouselPlayback` (`PLAYING = "playing"`, `PAUSED = "paused"`, `DISABLED = "disabled"`) to `lib/enums/home.ts`, `CampaignImageKey` (`BLACK_FRIDAY`, `WINTER_SALES`, `SPRING_SALES`, `BUY_ONE_GET_ONE_FREE`) to `lib/enums/promotions.ts`

**Checkpoint**: `npm run typecheck`, `npm run lint`, `npm run test` pass; the site still runs with the five keys; the ten photos and their credits are in place.

---

## Phase 3: User Story 1 - Toutes les catégories du catalogue (Priority: P1) 🎯 MVP

**Goal**: Every product shows its category name and icon; the catalog filters on each of the five active categories with its own facets and exact count; the home tiles show the active categories with their counts.

**Independent Test**: open the catalog filtered on « Smartphones », see 616 products (value of the day) and the smartphone filters, open a product and read « Smartphones » in the breadcrumb (quickstart §3 US1).

### Tests for User Story 1 ⚠️

- [X] T011 [P] [US1] Unit tests in `tests/unit/catalog/categories.test.ts`: `CATEGORY_LABELS`, `CATEGORY_ICONS` cover every `CategoryKey`; `categoryLabel` / `categoryIcon` for each key and for an unknown key (« Autres produits », `Package`); `CategorySummarySchema` accepts `{ categoryKey: "SMARTWATCH", label: "Smartwatches" }`; `getActiveCategories` with MSW: backend order `COMPUTER, DESKTOP, MONITOR, SMARTPHONE, SMARTWATCH` → `CATEGORY_ORDER`; a missing (inactive) key is absent; an unknown key `TABLET` is ignored and logged once at `warn`; a 503 → full `CATEGORY_ORDER` and a `warn`; nothing else logged
- [X] T012 [P] [US1] Extend `tests/unit/catalog/facets-endpoint.test.ts`: `getCategoryCounts(categories)` calls the facets once per given category and returns `totalHits`, `null` for a failed category without failing the others; `getCategoryPhotos(categories)` same for photos
- [X] T013 [P] [US1] Component tests in `tests/unit/catalog/category-display.test.tsx` (jest-axe): `CategoryTiles` renders one tile per active category in `CATEGORY_ORDER` with its icon, label and count, hides an unknown count, says « aucun produit » for 0; `ProductBreadcrumb`, `ProductCard`, `ProductDetails`, an account cart line, a guest cart line, an order line and a wishlist item show « Montres connectées » for a `SMARTWATCH` product and « Autres produits » for `TABLET` or a `null` order-line category; the catalog category filter (`Filters.tsx`) lists the active categories only
- [X] T014 [P] [US1] E2E `tests/e2e/categories.spec.ts`: for each of the five categories, `/products?category=KEY` shows a count equal to the `totalHits` read from the backend facets in the test (no hard-coded figure) and at least one filter specific to the category (e.g. « NFC » for smartphones); a smartwatch product page shows « Montres connectées » in the breadcrumb; the home page shows five tiles with counts; axe on `/products?category=SMARTPHONE`

### Implementation for User Story 1

- [X] T015 [P] [US1] Add `CategorySummarySchema` (`{ categoryKey: z.string().min(1), label: z.string() }`, `ProductCategoryResponseDto`) and `CategorySummariesSchema = z.array(…)` to `lib/schemas/category.ts`, with a type-level drift test in `tests/unit/schemas/category.test-d.ts` (field names equal to the OpenAPI)
- [X] T016 [US1] Add `getActiveCategories(): Promise<readonly CategoryKey[]>` to `lib/api/endpoints/categories.ts`: `GET /product-category-schemas`, public, `nextCache: { revalidate: CATEGORIES_REVALIDATE_SECONDS, tags: ["categories"] }`; keep the known keys in `CATEGORY_ORDER` order; ignore and `warn` an unknown key (`catalog.categories`, key only); on any error `warn` and return `CATEGORY_ORDER` (research R1)
- [X] T017 [US1] Generalise `getCategoryCounts(categories: readonly CategoryKey[])` in `lib/api/endpoints/facets.ts` and `getCategoryPhotos(categories)` in `lib/api/endpoints/products.ts`: one parallel call per category (`Promise.all`), result `Partial<Record<CategoryKey, …>>`, a failed category gives `null` / `[]` (research R2)
- [X] T018 [US1] Rework `features/catalog/components/CategoryTiles.tsx`: props `categories: readonly CategoryKey[]`, `counts`, `photos`; icon from `CATEGORY_ICONS`; layout fit for five tiles (grid tokens from the theme, no arbitrary values); update `app/(shop)/page.tsx` to load `getActiveCategories()` then counts and photos
- [X] T019 [US1] Use `categoryLabel` / `categoryIcon` wherever a product is shown (FR-003, research R12): `features/catalog/components/{ProductBreadcrumb,CatalogBreadcrumb,ProductCard,ProductDetails}.tsx`, `features/catalog/active-filters.ts`, `lib/api/compare.ts` and the compare table; account cart lines from `AccountCartItem.category`, guest cart lines from the product data they already read, order lines (`features/orders/components`, list, detail, edit) from `OrderItem.category` (`null` → generic), wishlist items from `product.category`; no empty value nor misleading fallback
- [X] T020 [US1] Catalog filter on the five categories: `app/(shop)/products/page.tsx` and `features/catalog/components/Filters.tsx` list the categories returned by `getActiveCategories()` with their labels and counts; `features/catalog/search-params.ts` keeps parsing `?category=` through `toCategoryKey` (an inactive or unknown key falls back to « tout le catalogue »); the facets of each category come from its schema as today (`getCategorySchema`), with the discreet « filtres indisponibles » message when the schema cannot be read (edge case)
- [X] T021 [US1] Run `categories.spec.ts`, `catalog.spec.ts`, `catalog-filters.spec.ts`, `product-page.spec.ts`, `compare.spec.ts` (`--workers=1`), capture `specs/004-catalog-promos-reviews/screenshots/us1/` (home tiles, catalog per category, smartwatch product page) and review them; Lighthouse desktop on a production build for `/`, `/products?category=SMARTPHONE` and a smartphone product page (LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms, constitution IX); fill quickstart §5 US1 (date, backend commit, counts, results of rows 1–5 bis); commit `feat(catalog): five categories with names, icons and filters`; stop and report in French

**Checkpoint**: the five categories are browsable and labelled everywhere.

---

## Phase 4: User Story 2 - Menu déroulant « Catalogue » (Priority: P1)

**Goal**: « Catalogue » in the header opens a panel listing « Tout le catalogue » and the active categories, usable with mouse and keyboard; the « Ordinateurs » / « Écrans » links are gone.

**Independent Test**: from any page, hover « Catalogue », choose « Montres connectées », land on the filtered catalog; redo it with the keyboard only (quickstart §3 US2).

### Tests for User Story 2 ⚠️

- [ ] T022 [P] [US2] Component tests in `tests/unit/layout/catalog-menu.test.tsx` (jest-axe): the trigger « Catalogue » has `aria-expanded`; click opens the panel with « Tout le catalogue » then the categories in order (icon, name, count when known, no count when `null`); Escape closes it and returns focus to the trigger; Tab reaches each link; the current category link has `aria-current="page"`; with effects off or reduced, the panel renders without motion props (one test per effect level, `tests/unit/effects/` helpers)
- [ ] T023 [P] [US2] Extend `tests/e2e/navigation.spec.ts`: the bar shows « Accueil », « Catalogue » (no « Ordinateurs » / « Écrans »); hover then click « Montres connectées » → `/products?category=SMARTWATCH`; keyboard only: Tab to « Catalogue », Enter, Tab to « Smartphones », Enter → filtered catalog; Escape closes and focus is back on « Catalogue »; on a smartphone product page « Catalogue » is current and « Smartphones » marked in the panel

### Implementation for User Story 2

- [ ] T024 [P] [US2] Add the menu texts to `features/common/messages.ts` (or `features/catalog/messages.ts`): « Catalogue », « Tout le catalogue », count label (« 616 produits », singular / plural), panel name for screen readers
- [ ] T025 [US2] Create `components/layout/CatalogMenu.tsx` (`"use client"`) with `NavigationMenu` from `radix-ui` (research R3): trigger « Catalogue » (current when `resolveNavSection` gives `CATALOG`), content « Tout le catalogue » + one `Link` per active category (`buildSearchUrl({ ...EMPTY_SEARCH_FILTERS, category })`, icon from `CATEGORY_ICONS`, count), current category from `resolveNavCategory` with `aria-current="page"`; opening animation through `useSurfaceMotion()` / `useMotionTokens()`, static when effects are reduced, off or `prefers-reduced-motion`; surface, radius, shadow and spacing from theme tokens (same look as the account menu)
- [ ] T026 [US2] Wire it: `components/layout/Header.tsx` (server) loads `getActiveCategories()` and `getCategoryCounts()` (cached) and passes them to `MainNav`; `components/layout/MainNav.tsx` renders Accueil · `CatalogMenu` and keeps the gold underline on the current section (`aria-current`), static fallback for `Suspense` unchanged; remove the « Ordinateurs » / « Écrans » links and `categoryHref`
- [ ] T027 [US2] Run `navigation.spec.ts`, `a11y.spec.ts` (header on every page), `home.spec.ts`; Lighthouse desktop on `/`, `/products` and a product page (the header changed on every page, constitution IX); capture `specs/004-catalog-promos-reviews/screenshots/us2/` (menu closed, open, current category, keyboard focus) and review; fill quickstart §5 US2 (rows 6–9); commit `feat(nav): catalog dropdown with every category`; stop and report

**Checkpoint**: every category is reachable in two interactions from any page (SC-001).

---

## Phase 5: User Story 4 - Promotions (Priority: P2)

**Goal**: `/promotions` lists the active campaigns; each campaign has its page with benefit, conditions and « Appliquer à mon panier »; « Promotions » is in the header.

**Independent Test**: open « Promotions », see BLACK_FRIDAY, open its page, click « Appliquer à mon panier », go to the cart and read « Réduction choisie : BLACK_FRIDAY » (quickstart §3 US4).

### Tests for User Story 4 ⚠️

- [ ] T028 [P] [US4] Component tests in `tests/unit/promotions/promotions-pages.test.tsx` (jest-axe): `CampaignCard` shows image, name, benefit, conditions and links to its page; the list hides `NO_DISCOUNT`; empty state (`StateIllustration`) with « Parcourir le catalogue » when there is no campaign; `CampaignDetail` shows benefit, minimum, cap, end date or « Sans date de fin », « Appliquer à mon panier » and « Voir le catalogue »
- [ ] T029 [P] [US4] Tests in `tests/unit/promotions/apply-campaign.test.tsx`: signed in → `writeDiscountKey` called with the key, `APPLIED` announced in a polite live region with a link to the cart; visitor → key stored, `SIGN_IN_NEEDED` message with « Me connecter » linking to `loginPath(CART_PATH)`; storage throwing → `STORAGE_UNAVAILABLE` message; never an amount; a campaign that expired meanwhile is refused later by the cart quote (existing 003 behaviour, not re-tested here)
- [ ] T030 [P] [US4] E2E `tests/e2e/promotions.spec.ts`: header « Promotions » → `/promotions` (current section), BLACK_FRIDAY listed with « −20 % »; its page; signed in (registered user): « Appliquer à mon panier » → `/cart` shows « Réduction choisie : BLACK_FRIDAY »; visitor: the key is kept and after sign-in the cart offers it; `/promotions/INCONNUE` → « campagne introuvable ou terminée » with a link back; axe on both pages

### Implementation for User Story 4

- [ ] T031 [P] [US4] Add `ApplyCampaignOutcome` (`APPLIED = "applied"`, `SIGN_IN_NEEDED = "sign-in-needed"`, `STORAGE_UNAVAILABLE = "storage-unavailable"`) to `lib/enums/promotions.ts` and complete `features/promotions/messages.ts` (page titles and subtitles, empty state, not-found state, apply outcomes, `CAMPAIGN_NAMES` for the four known keys, image alts)
- [ ] T032 [US4] Create `features/home/slide-images.ts` (`CATEGORY_IMAGES: Readonly<Record<CategoryKey, StaticImageData>>` from static imports) and `features/promotions/campaign-images.ts` (`CAMPAIGN_IMAGES: Readonly<Record<CampaignImageKey, StaticImageData>>`, `GENERIC_CAMPAIGN_IMAGE`, `campaignImage(key: string)`); the home slides reuse both in US3
- [ ] T033 [US4] Create `features/promotions/campaign-view.ts` with `toCampaignView(discount: ActiveDiscount): CampaignView` (data-model §4: `name` from `CAMPAIGN_NAMES` or the key formatted, `benefit` « −20 % » / « −10,00 € » / « 1 acheté = 1 offert » with an exhaustive `switch` on `DiscountCalculationType` (`NONE` never shown), `conditions` minimum, cap, end date or « Sans date de fin », amounts formatted with `formatPrice`, never computed) and the texts in `features/promotions/messages.ts`; unit tests in `tests/unit/promotions/campaign-view.test.ts` (each type, each condition present / absent) — reused by the carousel in US3
- [ ] T034 [US4] Create `features/promotions/components/CampaignCard.tsx` and `CampaignDetail.tsx` (server components, glass card, `TiltCard` on the image at full effects only, theme tokens) and `ApplyCampaignButton.tsx` (`"use client"`, session from `useSession`, `writeDiscountKey(window.sessionStorage, key)`, outcome announced, loading state, `MagneticButton` like the other primary CTAs)
- [ ] T035 [US4] Create `app/(shop)/promotions/page.tsx` (`PageShell`, `PageHeader` with breadcrumb and `LiveTitle`, campaigns from `getActiveDiscounts()` → `toCampaignView`, `RevealGroup` cascade, empty state; metadata in French) and `app/(shop)/promotions/[key]/page.tsx` + `not-found.tsx` (key validated with `DiscountKeySchema`; unknown or inactive → `notFound()`; metadata with the campaign name)
- [ ] T036 [US4] Add « Promotions » to `components/layout/MainNav.tsx` after `CatalogMenu`, current when `resolveNavSection` gives `PROMOTIONS` (FR-006); the carousel (US3, next) will link its campaign slides to these pages
- [ ] T037 [US4] Run `promotions.spec.ts`, `discount.spec.ts` (non-regression of the discount block), `navigation.spec.ts`, `a11y.spec.ts`; Lighthouse on `/promotions`; capture `screenshots/us4/` (list, campaign page, applied, visitor, not found, empty if reproducible) and review; fill quickstart §5 US4 (rows 16–20); commit `feat(promotions): campaigns page and apply to cart`; stop and report

**Checkpoint**: a visitor reaches a campaign from the header and applies it in one click (SC-005 is completed by the carousel in US3: one click from the home page).

---

## Phase 6: User Story 3 - Carrousel d'accueil (Priority: P2)

**Goal**: The home page opens on an accessible carousel alternating category and campaign slides; clicking the current slide leads to the filtered catalog or to the campaign page.

**Independent Test**: on the home page, let it rotate, go to « Smartphones » with « Suivant », click its image → filtered catalog; click the BLACK_FRIDAY slide → campaign page (quickstart §3 US3).

### Tests for User Story 3 ⚠️

- [ ] T038 [P] [US3] Unit tests in `tests/unit/home/home-slides.test.ts`: `buildHomeSlides` with 5 categories and 0 campaign → 5 category slides in `CATEGORY_ORDER`; with 1 campaign → C, P, C, C, C, C; with 4 → C, P, C, P, C, P, C, P, C; more than `HOME_CAMPAIGN_SLIDES_MAX` (4) campaigns are cut; `NO_DISCOUNT` never becomes a slide; an unknown campaign key gets `GENERIC_CAMPAIGN_IMAGE`; `href` = `buildSearchUrl({ category })` or `promotionRoute(key)`; ids unique; category slide carries its count (or `null`)
- [ ] T039 [P] [US3] Hook tests in `tests/unit/home/use-carousel.test.tsx` (fake timers): advances every `CAROUSEL_AUTOPLAY_INTERVAL_MS`; wraps around; `next` / `previous` / `goTo`; pauses while hovered, while focus is inside, while `document.visibilityState === "hidden"`, and when the user pressed pause (`CarouselPlayback.PAUSED`); resumes after hover / focus leave; `DISABLED` with a single slide or when effects are not full or `prefers-reduced-motion` (no timer at all)
- [ ] T040 [P] [US3] Component tests in `tests/unit/home/home-carousel.test.tsx` (jest-axe): `section` with `aria-roledescription="carrousel"` and an accessible name; each slide `role="group"` `aria-roledescription="diapositive"` named « 2 sur 9 »; pause / play button first in tab order with the right label; previous / next buttons; dots are buttons with `aria-current` on the current one; live region `aria-live="off"` while playing and `"polite"` after a user action; image and CTA of the visible slide are links to its `href`, hidden slides are `inert`; a slide image that fails to load keeps the gradient background, the title and the link (edge case); one slide → no dots, no controls; static rendering (no motion props) per effect level
- [ ] T041 [P] [US3] E2E `tests/e2e/home-carousel.spec.ts`: the carousel shows one slide; it advances by itself (wait just over the interval); hovering pauses it; « Suivant » up to « Smartphones », click the image → `/products?category=SMARTPHONE`; click the BLACK_FRIDAY slide → `/promotions/BLACK_FRIDAY` shows the campaign (page delivered by US4); pause button stops it; with `reducedMotion: "reduce"` the slide does not change by itself; axe on `/`

### Implementation for User Story 3

- [ ] T042 [P] [US3] Create `features/home/messages.ts`: carousel name, « Mettre en pause le défilement » / « Lancer le défilement », « Diapositive précédente » / « suivante », « Aller à la diapositive N », « N sur M », category taglines (`CATEGORY_TAGLINES: Record<CategoryKey, string>`) and CTAs (« Voir les smartphones »…), campaign CTA « Voir la promotion », image alt texts describing each photo
- [ ] T043 [US3] Create `features/home/home-slides.ts` with the `HomeSlide` discriminated union and `buildHomeSlides(categories, counts, campaigns): readonly HomeSlide[]` (research R6, data-model §3)
- [ ] T044 [US3] Create `features/home/hooks/useCarousel.ts` (`"use client"`): state `{ index, playback, isHovered, isFocused, isHidden }`, effective playing = `PLAYING` and not hovered, focused nor hidden; one `setTimeout` per step (cleared on change); `visibilitychange` listener; `DISABLED` when `useEffectiveEffects()` is not at full level, `prefers-reduced-motion` or a single slide (FR-009, FR-010)
- [ ] T045 [US3] Create `features/home/components/HomeCarousel.tsx` (`"use client"`, ≤ 80 lines per component, split into `CarouselSlide`, `CarouselControls`, `CarouselDots`): WAI-ARIA carousel pattern (research R4), `next/image` with the first slide `priority` and the others lazy with `sizes`, gradient fallback behind the image, title, tagline, count, CTA (`PRIMARY_CTA_CLASS`), cross-fade through `useMotionTokens()` at full effects, instant switch otherwise; hidden slides `inert`
- [ ] T046 [US3] Update `app/(shop)/page.tsx`: build the slides on the server from `getActiveCategories()`, `getCategoryCounts()` and `getActiveDiscounts()` (failures hide the campaign slides only) and render `HomeCarousel` in place of the photo banner of `HomeHero` (the greeting stays); check CLS (fixed aspect ratio from the theme)
- [ ] T047 [US3] Run `home-carousel.spec.ts`, `home.spec.ts`, `a11y.spec.ts`, `long-tasks.spec.ts` (home); Lighthouse desktop on a production build for `/` (LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms); capture `screenshots/us3/` (category slide, campaign slide, paused, reduced effects) and review; fill quickstart §5 US3 (rows 10–15); commit `feat(home): carousel of categories and promotions`; stop and report

**Checkpoint**: the home page showcases the categories and the running campaigns.

---

## Phase 7: User Story 5 - Avis sur mes achats (Priority: P2)

**Goal**: Product pages show the real reviews (average, distribution, paginated list); « Mes avis » lists the products to review and my published reviews, which I can edit or delete at any time; the order detail offers « Donner mon avis ».

**Independent Test**: with an account that has a paid order, open « Mes avis », rate a product 4 stars with a comment, open its page and read the review with the first name; edit then delete it from « Mes avis » (quickstart §3 US5).

### Tests for User Story 5 ⚠️

- [ ] T048 [P] [US5] Unit tests in `tests/unit/reviews/review-schemas.test.ts` and type test `tests/unit/schemas/review.test-d.ts`: `PublicReviewSchema`, `ProductReviewsResponseSchema` (`averageRating` nullable, `distribution` keys « 1 » to « 5 » all present), `ReviewableProductSchema` (`orderDate` `z.iso.date()` nullable), `MyReviewSchema` (`updatedAt` nullable), `ReviewResponseSchema`; `ReviewCreateBodySchema`: `rating` int 1–5 (0 and 6 refused), `comment` trimmed, ≤ 1 000 characters (1 001 refused), blank → omitted; `ReviewUpdateBodySchema` same rules; field names equal to the OpenAPI
- [ ] T049 [P] [US5] Unit tests in `tests/unit/reviews/review-views.test.ts`: `toProductReviews` (average, count, distribution, items with first name and date, empty → no fictitious figure); `toMyReviewsView` (to-review list sorted by order date desc, published page, `isEdited` when `updatedAt` > `createdAt`, pagination)
- [ ] T050 [P] [US5] Action tests in `tests/unit/reviews/review-actions.test.ts` (MSW): `createReview` success (201) revalidates `/account/reviews`, the order detail and tag `product-reviews:{productUuid}`; `403 COMMENT_POST_NOT_ALLOWED` → `review-rejected`; `409 ORDER_NOT_REVIEWABLE` → `review-not-allowed` (branching on `errorCode`, never on the status); `401` → `unauthenticated`; `429` → `rate-limited` with delay; `updateReview` and `deleteReview` (404 counts as deleted); invalid body → no backend call; no comment or first name in any log
- [ ] T051 [P] [US5] Route tests in `tests/unit/api/bff-product-reviews-route.test.ts`: `GET /api/products/{uuid}/reviews?page=1` relays the page; invalid uuid or page → `400 invalid` without backend call; `404 PRODUCT_NOT_FOUND` → `404 not-found`
- [ ] T052 [P] [US5] Component tests in `tests/unit/reviews/reviews-components.test.tsx` (jest-axe): `StarRatingInput` is a radio group (« 1 étoile » … « 5 étoiles »), arrows change the value; `ReviewForm` shows the counter « N / 1 000 », refuses a missing rating on the field, keeps rating and comment on `review-rejected` with the kind message, shows the session-expired message without sending again; publish, update and delete outcomes are announced in a polite live region (FR-022); `ReviewableList` and `MyReviewList` (edit inline, delete through `DeleteReviewDialog` confirm, focus return, « modifié » mention, link to the product page, kept even if the product was removed: it then lands on the existing « produit introuvable » page); empty state when both lists are empty; `ProductReviews` with real data and « Voir plus d'avis » (`MoreReviews`)
- [ ] T053 [P] [US5] E2E `tests/e2e/reviews.spec.ts`: register with `withBankCard: true`, place and pay an order (helpers of `checkout.spec.ts`), open « Mes avis » from the avatar menu, the product is listed with the order date; rate 4 stars with a comment → confirmation, the product leaves « À noter » and appears under « Mes avis publiés »; the product page shows the review with the first name; reload « Mes avis », edit to 3 stars → product page updated; delete (confirm) → the product is reviewable again; publish a rating without comment → accepted (backend `8cc5ded`); the order detail shows « Donner mon avis » for a reviewable product, also while the order is `AWAITING_SHIPPING` (backend `abe674d`) when the shipping batch has run; axe on `/account/reviews`

### Implementation for User Story 5

- [ ] T054 [P] [US5] Create `lib/schemas/review.ts` (schemas of data-model §5.1 and §5.2) and `lib/constants/reviews.ts` (`REVIEW_COMMENT_MAX_LENGTH = 1_000` « `@Size(max = 1000)` », `PRODUCT_REVIEWS_PAGE_SIZE = 10`, `MY_REVIEWS_PAGE_SIZE = 10`, `PRODUCT_REVIEWS_REVALIDATE_SECONDS = 60`, `productReviewsTag(uuid)`); `ReviewFormStatus` enum in `lib/enums/review.ts`
- [ ] T055 [P] [US5] Create `features/reviews/messages.ts`: « Mes avis », « À noter », « Mes avis publiés », form labels, counter, star names, success messages (published, updated, deleted), kind moderation refusal (« Ton commentaire n'a pas pu être publié tel quel : reformule-le, ta note et ton texte sont gardés. »), not-allowed, not-found, session expired, empty state, « Donner mon avis », « modifié le … »
- [ ] T056 [US5] Create `lib/api/endpoints/reviews.ts` (`server-only`, logger `reviews.read` / `reviews.write`): `getProductReviews(uuid, page)` (public, `revalidate` 60 s, tag), `getReviewableProducts(token)`, `getMyReviews(token, page)` (`size=10`, `sort=createdAt,desc`), `createReview`, `updateReview`, `deleteReview` (404 → `false`); UUIDs masked, rating logged, never the comment
- [ ] T057 [US5] Create `app/api/products/[uuid]/reviews/route.ts` (GET, public, contracts §1) and `features/reviews/actions.ts` (Server Actions `createReview`, `updateReview`, `deleteReview`, contracts §2: Zod validation, `getAccessTokenOrThrow`, `revalidatePath` / `revalidateTag`, `ActionResult`)
- [ ] T058 [US5] Fill the product page: `features/catalog/reviews.ts` gets `toProductReviews(response)` (`ProductReview` gains `authorFirstName`, `createdAt`; `NO_REVIEWS` kept for failures), `app/(shop)/products/[uuid]/page.tsx` reads page 0 (a failure shows the honest empty state, `warn`), `features/catalog/components/ProductReviews.tsx` shows first name and date, and `MoreReviews.tsx` (`"use client"`) loads the next pages through the route (`bffGet`), announced politely
- [ ] T059 [US5] Create `features/reviews/my-reviews-view.ts` (`toMyReviewsView`) and the components `StarRatingInput.tsx` (radix radio group), `ReviewForm.tsx` (`useActionState`, counter, kept input on error, loading state on submit), `ReviewableList.tsx`, `MyReviewList.tsx`, `DeleteReviewDialog.tsx` (AlertDialog) in `features/reviews/components/`
- [ ] T060 [US5] Create `app/(account)/account/reviews/page.tsx`: `requireSession`, parallel `getReviewableProducts` + `getMyReviews(page)` (`no-store`), `?page=` for my reviews, `?product=&order=` opens the form of that product (FR-019 link), empty state when both lists are empty; « Mes avis » added to `ACCOUNT_SECTIONS` in `features/account/account-sections.ts` (source of `AccountNav`) and to `features/auth/components/AccountMenu.tsx` between « Mes commandes » and « Ma wishlist »
- [ ] T061 [US5] « Donner mon avis » on the order detail: `app/(account)/account/orders/[uuid]/page.tsx` reads `getReviewableProducts` (`PAID`, `AWAITING_SHIPPING`, `SHIPPED`, `DELIVERED`) and passes the reviewable product UUIDs of this order to `features/orders/components/OrderDetail.tsx`, which shows a link `accountReviewRoute({ productUuid, orderUuid })` on those lines only (FR-019)
- [ ] T062 [US5] Run `reviews.spec.ts`, `orders.spec.ts`, `product-page.spec.ts`, `a11y.spec.ts` (`--workers=1`, one-minute pause between account-creating specs); Lighthouse on a product page with reviews; capture `screenshots/us5/` (product reviews, « Mes avis » with both lists, form, refusal, empty state, order detail link) and review; fill quickstart §5 US5 (rows 21–29); update `docs/backend/api-map.md` (review endpoints and `GET /product-category-schemas`); commit `feat(reviews): product reviews and « Mes avis »`; stop and report

**Checkpoint**: a customer publishes, edits and deletes a review in under a minute (SC-004).

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T063 Visual audit with the **frontend-design** skill: « after » screenshots of every new or changed surface (header menu, home carousel and tiles, catalog per category, promotions list and page, product reviews, « Mes avis ») into `specs/004-catalog-promos-reviews/screenshots/after/`, compared with `before/`; fix inconsistencies (titles, cards, spacing, widths, empty states) with theme tokens only
- [ ] T064 [P] Tests per effect level for every new effect (menu opening, carousel cross-fade, campaign card tilt) in `tests/unit/effects/catalog-promos-effects-levels.test.tsx`; extend `tests/e2e/long-tasks.spec.ts` to `/` (carousel running) and `/promotions`
- [ ] T065 [P] TSDoc and constants audit of every file touched by the feature (no magic value, no raw visual value, `@see` to spec / contract / backend file, logs free of personal data), fixing what `npm run lint` does not catch
- [ ] T066 Full run: `npm run typecheck`, `npm run lint`, `npm run test`, then every Playwright spec of the feature and the existing ones one by one (`--workers=1`, one-minute pause between specs that create accounts); Lighthouse on `/`, `/promotions` and a product page with reviews (SC-006); complete quickstart §5 with the date, counts and remaining manual points
- [ ] T067 Final commit `docs: wrap up feature 004` and checkpoint with the user (in French)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: after Setup — blocks every story (T009 photos and T010 carousel / campaign constants included)
- **US1 (Phase 3)**: after Foundational
- **US2 (Phase 4)**: after US1 (needs `getActiveCategories`, counts and labels)
- **US4 (Phase 5)**: after Foundational; creates `campaign-view.ts` and `campaign-images.ts` (T032, T033) and the « Promotions » link
- **US3 (Phase 6)**: after US1 (category list, counts) and US4 (campaign view, images and pages the slides link to)
- **US5 (Phase 7)**: after Foundational; independent of US1–US4 (product page and account only)
- **Polish (Phase 8)**: last

### Within Each User Story

- Tests first (must fail) → schemas, constants and pure functions → server code (endpoints, route, actions) → hooks → components → pages → e2e run, Lighthouse, screenshots, quickstart, commit, stop and report

### Parallel Opportunities

- Foundational: T004–T007, T009, T010 in parallel after T003; then T008
- US1: T011–T014 in parallel; T015 then T016 → T017 → T018–T020
- US2: T022–T024 in parallel; then T025 → T026
- US4: T028–T031 in parallel; then T032 → T033 → T034 → T035 → T036
- US3: T038–T042 in parallel; then T043 → T044 → T045 → T046
- US5: T048–T055 in parallel; then T056 → T057 → T058–T061
- US5 can be built in parallel with US2–US3 (disjoint files except `AccountMenu`)

---

## Parallel Example: User Story 1

```bash
Task: "Unit tests tests/unit/catalog/categories.test.ts"
Task: "Extend tests/unit/catalog/facets-endpoint.test.ts"
Task: "Component tests tests/unit/catalog/category-display.test.tsx"
Task: "E2E tests/e2e/categories.spec.ts"
Task: "CategorySummarySchema in lib/schemas/category.ts"
```

## Parallel Example: User Story 5

```bash
Task: "Schema tests tests/unit/reviews/review-schemas.test.ts"
Task: "View tests tests/unit/reviews/review-views.test.ts"
Task: "Action tests tests/unit/reviews/review-actions.test.ts"
Task: "Route tests tests/unit/api/bff-product-reviews-route.test.ts"
Task: "Component tests tests/unit/reviews/reviews-components.test.tsx"
Task: "E2E tests/e2e/reviews.spec.ts"
Task: "lib/schemas/review.ts and lib/constants/reviews.ts"
Task: "features/reviews/messages.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup, Phase 2 Foundational
2. Phase 3 US1: the categories everywhere (catalog, product, cart, orders, wishlist)
3. **Stop and validate** on the real backend, commit, report

### Incremental Delivery

1. US1 → every product correctly categorised (MVP)
2. US2 → the header scales to every category
3. US4 → promotions pages and « Appliquer à mon panier »
4. US3 → home showcase (categories and campaigns, every link live)
5. US5 → reviews on product pages and « Mes avis »
6. Polish → audit, effects, performance, wrap-up

One user story per conversation; each ends with a commit and a report in French.
