---

description: "Task list for feature 003 — checkout, discounts, my orders, profile and saved card"
---

# Tasks: Mon compte et mes commandes

**Input**: Design documents from `specs/003-account-orders/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R20), data-model.md, contracts/bff-routes.md, quickstart.md

**Tests**: REQUIRED — constitution principle VII (« un comportement sans test n'est pas terminé »). Unit tests (Vitest + Testing Library + MSW + jest-axe) and Playwright journeys are included per story, written first and failing before the implementation.

**Organization**: Tasks are grouped by user story in priority order (US1 checkout P1, US2 discount P1, US3 my orders P2, US4 profile P2, US5 saved card P3), then the « Interface vivante et cohérente » phase (`docs/speckit-prompts-lot2.md` §6) and the wrap-up. Each story can be implemented, tested and committed on its own, one story per conversation.

**Rules applying to EVERY task** (constitution XI–XIII, `CLAUDE.md`):
- Code, comments, TSDoc and logs in **English**; user-facing text in **French** (tutoiement) in `features/*/messages.ts` only.
- No magic number/string: use `lib/constants/*`; closed sets are **string enums** in `lib/enums/*`; Zod built from enums (`z.enum(MyEnum)`); exhaustive `switch` + `assertNever`.
- TSDoc on every export and at the top of every module (`@param`, `@returns`, `@throws`, `@see` to the spec, contract or backend file).
- Server logs via `lib/logger.ts` child loggers only (modules listed in contracts §5); order and user UUIDs masked with `maskUuid`; **never** log an address, phone, name, email, card holder, card number (even masked), expiry date, form body, token or cookie.
- Every visual value comes from `lib/theme/theme.config.ts` through CSS variables / Tailwind tokens; no raw hex, px, ms or arbitrary Tailwind values in `components/` or `features/`; animations read `useMotionTokens()` and `useEffectiveEffects()` and have a static version.
- No amount is computed by the front: every subtotal, discount, shipping cost and total displayed comes from the quote or the order returned by the backend (constitution V); the only derived figure is the informative `missingAmount` (research R6).
- Reuse existing building blocks instead of re-creating them: `lib/api/client.ts` (`backendFetch`), `lib/api/bff-response.ts` (`jsonOk`, `jsonError`, `parseJsonBody`), `lib/api/bff-client.ts` (`bffGet`, `bffSend`), `lib/api/retry.ts`, `lib/auth/guards.ts` (`requireSession`, `getAccessTokenOrThrow`), `lib/auth/callback-url.ts`, `lib/auth/session-cookie.ts`, `lib/api/endpoints/{shipping,discounts,users,cart}.ts`, `lib/schemas/{shipping,discount,user,paged,storage}.ts`, `features/catalog/delivery.ts`, `features/cart/hooks/useCart.ts`, `features/cart/components/QuantityStepper.tsx`, `features/auth/session-expiry.ts`, `components/layout/{PageShell,PageHeader,SectionHeading,EmptyState,MainNav}.tsx`, `components/effects/{StateIllustration,Reveal,Enter}.tsx`, `components/ui/*` (radio-group, select, input, dialog), `lib/format.ts` (`formatPrice`, `formatDay`), `tests/e2e/support/*`.
- A task is done when `npm run typecheck`, `npm run lint` (0 warning) and `npm run test` pass.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 commande · US2 réduction · US3 mes commandes · US4 profil · US5 carte

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fix the enum drift found during the backend refresh and record the starting state.

- [X] T001 Align `lib/enums/brand.ts` with the 43 values of the backend `Brand` enum (read-only: `C:\Users\guill\Downloads\cybertech-dev-develop_cybertech`, commits `ecc76e1` and `84dc038`; cross-check with `components["schemas"]` in `lib/api/schema.d.ts`), with TSDoc per value; update every place that maps brands (labels, catalog brand filter order, tests in `tests/unit/schemas` and `tests/unit/catalog`) so that `z.enum(Brand)` in `lib/schemas/product.ts`, `lib/schemas/search.ts`, `lib/api/endpoints/facets.ts` and `features/catalog/search-params.ts` accepts the new brands; mark `docs/backend/api-map.md` §E 29 as fixed
- [X] T002 [P] Capture « before » screenshots (Playwright, 1 440 × 900, effects at default level) of `/cart` (guest and signed in, empty and filled) into `specs/003-account-orders/screenshots/before/` with `tests/e2e/screenshots.spec.ts` (`CAPTURE_DIR=… npx playwright test screenshots --config playwright.capture.config.ts`, verification server on port 3123, reused in T071 and T078)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Enums, constants, error codes, schemas, address parsing, order endpoints and the private-route guard shared by several stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Enums with TSDoc per value (data-model §1): create `lib/enums/order.ts` (`OrderStatus` with the 10 backend values `CREATED`, `AWAITING_PAYMENT`, `PAYMENT_FAILED`, `PAID`, `AWAITING_SHIPPING`, `SHIPPED`, `DELIVERED`, `RETURNED`, `CANCELED`, `REFUNDED`; `PaymentType` `MASTERCARD`, `VISA`, `APPLE_PAY`, `GOOGLE_PAY`; `OrderOutcome` `CANCELED = "canceled"`, `REFUNDED = "refunded"`, `RETURNED = "returned"`, `PAYMENT_FAILED = "payment-failed"`; `StatusTone` `PROGRESS`, `SUCCESS`, `WARNING`, `NEUTRAL` with lower-case values; `OrderChangeKind` `REFUNDED = "refunded"`, `CHARGED = "charged"`, `UNCHANGED = "unchanged"`), `lib/enums/checkout.ts` (`CheckoutStep` `ADDRESS = "address"`, `SHIPPING = "shipping"`, `PAYMENT = "payment"`; `DiscountBlockMode` `CART = "cart"`, `CHECKOUT = "checkout"`; `ShippingChoiceKind` `CARRIER = "carrier"`, `PICKUP_PLACEHOLDER = "pickup-placeholder"`; `DelaySource` `BACKEND = "backend"`, `ESTIMATE = "estimate"`), `lib/enums/bank-card.ts` (`BankCardType` `VISA`, `MASTERCARD`, `AMERICAN_EXPRESS`, `DISCOVER`, `OTHER`); add `CartIssue` (`STOCK = "stock"`, `EMPTY = "empty"`) to `lib/enums/cart.ts`, `ACCOUNT = "account"` to `NavSection` in `lib/enums/nav-section.ts`, `DISCOUNT = "ct_discount_v1"` and `CHECKOUT = "ct_checkout_v1"` to `StorageKey` in `lib/enums/storage-key.ts` (+ `DISCOUNT_STORAGE_KEY`, `CHECKOUT_DRAFT_STORAGE_KEY` in `lib/constants/storage-keys.ts`), `QUOTE = "quote"`, `ORDER_STATUS = "order-status"`, `ORDER_SEARCH = "order-search"` to `QueryKey` in `lib/enums/query-key.ts`; extend `tests/unit/enums` so that `OrderStatus`, `PaymentType` and `BankCardType` match the generated union types of `lib/api/schema.d.ts`
- [X] T004 [P] Constants with TSDoc stating origin and unit (data-model §6): create `lib/constants/orders.ts` (`ORDER_STATUS_POLL_INTERVAL_MS = 2_000`, `ORDER_STATUS_POLL_TIMEOUT_MS = 60_000`, `CONFIRMATION_TERMINAL_STATUSES` = every `OrderStatus` except `CREATED` and `AWAITING_PAYMENT`, `ORDER_TIMELINE_STEPS` = `CREATED → AWAITING_PAYMENT → PAID → AWAITING_SHIPPING → SHIPPED → DELIVERED`, `ORDERS_PAGE_SIZE = 10`, `ORDERS_SORT = "createdAt,desc"`, `ORDER_MAX_LINES = 50`, `ORDER_EDIT_SEARCH_DEBOUNCE_MS = 300`, `ORDER_EDIT_SEARCH_SIZE = 8`), `lib/constants/checkout.ts` (`CART_QUOTE_SHIPPING = { type: STANDARD, provider: DHL }`, `PICKUP_PLACEHOLDER` display entry), `lib/constants/discount.ts` (`NO_DISCOUNT_KEY = "NO_DISCOUNT"` from `CyberTechAppConstants.java:39`, `DISCOUNT_KEY_MAX_LENGTH = 64`, `DISCOUNT_KEY_PATTERN = /^[A-Z0-9_]+$/`), `lib/constants/account.ts` (`ADDRESS_FIELD_MAX_LENGTH = 255`, `NAME_MIN_LENGTH = 2`, `NAME_MAX_LENGTH = 50`, `PHONE_PATTERN = /^\+?[0-9 .-]{6,20}$/`, `CARD_EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/[0-9]{4}$/`), `KEYCLOAK_ACCOUNT_PATH = "/account"` in `lib/constants/auth.ts`; replace `PRIVATE_PATH_PREFIX` by `PRIVATE_PATH_PREFIXES = ["/account", "/checkout"]` in `lib/constants/security.ts`
- [X] T005 [P] Routes and backend paths with TSDoc (method, auth, `@see contracts/bff-routes.md`): in `lib/constants/routes.ts` add `CHECKOUT_PATH`, `checkoutConfirmationPath(uuid)`, `ACCOUNT_PATHS` (`root`, `orders`, `profile`, `card`), `orderPath(uuid)`, `orderEditPath(uuid)`, `BFF_ROUTES.checkoutQuote`, `.checkoutPlace`, `.order(uuid)`, `.orderStatus(uuid)`, `.orderCancel(uuid)`, `.orderRetryPayment(uuid)`; in `lib/constants/api.ts` add to `BACKEND_PATHS` `orderQuote`, `orderPlace`, `orderUpdate`, `orderCancel`, `orderMine`, `orderGet(uuid)`, `orderStatus(uuid)`, `orderRetryPayment(uuid)` (`/management/order/…`) and `bankCardGet`, `bankCardUpdate`, `bankCardDelete`
- [X] T006 [P] Error codes (research R18, data-model §1): add `DISCOUNT_INVALID = "discount-invalid"`, `PAYMENT_FAILED = "payment-failed"`, `PAYMENT_ALREADY_COMPLETED = "payment-already-completed"`, `ORDER_LOCKED = "order-locked"`, `REFUND_FAILED = "refund-failed"`, `ACCOUNT_INACTIVE = "account-inactive"`, `CARD_EXPIRED = "card-expired"` to `FrontErrorCode` in `lib/enums/error-code.ts`; map in `lib/api/errors.ts` exactly as data-model §1 (`ORDER_DOESNT_BELONGS_TO_USER` → `NOT_FOUND`, `FAILED_UPDATING_ORDER` → `PAYMENT_FAILED`, `ORDER_NOT_FUNDED` → `ORDER_LOCKED`, …) with the HTTP status of contracts §1.1 (403 `ORDER_DOESNT_BELONGS_TO_USER` rendered as 404); extend the existing exhaustiveness test (lot 1 T020) and add one test per new mapping in `tests/unit/api/errors.test.ts`
- [X] T007 [P] Schema tests first in `tests/unit/schemas/order.test.ts` and `tests/unit/schemas/discount-key.test.ts`: `OrderResponseSchema` accepts a recent order and an old one (`subtotalAmount`, `discountAmount`, `shippingCost`, `discountCalculationType` = `null`), rejects `discountKey: null` and an empty `orderItems`; `OrderStatusSchema`; `OrderQuoteResponseSchema` (`discountApplied` required, `minOrderAmount` nullable); `OrderQuoteBodySchema` default `discountKey` = `NO_DISCOUNT_KEY`, never `null`; `OrderPlaceBodySchema` refuses an empty address field and any `shippingType` other than `STANDARD | EXPRESS`; `OrderUpdateBodySchema` « 1..`ORDER_MAX_LINES` items, quantity 1..`CART_LINE_MAX_QUANTITY`, no duplicate `productUuid` », no `discountKey`; `OrdersListParamsSchema` drops unknown statuses and duplicates, `page` ≥ 1 default 1; `DiscountKeySchema` « `trim().toUpperCase()`, 1 to `DISCOUNT_KEY_MAX_LENGTH`, `^[A-Z0-9_]+$` »; type-level tests that each response schema is assignable from its `components["schemas"][…Dto]` in `lib/api/schema.d.ts`
- [X] T008 Create the schemas of data-model §2–§3 with TSDoc and `@see` to the DTO: `lib/schemas/order.ts` (`OrderItemSchema`, `OrderResponseSchema`, `OrdersPageSchema` from `lib/schemas/paged.ts`, `OrderStatusSchema`, `OrderQuoteResponseSchema`, `OrderQuoteBodySchema`, `OrderPlaceBodySchema`, `OrderUpdateBodySchema`, `OrderUuidParamSchema`, `OrdersListParamsSchema`), `lib/schemas/address.ts` (`ShippingAddressSchema`: `street`, `city`, `zipCode`, `country` « `trim()`, non vides (`@NotBlank`), ≤ `ADDRESS_FIELD_MAX_LENGTH` »), `DiscountKeySchema` in `lib/schemas/discount.ts`; T007 passes
- [X] T009 [P] Unit tests first in `tests/unit/account/address.test.ts` for `parseFlatAddress` (data-model §4.6): `"12 rue de la Paix, 75002 Paris, France"`; street containing a comma; composed city (`"13001 Aix en Provence"`); `"null, null null, null"` → all empty; `null` / `""` → all empty; fewer than 3 segments → all empty; zip without city
- [X] T010 Create `lib/address.ts` exporting `ParsedAddress` and `parseFlatAddress(text: string | null | undefined): ParsedAddress` (format `"%s, %s %s, %s"` of `UserMapper#mapAddressToString` / `OrderMapper#mapAddressToString`, never guesses: uncertain fields stay empty, FR-030); T009 passes
- [X] T011 [P] Endpoint tests first with MSW in `tests/unit/api/orders-endpoints.test.ts`: `quoteOrder`, `placeOrder` (address flattened into `shippingStreet/City/ZipCode/Country`, `discountKey` omitted rather than `null`), `getOrderStatus`, `retryPayment`, `getMyOrders` (query `status` repeated, `page` converted to a 0-based index, `size=ORDERS_PAGE_SIZE`, `sort=ORDERS_SORT`), `getOrder`, `updateOrder` (`uuid` + full `itemUpdateRequestDtoList`), `cancelOrder` (`{ orderUuid }`): `Authorization` header present, `cache: "no-store"`, response validated by Zod (non-conforming → `unavailable` + `error` log), each backend error turned into the `ApiError` of contracts §1.1, no automatic retry for place / retry-payment / update / cancel (`isRetryableWrite` false)
- [X] T012 Create `lib/api/endpoints/orders.ts` (`import "server-only"`, child logger per contracts §5, UUIDs masked) implementing the 8 functions of T011 through `backendFetch`; T011 passes
- [X] T013 [P] Proxy tests first in `tests/unit/security/proxy-private.test.ts`: `/account`, `/account/orders/…` and `/checkout` without session cookie → 307 to `/login?callbackUrl=<path+search>` (built with `loginPath` / `safeCallbackPath`); with `authjs.session-token` or `__Secure-authjs.session-token` → passes with CSP; `/api/checkout/quote` and `/api/orders/…` never redirected; `/products` canonical redirect unchanged
- [X] T014 Guard private routes (research R1): extend `proxy.ts` (module TSDoc updated, cookie names from `lib/auth/session-cookie.ts`, no server-only import) and create `app/(account)/layout.tsx` calling `requireSession(pathname)` with `export const dynamic = "force-dynamic"`; T013 passes

**Checkpoint**: Foundation ready — user stories can now begin.

---

## Phase 3: User Story 1 - Passer commande depuis le panier (Priority: P1) 🎯 MVP

**Goal**: « Passer commande » on the cart leads to a single-page checkout (address, shipping, payment unfolding next to a sticky summary) priced by the backend quote, a placement that never creates two orders, and a confirmation page that follows the payment until « Payée » or « Paiement refusé » with a retry. Works without discount (`NO_DISCOUNT`).

**Independent Test**: with an account and a 2-product cart, click « Passer commande », keep the prefilled address, choose Express FedEx and Visa, check the summary total equals the created order's total, then see the confirmation switch to « Payée » (quickstart §3 US1).

### Tests for User Story 1 ⚠️

> Write these tests FIRST and make sure they FAIL before the implementation.

- [X] T015 [P] [US1] Unit tests in `tests/unit/checkout/quote-view.test.ts` for `toQuoteView` (data-model §4.1): amounts copied, never recomputed; `discountKey` `null` for `NO_DISCOUNT_KEY`; `missingAmount` = `roundToCents(minOrderAmount − subtotal)` only when `discountApplied` is false, `minOrderAmount` not null and key ≠ `NO_DISCOUNT_KEY`, otherwise `null`
- [X] T016 [P] [US1] Unit tests in `tests/unit/checkout/shipping-choices.test.ts` for `buildShippingChoices(options, now)` (data-model §4.2): one `CARRIER` per backend pair with its real `cost`, ordered `STANDARD` then `EXPRESS` then by provider enum order; delay from `minDeliveryDays` / `maxDeliveryDays` when present (`DelaySource.BACKEND`, no business-day or holiday computation) else `SHIPPING_DELAYS` (`DelaySource.ESTIMATE`); `expressPromise` only on `EXPRESS`; `PICKUP_PLACEHOLDER` always last with `isDisabled: true`; `null` options → empty list
- [X] T017 [P] [US1] Unit tests in `tests/unit/checkout/checkout-draft.test.ts`: `CheckoutDraftSchema` (data-model §4.3: `step`, optional `shippingType`, `shippingProvider`, `paymentType`, `hadCustomAddress`; **no address field**), read / write / clear on `sessionStorage` under `StorageKey.CHECKOUT`, tampered or invalid value removed, storage unavailable handled
- [X] T018 [P] [US1] Route tests with MSW in `tests/unit/api/bff-checkout-routes.test.ts`: `POST /api/checkout/quote` (body validated by `OrderQuoteBodySchema`, `200 QuoteView`, 401, 409 `empty-cart`, 429 with `retryAfterSeconds`, 503); `POST /api/checkout/place` (`201 { orderUuid, status }`, 409 `insufficient-stock`, 409 `empty-cart`, 403 `account-inactive`, 400 `discount-invalid`, invalid address → 400 `invalid` without backend call); `GET /api/orders/[uuid]/status` (invalid UUID → 400, 403 backend → 404); `POST /api/orders/[uuid]/retry-payment` (409 `payment-already-completed`, 402 and 422 → `payment-failed`); every response `Cache-Control: no-store`; logs without address
- [X] T019 [P] [US1] Hook tests in `tests/unit/checkout/checkout-hooks.test.tsx` (MSW + QueryClient): `useQuote` shows only the amounts of the latest choice when responses arrive out of order and aborts the obsolete request (`signal`), keeps the previous amounts with `isStale` while fetching, no retry on 4xx; `usePlaceOrder` sends once even on double click, on success sets the account cart cache to empty, clears the draft and calls `router.replace(checkoutConfirmationPath(uuid))`, on 401 stores the draft without address and redirects to login without replaying; `useOrderStatus` polls every `ORDER_STATUS_POLL_INTERVAL_MS`, stops on a status of `CONFIRMATION_TERMINAL_STATUSES` and after `ORDER_STATUS_POLL_TIMEOUT_MS`, pauses when the tab is hidden; `useQuote` refetches the account cart on window focus and invalidates the quote; `usePlaceOrder` first requests a final quote and, if its `totalAmount` differs from the displayed total, does not place, shows the new total and requires a new click (spec Edge Cases « panier modifié dans un autre onglet »); after re-login the draft restores shipping, payment and discount but never places by itself (FR-002)
- [X] T020 [P] [US1] Component tests with jest-axe in `tests/unit/checkout/checkout-components.test.tsx`: `CheckoutFlow` unfolds one step at a time, a validated step folds into an editable summary, reopening keeps choices, step indicator accessible; `AddressStep` prefilled from `ParsedAddress`, the 4 fields required with linked errors; `ShippingStep` lists real prices, « estimatif » label when `DelaySource.ESTIMATE`, pickup entry `aria-disabled` with « Bientôt disponible »; `PaymentStep` 4 methods, simulated-payment notice, no card number input anywhere; `CheckoutSummary` amounts from the quote in an `aria-live="polite"` region, `aria-busy` while stale, « Valider la commande » disabled without an up-to-date quote; `PaymentTracker` states « Paiement en cours », « Payée », « Paiement refusé » with « Relancer le paiement », timeout message with link to the order
- [X] T021 [P] [US1] E2E `tests/e2e/checkout.spec.ts` (real stack, unique account via `tests/e2e/support`): visitor `/checkout` → login → back to `/checkout`; guest cart + « Passer commande » → login → merged cart in the checkout; prefilled address; switching Standard/Express and DHL/FedEx updates the summary; place order → confirmation « Payée » and summary total equal to the order total read on the confirmation; back button does not return to a placeable checkout; cart badge empty; axe on `/checkout` and the confirmation; measure (SC-003) the delay between a shipping change and the new amounts in the summary (`performance.now()` around the change and the live-region update), assert < 1 000 ms locally; count the interactions from « Passer commande » to the confirmation (SC-001, ≤ 6 with a complete profile); session expired during the checkout (`/api/test/expire-session`) → re-login → choices restored, address reprefilled with the message, no order until « Valider la commande » is clicked again

### Implementation for User Story 1

- [X] T022 [P] [US1] Create `features/checkout/messages.ts` (`CHECKOUT_MESSAGES`): step titles and summaries, field labels and errors, shipping labels (« estimatif », « Bientôt disponible » for pickup, express promise), payment labels and « Paiement simulé : aucun débit réel », summary rows (Sous-total, Remise, Livraison, Total), « Mise à jour des montants… », « Valider la commande », errors per `FrontErrorCode` (stock, empty cart, inactive account, rate limited with seconds, unavailable with « Réessayer »), confirmation and payment-tracker texts, « Ton adresse a été réinitialisée » after re-login
- [X] T023 [P] [US1] Create `features/checkout/quote-view.ts` (`QuoteView`, `toQuoteView`, `missingAmountForDiscount`) using `roundToCents` from `features/cart/cart-view.ts`; T015 passes
- [X] T024 [P] [US1] Extend `ShippingOptionSchema` in `lib/schemas/shipping.ts` with optional `minDeliveryDays`, `maxDeliveryDays` (`z.number().int().nonnegative().optional()`, `refine` max ≥ min, TSDoc pointing to `docs/backend/backend-prompts-lot2.md` §9), then create `features/checkout/shipping-choices.ts` (`ShippingChoice` union, `buildShippingChoices`) reusing `SHIPPING_DELAYS` and `expressPromise`; T016 passes
- [X] T025 [P] [US1] Create `CheckoutDraftSchema` in `lib/schemas/storage.ts` and `features/checkout/checkout-draft.ts` (`readCheckoutDraft`, `writeCheckoutDraft`, `clearCheckoutDraft`); T017 passes
- [X] T026 [US1] Create `app/api/checkout/quote/route.ts` and `app/api/checkout/place/route.ts` (contracts §1, child loggers `checkout.quote` / `checkout.place`, info log on order created with masked UUID, line count, shipping and `discountApplied`), then `app/api/orders/[uuid]/status/route.ts` and `app/api/orders/[uuid]/retry-payment/route.ts` (`orders.status`, `orders.retry-payment`); T018 passes
- [X] T027 [US1] Create `features/checkout/hooks/useQuote.ts`, `usePlaceOrder.ts` and `features/checkout/hooks/useOrderStatus.ts` (TanStack Query keys from `QueryKey.QUOTE` / `QueryKey.ORDER_STATUS`, quote key = shipping type, provider, discount key and cart version; `placeholderData` for stale amounts; place via `useMutation` without retry; 401 handled like `features/auth/session-expiry.ts` but storing the checkout draft); T019 passes; cart query refetched on window focus with the quote invalidated; final quote before placing compared to the displayed total (refusal + new total + new click when different)
- [X] T028 [US1] Create `features/checkout/components/CheckoutStepPanel.tsx`, `AddressStep.tsx`, `ShippingStep.tsx` and `PaymentStep.tsx` (radio groups from `components/ui/radio-group.tsx`, errors linked with `aria-describedby`, pickup rendered `aria-disabled`), all texts from `CHECKOUT_MESSAGES`, theme tokens only
- [X] T029 [US1] Create `features/checkout/components/CheckoutSummary.tsx` (lines, address, shipping, payment, quote amounts with `formatPrice`, live region, stale state, « Réessayer » on `unavailable`, place button state from `isPlaceable`) and `features/checkout/components/CheckoutFlow.tsx` (client island: step state with `CheckoutStep`, draft restore, error routing of research R10 to `/cart?issue=stock|empty`); T020 passes for these components
- [X] T030 [US1] Create `app/(account)/checkout/page.tsx` (Server Component: parallel `getMe`, `getAccountCart`, `getShippingOptions`, address parsed with `parseFlatAddress`; empty cart → `redirect(CART_PATH)`; `PageShell` + `PageHeader`; renders `CheckoutFlow`) with page metadata in French from `CHECKOUT_MESSAGES`
- [X] T031 [US1] Create `features/checkout/components/PaymentTracker.tsx` and `app/(account)/checkout/confirmation/[uuid]/page.tsx` (Server Component: `getOrder` for lines and total, `notFound()` on `not-found`; client tracker for status, retry and timeout); T020 passes for `PaymentTracker`; while US3 is not delivered, the timeout and failure links point to `CART_PATH` / `HOME_PATH` instead of the order detail (route constant switched to `orderPath(uuid)` in T052, with a test)
- [X] T032 [US1] Cart page (research R19): move `app/(shop)/cart/page.tsx` to `PageShell` / `PageHeader` (point left from 002 quickstart §5), add « Passer commande » to `features/cart/components/CartSummary.tsx` (`CHECKOUT_PATH` when signed in, `loginPath(CHECKOUT_PATH)` for a guest, hidden for an empty cart), read `?issue=` with `z.enum(CartIssue)` and show a banner (stock lines flagged with available quantity, empty cart message), texts in `features/cart/messages.ts`; existing cart tests stay green and new cases are added in `tests/unit/cart`
- [X] T033 [US1] Run `tests/e2e/checkout.spec.ts` (T021) and the existing `cart.spec.ts` one by one (`--workers=1`), review screenshots of the checkout (each step open), the confirmation (pending, paid, failed) and the cart, fill quickstart §5 US1, commit `feat(checkout): single-page checkout priced by the backend quote`, then stop and report to the user (in French); Lighthouse desktop (constitution IX) on `/`, `/products`, one product page and `/cart`, `/checkout`, the confirmation, budgets LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms, recorded in quickstart §5

### US1 follow-up (decision of 2026-10-14)

- [X] T083 [US1] Payment step shows the saved card that will be charged (masked network and last 4 digits, read by `getBankCard` in `features/checkout/server/checkout-data.ts`, needs the read part of T066); without a card, « Valider la commande » is disabled with « Ajouter une carte » linking to `/account/card?returnTo=/checkout` (`CARD_RETURN_PARAM`), and a `no-saved-card` answer at placement shows the same link; « Paiement simulé » texts become « paiement de test » (FR-009); tests in `tests/unit/checkout/checkout-components.test.tsx`

**Checkpoint**: an order can be placed and paid from the cart — MVP.

---

## Phase 4: User Story 2 - Appliquer une réduction (Priority: P1)

**Goal**: A « Appliquer une réduction » block on the cart (signed in) and on the checkout summary: choose an active campaign or type its key, see the discount from the backend quote, a clear message with the missing amount when the minimum is not reached, a refusal for an unknown key, and a safe path when the campaign expires before placing.

**Independent Test**: with BLACK_FRIDAY active, apply it on a 500 € cart, read a 100 € discount in the summary, place the order and find the same discount in the order (quickstart §3 US2).

### Tests for User Story 2 ⚠️

- [X] T034 [P] [US2] Unit tests in `tests/unit/checkout/discount-storage.test.ts`: read / write / clear the key under `StorageKey.DISCOUNT` validated by `DiscountKeySchema`, lower-case input normalised, tampered value removed; `describeDiscountOffer(discount)` (advantage « −20 % », « −10 € », « 1 acheté = 1 offert », minimum, cap and end date when present) and `NO_DISCOUNT` excluded through `isDisplayableDiscount`
- [X] T035 [P] [US2] Component tests with jest-axe in `tests/unit/checkout/discount-block.test.tsx`: cart mode shows only subtotal and discount then « Livraison et total calculés à l'étape suivante » (no shipping, no total); checkout mode shows the full summary; campaign list without `NO_DISCOUNT`; only key input when no campaign; unknown key → error and previous key kept; minimum not reached → « Il te manque X € pour profiter de KEY » and key kept selected; guest → invitation to sign in, no quote request; messages announced in a live region
- [X] T036 [P] [US2] E2E `tests/e2e/discount.spec.ts`: apply BLACK_FRIDAY on the cart (amount above the minimum when the campaign has one, otherwise just applied), find it applied in the checkout, place the order, read the same discount key and amount on the confirmation; minimum not reached case (if the local campaign has `minOrderAmount`, otherwise reported « non testable » in quickstart §5); unknown key `NOPE` refused; axe on the cart with the block open

### Implementation for User Story 2

- [X] T037 [P] [US2] Create `features/checkout/discount-storage.ts` (`readDiscountKey`, `writeDiscountKey`, `clearDiscountKey`) and `features/checkout/discount-offer.ts` (`describeDiscountOffer`); add the discount texts to `features/checkout/messages.ts` (offer advantages, conditions, « Il te manque … », refusal, expired campaign at placement, sign-in invitation); T034 passes
- [X] T038 [US2] Create `features/checkout/components/DiscountBlock.tsx` (client; prop `mode: DiscountBlockMode` from T003; campaigns passed from the server; key typed then tested with `useQuote`, rollback on `discount-invalid`; uses `CART_QUOTE_SHIPPING` in cart mode); T035 passes
- [X] T039 [US2] Wire it: cart page (`app/(shop)/cart/page.tsx` fetches `getActiveDiscounts()`, `CartSummary` renders `DiscountBlock` mode cart for a signed-in user, invitation for a guest) and checkout (`CheckoutSummary` renders mode checkout; `useQuote` reads the stored key); `usePlaceOrder` sends the key and handles `discount-invalid` at placement (FR-020): key cleared, quote refreshed without it, message, no order, explicit new click required — add the matching cases to T019 and T020
- [X] T040 [US2] Run `tests/e2e/discount.spec.ts` and `checkout.spec.ts` one by one, review screenshots (cart with block, checkout with discount, minimum not reached), fill quickstart §5 US2, commit `feat(checkout): apply a discount campaign on the cart and the checkout`, stop and report; Lighthouse desktop (constitution IX) on `/`, `/products`, one product page and `/cart` with the discount block, budgets LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms, recorded in quickstart §5

**Checkpoint**: discounts usable end to end; US1 still green.

---

## Phase 5: User Story 3 - Suivre et gérer mes commandes (Priority: P2)

**Goal**: « Mes commandes » (paginated list, newest first, status filter in the URL), order detail with total breakdown or total only for old orders, lifecycle timeline, edit (quantities, line removal keeping at least one line, product added by search, address, shipping, payment) keeping the original discount, cancellation, payment retry.

**Independent Test**: after two orders, open « Mes commandes », filter on « Payée », open the detail, lower a quantity and add a product, check the new total and the kept discount, then cancel another order (quickstart §3 US3).

### Tests for User Story 3 ⚠️

- [X] T041 [P] [US3] Unit tests in `tests/unit/orders/order-view.test.ts`: `toOrderSummaryRow` (`itemCount` = Σ quantities, `statusTone` per data-model §5); `toOrderView` with breakdown and with `breakdown: null` when one of `subtotalAmount`, `discountAmount`, `shippingCost` is `null`; `discountKey` `null` for `NO_DISCOUNT`; `refunded` shown only when > 0; `canEdit` / `canCancel` / `canRetryPayment` for each of the 10 statuses exactly as the table of data-model §5 (`AWAITING_SHIPPING` editable but not cancellable; retry only on `PAYMENT_FAILED`); timeline states `done` / `current` / `upcoming` and `outcome` for `CANCELED`, `REFUNDED`, `RETURNED`, `PAYMENT_FAILED` (after step 2); `isInCatalog` per line from an availability result (absent UUID → no link, availability error → no link); `describeOrderChange(before, after)` returns `OrderChangeKind` `REFUNDED` when `refundedAmount` increased, `CHARGED` when `totalAmount` increased, `UNCHANGED` otherwise, without computing any amount (FR-025)
- [X] T042 [P] [US3] Unit tests in `tests/unit/orders/order-edit.test.ts` for `buildOrderUpdateBody(state)`: full list of lines sent, quantity change, line removal refused when it is the last line, product added once (adding a present product increases its quantity), quantities bounded 1..`CART_LINE_MAX_QUANTITY`, at most `ORDER_MAX_LINES` lines, address split back from `parseFlatAddress`, `paymentType` required with no default (absent from `OrderResponseDto`)
- [X] T043 [P] [US3] Route tests with MSW in `tests/unit/api/bff-orders-routes.test.ts`: `POST /api/orders/[uuid]` (`200 OrderView`, 409 `order-locked`, 409 `insufficient-stock` with `productUuid`, 402 `payment-failed`, invalid body → 400 without backend call) and `POST /api/orders/[uuid]/cancel` (`200 OrderView`, 409 `order-locked`, 409 `refund-failed`, 403 → 404); `no-store`; info log on update / cancel with masked UUID
- [X] T044 [P] [US3] Component tests with jest-axe in `tests/unit/orders/orders-components.test.tsx`: `OrderList` rows (date, status label + tone, item count, total) and empty state; `OrderStatusFilter` is a GET form (works without JavaScript); `OrderBreakdown` full vs total only (no empty value, no misleading zero); `OrderTimeline` readable by screen readers (current step `aria-current="step"`, outcome announced as an outcome); `OrderActions` shows edit / cancel / retry only when allowed; `CancelOrderDialog` confirm / cancel and focus return; `OrderEditForm` last line cannot be removed (explanation + link to cancel), « La réduction d'origine est conservée » notice, stock error on the added line keeps other changes; `ProductPicker` debounced search, keyboard selectable results
- [X] T045 [P] [US3] E2E `tests/e2e/orders.spec.ts`: two orders placed through the BFF in a fixture; list newest first, filter `Payée` reflected in the URL and kept on reload; detail with breakdown and timeline; edit: lower a quantity, add a product found by search, save → new total and same discount key; cancel another order → « Annulée »; another user's order UUID → « commande introuvable »; axe on list, detail and edit

### Implementation for User Story 3

- [X] T046 [P] [US3] Create `features/orders/messages.ts` (`ORDERS_MESSAGES`: status labels for the 10 `OrderStatus`, outcome labels, timeline step labels, list headers, filter labels, breakdown rows, « Commande passée avant le détail des montants » helper, edit texts incl. « La réduction d'origine est conservée », complement / partial refund explanation, cancel dialog, errors per `FrontErrorCode`, empty state « Découvre le catalogue »); old / new total texts and « La différence est débitée sur ton moyen de paiement » / « X € remboursés » (amount = backend `refundedAmount`)
- [X] T047 [P] [US3] Create `features/orders/order-view.ts` (`OrderSummaryRow`, `OrderView`, `toOrderSummaryRow`, `toOrderView`, allowed actions table) and `features/orders/order-timeline.ts` (`buildOrderTimeline` with `ORDER_TIMELINE_STEPS` and `OrderOutcome`, exhaustive `switch` on `OrderStatus`); T041 passes
- [X] T048 [P] [US3] Create `features/orders/order-edit.ts` (`OrderEditState`, transitions, `buildOrderUpdateBody`); T042 passes
- [X] T049 [US3] Create `app/api/orders/[uuid]/route.ts` (POST update) and `app/api/orders/[uuid]/cancel/route.ts` (contracts §1, loggers `orders.update` / `orders.cancel`); T043 passes
- [X] T050 [US3] Account shell: `features/account/components/AccountNav.tsx` (Commandes, Profil, Carte, Wishlist (`ACCOUNT_PATHS.wishlist`, US6; « Ma wishlist » already in `AccountMenu`); current page with `aria-current`), `app/(account)/account/layout.tsx` (`PageShell` + `AccountNav`, `NavSection.ACCOUNT`), `app/(account)/account/page.tsx` (`redirect(ACCOUNT_PATHS.orders)`), « Mes commandes », « Mon profil », « Ma carte » in `features/auth/components/AccountMenu.tsx` and the current section in `components/layout/MainNav.tsx`; texts in `features/account/messages.ts` (created here, completed in US4 and US5); update `tests/unit/layout` for the new section
- [X] T051 [US3] Create `features/orders/components/OrderList.tsx`, `OrderStatusFilter.tsx` and `app/(account)/account/orders/page.tsx` (Server Component: `OrdersListParamsSchema` on `searchParams`, `getMyOrders`, pagination links, `EmptyState` + `StateIllustration`)
- [X] T052 [US3] Create `features/orders/components/OrderDetail.tsx`, `OrderBreakdown.tsx`, `OrderTimeline.tsx`, `OrderActions.tsx`, `CancelOrderDialog.tsx` and `app/(account)/account/orders/[uuid]/page.tsx` (`getOrder`, `notFound()` on `not-found`, retry reusing `useOrderStatus` / `PaymentTracker` from US1, `router.refresh()` after cancel or refused action); switch the PaymentTracker links of T031 to `orderPath(uuid)`; product links only for lines with `isInCatalog` (one `getAvailability` call for all lines, spec Edge Cases « produit retiré du catalogue »); after an edit, show old and new totals and the `OrderChangeKind` message
- [X] T053 [US3] Create `features/orders/components/ProductPicker.tsx` (existing `GET /api/search`, `QueryKey.ORDER_SEARCH`, `ORDER_EDIT_SEARCH_DEBOUNCE_MS`, `ORDER_EDIT_SEARCH_SIZE`), `OrderEditForm.tsx` (reuses `QuantityStepper`, `AddressStep` fields and `ShippingStep` / `PaymentStep` choices from US1) and `app/(account)/account/orders/[uuid]/edit/page.tsx` (not editable → redirect to the detail with a message); T044 passes; session expired on save → message inviting to sign in again, the edit state kept in memory and in `sessionStorage` under a new `StorageKey.ORDER_EDIT` (order UUID, lines, shipping, payment; no address) restored after re-login, never resubmitted automatically (FR-002)
- [X] T098 [US3] Header account menu: avatar with initials, hover/click panel (name, links, sign-out) — `features/auth/components/{AccountAvatarMenu,AccountMenuPanel}.tsx`, `features/auth/hooks/useHoverDisclosure.ts`, `features/auth/account-identity.ts`, sections shared with `AccountNav` through `features/account/account-sections.ts` (`ACCOUNT_SECTIONS` / `ACCOUNT_MENU_ITEMS`); tests in `tests/unit/auth/account-menu.test.tsx`; `tests/e2e/auth.spec.ts` opens the menu before signing out (FR-040, asked by the user on 2026-10-20)
- [X] T054 [US3] Run `tests/e2e/orders.spec.ts` one by one with the previous specs, review screenshots (list empty / filled / filtered, detail recent / old, timeline per outcome, edit), fill quickstart §5 US3, commit `feat(orders): my orders list, detail, edit and cancel`, stop and report; Lighthouse desktop (constitution IX) on `/`, `/products`, one product page and `/account/orders` and one order detail, budgets LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms, recorded in quickstart §5

**Checkpoint**: orders can be followed and managed.

---

## Phase 6: User Story 4 - Consulter et modifier mon profil (Priority: P2)

**Goal**: « Mon profil » shows first and last name, email, username and address, and edits first name, last name (2–50), phone (replaces, never read back), street, zip code, city and country; link to the Keycloak account console for the password; no account deletion.

**Independent Test**: change the city, reload, find the new city, then open the checkout and see it prefilled (quickstart §3 US4).

### Tests for User Story 4 ⚠️

- [X] T055 [P] [US4] Tests in `tests/unit/account/profile.test.ts`: `UserProfileSchema` (extends `CurrentUserSchema`, `address` nullable); `ProfileUpdateSchema` (`firstName`, `lastName` « `trim()`, 2..50 (`@Size`) », `phoneNumber` optional matching `PHONE_PATTERN`, address fields optional, empty string → omitted); `toProfileView`; `updateProfile` Server Action with MSW (`PATCH /user/me` body without empty fields, backend `fieldErrors` mapped on fields, `not-found`, 429, `revalidatePath` of `/account/profile` and `/checkout`, no field value logged); `updateMe` endpoint
- [X] T056 [P] [US4] Component tests with jest-axe in `tests/unit/account/profile-form.test.tsx`: prefilled fields from `ParsedAddress`, email and username read-only, one-letter first name → linked error, phone field empty with « un numéro saisi remplacera l'ancien », success message announced, password link to the console, no delete-account control
- [X] T057 [P] [US4] E2E `tests/e2e/profile.spec.ts`: edit city → reload → kept; `/checkout` prefilled with the new city; invalid first name refused; axe on `/account/profile`

### Implementation for User Story 4

- [X] T058 [P] [US4] Add `UserProfileSchema` and `ProfileUpdateSchema` to `lib/schemas/user.ts` and `updateMe(input, token)` to `lib/api/endpoints/users.ts` (`PATCH /user/me`, `UserSelfUpdateRequestDto`); create `features/account/profile-view.ts` (`ProfileView`, `toProfileView` with `parseFlatAddress`)
- [X] T059 [P] [US4] Add profile texts to `features/account/messages.ts` (labels, hints, errors, success, password link label, read-only email notice) and derive the console URL from `AUTH_KEYCLOAK_ISSUER` + `KEYCLOAK_ACCOUNT_PATH` in a server-only helper `lib/auth/account-console.ts`; the console link opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`) and its label says so (US4 scenario 4)
- [X] T060 [US4] Create `features/account/actions.ts` with `updateProfile` (`"use server"`, `requireSession`, Zod, logger `account.profile`, result type of contracts §2); T055 passes
- [X] T061 [US4] Add the « Mon profil » entry to `ACCOUNT_SECTIONS` in `features/account/account-sections.ts` (shown in the account nav and the header menu, FR-040). Create `features/account/components/ProfileForm.tsx` (`useActionState`, works without JavaScript) and `app/(account)/account/profile/page.tsx` (`getMe`, `toProfileView`); T056 passes; session expired on submit → `requireSession` redirect replaced by a form error inviting to sign in again, typed values kept in the form state (FR-002), with a test in T056
- [X] T062 [US4] Run `tests/e2e/profile.spec.ts`, review screenshots, fill quickstart §5 US4, commit `feat(account): profile page`, stop and report; Lighthouse desktop (constitution IX) on `/`, `/products`, one product page and `/account/profile`, budgets LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms, recorded in quickstart §5

**Checkpoint**: profile editable and reused by the checkout.

---

## Phase 7: User Story 5 - Gérer ma carte enregistrée (Priority: P3)

**Goal**: « Ma carte » shows the masked card (holder, last 4 digits, expiry, network), adds or replaces it through the site's « Ajouter une carte » form (number sent to the backend by the BFF, never logged, stored nor shown again, constitution V v3.0.0, research R21 revised), edits holder and expiry (month and year, not past), deletes after confirmation. The backend charges this card at every payment: an all-1s number pays, any other is declined.

**Independent Test**: without a card, add 4242 4242 4242 4242, order and see « Payée »; replace it with 4000 0000 0000 0341, order and see « Paiement refusé »; change the expiry, then delete the card and see the « aucune carte » state (quickstart §3 US5).

### Tests for User Story 5 ⚠️

- [X] T063 [P] [US5] Tests in `tests/unit/account/bank-card.test.ts`: `BankCardSchema` (`maskedNumber` only, `expiryDate` `MM/YYYY`, `z.enum(BankCardType)`); `BankCardUpdateSchema` (`cardHolderName` « `trim()`, non vide », `expiryDate` « `MM/YYYY` (`@Pattern`) » and not before the current month in `SHOP_TIME_ZONE`); `getBankCard` (404 `BANK_CARD_NOT_FOUND` → `null`); `updateBankCard` action (400 `BANK_CARD_EXPIRED` → `card-expired` on the expiry field, `not-found` → no-card state) and `deleteBankCard` (204 and 404 both succeed) with MSW; nothing about the card logged
- [X] T064 [P] [US5] Component tests with jest-axe in `tests/unit/account/bank-card-panel.test.tsx`: masked number, holder, expiry and network shown, never a full number; edit form with month / year selects; `DeleteCardDialog` confirm and focus return; no-card state with `StateIllustration` explaining that a card is needed to order, with « Ajouter une carte »; no input accepting a card number anywhere; expiry entered as month (`01`–`12`) and year (4 digits) selects assembled into `expiryDate` `MM/YYYY` (data-model §3)
- [ ] T065 (blocked: backend prompt §12, delete has no effect) [P] [US5] E2E `tests/e2e/bank-card.spec.ts`: account registered with a test card (`registerUser(context, { withBankCard: true })`, test support only; the add flow is covered by T088); edit expiry → reload → kept; past expiry refused; delete → no-card state; axe on `/account/card`

### Implementation for User Story 5

- [X] T066 [P] [US5] Create `lib/schemas/bank-card.ts` (`BankCardSchema`, `BankCardUpdateSchema`) and `lib/api/endpoints/bank-card.ts` (`getBankCard`, `updateBankCard`, `deleteBankCard`, logger `account.card`)
- [X] T067 [P] [US5] Add card texts to `features/account/messages.ts` (network labels for `BankCardType`, fields, errors, delete dialog, no-card explanation)
- [X] T068 [US5] Add `updateBankCard` and `deleteBankCard` to `features/account/actions.ts`; T063 passes
- [X] T069 [US5] Add the « Ma carte » entry to `ACCOUNT_SECTIONS` in `features/account/account-sections.ts` (account nav and header menu, FR-040). Create `features/account/components/BankCardPanel.tsx`, `DeleteCardDialog.tsx` and `app/(account)/account/card/page.tsx`; T064 passes; session expired on submit → form error inviting to sign in again, holder name kept, nothing about the card stored in the browser (FR-002), with a test in T064
- [X] T070 [US5] Run `tests/e2e/bank-card.spec.ts`, review screenshots (card, edit, no card), fill quickstart §5 US5, commit `feat(account): saved card page`, stop and report; Lighthouse desktop (constitution IX) on `/`, `/products`, one product page and `/account/card`, budgets LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms, recorded in quickstart §5

### Card form (decision of 2026-10-20: constitution V v3.0.0, research R21 revised)

- [X] T084 [P] [US5] Route tests with MSW in `tests/unit/api/bff-bank-card-routes.test.ts`: `POST /api/bank-card` (`BankCardAddBodySchema` strict: unknown field, 12-digit number, letters, past expiry → 400 `invalid` without backend call; spaces removed from the number; 201 masked card; `replace: true` → delete then add; existing card without `replace` → 409 `conflict`; backend 400 → `invalid`); a log spy asserts that neither the number, its last 4 digits, the holder nor the expiry is ever logged; the response never contains the sent number
- [X] T085 [US5] Add `BankCardAddBodySchema` to `lib/schemas/bank-card.ts`, `addBankCard` (and `deleteBankCard`) to `lib/api/endpoints/bank-card.ts`, `CARD_NUMBER_PATTERN` to `lib/constants/account.ts`, `bankCardAdd` to `BACKEND_PATHS`, `BFF_ROUTES.bankCard`, then `app/api/bank-card/route.ts` (contracts §2 bis); T084 passes
- [X] T086 [US5] Create `features/account/components/AddCardForm.tsx` (client: holder, number with `inputMode="numeric"` and `autoComplete="off"`, expiry, network; Zod validation with errors linked by `aria-describedby`; test-card notice « 1111 1111 1111 1111 paie, tout autre numéro est refusé — n'entre jamais une vraie carte »; replacing asks for confirmation; number cleared from state after sending, success or failure; `?returnTo=` checked with `safeCallbackPath` and followed after success) and wire it into `BankCardPanel`; component tests with jest-axe in `tests/unit/account/add-card-form.test.tsx` (number never rendered back, nothing written to `sessionStorage` / `localStorage`, previous card kept on failure)
- [X] T087 [US5] No Stripe leftovers: no `@stripe/*` dependency, no Stripe origin in `lib/security/csp.ts` / `proxy.ts` (test that `/account/card` keeps the strict CSP); update the payment-step notice of the checkout (`SAVED_CARD_MESSAGES`) to the test-card wording
- [ ] T088 (blocked: backend prompt §12, delete has no effect) [US5] E2E `tests/e2e/bank-card-add.spec.ts`: account without card → `/checkout` shows « Ajouter une carte » → add 1111 1111 1111 1111 → back to the checkout → order → « Payée »; replace with 4242 4242 4242 4242 → order → « Paiement refusé » → replace with 1111… → « Relancer le paiement » → « Payée »; record every request to `localhost:3000` and assert the number only appears in the body of `POST /api/bank-card` (SC-008); fill quickstart §5 US5, commit `feat(account): add and replace the saved card`, stop and report

**Checkpoint**: all five stories delivered.

---

## Phase 7 bis: User Story 6 - Ma wishlist (Priority: P2, added 2026-10-14)

**Goal**: a heart on every product card and on the product page adds or removes the product from the wishlist (optimistic, rolled back on refusal); « Ma wishlist » (`/account/wishlist`) lists the products, newest first, paginated, with « Ajouter au panier » and « Retirer »; a visitor signs in and the add is replayed once.

**Independent Test**: signed in, heart two catalog products, open « Ma wishlist » and see both (latest first); remove one, add the other to the cart; reload: one product left, heart filled on its card (quickstart §3 US6).

### Tests for User Story 6 ⚠️

- [X] T089 [P] [US6] Schema and endpoint tests with MSW in `tests/unit/api/wishlist-endpoints.test.ts`: `WishlistItemSchema` / `WishlistPageSchema` accept a `WishlistResponseDto` page; `getMyWishlist(token, page)` (0-based page, `size=WISHLIST_PAGE_SIZE`, `sort=WISHLIST_SORT`, `no-store`), `getWishlistProductUuids(token)` (`size=WISHLIST_IDS_MAX`), `addToWishlist` (409 `PRODUCT_ALREADY_IN_WISHLIST` → resolves), `removeFromWishlist` (404 → resolves); `Authorization` present, non-conforming response → `unavailable`; mapping `PRODUCT_ALREADY_IN_WISHLIST` → `FrontErrorCode.ALREADY_EXISTS` in `tests/unit/api/errors.test.ts`
- [X] T090 [P] [US6] Route tests in `tests/unit/api/bff-wishlist-routes.test.ts`: `GET /api/wishlist/ids` (200 list, no session → 401, 503), `PUT` / `DELETE /api/wishlist/[productUuid]` (invalid UUID → 400 without backend call, 204, 409 absorbed, 404 on PUT → `not-found`, 404 on DELETE absorbed, 429 with `retryAfterSeconds`); `Cache-Control: no-store`
- [X] T091 [P] [US6] Client tests in `tests/unit/wishlist/`: `wishlist-pending.test.ts` (read / write / clear under `StorageKey.WISHLIST_PENDING`, tampered value removed, blocked storage); `use-wishlist.test.tsx` (ids query disabled for a visitor, optimistic toggle then rollback on error, 409 kept as added, one query shared by several buttons); `wishlist-components.test.tsx` with jest-axe (`WishlistButton` name and `aria-pressed`, visitor → stores the pending add and goes to `loginPath(current path)`; `WishlistList` rows, unavailable product → add-to-cart disabled, empty state, pagination links)

### Implementation for User Story 6

- [X] T092 [US6] Foundations: `lib/constants/wishlist.ts` (`WISHLIST_PAGE_SIZE`, `WISHLIST_IDS_MAX`, `WISHLIST_SORT`), `ACCOUNT_PATHS.wishlist`, `BFF_ROUTES.wishlistIds` / `.wishlistItem(uuid)`, `BACKEND_PATHS.wishlistAdd(uuid)` / `.wishlistRemove(uuid)` / `.wishlistMine`, `QueryKey.WISHLIST`, `StorageKey.WISHLIST_PENDING`, mapping `PRODUCT_ALREADY_IN_WISHLIST` → `ALREADY_EXISTS`; `lib/schemas/wishlist.ts`, `WishlistPendingSchema` in `lib/schemas/storage.ts`, `lib/api/endpoints/wishlist.ts` (`server-only`, logger per contracts §5); T089 passes
- [X] T093 [US6] Routes `app/api/wishlist/ids/route.ts` and `app/api/wishlist/[productUuid]/route.ts` (contracts §1, `jsonOk` / `jsonError`, `getAccessTokenOrThrow`); T090 passes
- [X] T094 [US6] `features/wishlist/messages.ts` (`WISHLIST_MESSAGES`, French, tutoiement), `features/wishlist/wishlist-pending.ts`, `features/wishlist/hooks/useWishlist.ts` (`useWishlistIds`, `useToggleWishlist`), `features/wishlist/components/WishlistButton.tsx` (heart from `lucide-react`, filled state, theme tokens, `useMotionTokens()` pop with a static version) and `WishlistPendingReplayer.tsx` mounted next to `GuestCartMerger`; wire the button into `features/catalog/components/ProductCard.tsx` and `ProductDetails.tsx` without breaking the card link (button outside the link or `stopPropagation`); T091 passes for these
- [X] T095 [US6] Page `app/(account)/account/wishlist/page.tsx` (Server Component, `?page=` validated, `PageShell` + `PageHeader` + breadcrumb, metadata from `WISHLIST_MESSAGES`, `robots: { index: false }`), `features/wishlist/wishlist-view.ts` (`toWishlistRows`, availability from `GET /product/availability`), `features/wishlist/components/WishlistList.tsx` (rows, « Ajouter au panier » through `useCart`, « Retirer » through `useToggleWishlist` then `router.refresh()`, `EmptyState`, pagination); link « Ma wishlist » in `features/auth/components/AccountMenu.tsx`; T091 passes
- [X] T096 [US6] E2E `tests/e2e/wishlist.spec.ts` (unique account): heart two products in the catalog → « Ma wishlist » lists them newest first → remove one, add the other to the cart (cart badge) → reload → one product, heart filled on its card; visitor heart → login → back → product in the wishlist; axe on `/account/wishlist` (empty and filled)
- [X] T097 [US6] Run `wishlist.spec.ts` (`--workers=1`), review screenshots (catalog hearts, product page, wishlist filled and empty), fill quickstart §5 US6, commit `feat(wishlist): heart on products and « Ma wishlist » page`, stop and report

---

## Phase 7 ter: Structured stock shortage (backend `f582c3a`, prompt §11, added 2026-10-20)

- [X] T099 Read `details.items[] = { productUuid, requested, available }` of `409 NOT_ENOUGH_STOCK` (backend `ErrorDetailsDto` / `StockShortageDto`, absent on other errors): `StockShortageSchema` in `lib/schemas/error.ts` (or the existing error schema), carried by `ApiError` / `BffError` as `shortages`, relayed by the BFF in its error body; order edit flags exactly the short lines with « Il n'en reste que N » (fallback to the current « lignes ajoutées ou augmentées » when `details` is absent); cart and checkout `?issue=stock` show the remaining quantity of the named line; unit tests (schema, BFF relay, edit form, cart banner) and the stock case of `orders.spec.ts` if reproducible; update spec « Dépendances backend » (§11 delivered); commit `feat(orders): flag the exact line out of stock`

---

## Phase 8: Interface vivante et cohérente

**Purpose**: `docs/speckit-prompts-lot2.md` §6 applied to the pages of this feature, with the **frontend-design** skill and the « Aurora Glow » annex of `specs/001-catalog-auth-cart/spec.md`. Every value through `lib/theme/theme.config.ts`, `useEffectiveEffects()` and `useMotionTokens()`; every effect has a static version and a test per level.

- [ ] T071 Visual audit: screenshots (verification server on 3123) of the cart (guest, signed in, with discount, with issue banner), each checkout step, the confirmation (pending, paid, failed, timeout), « Mes commandes » (empty, filled, filtered), detail (recent, old, each outcome), edit, profile, card (with and without) into `specs/003-account-orders/screenshots/audit/`, reviewed and commented in quickstart §5: what « fait vide » and what is inconsistent (spacing, radii, titles, buttons, widths)
- [ ] T072 Fill without inventing: the checkout shows the cart lines with images and the shipping promise; the confirmation shows next steps and a link to the order and to the catalog; « Mes commandes » and the detail show real data only (order lines, status help); empty states invite to act; no fictitious figure
- [ ] T073 Consistency: same page headers (breadcrumb, `LiveTitle`, subtitle), glass cards, buttons (gradient CTA + `MagneticButton` for « Passer commande » and « Valider la commande »), empty states, skeletons (`skeleton-shimmer`) for the quote and the order list, same content width, same tables, in `features/checkout/components`, `features/orders/components`, `features/account/components`, `app/(shop)/cart/page.tsx`
- [ ] T074 One orchestrated animation per page: checkout step transitions (fold / unfold) and summary amounts cross-fade, timeline filling step by step on the detail, cascade of the order list (`RevealGroup`), card panel entrance; no decorative cascade on every element; static versions when effects are reduced, off or `prefers-reduced-motion`
- [ ] T075 Signature effects where they make sense: `TiltCard` on product thumbnails of the checkout summary and order lines; aurora halos and dot grid behind account pages (lighter version); no heavy effect added to the checkout
- [ ] T076 Form micro-interactions: validation appearing softly, animated success (profile saved, card updated, order edited), loading state on every submit button, optional UI sound (`useUiSound`) on order confirmed and payment succeeded
- [ ] T077 Tests: one test per effect level for each new effect in `tests/unit/effects/account-orders-effects-levels.test.tsx`; extend `tests/e2e/a11y.spec.ts` to every new page (helper waits for fades), `tests/e2e/long-tasks.spec.ts` to the checkout and the order detail; Lighthouse on a production build (`NEXT_DIST_DIR=.next-prod npx next build`, `next start` on another port) for cart, checkout and « Mes commandes » (budgets LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms) recorded in quickstart §5
- [ ] T078 Checkpoint with the user (in French), before / after screenshots in `specs/003-account-orders/screenshots/after/`

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T079 [P] Update `docs/backend/api-map.md` §F (quote, shipping options and order breakdown now used by the front; structured profile address, phone read-back, payment type on `OrderResponseDto` and quote of an order update listed as backend dependencies) and check `docs/backend/backend-prompts-lot2.md` §9 matches the decision of 2026-10-14 (fixed delays from configuration, cosmetic store pickup)
- [ ] T080 [P] TSDoc and constants audit of every file touched by the feature (no magic value, no raw visual value, `@see` to spec / contract / backend file, logs free of personal data), fixing what `npm run lint` does not catch
- [ ] T081 Full run: `npm run typecheck`, `npm run lint`, `npm run test`, then every Playwright spec one by one (`--workers=1`, one-minute pause between specs that create accounts); `git checkout -- tsconfig.json` and remove `.next-verify` after the verification server; complete quickstart §5 with the date, counts and remaining manual points
- [ ] T082 Final commit `docs: wrap up feature 003` and checkpoint with the user (in French)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: after Setup — blocks every story
- **US1 (Phase 3)**: after Foundational
- **US2 (Phase 4)**: after US1 (the block lives in the cart summary and the checkout summary, and uses `useQuote` / `usePlaceOrder`)
- **US3 (Phase 5)**: after Foundational; reuses `PaymentTracker` / `useOrderStatus` and the step components of US1 for retry and edit — best after US1; needs orders to exist (e2e fixture places them through the BFF)
- **US4 (Phase 6)**: after Foundational; independent of US1–US3 except for the account shell (T050): if US3 is not done, create `AccountNav` and `app/(account)/account/layout.tsx` here
- **US6 (Phase 7 bis, wishlist)**: after Foundational; independent of US2–US5 (own files except `ProductCard`, `ProductDetails`, `AccountMenu` and the shared constants); the account navigation of US3 gets a « Ma wishlist » entry when it lands
- **US5 (Phase 7)**: after Foundational; same remark about the account shell; the card form tasks T084–T088 no longer wait for the backend (Stripe flow dropped, `ae1d263`), and T083 (US1 follow-up) needs the read part of T066
- **Interface vivante (Phase 8)**: after the stories it decorates
- **Polish (Phase 9)**: last

### Within Each User Story

- Tests first (must fail) → schemas and pure functions → server code (endpoints, routes, actions) → hooks → components → pages → e2e run, quickstart update, commit, stop and report

### Parallel Opportunities

- Foundational: T003–T007, T009, T011, T013 in parallel; then T008, T010, T012, T014
- US1: T015–T021 tests in parallel; T022–T025 in parallel; then T026 → T027 → T028–T029 → T030–T032
- US2: T034–T036 in parallel; T037 then T038 → T039
- US3: T041–T045 in parallel; T046–T048 in parallel; then T049 → T050 → T051–T053
- US4: T055–T057 in parallel; T058–T059 in parallel; then T060 → T061
- US5: T063–T065 in parallel; T066–T067 in parallel; then T068 → T069; card form T084 → T085 → T086 / T087 → T088
- US4 and US5 can be built in parallel with each other once the account shell exists
- Phase 8: T072–T076 in parallel after T071

---

## Parallel Example: User Story 1

```bash
# Tests first, together:
Task: "Unit tests tests/unit/checkout/quote-view.test.ts"
Task: "Unit tests tests/unit/checkout/shipping-choices.test.ts"
Task: "Unit tests tests/unit/checkout/checkout-draft.test.ts"
Task: "Route tests tests/unit/api/bff-checkout-routes.test.ts"
Task: "Hook tests tests/unit/checkout/checkout-hooks.test.tsx"
Task: "Component tests tests/unit/checkout/checkout-components.test.tsx"
Task: "E2E tests/e2e/checkout.spec.ts"

# Then, together:
Task: "Create features/checkout/messages.ts"
Task: "Create features/checkout/quote-view.ts"
Task: "Extend lib/schemas/shipping.ts and create features/checkout/shipping-choices.ts"
Task: "Create features/checkout/checkout-draft.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Unit tests tests/unit/orders/order-view.test.ts"
Task: "Unit tests tests/unit/orders/order-edit.test.ts"
Task: "Route tests tests/unit/api/bff-orders-routes.test.ts"
Task: "Component tests tests/unit/orders/orders-components.test.tsx"
Task: "E2E tests/e2e/orders.spec.ts"
Task: "Create features/orders/messages.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **STOP and VALIDATE** (quickstart §3 US1, `checkout.spec.ts`)
3. Demo: an order placed from the cart, priced by the backend, paid and confirmed

### Incremental Delivery (one story per conversation, commit at the end of each)

1. Setup + Foundational
2. US1 → checkout (MVP)
3. US2 → discount
4. US3 → my orders
5. US4 → profile
6. US5 → saved card
6 bis. US6 → wishlist (added 2026-10-14, implemented right after US2)
7. Phase 8 → « Interface vivante et cohérente », before / after screenshots
8. Phase 9 → docs, full run, wrap-up

---

## Notes

- [P] tasks = different files, no dependency on incomplete tasks
- Verification method of `CLAUDE.md` and memory « local-env-quirks »: sign-in only works on port 3000 (reuse the user's `next dev` if it runs, otherwise start one and stop only that PID); verification server `next dev -p 3123` with `NEXT_DIST_DIR=.next-verify`; never kill other processes; unique test account names; registrations limited to 5/min/IP
- Payment is simulated server-side: `PAYMENT_FAILED` cannot be forced from the front; the failed-payment and retry paths are covered by unit tests with MSW and checked manually only if the backend configuration allows a failing payment method (otherwise « non testable » in quickstart §5)
- Store pickup is displayed greyed out only; it is never sent to the backend
- UI tasks (T028–T032, T038–T039, T050–T053, T061, T069, Phase 8) are implemented with the **frontend-design** skill and the « Aurora Glow » annex as reference
