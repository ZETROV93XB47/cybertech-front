# cybertech-front Constitution

Front Next.js de cybertech, plateforme e-commerce pédagogique de matériel informatique.
Le backend Spring Boot (Keycloak, MySQL, Redis, Elasticsearch, Stripe) existe déjà et fait foi ;
il est décrit dans `docs/backend/api-map.md` et `docs/backend/analysis.md`. Il n'est jamais
modifié depuis ce repo.

## Core Principles

### I. TypeScript strict

- `tsconfig.json` MUST activer `"strict": true`, `"noUncheckedIndexedAccess": true` et
  `"exactOptionalPropertyTypes": true`.
- Aucun `any` (explicite ou implicite) ni `@ts-ignore` n'est toléré ; on utilise `unknown`
  puis du narrowing. ESLint MUST bloquer `@typescript-eslint/no-explicit-any` en erreur.

**Pourquoi** : les données traversent trois frontières (navigateur, BFF, Spring) ; le typage
strict est le premier filet contre les erreurs de contrat.

### II. Next.js App Router, dernière version stable

- Next.js 16.x (dernière stable au 2026-10-13), App Router uniquement.
- Server Components par défaut. `"use client"` est réservé à l'interactivité : état local,
  événements, effets visuels, TanStack Query.
- Les routes privées MUST être protégées dans `proxy.ts` (anciennement `middleware.ts`)
  ET par une vérification de session côté serveur dans chaque layout ou page privé.

**Pourquoi** : le rendu serveur garde les secrets côté serveur et améliore le LCP ; la double
vérification évite qu'un contournement du proxy expose une page privée.

### III. Pattern BFF obligatoire

- Le navigateur n'appelle JAMAIS le backend Spring ni Keycloak en direct pour des données ;
  seules les redirections OIDC passent par le navigateur.
- Tous les appels passent par des Route Handlers (`app/api/*`) ou des Server Actions, qui
  ajoutent `Authorization: Bearer <access_token>` et `X-API-VERSION: 1.0`.
- Un seul client HTTP serveur (`lib/api/`) centralise base URL, en-têtes, timeouts, parsing
  et mapping des erreurs. Ce code MUST être marqué `import "server-only"`.

**Pourquoi** : les tokens ne quittent jamais le serveur, l'URL du backend n'est pas exposée et
la gestion des erreurs reste en un seul endroit.

### IV. Session et tokens

- Authentification OIDC Keycloak (Authorization Code + PKCE) via Auth.js v5, client
  confidentiel `cybertech-front-client`.
- Les tokens (access, refresh, id) vivent uniquement côté serveur, dans une session en cookie
  chiffré httpOnly, Secure (hors localhost), SameSite=Lax. Ils ne sont JAMAIS placés dans
  `localStorage` ou `sessionStorage`, ni exposés au JavaScript client.
- Le refresh est automatique, côté serveur, avant expiration (access token Keycloak = 5 min).
- Des données non sensibles (identifiants produit et quantités du panier invité, derniers
  produits consultés) MAY être stockées côté navigateur ; elles sont revalidées par Zod à
  chaque lecture et ne font jamais foi (voir `docs/guest-cart.md`).

**Pourquoi** : un token lisible en JavaScript est volable par XSS ; un cookie httpOnly ne l'est pas.

### V. Le contrat d'API fait foi

- Les types sont générés depuis l'OpenAPI du backend (`openapi-typescript` sur `/v3/api-docs`
  ou `docs/openapi/openapi.yaml`), à défaut dérivés de `docs/backend/api-map.md`.
- Chaque réponse backend MUST être validée par un schéma Zod avant usage. Chaque entrée
  utilisateur MUST être validée par Zod avec les mêmes contraintes que Bean Validation
  (tailles, regex, min/max).
- Le front ne recalcule jamais un montant faisant foi (totaux, remises) : il affiche ceux du
  backend. Seule exception : le total « estimé » du panier invité, signalé comme tel.

**Pourquoi** : le backend est la source de vérité ; une divergence de contrat doit échouer
bruyamment à la frontière, pas silencieusement dans l'UI.

### VI. Configuration

- Les variables d'environnement sont validées par Zod au démarrage (`lib/env.ts`) ;
  l'application MUST refuser de démarrer si une variable manque ou est invalide.
- Seules les variables `NEXT_PUBLIC_*` explicitement listées sont exposées au client.

**Pourquoi** : une configuration fausse doit casser au démarrage, pas à la première requête
en production.

### VII. Tests

- Vitest + Testing Library pour l'unitaire : schémas Zod, mappers d'erreurs, composants, hooks.
  Les appels backend sont mockés au niveau HTTP (MSW).
- Playwright pour les parcours critiques : catalogue → fiche produit, inscription,
  connexion/déconnexion, panier (invité puis connecté), session expirée.
- Un comportement sans test n'est pas terminé.

**Pourquoi** : les parcours d'achat et d'authentification sont ceux dont la régression coûte
le plus cher.

### VIII. Accessibilité

- WCAG 2.1 AA : contrastes, focus visible, navigation clavier complète, rôles ARIA, libellés
  de formulaires, annonces `aria-live` pour le panier et les erreurs.
- `prefers-reduced-motion` MUST être respecté par TOUTES les animations et effets
  (canvas figé, transitions réduites à des fondus).

**Pourquoi** : la direction artistique est riche en mouvement ; elle ne doit exclure personne.

### IX. Performance

- Budgets Core Web Vitals : LCP < 2,5 s, INP < 200 ms, CLS < 0,1, mesurés en CI avec
  Lighthouse sur les pages catalogue et produit.
- Les effets lourds (canvas, WebGL, smooth scroll) sont chargés en différé (`next/dynamic`,
  `ssr: false`), mis en pause quand l'onglet est inactif (`visibilitychange`) ou hors viewport ;
  60 fps visés ; aucun effet ne bloque le thread principal plus de 50 ms.
- Images via `next/image` avec dimensions explicites.

**Pourquoi** : un site « vivant » qui rame perd l'effet recherché et les ventes.

### X. Conteneurisation

- `output: "standalone"` et Dockerfile multi-stage (deps → build → runner non-root).
- L'image MUST être compatible avec le chart Helm existant `front-app-chart` du backend :
  port 3000, variables `AUTH_*`, sondes HTTP.

**Pourquoi** : le déploiement Kubernetes est déjà préparé côté backend ; le front s'y insère
sans adaptation.

### XI. Code pédagogique

- Code lisible, nommage explicite, commentaires sur les choix non évidents (le pourquoi, pas
  le quoi). Pas d'abstraction prématurée.
- Documentation et commentaires en français, identifiants techniques en anglais.

**Pourquoi** : le projet sert à apprendre ; le code doit pouvoir être lu et expliqué.

## Contraintes techniques et sécurité

- Sources de vérité : `docs/backend/api-map.md`, `docs/backend/analysis.md`,
  `docs/guest-cart.md` et l'OpenAPI du backend. Une capacité absente du backend est soit
  exclue, soit portée explicitement par le BFF et documentée.
- Les erreurs backend sont aiguillées sur `errorCode` (jamais sur le texte du message) et
  traduites en messages français centralisés.
- Langue de l'interface : français uniquement, tutoiement partout, ton chaleureux et jamais
  culpabilisant.
- En-têtes de sécurité dans `next.config` (CSP avec nonce, `frame-ancestors 'none'`,
  Referrer-Policy, Permissions-Policy). Aucune donnée privée dans une page statique ou ISR.

## Workflow et portes qualité

- Chaque fonctionnalité suit Spec Kit : `/speckit-specify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`. Le plan MUST passer le « Constitution Check ».
- Une tâche n'est terminée que si `tsc --noEmit`, ESLint, Vitest et les tests Playwright
  concernés passent.
- Toute PR vérifie la conformité aux principes I à XI ; une violation non justifiée bloque
  la fusion.

## Governance

- Cette constitution prime sur toute autre pratique du repo.
- Toute dérogation à un principe MUST être justifiée dans la section « Complexity Tracking »
  du plan concerné et approuvée par le propriétaire du projet.
- Amendement : modification de ce fichier dans une PR dédiée, avec rapport d'impact et mise
  à jour des modèles Spec Kit si nécessaire.
- Versionnement sémantique : MAJOR pour un principe retiré ou redéfini de façon incompatible,
  MINOR pour un principe ou une section ajouté ou nettement étendu, PATCH pour une
  clarification ou une correction de forme.

**Version**: 1.0.0 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-10-13
