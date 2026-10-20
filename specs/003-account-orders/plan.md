# Implementation Plan: Mon compte et mes commandes

**Branch**: `003-account-orders` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-account-orders/spec.md`

## Summary

Fermer la boucle d'achat : bouton « Passer commande » et bloc réduction sur le panier, tunnel
sur une seule page (adresse, livraison, paiement) chiffré en continu par le devis du backend
(`POST /order/quote`), validation sans doublon, confirmation qui suit le paiement jusqu'à son
issue avec relance ; espace « Mon compte » : commandes (liste filtrée, détail avec
décomposition du total et frise, modification avec ajout de produits, annulation), profil,
carte enregistrée masquée. Approche : Server Components pour toutes les lectures privées
(`no-store`, jeton de l'utilisateur), un îlot client pour le tunnel et la modification de
commande (TanStack Query pour le devis annulable et le sondage du statut), Server Actions pour
profil et carte, six nouvelles routes BFF, pages privées gardées par `proxy.ts` puis par le
layout. Aucune dépendance ajoutée : la carte s'ajoute dans un formulaire de « Ma carte » envoyé au
backend par le BFF (R21 révisée, constitution V v3.0.0). Aucun montant calculé par le front (le montant
manquant pour un minimum de commande est une différence informative de deux valeurs du
devis). Décisions : [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x strict, Node 24 LTS, React 19.3, Next.js 16.4 (App Router)
— inchangé

**Primary Dependencies**: celles du lot 1 et de la 002 : zod 4.6, @tanstack/react-query
5.104, next-auth 5 beta, tailwindcss 4.3, radix-ui (Dialog, AlertDialog, RadioGroup, Select),
motion 14.1, sonner, pino, openapi-typescript

**Storage**: aucune base. Navigateur (`sessionStorage`, non sensible, revalidé par Zod) :
`ct_discount_v1` (clé de réduction), `ct_checkout_v1` (brouillon du tunnel sans adresse) ;
clés existantes inchangées

**Testing**: Vitest + Testing Library + MSW + jest-axe (unitaire), Playwright +
@axe-core/playwright contre la stack locale (`--workers=1`), Lighthouse desktop manuel

**Target Platform**: navigateurs desktop récents, fenêtre ≥ 1 024 px ; exécution locale

**Project Type**: application web (front Next.js + BFF intégré), backend externe existant

**Performance Goals**: budgets du lot 1 (LCP < 2,5 s, CLS < 0,1, TBT ≤ 200 ms) sur panier,
tunnel et « Mes commandes » ; nouveaux montants affichés < 1 s après un changement (SC-003) ;
issue du paiement < 15 s dans 95 % des cas (SC-005)

**Constraints**: backend en lecture seule ; paiement Stripe en mode test côté serveur, avec une
carte enregistrée obligatoire (son numéro décide de l'issue, backend `ae1d263`) ; place sans clé
d'idempotence ; devis limité à 60 req/min, place à 30 req/min ; adresse du profil aplatie et
téléphone jamais renvoyé ; moyen de paiement absent de `OrderResponseDto` ; aucun devis pour
une commande existante ; délais de livraison pas encore fournis par le backend

**Scale/Scope**: 8 pages ajoutées (tunnel, confirmation, profil, commandes, détail,
modification, carte, redirection `/account`), 1 page modifiée (panier), en-tête ; 6 routes BFF,
3 Server Actions, 12 endpoints backend nouvellement consommés ; 5 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification dans ce plan | Statut |
|---|---|---|
| I. TypeScript strict | Aucun relâchement ; schémas Zod pour chaque DTO, unions discriminées pour `OrderView.breakdown` et les résultats d'actions | ✅ |
| II. App Router | Lectures en Server Components ; `"use client"` limité à `CheckoutFlow`, `DiscountBlock`, `PaymentTracker`, `OrderEditForm`, dialogues de confirmation ; pages privées gardées par `proxy.ts` **et** `requireSession` dans `app/(account)/layout.tsx` (R1) | ✅ |
| III. BFF | Navigateur → `/api/checkout/*`, `/api/orders/*`, Server Actions ; jeton ajouté côté serveur ; jamais d'appel direct à Spring | ✅ |
| IV. Session et tokens | Aucun jeton côté client ; `sessionStorage` limité à une clé de réduction et à des choix de livraison/paiement ; l'adresse n'est pas stockée côté navigateur (R9) | ✅ |
| V. Contrat d'API | Schémas Zod depuis les DTO, comparés à `schema.d.ts` (test de type) ; montants affichés = devis ou commande du backend ; l'exception « montant estimé » n'est plus utilisée dans le tunnel ; montant manquant = différence informative non facturée (R6) ; v3.0.0 : carte saisie dans le seul formulaire « Ajouter une carte », envoyée au backend par le BFF, numéro jamais loggué, stocké ni réaffiché (R21, FR-032) | ✅ |
| VI. Configuration | Aucune nouvelle variable ; URL de la console de compte dérivée de `AUTH_KEYCLOAK_ISSUER` | ✅ |
| VII. Tests | Unitaires (vues, adresse, devis, sondage, mapping d'erreurs, composants + axe) ; 5 parcours Playwright (commande, réduction, commandes, profil, carte) | ✅ |
| VIII. Accessibilité | Indicateur d'étape, `aria-live` pour montants et statuts, option grisée annoncée, `AlertDialog` pour annuler/supprimer, erreurs reliées aux champs, frise lisible par les lecteurs d'écran, reduced-motion | ✅ |
| IX. Performance | Pas d'effet lourd ajouté ; lectures parallèles côté serveur ; sondage suspendu onglet masqué ; Lighthouse en fin de story | ✅ |
| X. Exécution locale | Inchangé | ✅ |
| XI. Code pédagogique | Code et logs en anglais ; textes dans `features/checkout/messages.ts`, `features/orders/messages.ts`, `features/account/messages.ts` | ✅ |
| XII. Code propre et observable | Constantes listées (data-model, section Constantes) ; enums `OrderStatus`, `PaymentType`, `CheckoutStep`, `OrderOutcome`, `CartIssue`, `StatusTone`, ajouts `NavSection.ACCOUNT`, `FrontErrorCode`, `StorageKey`, `QueryKey` ; `switch` exhaustifs ; logs devis / commande / modification / annulation avec UUID masqués, jamais d'adresse, d'email ni de carte | ✅ |
| XIII. Interface paramétrable | Tunnel, récapitulatif, frise et états en tokens du thème ; animations via `useMotionTokens()` / `useEffectiveEffects()` avec version statique | ✅ |
| Contraintes (tutoiement, CSP, `errorCode`) | Messages au tutoiement ; lien vers la console Keycloak déjà autorisé par la CSP (origine de l'émetteur) ; origines Stripe ajoutées à la CSP sur `/account/card` seulement (R21) ; erreurs aiguillées sur `errorCode` | ✅ |

Gate initial : **PASS**. Re-vérification après Phase 1 : **PASS** (aucune dérogation).

## Project Structure

### Documentation (this feature)

```text
specs/003-account-orders/
├── plan.md              # ce fichier
├── research.md          # Phase 0 : décisions R1–R20
├── data-model.md        # Phase 1 : enums, schémas, vues, transitions, constantes
├── quickstart.md        # Phase 1 : guide de validation
├── contracts/
│   └── bff-routes.md    # routes BFF, Server Actions, appels serveur, proxy
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Fichiers ajoutés (+) ou modifiés (~) ; le reste est inchangé.

```text
proxy.ts                                     ~ garde /account et /checkout (R1)
app/
├── (shop)/cart/page.tsx                     ~ PageShell, DiscountBlock, « Passer commande » (R19)
├── (account)/                               + groupe privé
│   ├── layout.tsx                           + requireSession, no-store
│   ├── checkout/page.tsx                    + lectures parallèles, CheckoutFlow (R3)
│   ├── checkout/confirmation/[uuid]/page.tsx + PaymentTracker (R11)
│   └── account/
│       ├── layout.tsx · page.tsx            + AccountNav, redirection vers orders
│       ├── orders/page.tsx                  + liste filtrée (R12)
│       ├── orders/[uuid]/page.tsx           + détail, frise, actions (R13, R15)
│       ├── orders/[uuid]/edit/page.tsx      + OrderEditForm (R14)
│       ├── profile/page.tsx                 + ProfileForm (R17)
│       └── card/page.tsx                    + BankCardPanel, AddCardForm (R17, R21)
└── api/
    ├── bank-card/route.ts                   + POST carte de test (R21)
    ├── checkout/quote/route.ts              + POST
    ├── checkout/place/route.ts              + POST
    └── orders/[uuid]/
        ├── route.ts                         + POST (modification)
        ├── status/route.ts                  + GET
        ├── retry-payment/route.ts           + POST
        └── cancel/route.ts                  + POST
features/
├── checkout/                                + tunnel, réduction, devis, confirmation
│   ├── quote-view.ts · shipping-choices.ts · checkout-draft.ts · discount-storage.ts ·
│   │   discount-offer.ts
│   ├── hooks/ useQuote.ts · usePlaceOrder.ts · useOrderStatus.ts
│   ├── components/ CheckoutFlow · CheckoutStepPanel · AddressStep · ShippingStep ·
│   │   PaymentStep · CheckoutSummary · DiscountBlock · PaymentTracker
│   └── messages.ts
├── orders/                                  + mes commandes
│   ├── order-view.ts · order-timeline.ts · order-edit.ts
│   ├── components/ OrderList · OrderStatusFilter · OrderDetail · OrderBreakdown ·
│   │   OrderTimeline · OrderActions · CancelOrderDialog · OrderEditForm · ProductPicker
│   └── messages.ts
├── account/                                 + profil, carte, navigation du compte
│   ├── profile-view.ts · actions.ts
│   ├── components/ AccountNav · ProfileForm · BankCardPanel · DeleteCardDialog
│   └── messages.ts
├── cart/components/CartSummary.tsx          ~ DiscountBlock, bouton commande
└── auth/components/AccountMenu.tsx          ~ liens du compte
lib/
├── api/endpoints/ orders.ts + · bank-card.ts + · users.ts ~ (updateMe)
├── api/errors.ts                            ~ nouveaux codes front (R18)
├── schemas/ order.ts + · address.ts + · bank-card.ts + · user.ts ~ · shipping.ts ~ ·
│            discount.ts ~ · storage.ts ~
├── constants/ checkout.ts + · orders.ts + · account.ts + · discount.ts + · routes.ts ~ ·
│              api.ts ~ · security.ts ~ · auth.ts ~
├── address.ts                               + parseFlatAddress (R16)
└── enums/ order + (OrderStatus, PaymentType, OrderOutcome, StatusTone) · checkout + ·
           bank-card + · cart ~ (CartIssue) · nav-section ~ · error-code ~ · storage-key ~ ·
           query-key ~ · brand ~ (prérequis, 43 marques)
tests/
├── unit/checkout/ quote-view · shipping-choices · checkout-draft · discount-storage ·
│   use-quote (MSW, annulation) · use-order-status (sondage borné) · composants + axe
├── unit/orders/ order-view · order-timeline · order-edit · composants + axe
├── unit/account/ address · actions (MSW) · composants + axe
├── unit/api/ orders-endpoints · bff-checkout-routes · error-mapping (exhaustivité)
└── e2e/ checkout · discount · orders · profile · bank-card + ; a11y · navigation ~
```

**Structure Decision** : même projet unique Next.js. Trois domaines : `features/checkout/`
(tunnel, réduction, confirmation : tout ce qui précède et suit la création), `features/orders/`
(commandes existantes) et `features/account/` (profil, carte, navigation du compte). Le
groupe de routes `app/(account)/` porte la garde serveur unique des pages privées.

### Ajout US6 — Wishlist (2026-10-14, R22)

```text
app/(account)/account/wishlist/page.tsx      + « Ma wishlist », paginée (?page=)
app/api/wishlist/ids/route.ts                + GET
app/api/wishlist/[productUuid]/route.ts      + PUT, DELETE
features/wishlist/                           + wishlist-view.ts · wishlist-pending.ts ·
                                               hooks/useWishlist.ts · components/
                                               WishlistButton · WishlistList ·
                                               WishlistPendingReplayer · messages.ts
features/catalog/components/ProductCard.tsx  ~ cœur ; ProductDetails.tsx ~ cœur
features/auth/components/AccountMenu.tsx     ~ lien « Ma wishlist »
lib/ schemas/wishlist.ts + · api/endpoints/wishlist.ts + · constants/wishlist.ts +
```

## Mapping page → BFF → endpoint Spring

| Page / composant | Côté Next | Endpoint Spring | Cache |
|---|---|---|---|
| Panier – réduction | client → `POST /api/checkout/quote` | `POST /management/order/quote` | no-store |
| Panier / tunnel – campagnes | RSC → `getActiveDiscounts()` | `GET /discounts/active` | existant |
| Tunnel – préremplissage | RSC → `getMe`, `getAccountCart` | `GET /user/me`, `GET /cart/get` | no-store |
| Tunnel – livraison | RSC → `getShippingOptions()` | `GET /shipping/options` | 600 s (existant) |
| Tunnel – récapitulatif | client → `POST /api/checkout/quote` | `POST /management/order/quote` | no-store |
| Tunnel – validation | client → `POST /api/checkout/place` | `POST /management/order/place` | no-store |
| Confirmation | client → `GET /api/orders/{uuid}/status`, `POST …/retry-payment` | `GET /order/status/{uuid}`, `POST /order/retry-payment/{uuid}` | no-store |
| Mes commandes | RSC → `getMyOrders(params)` | `GET /management/order/mine` | no-store |
| Détail | RSC → `getOrder(uuid)` ; client → `POST /api/orders/{uuid}/cancel` | `GET /order/get/{uuid}`, `POST /order/cancel` | no-store |
| Modification | RSC → `getOrder` ; client → `GET /api/search`, `POST /api/orders/{uuid}` | `POST /product/search`, `POST /order/update` | no-store |
| Profil | RSC → `getMe` ; Server Action `updateProfile` | `GET /user/me`, `PATCH /user/me` | no-store |
| Carte | RSC → `getBankCard` ; Server Actions `updateBankCard`, `deleteBankCard` ; client → `POST /api/bank-card` (formulaire) | `GET /bank-card/get`, `PUT /bank-card/update`, `DELETE /bank-card/delete`, `POST /bank-card/add` | no-store |
| Tunnel – carte débitée | RSC → `getBankCard` | `GET /bank-card/get` | no-store |

Détail : [contracts/bff-routes.md](./contracts/bff-routes.md).

## Ordre de livraison (une user story par conversation)

0. **Prérequis** : enum `Brand` à 43 marques (`api-map.md` §E 29), garde des pages privées
   (proxy + layout), enums et schémas communs (commande, devis), codes d'erreur front.
1. **US1 Passer commande (P1)** : panier sur le gabarit commun et bouton, tunnel à une page,
   devis, livraison (options réelles, retrait grisé), validation, confirmation et relance.
   Livrable seul (sans réduction : `NO_DISCOUNT`).
2. **US2 Réduction (P1)** : `DiscountBlock` sur le panier et le récapitulatif, stockage de la
   clé, montant manquant, clé refusée, campagne expirée à la validation.
3. **US3 Mes commandes (P2)** : liste filtrée, détail, frise, annulation, modification avec
   ajout de produits, relance depuis le détail.
4. **US4 Profil (P2)** : affichage, découpage de l'adresse, Server Action, lien de mot de
   passe ; le tunnel préremplit déjà l'adresse depuis US1 (découpage livré en US1).
5. **US5 Carte (P3)** : affichage masqué, ajout et remplacement par le formulaire du site (R21
   révisée), modification, suppression, état « aucune carte » qui invite à
   ajouter une carte ; parcours e2e avec les cartes de test du backend (paiement accepté puis
   refusé et relancé).
6. **Phase « Interface vivante et cohérente »** (`docs/speckit-prompts-lot2.md` §6) : audit
   avec captures, animations orchestrées par surface, tests par niveau d'effet, axe, longues
   tâches, Lighthouse.

## Tests

- Unitaires : `toQuoteView` et `missingAmountForDiscount` (atteint, non atteint, sans
  minimum, `NO_DISCOUNT`) ; `buildShippingChoices` (prix réels, délais backend présents ou
  absents, retrait grisé) ; `parseFlatAddress` (rue avec virgule, ville composée, `"null"`,
  vide) ; `toOrderView` (avec et sans décomposition, issues, actions par statut) ; frise ;
  `buildOrderUpdateBody` (ajout d'un produit déjà présent, retrait, au moins une ligne) ;
  stockage de la réduction et du brouillon (valeurs trafiquées rejetées) ; `useQuote` (seul le
  dernier choix affiché, requête annulée) ; `useOrderStatus` (arrêt sur statut terminal et
  après 60 s) ; routes BFF avec MSW (succès, chaque `errorCode`, 401, 429) ; exhaustivité du
  mapping d'erreurs ; composants avec jest-axe ; effets par niveau.
- E2E (stack réelle, `--workers=1`, comptes uniques) : panier → tunnel → confirmation
  « Payée » avec total égal à celui de la commande ; réduction BLACK_FRIDAY (appliquée, minimum
  non atteint, clé inconnue) ; mes commandes (filtre, détail, modification avec ajout,
  annulation) ; profil (modification, préremplissage du tunnel) ; carte (si une carte de test
  existe) ; visiteur redirigé depuis `/account` et `/checkout` ; axe sur chaque nouvelle page.
- Lighthouse desktop en fin de story (quickstart).

## Complexity Tracking

Aucune violation de la constitution à justifier.
