# Implementation Plan: Notifications Web Push

**Branch**: `005-web-push-notifications` (pas de branche git, travail sur `main`) | **Date**:
2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-web-push-notifications/spec.md`

## Summary

Abonner le navigateur d'un client connecté aux notifications que le backend envoie déjà
(paiement confirmé, commande expédiée), uniquement après un clic : encart sur la page de
confirmation de commande et interrupteur dans le profil. Approche : un Service Worker en
JavaScript simple servi depuis `public/` (`sw.js` + fonctions pures dans `sw-core.js`, testées
sur le fichier servi), enregistré seulement quand il sert ; trois routes BFF
(`/api/notifications/push/…`) adossées à `lib/api/endpoints/push.ts` ; un hook
`usePushNotifications` partagé par l'encart et l'interrupteur, un composant `PushSync` qui
resynchronise l'abonnement au démarrage d'une session et après un renouvellement ; l'UUID
d'abonnement mémorisé en `localStorage` (`ct_push_v1`), transmis à `signOutEverywhere` pour
supprimer l'abonnement côté backend avant la fin de session, avec un délai borné. CSP
`worker-src 'self'`, en-têtes du SW dans `next.config.ts`. Aucune dépendance ajoutée.
Décisions : [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x strict, Node 24 LTS, React 19.3, Next.js 16.4 (App Router)
— inchangé ; JavaScript ES2022 avec `// @ts-check` pour le Service Worker (`public/`)

**Primary Dependencies**: inchangées : zod 4.6, next-auth 5 beta, radix-ui 1.8 (Switch),
tailwindcss 4.3, lucide-react, pino, openapi-typescript (types push déjà générés) ; `sharp`
(déjà présent via Next.js) pour générer une fois les icônes

**Storage**: `localStorage` `ct_push_v1` (UUID d'abonnement), `sessionStorage`
`ct_push_sync_v1` (resynchronisation faite) ; souscription gérée par le navigateur ; aucun
stockage serveur côté front

**Testing**: Vitest + Testing Library + MSW + jest-axe ; `node:vm` pour le Service Worker ;
test de type contre `schema.d.ts` ; Playwright (projet chromium, fausse souscription,
`grantPermissions`) ; validation manuelle avec de vraies clés VAPID et la Stripe CLI

**Target Platform**: navigateurs desktop récents (Chrome, Edge, Firefox, Safari 16+) sur
`localhost` ; iPhone/iPad : explication seule

**Project Type**: application web (Next.js + BFF intégré), backend externe en lecture seule

**Performance Goals**: aucun coût pour les visiteurs anonymes (pas de SW enregistré) ; aucune
requête au chargement d'une page hors resynchronisation (une fois par session) ; notification
affichée < 30 s après le paiement (SC-002, dépend surtout du backend et du service de push)

**Constraints**: demande d'autorisation uniquement dans un geste de l'utilisateur ; Service
Worker sans bundler ni module ES ; adresse d'abonnement jamais logguée ; déconnexion retardée
de 2 s au plus ; un compte = 5 navigateurs max (backend) ; texte des notifications fourni par le
backend

**Scale/Scope**: 3 routes BFF, 1 Server Action modifiée, 3 endpoints backend consommés ; 2 pages
modifiées (confirmation, profil), 1 composant global (`PushSync`), 1 formulaire modifié
(déconnexion) ; 2 fichiers de Service Worker, 2 icônes ; 3 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification dans ce plan | Statut |
|---|---|---|
| I. TypeScript strict | Schémas Zod pour chaque body, réponse et lecture de stockage ; `PushState` exhaustif avec `assertNever` ; le SW (JS) est hors `tsconfig` mais `// @ts-check` + JSDoc | ✅ |
| II. App Router | Pages restent des Server Components ; `"use client"` limité à `PushOptIn`, `PushToggle`, `PushSync`, champ caché de déconnexion ; pages déjà protégées par `proxy.ts` et leur layout | ✅ |
| III. BFF | Navigateur → `/api/notifications/push/*` et Server Action ; le SW n'appelle rien (il prévient les pages, R9) | ✅ |
| IV. Session et tokens | Aucun jeton côté client ; seul l'UUID d'abonnement (non sensible, sans droit sans session) est en `localStorage`, validé par Zod à chaque lecture | ✅ |
| V. Contrat d'API | Types générés déjà présents ; test de type du body ; Zod sur les réponses ; `uuid` exigé alors que l'OpenAPI le dit optionnel (échec bruyant si absent) | ✅ |
| VI. Configuration | Aucune variable d'environnement côté front (la clé publique vient du backend) | ✅ |
| VII. Tests | Unitaires (SW, routes, hook, `PushSync`, Server Action, composants + axe) ; parcours Playwright ; validation manuelle documentée | ✅ |
| VIII. Accessibilité | Interrupteur Radix au clavier avec libellé, états annoncés en `aria-live`, aucune animation ajoutée | ✅ |
| IX. Performance | SW enregistré à la demande, sans cache ni précache ; rien de lourd sur le thread principal | ✅ |
| X. Exécution locale | Fonctionne sur `localhost` sans HTTPS ; README complété | ✅ |
| XI. Code pédagogique | Code en anglais, textes dans `features/notifications/messages.ts` (tutoiement), choix commentés (geste utilisateur, `importScripts`, délai de déconnexion) | ✅ |
| XII. Code propre et observable | Constantes listées (data-model §5), enums `PushState`, `PushSupport`, `PushSwMessageType`, `StorageKey` complété ; logs `notifications.push` avec `maskPushEndpoint` et `maskUuid` ; SW : constantes nommées en tête de fichier, copies vérifiées par test | ✅ |
| XIII. Interface paramétrable | Surfaces `glass`, `Switch` et boutons existants, tokens du thème ; aucune valeur visuelle brute | ✅ |
| Contraintes (CSP, `errorCode`) | `worker-src 'self'` seulement, aucune origine tierce ; erreurs aiguillées sur `errorCode` (mapping existant) | ✅ |

Gate initial : **PASS**. Re-vérification après Phase 1 : **PASS** (aucune dérogation).

## Project Structure

### Documentation (this feature)

```text
specs/005-web-push-notifications/
├── plan.md              # ce fichier
├── research.md          # Phase 0 : R1–R15
├── data-model.md        # Phase 1 : enums, transitions, schémas, constantes
├── quickstart.md        # Phase 1 : validation manuelle et automatisée
├── contracts/
│   └── bff-routes.md    # routes BFF, Server Action, Service Worker, en-têtes
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Fichiers ajoutés (+) ou modifiés (~).

```text
app/
├── api/notifications/push/public-key/route.ts           + GET public
├── api/notifications/push/subscriptions/route.ts        + POST (USER)
├── api/notifications/push/subscriptions/[uuid]/route.ts + DELETE (USER, 404 → 204)
├── (account)/checkout/confirmation/[uuid]/page.tsx      ~ encart PushOptIn
├── (account)/account/profile/page.tsx                   ~ section PushToggle
└── providers.tsx                                        ~ <PushSync />
public/
├── sw.js                                                + écouteurs (R1, R9, R10)
├── sw-core.js                                           + fonctions pures (ctPushCore)
└── icons/ notification.svg · notification-192.png · notification-badge-96.png  +
scripts/generate-notification-icons.mjs                  + génération unique (sharp)
features/
├── notifications/                                       +
│   ├── push-support.ts        détection (R3)
│   ├── push-record.ts         ct_push_v1 / ct_push_sync_v1 (R6)
│   ├── push-client.ts         register, subscribe, base64UrlToBytes, appels BFF
│   ├── push-store.ts          store externe partagé (useSyncExternalStore)
│   ├── hooks/usePushNotifications.ts
│   ├── components/ PushOptIn · PushToggle · PushSync · PushSignOutField
│   └── messages.ts
└── auth/
    ├── actions.ts             ~ signOutEverywhere(formData) : DELETE borné avant signOut
    └── components/AccountMenuPanel.tsx ~ champ caché + nettoyage local
lib/
├── api/endpoints/push.ts      +
├── api/errors.ts              ~ commentaire « not used yet » retiré
├── schemas/push.ts            +
├── enums/push.ts              + · storage-key.ts ~ (PUSH, PUSH_SYNC)
├── constants/push.ts          + · api.ts ~ · routes.ts ~ · security.ts ~ (en-têtes SW)
├── security/csp.ts            ~ worker-src 'self'
└── log-safety.ts              ~ maskPushEndpoint
next.config.ts                 ~ en-têtes /sw.js, /sw-core.js
eslint.config.mjs              ~ bloc public/**/*.js (globales serviceworker)
README.md                      ~ HTTPS sauf localhost, clés VAPID locales
docs/backend/api-map.md        ~ section notifications push
tests/
├── unit/push/                 + sw-core, sw, routes, endpoints, schemas, support, record,
│                                usePushNotifications, PushSync, PushOptIn, PushToggle,
│                                push-contract.test-d.ts
├── unit/auth/                 ~ sign-out avec suppression d'abonnement
└── e2e/push-notifications.spec.ts +
```

**Structure Decision**: même organisation que les features 001 à 004 : routes BFF sous
`app/api/`, appels backend dans `lib/api/endpoints/`, une feature `features/notifications/`
pour l'état et l'interface ; seul `public/` reçoit du code nouveau (le Service Worker), ce qui
justifie le bloc ESLint dédié.

## Complexity Tracking

Aucune dérogation à la constitution.
