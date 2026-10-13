# Phase 0 — Recherche et décisions : lot 1

Chaque entrée : **Décision**, **Pourquoi**, **Alternatives écartées**. Les versions ont été vérifiées
sur npm le 2026-10-13 (voir `docs/speckit-prompts.md`).

## R1. Version de Next.js et protection des routes

- **Décision** : Next.js 16.x, App Router, React 19. Protection des routes privées dans `proxy.ts`
  (nom du middleware depuis Next 16), qui ne fait qu'un contrôle léger de présence de session
  et redirige vers `/login?callbackUrl=…` ; chaque layout privé revérifie avec `auth()` côté
  serveur.
- **Pourquoi** : principe II. Le proxy seul ne suffit pas (il peut être contourné par un appel
  direct à un Route Handler ou une Server Action), d'où la double vérification.
- **Alternatives** : `middleware.ts` (déprécié en 16) ; vérification uniquement dans les pages
  (redirections plus tardives, flash de contenu).

## R2. Authentification : Auth.js v5 + Keycloak

- **Décision** : `next-auth@5.0.0-beta.32`, provider Keycloak, client confidentiel
  `cybertech-front-client`, PKCE S256, stratégie de session `jwt` (cookie chiffré httpOnly).
  Le callback `jwt` stocke `accessToken`, `refreshToken`, `idToken`, `expiresAt` ; le callback
  `session` n'expose que `user.name`, `user.email`, `roles`, `error`.
- **Pourquoi** : principe IV ; Auth.js v5 lit directement les variables `AUTH_*` (convention
  déjà utilisée par le chart Helm du backend). Auth.js découpe automatiquement le cookie s'il dépasse 4 Ko (trois
  tokens Keycloak peuvent dépasser cette taille).
- **Alternatives** : `openid-client` + session maison (plus de code, plus de risques) — gardé en
  repli si la bêta pose problème ; stockage des tokens en base (inutile : pas de base côté front).

## R3. Refresh du token

- **Décision** : dans le callback `jwt`, si `expiresAt - 30 s < now`, appel `grant_type=refresh_token`
  au token endpoint Keycloak. Les refresh concurrents d'un même processus sont mutualisés par une
  `Map<refreshToken, Promise>`. En cas d'échec → `error: "RefreshTokenError"` ; le layout et le
  client HTTP serveur traitent cette erreur comme une absence de session (redirection connexion
  avec `callbackUrl`).
- **Pourquoi** : access token Keycloak = 5 min ; `revokeRefreshToken=false` côté realm, donc deux
  refresh concurrents sur deux instances restent valides tous les deux : la mutualisation par
  processus suffit, pas besoin de verrou distribué.
- **Alternatives** : refresh à la demande après un 401 seulement (une requête perdue toutes les
  5 min) ; verrou Redis côté front (complexité injustifiée).

## R4. Déconnexion complète

- **Décision** : Server Action `signOutEverywhere` : lit `idToken` dans la session, appelle
  `signOut({ redirect: false })`, puis redirige vers
  `{issuer}/protocol/openid-connect/logout?id_token_hint=…&post_logout_redirect_uri={AUTH_URL}/`.
  Les pages privées envoient `Cache-Control: no-store` pour que « retour » ne réaffiche rien.
- **Pourquoi** : FR-017 ; le backend est stateless, la session SSO Keycloak doit être fermée.

## R5. Panier invité (option B)

- **Décision** : conforme à `docs/guest-cart.md` : `localStorage` `ct_guest_cart_v1`, validation
  Zod à chaque lecture, `POST /api/cart/preview` pour l'enrichissement, `GuestCartMerger` + Web
  Locks API pour une fusion unique, `POST /api/cart/merge` côté BFF.
- **Pourquoi** : décision du propriétaire ; aucune donnée sensible ; compatible principe IV
  (amendement explicite dans la constitution).
- **Alternatives** : voir `docs/guest-cart.md` §8.

## R6. Disponibilité en temps réel

- **Décision** : la fiche produit et les cartes sont rendues côté serveur sans stock ; un Client
  Component `AvailabilityBadge` interroge `GET /api/availability?uuids=` (TanStack Query,
  `staleTime` 0, refetch au focus, regroupement des UUID d'une page en un seul appel ≤ 50).
  Seuil « plus que N » = 5.
- **Pourquoi** : le backend sert le stock à part et en `no-store` précisément pour que le produit
  reste cacheable ; FR-007.
- **Alternatives** : stock lu dans le rendu serveur de la fiche (rendrait la page non cacheable).

## R7. Rendu, cache et CSP

- **Décision** : CSP avec nonce généré dans `proxy.ts`. Conséquence documentée par Next.js : les
  pages deviennent dynamiques. On garde la performance via le **cache de données** : chaque
  `fetch` catalogue utilise `next: { revalidate, tags }` (produits 60 s, remises 300 s, schémas
  3600 s). Les pages restent donc rapides (rendu serveur sur données en cache) sans ISR de page.
- **Pourquoi** : la constitution impose une CSP stricte ; un nonce est incompatible avec le rendu
  statique. Le cache de données suffit pour LCP < 2,5 s.
- **Alternatives** : ISR de page + CSP sans nonce avec `'unsafe-inline'` (affaiblit la sécurité) ;
  SRI expérimental (instable). **Écart vs prompt 4.3** (« pages produit en ISR ») : remplacé par le
  cache de données, voir Complexity Tracking du plan.

## R8. Gestion des erreurs backend

- **Décision** : `lib/api/errors.ts` parse `ErrorResponseDto`
  `{ message, httpStatusCode, errorCodeType, errorCode, fieldErrors? }` (format unique, 429 compris,
  délai dans `Retry-After`) en `ApiError`. Aiguillage **uniquement** sur `errorCode` (enum généré
  depuis l'OpenAPI). Réponse non JSON / timeout 8 s (`AbortSignal.timeout(8000)`) →
  `ApiError { errorCode: "UNAVAILABLE" }` (code interne front). `CONCURRENT_MODIFICATION` et 5xx
  sur une écriture panier → un seul rejeu automatique.
- **Pourquoi** : backend `d50e661` ; le texte de `message` est en anglais et peut changer.
- Tableau complet : `contracts/errors.md`.

## R9. Inscription et rate limiting

- **Décision** : Server Action `registerUser` ; validation Zod miroir de `UserCreateRequestDto` ;
  le BFF transmet `X-Forwarded-For` (IP client lue dans les en-têtes entrants) ; `fieldErrors` du
  backend projetés sur les champs du formulaire ; `USER_ALREADY_EXISTS` → message sur l'email ;
  `TOO_MANY_REQUESTS` → « Réessaie dans N s ».
- **Point ouvert backend** : en dev, `server.forward-headers-strategy` n'est pas activé ⇒ quota
  global de 5 inscriptions/min. Accepté pour le dev local (question 9 de `docs/speckit-prompts.md`).
- `birthDate` : le backend attend un `LocalDateTime` → le formulaire envoie `YYYY-MM-DDT00:00:00`.

## R10. Style : Tailwind v4 + shadcn/ui

- **Décision** : Tailwind CSS 4.3 (`@import "tailwindcss"` + `@theme` dans `styles/globals.css`
  avec les tokens Aurora Glow) ; shadcn/ui (compatible Tailwind 4) copié dans `components/ui/`
  et restylé. Pas de mode clair : le site est sombre par conception.
- **Pourquoi** : configuration CSS-first de Tailwind 4, tokens en un seul endroit.

## R11. Animations et effets

- **Décision** :
  - `motion@14` (`motion/react`) pour micro-interactions et apparitions, `MotionConfig
    reducedMotion="user"`.
  - Lenis 1.3 pour le smooth scroll, non initialisé si `prefers-reduced-motion`.
  - Transition carte → fiche via l'API View Transitions native (`document.startViewTransition`
    déclenché au clic sur la carte, `view-transition-name` = `product-{uuid}`) ; fallback fondu si
    non supporté.
  - `DotGrid` et `AuroraBlobs` en Canvas 2D, chargés via `next/dynamic({ ssr: false })`, boucle
    `requestAnimationFrame` suspendue sur `visibilitychange` et via `IntersectionObserver` ;
    nombre de points ∝ surface d'écran (pas de 28 px) ; masque des zones de cartes via
    `data-dotgrid-exclude`.
  - Titres à graisse réactive : variable font Sora, `font-variation-settings` mis à jour au plus
    une fois par frame.
- **Pourquoi** : principes VIII et IX (pause, différé, reduced motion).
- **Alternatives** : WebGL (seulement si le profilage montre < 60 fps en Canvas 2D).

## R12. Recherche instantanée ⌘K

- **Décision** : composant `CommandPalette` (shadcn `Command` / cmdk), debounce 200 ms,
  `GET /api/search?q=` → `POST /product/search { keyword, size: 6 }`, annulation de la requête
  précédente (`AbortController`).

## R13. Accueil personnalisé et derniers produits consultés

- **Décision** : prénom lu côté serveur via `GET /user/me` (backend `d50e661`) dans un Server
  Component dynamique ; derniers produits consultés dans `localStorage` `ct_recent_v1`
  (≤ 8 UUID), affichés par un Client Component qui récupère les fiches via
  une route dédiée `GET /api/products?uuids=` (fiches seules, sans stock).
- **Pourquoi** : aucune API de lecture des événements ; un cookie serait envoyé à chaque requête
  pour rien. Le message d'heure est calculé côté client (fuseau du visiteur) pour éviter un
  décalage d'hydratation (rendu initial neutre « Bienvenue »).

## R14. Action en attente après session expirée

- **Décision** : si une mutation panier reçoit `unauthenticated` non récupérable, le client
  enregistre l'action (`{ type, productUuid, quantity }`) dans `sessionStorage`
  `ct_pending_action_v1`, redirige vers la connexion, puis la rejoue une fois au retour
  (après la fusion du panier invité).
- **Pourquoi** : cas limite de la spec ; aucune donnée sensible.

## R15. Tests

- **Décision** : Vitest 3 + Testing Library + MSW 2 (unitaire, jsdom) ; Playwright (+
  `@axe-core/playwright`) contre la stack locale réelle (Keycloak et backend), avec un projet
  `reduced-motion` (`reducedMotion: 'reduce'`) ; Lighthouse lancé à la main dans Chrome DevTools
  (mode desktop) en fin de story sur `/`, `/products` et une fiche produit, budgets LCP 2500 ms,
  CLS 0,1, TBT 200 ms (TBT = approximation de l'INP en labo). Pas de CI (constitution X).
- **Longues tâches** : un test Playwright enregistre les entrées `longtask` via
  `PerformanceObserver` pendant 5 s d'interaction avec les effets ; aucune ne doit dépasser 50 ms.
- **Sans JavaScript** : un contexte Playwright `javaScriptEnabled: false` vérifie que l'accueil,
  la liste filtrée (formulaire GET) et une fiche restent lisibles.
- **Session expirée en e2e** : route de test `app/api/test/expire-session` active uniquement si
  `E2E=1`, qui force `expiresAt` dans le passé et invalide le refresh.

## R16. Exécution locale (constitution X)

- **Décision** : tout tourne sur le PC du développeur. Services du backend (MySQL, Redis, Mongo,
  Elasticsearch, Keycloak, LocalStack, Mailpit, moderation-api…) via le `docker-compose.yml` du
  repo backend ; application Spring lancée depuis IntelliJ sur `http://localhost:8081` ; front
  lancé avec `npm run dev` sur `http://localhost:3000`. Le front n'a ni Dockerfile, ni
  docker-compose, ni CI.
- **Pourquoi** : projet pédagogique et personnel, cible desktop. Lancer le front directement
  sur la machine évite aussi le piège de l'issuer Keycloak : navigateur et serveur Next joignent
  Keycloak à la même adresse (`http://localhost:8080`), donc les tokens sont acceptés.
- **Alternatives** : conteneuriser le front (Dockerfile + chart Helm existant côté backend) —
  écarté tant que la constitution X n'est pas amendée ; les variables `AUTH_*` sont gardées pour
  ne pas fermer cette porte.

## R17. Qualité de code, enums, documentation et logs (principe XII)

- **Décision** :
  - **Constantes** : `lib/constants/{api,auth,cart,catalog,storage-keys,ui}.ts`, chacune
    documentée en TSDoc avec l'origine de sa valeur (ex. `ACCESS_TOKEN_REFRESH_MARGIN_MS = 30_000`,
    `BACKEND_TIMEOUT_MS = 8_000`, `GUEST_CART_MAX_LINES = 50`, `LOW_STOCK_THRESHOLD = 5`,
    `SEARCH_PAGE_SIZE = 24`, `COMMAND_PALETTE_DEBOUNCE_MS = 200`).
  - **Enums string** : `lib/enums/` (`Brand`, `CategoryKey`, `CartSource`, `CartLineStatus`,
    `AvailabilityLevel`, `BackendErrorCode` (miroir de l'OpenAPI), `FrontErrorCode`,
    `MergeDropReason`, `PendingActionType`, `CommunicationChannel`, `Sex`, `LogLevel`,
    `QueryKey`, `StorageKey`). Schémas Zod construits avec `z.enum(MonEnum)`.
    `BackendErrorCode` est vérifié par un test contre l'union générée par `openapi-typescript`
    pour détecter toute dérive du backend.
  - **Exhaustivité** : `assertNever(value: never): never` dans `lib/assert-never.ts`.
  - **Logs serveur** : `pino` (JSON, niveaux depuis `LOG_LEVEL`), déclaré dans
    `serverExternalPackages` ; `pino-pretty` en dev uniquement ; `redact` configuré sur
    `authorization`, `cookie`, `*.password`, `*.accessToken`, `*.refreshToken`, `*.idToken` en
    plus des helpers `maskUuid` / `maskEmail`. Le client HTTP serveur logge chaque appel backend
    (`method`, `path`, `status`, `durationMs`, `requestId`, `errorCode`).
  - **Logs client** : `clientLogger` minimal (erreurs seulement en production), `no-console`.
  - **ESLint** (flat config, `typescript-eslint` type-checked) : `no-explicit-any`,
    `no-magic-numbers` (ignore 0/1/-1, enums, index, `readonly` class props ; désactivé dans
    `tests/`), `switch-exhaustiveness-check`, `explicit-module-boundary-types`,
    `prefer-readonly`, `naming-convention`, `jsdoc/require-jsdoc` (exports) +
    `jsdoc/require-param` + `jsdoc/require-returns`, `no-console`, `max-depth: 3`,
    `max-lines-per-function: 40` (JSX exclu via `skipBlankLines`/`skipComments` et override
    `*.tsx` à 80), `no-nested-ternary`, `import/no-cycle`.
- **Pourquoi** : demande du propriétaire, alignement sur le niveau du backend Java ; les règles
  sont outillées pour être vérifiées automatiquement plutôt que laissées à la relecture.
- **Alternatives** : unions de littéraux `as const` (plus idiomatiques en TS moderne, mais le
  propriétaire veut des enums explicites, nommés et documentés) ; `console` structuré maison
  (moins de fonctionnalités que pino : redaction, niveaux, enfants).

## R18. Thème paramétrable et préférences utilisateur (constitution XIII, US5)

- **Décision — config de thème unique** : `lib/theme/theme.config.ts` exporte un objet typé
  `THEME` (`as const satisfies ThemeConfig`) qui contient **toutes** les valeurs visuelles :
  palette de base, variantes d'accent, typographie, rayons, ombres, flous, opacités, durées et
  easings par intensité, et réglages de chaque effet (grille de points : rayon, espacement,
  inertie ; halos : nombre, cycle, flou ; inclinaison : angle max ; aimant : force ; défilement
  fluide : durée). Les variantes sont indexées par des enums (`AccentVariant`, `EffectsLevel`,
  `MotionIntensity`).
- **Décision — de la config au CSS** : `lib/theme/css-variables.ts` transforme `THEME` en
  variables CSS (`--color-bg`, `--accent`, `--radius-card`, `--duration-base`…).
  `app/layout.tsx` les injecte côté serveur dans une balise `<style nonce>` placée dans le
  `<head>`, avec un bloc par variante (`[data-accent="blue"] { --accent: … }`,
  `[data-motion="soft"] { --duration-base: … }`). `styles/globals.css` ne contient **aucune
  valeur** : son `@theme inline` se contente de relier les tokens Tailwind aux variables
  (`--color-accent: var(--accent)`). Les composants n'utilisent que ces tokens.
- **Décision — préférences sans flash** : les préférences (`{ version, effects, motion, accent,
  sound }`) sont stockées dans un cookie `ct_prefs_v1` (non httpOnly, `SameSite=Lax`, 1 an,
  JSON validé par Zod). Le layout racine le lit côté serveur et pose `data-accent`,
  `data-effects` et `data-motion` sur `<html>` dès le premier rendu, donc aucun changement
  visible après hydratation. Côté client, `PreferencesProvider` (contexte React) expose
  `usePreferences()` et `useEffectiveEffects()` ; une modification réécrit le cookie et les
  attributs de `<html>` immédiatement.
- **Décision — niveau effectif** : `effectiveEffects = min(préférence, système)`. Si
  `prefers-reduced-motion: reduce` est actif, le niveau est forcé à `OFF` pour le mouvement.
  Les effets (DotGrid, AuroraBlobs, TiltCard, MagneticButton, Lenis, View Transitions) lisent
  ce niveau et leurs paramètres dans `THEME.effects[niveau]` ; `REDUCED` garde la grille et les
  halos en version statique ou ralentie, sans inclinaison ni aimant.
- **Décision — accents** : violet (défaut), bleu, cyan ; l'or reste réservé aux prix et
  badges (FR-037), le rose aux alertes douces. Un test unitaire calcule le ratio de contraste
  WCAG de chaque `accent × surface × texte` et échoue sous 4,5:1 (3:1 pour les grands textes et
  les contours de focus).
- **Décision — sons** : `lib/sound/ui-sounds.ts` génère de courts sons avec l'API Web Audio
  (pas de fichier audio), joués seulement si `sound = ON` ; enum `UiSound` (ADD_TO_CART,
  MERGE_SUCCESS, ERROR). Volume et durée viennent de `THEME.sound`.
- **Pourquoi** : constitution XIII ; un seul endroit à modifier pour faire évoluer le style ;
  le cookie évite le flash d'un thème par défaut que provoquerait `localStorage`.
- **Alternatives** : `localStorage` + script bloquant dans le `<head>` (fonctionne, mais un
  script inline de plus à autoriser par la CSP) ; `next-themes` (pensé pour clair/sombre, pas
  pour plusieurs axes de préférences) ; thèmes complets commutables (hors périmètre).

## Points restant à vérifier à l'exécution (non bloquants)

| Point | Où vérifier | Impact si faux |
|---|---|---|
| Recherche sans filtre = tout le catalogue | `POST /product/search {}` | Envoyer `keyword: ""` ou `"*"` |
| Politique de mot de passe Keycloak | console Keycloak | Durcir le schéma Zod |
| Format JSON de `UserResponseDto.birthDate` | `GET /user/me` | Schéma Zod `birthDate` en `z.string().nullable()` (non utilisé au lot 1) |
