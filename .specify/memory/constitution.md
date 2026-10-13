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
  backend. Exception encadrée : un montant **estimé** (total du panier invité, économie, frais
  de port et total avant commande) MAY être calculé côté front tant que le backend n'expose pas
  de devis, à quatre conditions : il est affiché comme « estimé » ; il applique les règles du
  backend telles que documentées dans `docs/backend/api-map.md`, avec un test unitaire par
  règle ; il n'est jamais envoyé au backend ; il cède la place au montant renvoyé par le
  backend dès que celui-ci est connu.
- Aucun numéro de carte bancaire complet (PAN) ne transite par le front ni n'y est saisi : le
  front n'affiche que la carte masquée renvoyée par le backend.

**Pourquoi** : le backend est la source de vérité ; une divergence de contrat doit échouer
bruyamment à la frontière, pas silencieusement dans l'UI. Une estimation honnête et testée
vaut mieux qu'un total découvert après la commande ; un PAN qui ne passe jamais par le front ne
peut pas y fuiter (PCI-DSS).

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

- Cible : navigateur **desktop** uniquement (pas d'adaptation mobile).
- Budgets Core Web Vitals : LCP < 2,5 s, INP < 200 ms, CLS < 0,1, vérifiés **manuellement**
  avec Lighthouse (Chrome DevTools, mode desktop) sur les pages accueil, catalogue et produit
  à la fin de chaque user story.
- Les effets lourds (canvas, WebGL, smooth scroll) sont chargés en différé (`next/dynamic`,
  `ssr: false`), mis en pause quand l'onglet est inactif (`visibilitychange`) ou hors viewport ;
  60 fps visés ; aucun effet ne bloque le thread principal plus de 50 ms.
- Images via `next/image` avec dimensions explicites.

**Pourquoi** : un site « vivant » qui rame perd l'effet recherché et les ventes.

### X. Exécution locale

- Le projet tourne uniquement sur le poste du développeur : services du backend via le
  `docker-compose` du repo backend, application Spring lancée depuis IntelliJ (port 8081),
  front lancé avec `npm run dev` (port 3000).
- Pas de conteneurisation du front, pas de CI, pas de déploiement : aucun Dockerfile, chart
  Helm ni pipeline n'est produit tant que ce principe n'est pas amendé.
- Les noms de variables d'environnement restent ceux d'Auth.js (`AUTH_*`) pour ne pas fermer
  la porte à un déploiement ultérieur.

**Pourquoi** : projet pédagogique et personnel ; l'outillage de déploiement coûterait du temps
sans rien apporter à l'apprentissage visé.

### XI. Code pédagogique

- Code lisible, nommage explicite, commentaires sur les choix non évidents (le pourquoi, pas
  le quoi). Pas d'abstraction prématurée.
- **Code entièrement en anglais** : identifiants, commentaires, TSDoc, messages de log, messages
  d'exception internes, noms de fichiers et messages de commit.
- **Interface entièrement en français** : tout texte affiché à l'utilisateur (libellés, messages
  d'erreur, `aria-label`, métadonnées de page) est en français, au tutoiement, et centralisé dans
  les fichiers `messages.ts` — jamais écrit en dur dans un composant.
- La documentation projet (`docs/`, `specs/`, `README.md`) reste en français.

**Pourquoi** : le projet sert à apprendre ; le code doit pouvoir être lu et expliqué.

### XII. Code propre, explicite et observable

Niveau d'exigence calqué sur le backend Java (`CartServiceImp`, `CyberTechAppConstants`).

**Aucun magic number ni magic string**
- Toute valeur métier ou technique (durées, seuils, limites, tailles de page, clés de stockage,
  chemins d'API, codes, en-têtes) est une constante nommée en `SCREAMING_SNAKE_CASE`, typée,
  documentée par un commentaire TSDoc qui dit à quoi elle sert et d'où vient sa valeur
  (ex. « 300 s = `accessTokenLifespan` du realm Keycloak »).
- Les constantes vivent dans `lib/constants/` (par domaine : `api.ts`, `cart.ts`, `auth.ts`,
  `catalog.ts`, `preferences.ts`, `security.ts`, `storage-keys.ts`) ou en tête du module si elles lui
  sont privées. Les valeurs visuelles relèvent de `lib/theme/` (principe XIII).
- Les durées portent leur unité dans le nom (`ACCESS_TOKEN_REFRESH_MARGIN_MS`,
  `CATALOG_REVALIDATE_SECONDS`) ; séparateurs numériques pour la lisibilité (`8_000`).
- ESLint `@typescript-eslint/no-magic-numbers` MUST être en erreur (exceptions : `0`, `1`, `-1`,
  index de tableau, valeurs d'enum, tests).

**Enums pour tout ensemble fermé de valeurs**
- Tout ensemble fini de valeurs (statuts, codes d'erreur, catégories, marques, types d'action,
  clés de query, niveaux de disponibilité, sources de panier, niveaux de log…) est un
  **`enum` TypeScript à valeurs string** (`enum CartSource { GUEST = "guest", ACCOUNT = "account" }`).
  Pas d'enum numérique, pas de `const enum`, pas d'union de littéraux dupliquée ailleurs.
- Les enums alignés sur le backend reprennent exactement ses valeurs ; les schémas Zod sont
  construits depuis l'enum (`z.enum(Brand)`), jamais l'inverse.
- Tout `switch` sur un enum est exhaustif, terminé par `assertNever(value)`
  (règle ESLint `switch-exhaustiveness-check`).

**Code droit et structuré**
- Une fonction = une responsabilité ; retours anticipés plutôt qu'imbrication ; profondeur
  d'imbrication ≤ 3 ; pas de ternaire imbriqué ; fonctions de 40 lignes maximum (80 pour un
  composant `.tsx`, JSX compris).
- Paramètres et propriétés `readonly` par défaut ; `const` partout ; pas de mutation d'argument.
- Types de retour explicites sur toute fonction exportée
  (`@typescript-eslint/explicit-module-boundary-types`).
- Nommage : `PascalCase` pour types, enums, composants ; `camelCase` pour fonctions et variables ;
  verbes pour les fonctions (`fetchCart`, `mergeGuestCart`), booléens en `is/has/can/should`.
- Imports via l'alias `@/` ; aucune dépendance circulaire ; pas de code mort ni de code commenté.

**Documentation à la manière du backend**
- Chaque module commence par un bloc TSDoc décrivant son rôle et sa place dans l'architecture.
- Chaque fonction, composant, hook, type et constante **exportés** porte un TSDoc complet :
  ce qu'il fait, **pourquoi** il est conçu ainsi (contraintes backend, cas limites, alternatives
  écartées), `@param`, `@returns`, `@throws`, et `@see` vers la spec, le contrat ou le fichier
  backend concerné (ex. `@see docs/guest-cart.md §4`, `@see CartServiceImp#addItemsToCart`).
- Les choix non évidents à l'intérieur d'une fonction sont commentés en ligne (le pourquoi).
- ESLint `eslint-plugin-jsdoc` MUST exiger le TSDoc sur les exports.

**Logs structurés et sûrs**
- Côté serveur, un logger unique (`lib/logger.ts`, JSON structuré, niveaux `debug`/`info`/
  `warn`/`error` via un enum `LogLevel`, niveau piloté par `LOG_LEVEL`) ; un logger enfant par
  module (`logger.child({ module: "cart.merge" })`).
- Chaque appel backend est loggué : méthode, route, statut, durée, `X-Request-Id`, `errorCode`.
  Chaque décision métier notable est logguée (`info` : fusion de panier avec ses compteurs ;
  `warn` : rejeu, stock plafonné, refresh échoué ; `error` : 5xx, réponse non conforme à Zod).
- **Jamais** de token, mot de passe, cookie, email complet ni corps de formulaire dans un log ;
  les identifiants sont masqués (`maskUuid`, `maskEmail` dans `lib/logger.ts`, équivalents de
  `LogSafetyUtils`).
- Côté client, aucun `console.*` (ESLint `no-console` en erreur) ; un `clientLogger` limité aux
  erreurs, silencieux en production sauf `error`.

**Pourquoi** : un code sans valeurs magiques, typé par des enums, documenté et observable se
relit, se débogue et s'enseigne ; c'est le standard déjà tenu par le backend.

### XIII. Interface paramétrable et cohérente

**Paramétrage développeur — une seule source de vérité**
- Toute valeur visuelle (couleurs, polices, tailles, rayons, ombres, flous, opacités, durées,
  easings, intensité et activation de chaque effet) est définie **une seule fois** dans la
  configuration de thème `lib/theme/` et exposée sous forme de variables CSS et de tokens
  Tailwind. Changer une valeur à cet endroit MUST suffire à la répercuter dans toute l'interface.
- Aucun composant ne contient de valeur visuelle brute (`#hex`, `px`, `ms`, `rgba(...)` en dur,
  classes Tailwind arbitraires `[...]`) : il consomme les tokens ou la config des effets.
- Les variantes (accents, niveaux d'effets) sont des **enums** et des **ensembles de tokens
  prédéfinis**, jamais des valeurs libres : c'est ce qui garantit la cohérence d'ensemble.

**Paramétrage utilisateur — des choix bornés**
- L'utilisateur peut régler, depuis un panneau « Préférences », uniquement des options
  prévues par la config : niveau d'effets, intensité des animations, accent de couleur parmi
  des variantes validées, sons d'interface. Aucune saisie libre de couleur ou de taille.
- Chaque combinaison possible MUST respecter WCAG 2.1 AA ; un test automatisé vérifie le
  contraste de chaque accent sur chaque surface.
- `prefers-reduced-motion` du système l'emporte toujours sur la préférence utilisateur.
- Les préférences sont des données non sensibles, stockées côté navigateur dans un cookie
  lisible par le serveur, pour que la première page s'affiche déjà avec le bon thème (aucun
  flash).

**Pourquoi** : une direction artistique riche ne reste cohérente que si chaque valeur a une
seule origine ; et des réglages bornés laissent l'utilisateur adapter le confort visuel sans
pouvoir casser l'esthétique ni l'accessibilité.

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
- Une tâche n'est terminée que si `tsc --noEmit`, ESLint (0 erreur, 0 warning), Vitest et les
  tests Playwright concernés passent, et si chaque export ajouté est documenté (principe XII).
- Avant chaque commit, la conformité aux principes I à XIII est vérifiée ; une violation non
  justifiée n'est pas commitée.

## Governance

- Cette constitution prime sur toute autre pratique du repo.
- Toute dérogation à un principe MUST être justifiée dans la section « Complexity Tracking »
  du plan concerné et approuvée par le propriétaire du projet.
- Amendement : modification de ce fichier dans un commit dédié, avec mise à jour de la spec,
  du plan et des tâches concernés.
- Versionnement sémantique : MAJOR pour un principe retiré ou redéfini de façon incompatible,
  MINOR pour un principe ou une section ajouté ou nettement étendu, PATCH pour une
  clarification ou une correction de forme.

**Version**: 2.2.0 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-10-13
