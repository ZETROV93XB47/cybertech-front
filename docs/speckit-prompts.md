# Prompts Spec Kit — cybertech-front

> Prompts prêts à coller dans Claude Code, dans l'ordre. Ils s'appuient sur [`docs/backend/api-map.md`](./backend/api-map.md) et [`docs/backend/analysis.md`](./backend/analysis.md).
> Spec Kit est installé avec l'intégration Claude Code sous forme de **skills** : les commandes s'appellent `/speckit-constitution`, `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement` (tiret ; les formes `/speckit.xxx` des anciennes versions ne sont pas installées).
> Versions vérifiées sur npm le 2026-10-13 : `next@16.4.0`, `tailwindcss@4.3.3`, `zod@4.6.7`, `@tanstack/react-query@5.104.2`, `motion@14.1.0`, `lenis@1.3.26`, `openapi-typescript@7.13.0`, `next-auth@5.0.0-beta.32` (Auth.js v5, encore en bêta).

---

## 4.1 Prompt `/speckit-constitution`

````text
/speckit-constitution Établis la constitution du front Next.js de cybertech, plateforme e-commerce pédagogique de matériel informatique. Le backend Spring Boot (Keycloak, MySQL, Redis, Elasticsearch, Stripe) existe déjà et fait foi ; il est décrit dans docs/backend/api-map.md et docs/backend/analysis.md. Principes NON NÉGOCIABLES :

I. TypeScript strict
- "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true.
- Aucun `any` (ni explicite ni implicite), aucun `@ts-ignore` ; `unknown` + narrowing à la place. ESLint bloque `@typescript-eslint/no-explicit-any`.

II. Next.js App Router, dernière version stable (16.x au 2026-10-13)
- App Router uniquement. Server Components par défaut ; `"use client"` uniquement pour l'interactivité (état local, événements, effets visuels, TanStack Query).
- La protection des routes privées se fait dans le fichier de proxy/middleware de Next.js (`proxy.ts` depuis Next 16, anciennement `middleware.ts`), complétée par une vérification de session côté serveur dans chaque layout/page privé.

III. Pattern BFF obligatoire
- Le navigateur n'appelle JAMAIS le backend Spring ni Keycloak en direct pour des données (seules les redirections OIDC passent par le navigateur).
- Tous les appels passent par des Route Handlers (`app/api/*`) ou des Server Actions, qui ajoutent `Authorization: Bearer <access_token>` et `X-API-VERSION: 1.0`.
- Un seul client HTTP serveur (`lib/api/`) centralise base URL, en-têtes, timeouts, parsing et mapping des erreurs. Code marqué `import "server-only"`.

IV. Session et tokens
- Authentification OIDC Keycloak (Authorization Code + PKCE) via Auth.js v5, client confidentiel.
- Les tokens (access, refresh, id) vivent uniquement côté serveur, dans une session en cookie httpOnly, Secure (hors localhost), SameSite=Lax, chiffrée. JAMAIS dans localStorage, sessionStorage, ni exposés au JavaScript client.
- Refresh automatique côté serveur avant expiration (access token Keycloak = 5 min).

V. Le contrat d'API fait foi
- Types générés depuis l'OpenAPI du backend (`openapi-typescript` sur /v3/api-docs ou docs/openapi/openapi.yaml), sinon dérivés de docs/backend/api-map.md.
- Chaque réponse backend est validée par un schéma Zod avant usage ; chaque entrée utilisateur est validée par Zod avec les mêmes contraintes que Bean Validation (tailles, regex, min/max).
- Le front ne recalcule jamais un montant faisant foi (totaux, remises) : il affiche ceux du backend.

VI. Configuration
- Variables d'environnement validées par Zod au démarrage (`lib/env.ts`) ; l'application refuse de démarrer si une variable manque. Seules les variables `NEXT_PUBLIC_*` explicitement listées sont exposées au client.

VII. Tests
- Vitest + Testing Library pour l'unitaire (schémas Zod, mappers d'erreurs, composants, hooks).
- Playwright pour les parcours critiques : catalogue → fiche produit, inscription, connexion/déconnexion, panier (invité puis connecté), session expirée.
- Un comportement sans test n'est pas terminé. Les appels backend sont mockés au niveau HTTP (MSW) en unitaire.

VIII. Accessibilité
- WCAG 2.1 AA : contrastes, focus visible, navigation clavier complète, rôles ARIA, libellés de formulaires, annonces `aria-live` pour panier et erreurs.
- `prefers-reduced-motion` respecté par TOUTES les animations et effets (canvas figé, transitions réduites à des fondus).

IX. Performance
- Budgets Core Web Vitals : LCP < 2,5 s, INP < 200 ms, CLS < 0,1 (mesurés en CI avec Lighthouse sur les pages catalogue et produit).
- Effets lourds (canvas, WebGL, smooth scroll) chargés en différé (`next/dynamic`, `ssr: false`), mis en pause quand l'onglet est inactif (`visibilitychange`) ou hors viewport ; 60 fps visés ; aucun effet ne bloque le thread principal plus de 50 ms.
- Images via `next/image` avec dimensions explicites.

X. Conteneurisation
- `output: "standalone"`, Dockerfile multi-stage (deps → build → runner non-root), image compatible avec le chart Helm existant `front-app-chart` (port 3000, variables AUTH_*, sondes HTTP).

XI. Code pédagogique
- Code lisible, nommage explicite, commentaires sur les choix non évidents (pourquoi, pas quoi). Pas d'abstraction prématurée.
- Documentation et commentaires en français, identifiants techniques en anglais.

Gouvernance : toute dérogation à un principe doit être justifiée dans le plan (section « Complexity Tracking ») et approuvée. Version 1.0.0.
````

---

## 4.2 Prompt `/speckit-specify`

````text
/speckit-specify Premier lot du front e-commerce cybertech : catalogue, authentification et panier. Décris le QUOI et le POURQUOI du point de vue de l'utilisateur, sans choix technologique. La spécification se base EXCLUSIVEMENT sur les capacités réelles du backend décrites dans docs/backend/api-map.md et docs/backend/analysis.md ; toute capacité absente du backend est soit exclue, soit explicitement portée par le front et signalée comme telle.

## Contexte
cybertech vend du matériel informatique (ordinateurs, écrans ; catégories COMPUTER et MONITOR aujourd'hui ; marques ASUS, HP, LENOVO, DELL, AORUS, MSI, ACER, TOSHIBA, ALIENWARE, MICROSOFT, ALTYK, GIGABYTE, SAMSUNG). Les prix sont en euros. Les comptes sont gérés par un fournisseur d'identité externe (Keycloak) ; l'inscription passe par l'API cybertech.

## User stories

### US1 — Parcourir le catalogue (visiteur, priorité P1)
En tant que visiteur, je veux parcourir et rechercher les produits pour trouver celui qui me convient.
- Page d'accueil : message d'accueil contextuel selon l'heure, sélection « meilleures ventes », remises actives mises en avant.
- Liste/recherche : mot-clé (tolérant aux fautes de frappe), filtres catégorie, marques (multi), fourchette de prix (minimum 100 €, maximum 1 000 000 €), caractéristiques techniques propres à la catégorie (ex. CPU, RAM, type d'écran) dérivées du schéma de la catégorie ; pagination ; l'état des filtres est reflété dans l'URL (partageable, bouton retour fonctionnel).
- Fiche produit : nom, marque, prix, galerie de photos, description, caractéristiques techniques lisibles.
- Recherche instantanée accessible au clavier (⌘K / Ctrl+K) avec résultats en direct.
Critères d'acceptation :
1. Étant donné le catalogue, quand je saisis « lenvo » dans la recherche, alors des produits LENOVO apparaissent.
2. Quand je combine catégorie + marque + prix, alors seuls les produits correspondants sont listés et l'URL contient ces filtres ; recharger la page conserve le résultat.
3. Quand aucun produit ne correspond, alors un état vide explicite propose de réinitialiser les filtres.
4. Quand j'ouvre une fiche produit inexistante, alors une page « produit introuvable » s'affiche avec un retour au catalogue.
5. Toutes ces pages sont utilisables au clavier seul et lisibles par un lecteur d'écran.

### US2 — Créer un compte (visiteur, P1)
En tant que visiteur, je veux créer un compte pour commander et retrouver mon panier.
- Champs : email, prénom, nom (2–50 caractères), sexe (M/F), téléphone, canal de communication préféré (email, SMS, notification push), adresse (rue, ville, code postal, pays), date de naissance facultative (dans le passé), mot de passe (8 caractères minimum).
- Les erreurs sont affichées champ par champ avant envoi ; un email déjà utilisé produit un message clair.
- Après inscription réussie, l'utilisateur est invité à se connecter (l'inscription ne connecte pas automatiquement).
Critères : email invalide → erreur sur le champ sans appel serveur ; email existant → « Un compte existe déjà avec cet email » ; trop de tentatives → message d'attente avec délai.

### US3 — Se connecter, rester connecté, se déconnecter (P1)
- Connexion via la page du fournisseur d'identité, retour sur la page d'origine.
- La session reste active pendant la navigation sans action de l'utilisateur tant que la session du fournisseur est valide (30 min d'inactivité, 10 h maximum).
- Déconnexion : la session est fermée dans l'application ET chez le fournisseur d'identité.
- Visiteur connu : « Content de te revoir, <prénom> » avec ses derniers produits consultés (historique conservé côté navigateur, non sensible).
Critères : accès à une page privée sans session → redirection vers la connexion puis retour à la page demandée ; après déconnexion, le bouton « retour » ne réaffiche aucune donnée privée.

### US4 — Gérer mon panier (P1)
- Ajouter un produit depuis la liste ou la fiche, avec une quantité ; modifier la quantité ; supprimer une ligne ; vider le panier.
- Afficher les lignes (nom, prix unitaire, quantité, sous-total) et le total calculé par le serveur.
- Compteur du panier visible en permanence dans l'en-tête.
- Persistance multi-appareil : un utilisateur connecté retrouve le même panier sur tous ses appareils.
- Visiteur non connecté : il peut ajouter au panier ; ce panier invité est conservé sur son navigateur et fusionné dans son panier de compte à la connexion (quantités additionnées), avec un récapitulatif des lignes qui n'ont pas pu être fusionnées (stock insuffisant, produit disparu).
Critères :
1. Ajouter 2× un produit déjà présent 1× → la ligne affiche 3.
2. Demander une quantité supérieure au stock disponible → message indiquant la quantité disponible, le panier reste inchangé.
3. Se connecter sur un second appareil → le même panier s'affiche.
4. Visiteur avec 2 lignes, se connecte avec un compte ayant 1 ligne → panier final cohérent et message de fusion.
5. Chaque modification est annoncée aux technologies d'assistance.

## Cas limites (obligatoires)
- Session expirée pendant une action panier : l'action est rejouée après renouvellement transparent ; si la session ne peut être renouvelée, l'utilisateur est redirigé vers la connexion et retrouve son action en attente après connexion.
- Stock insuffisant à l'ajout, à la modification ou à la fusion : message explicite avec la quantité disponible.
- Backend indisponible ou lent (> 8 s) : catalogue → message bienveillant + bouton réessayer, sans page blanche ; panier → l'action échoue proprement, l'état affiché reste celui du serveur.
- Conflit temporaire (panier modifié en parallèle, sur-sollicitation) : nouvel essai automatique unique puis message.
- Trop de requêtes : message indiquant quand réessayer.
- Utilisateur non connecté qui ajoute au panier : panier invité (cf. US4), jamais d'erreur.
- Produit supprimé entre l'ajout et l'affichage du panier.
- JavaScript lent à charger : catalogue et fiches lisibles sans JavaScript (rendu serveur).

## Exigences non fonctionnelles côté utilisateur
- Accessibilité WCAG 2.1 AA ; respect de la préférence « réduire les animations ».
- Pages catalogue et produit perçues comme instantanées (LCP < 2,5 s sur mobile 4G).
- Messages en français, ton chaleureux et tutoyant de façon cohérente (à confirmer), jamais culpabilisant.

## Hors périmètre du lot 1
Commande et paiement, historique de commandes, wishlist, avis, recommandations personnalisées, carte bancaire, profil, mot de passe oublié, administration, stock affiché sur la fiche (non exposé par l'API), tri du catalogue (non supporté par l'API), avis/notes sur la fiche (non exposés publiquement), sons d'interface (prévus mais désactivés), internationalisation (français uniquement).

## Direction artistique

### « Aurora Glow » — sombre, doux à l'œil, premium et vivant

**Intention** : une ambiance nocturne et feutrée, comme une aurore boréale vue de nuit. Les couleurs vivent en arrière-plan et dans les accents, jamais en aplats agressifs. Le doré signe le côté premium. L'œil ne doit jamais fatiguer : pas de blanc pur, pas de noir pur, pas de contrastes violents. **La page doit sembler vivante et dialoguer avec l'utilisateur.**

**Références** : Linear, Stripe, Vercel, Raycast.

**Palette** (tokens CSS / Tailwind) :
| Rôle | Token | Valeur |
|---|---|---|
| Fond principal (bleu nuit) | `--bg` | `#0A0E1F` |
| Surface (cartes) | `--surface` | `#121833` |
| Surface élevée | `--surface-2` | `#1A2142` |
| Bordures | `--border` | `#2A3150` |
| Texte principal | `--text` | `#E6E8F2` |
| Texte secondaire | `--text-muted` | `#8B93B0` |
| Violet (accent principal) | `--violet` | `#8B7CF6` |
| Bleu (accent secondaire) | `--blue` | `#4F7BFF` |
| Or champagne (premium) | `--gold` | `#D4AF6A` |
| Cyan (succès, état actif) | `--cyan` | `#5EEAD4` |
| Rose (alertes douces, rare) | `--rose` | `#F08BB8` |

**Règles d'usage des couleurs** :
- Répartition 60 / 30 / 10 : 60 % bleu nuit, 30 % surfaces et gris, 10 % accents.
- **Doré rare** : prix, badges premium, liseré au survol des cartes. Jamais en fond.
- CTA principal en dégradé violet → bleu avec un léger halo.
- Tous les couples texte / fond respectent WCAG AA.

**Typographie** (polices variables via `next/font`) :
- Titres : **Sora**, 500–600, letter-spacing -0,02em. Alternative éditoriale : **Clash Display** (Fontshare, via `next/font/local`).
- Texte : **Inter**, 400–500, interligne 1,6–1,7.
- Prix et données techniques : **JetBrains Mono**, prix en doré.
- La graisse des titres réagit à la proximité du curseur (axe variable `wght`).

**Composants** :
- Cartes en verre subtil : `--surface` à ~70 % d'opacité, `backdrop-filter: blur(12px)`, bordure 1 px `--border`. Au survol, la bordure devient un dégradé violet → or.
- Rayons de 16 à 20 px. Ombres diffuses teintées de violet, jamais noires.
- Contrôles du panier (quantité, toggles) en dark neumorphism discret, avec un liseré cyan à l'état actif.

**Effet signature : grille de points réactive autour du curseur**
- Le fond porte une grille de petits points très discrète (couleur proche de `--border`, quasi invisible au repos).
- Autour du curseur, dans un rayon d'environ 120 px, les points se révèlent progressivement, grossissent légèrement et sont repoussés vers l'extérieur, formant un anneau vivant.
- Une ombre douce et sombre suit le curseur sous cet anneau, comme si le curseur creusait légèrement la surface.
- Le mouvement est amorti avec de l'inertie : les points reviennent lentement à leur place quand le curseur s'éloigne.
- L'effet est actif uniquement sur les zones de fond, pas au-dessus des cartes ni du texte.
- Sur mobile, il se déclenche au toucher, en version allégée.
- Implémentation en Canvas 2D (ou WebGL si nécessaire), avec un nombre de points adapté à la taille d'écran. Il est désactivé avec `prefers-reduced-motion`.

**Animations** (douces, jamais agressives) :
- Arrière-plan : 2 à 3 blobs aurora (violet, bleu, touche d'or) très floutés, qui dérivent sur des cycles de 20 à 30 s et suivent lentement le curseur.
- Apparition au scroll : fondu + translation de 12 px, 300–400 ms, ease-out, avec stagger.
- Transition partagée carte produit → page détail.
- Skeletons avec un shimmer violet très léger.
- Micro-interactions : 150–250 ms. Aucun clignotement.
- Avec `prefers-reduced-motion` : effets figés, transitions réduites à des fondus.

**Interactivité : « la page dialogue avec l'utilisateur »**
- **Accueil contextuel** : message selon l'heure (« Bonsoir »). Pour un visiteur connu, « Content de te revoir » avec ses derniers produits consultés.
- **Boutons magnétiques** : les CTA principaux sont légèrement attirés par le curseur.
- **Cartes produits** : inclinaison 3D selon le curseur, spotlight interne, reflet doré qui glisse sur la bordure.
- **Titres vivants** : révélation lettre par lettre au premier affichage, graisse réactive au curseur.
- **Recherche instantanée** : palette ⌘K / Ctrl+K avec résultats en direct.
- **Panier vivant** : animation « vole vers le panier », compteur doré qui rebondit, micro-copie chaleureuse, vibration légère sur mobile si supportée.
- **États vides et erreurs** : illustrations animées et textes qui s'adressent à l'utilisateur.
- **Sons d'interface optionnels**, désactivés par défaut.
- **Mobile** : les effets liés au curseur sont remplacés par le toucher et le gyroscope (inclinaison des cartes), avec dégradation propre.
- **Pas d'effets météo ni saisonniers** (pas de neige).
````

---

## 4.3 Prompt `/speckit-plan`

````text
/speckit-plan Plan technique du lot 1 (catalogue, authentification, panier) conforme à la constitution. Sources de vérité : docs/backend/api-map.md, docs/backend/analysis.md, et l'OpenAPI du backend (http://localhost:8081/v3/api-docs, copie : docs/openapi/openapi.yaml du repo backend).

## Stack
- Next.js 16.x (App Router, `output: "standalone"`), React 19, TypeScript strict, Node 24 LTS.
- Tailwind CSS v4 : les tokens de la direction artistique (couleurs --bg, --surface, --surface-2, --border, --text, --text-muted, --violet, --blue, --gold, --cyan, --rose ; rayons 16–20 px ; ombres teintées violet) déclarés dans `styles/globals.css` via `@theme`.
- shadcn/ui comme base de composants (Radix), restylés selon la direction artistique.
- Polices via `next/font` : Sora (titres, axe wght variable), Inter (texte), JetBrains Mono (prix, données) ; Clash Display en option via `next/font/local`.
- Motion (`motion/react`) pour micro-interactions et transitions ; Lenis pour le smooth scroll (désactivé si reduced-motion) ; View Transitions API pour la transition carte produit → fiche (fallback fondu) ; Canvas 2D pour la grille de points réactive et les blobs aurora (WebGL seulement si le profilage l'exige), chargés via `next/dynamic` sans SSR, pause sur `visibilitychange` et hors viewport.
- TanStack Query v5 côté client pour l'état serveur du panier (mises à jour optimistes + rollback, invalidation après mutation) ; le catalogue reste en Server Components.
- Auth.js v5 (`next-auth@beta`) avec le provider Keycloak (Authorization Code + PKCE, client confidentiel `cybertech-front-client`), stratégie de session JWT chiffrée en cookie httpOnly ; callbacks `jwt` (stockage access/refresh/expiresAt, refresh) et `session` (n'expose au client que nom, email, rôles).
- Zod v4 pour env, entrées et réponses ; `openapi-typescript` pour générer `lib/api/schema.d.ts`.
- Tests : Vitest + Testing Library + MSW ; Playwright (+ @axe-core/playwright pour l'a11y) ; Lighthouse CI.
- Implémentation de l'UI avec le skill Claude Code **frontend-design** en prenant la direction artistique de la spec comme référence.

## Architecture des dossiers
app/
  (shop)/page.tsx                       accueil
  (shop)/products/page.tsx              liste + recherche (searchParams → filtres)
  (shop)/products/[uuid]/page.tsx       fiche produit
  (shop)/cart/page.tsx                  panier
  (auth)/register/page.tsx             inscription
  (auth)/login/page.tsx                déclencheur signIn("keycloak")
  api/auth/[...nextauth]/route.ts       Auth.js
  api/cart/route.ts                     GET panier, POST ajout, DELETE vidage
  api/cart/items/[productUuid]/route.ts PATCH quantité, DELETE ligne
  api/cart/merge/route.ts               fusion panier invité → compte
  api/search/route.ts                   recherche instantanée ⌘K
  error.tsx, not-found.tsx, loading.tsx
components/   ui/ (shadcn), layout/, effects/ (DotGrid, AuroraBlobs, MagneticButton, TiltCard)
features/     catalog/, cart/, auth/ (composants + hooks + server actions par domaine)
lib/api/      client.ts (fetch serveur), errors.ts (ApiError + mapping), endpoints/*.ts, schema.d.ts (généré)
lib/schemas/  Zod : product, search, cart, user, error, env
lib/auth/     config Auth.js, refresh, guards
styles/       globals.css (tokens), motion.ts (durées/easings partagés)
proxy.ts      protection des routes privées (anciennement middleware.ts)
tests/        unit/, e2e/

## Mapping page → BFF → endpoint Spring (lot 1)
| Page / composant | Route Handler / Server Action | Endpoint Spring | Auth |
|---|---|---|---|
| Accueil – meilleures ventes | Server Component → lib/api/endpoints/products.getBestSellers | GET /api/v1/services/product/best-sellers?page&size | public |
| Accueil – bandeau remises | Server Component → discounts.getActive | GET /api/v1/services/discounts/active | public |
| Liste / recherche | Server Component → products.search(filters from searchParams) | POST /api/v1/services/product/search (page/size dans le body) | public |
| Filtres caractéristiques | Server Component → categories.getSchema(key) | GET /api/v1/services/product-category-schemas/{categoryKey} | public |
| Palette ⌘K | GET app/api/search?q= (debounce 200 ms, size 6) | POST /api/v1/services/product/search | public |
| Fiche produit | Server Component → products.getByUuid | GET /api/v1/services/product/get/{uuid} | public |
| Inscription | Server Action registerUser | POST /api/v1/services/user/register | public (transmettre X-Forwarded-For) |
| Connexion / déconnexion | Auth.js signIn / signOut + end_session Keycloak | Keycloak OIDC | — |
| Panier – lecture | GET app/api/cart | GET /api/v1/services/cart/get | USER |
| Panier – ajout | POST app/api/cart | POST /api/v1/services/cart/add | USER |
| Panier – quantité | PATCH app/api/cart/items/[productUuid] | PATCH /api/v1/services/cart/update/{cartUuid} (remplacement complet, construit à partir du panier courant) | USER |
| Panier – supprimer ligne | DELETE app/api/cart/items/[productUuid] | PATCH /api/v1/services/cart/remove/{productUuid} | USER |
| Panier – vider | DELETE app/api/cart | DELETE /api/v1/services/cart/clear | USER |
| Panier invité | cookie signé httpOnly géré par le BFF (lignes productUuid + quantity, max 50) ; affichage enrichi via GET product/get/{uuid} | — | visiteur |
| Fusion à la connexion | POST app/api/cart/merge (déclenché après callback signIn) | POST /api/v1/services/cart/add (toutes les lignes) ; en cas de 409, ligne par ligne pour isoler les échecs | USER |
| Accueil « Content de te revoir » | prénom depuis la session ; derniers produits consultés depuis un cookie non sensible côté client | — (aucune API) | — |

## Normalisation et contrats
- Panier : normaliser la réponse « panier inexistant » (cartUuid/items/totalPrice null) en panier vide `{ items: [], totalPrice: 0 }`.
- Montants : `number` → `Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })`, en JetBrains Mono doré.
- Pagination : schéma Zod `PagedModel<T>` = `{ content: T[], page: { size, number, totalElements, totalPages } }`.
- `discountKey` jamais envoyé à `null`.

## Stratégie de cache et revalidation
- Catalogue (best-sellers, recherche, fiche, schéma de catégorie, remises) : `fetch` serveur avec `next: { revalidate: 60, tags: ["products"] }` (remises : 300 s, schémas : 3600 s) ; pages produit en ISR ; pas de données utilisateur dans ces rendus.
- Panier : jamais mis en cache côté Next (`cache: "no-store"`), état client via TanStack Query (`staleTime` 30 s, refetch au focus), mutations optimistes avec rollback, invalidation après chaque mutation et après fusion.
- Session : lue côté serveur à chaque requête privée.

## Gestion centralisée des erreurs backend
- `lib/api/errors.ts` : classe `ApiError { status, kind, message, retryAfterSeconds? }`, parse les deux formats (ErrorResponseDto `{message, httpStatusCode, errorCodeType}` et 429 `{error, retryAfterSeconds}`).
- Mapping `kind` : 400 validation → `invalid` (message serveur affiché en dernier recours, Zod en premier) ; 401 → `unauthenticated` (refresh puis rejeu unique, sinon redirection login) ; 403 → `forbidden` SAUF messages panier vide → `empty-cart` ; 404 → `not-found` ; 409 → `conflict` (stock : extraire la quantité disponible du message ; optimistic lock : rejeu unique) ; 429 → `rate-limited` ; 500 sur `/cart/add` → rejeu unique (verrou Redis) ; 5xx / timeout (8 s via AbortSignal.timeout) → `unavailable`.
- Messages utilisateur centralisés en français dans `features/*/messages.ts` ; logs serveur avec l'en-tête `X-Request-Id` du backend.
- `app/error.tsx` et `not-found.tsx` illustrés et animés (sobre si reduced-motion).

## Refresh du token
- Keycloak : access 5 min, refresh valable tant que la session SSO vit (30 min d'inactivité, 10 h max).
- Dans le callback `jwt` d'Auth.js : si `expiresAt - 30 s < now`, POST token endpoint `grant_type=refresh_token` ; mutualiser les refresh concurrents (promesse partagée par session) ; en cas d'échec → `error: "RefreshTokenError"`, la session est invalidée et l'UI redirige vers la connexion en conservant l'URL de retour.
- Déconnexion : `signOut` + redirection vers `end_session_endpoint` avec `id_token_hint` et `post_logout_redirect_uri`.

## Sécurité
- Cookies httpOnly / Secure / SameSite=Lax ; en-têtes de sécurité dans `next.config` (CSP avec nonce, `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy).
- `images.remotePatterns` : `http://localhost:4566/cybertech-products/**` en dev, domaine S3 de prod à configurer.
- Aucune donnée privée dans les pages statiques/ISR.

## Variables d'environnement (validées par Zod)
API_BASE_URL (ex. http://localhost:8081), API_VERSION=1.0, AUTH_SECRET, AUTH_URL, AUTH_KEYCLOAK_ID, AUTH_KEYCLOAK_SECRET, AUTH_KEYCLOAK_ISSUER (http://localhost:8080/realms/cybertech), GUEST_CART_SECRET, NEXT_PUBLIC_SITE_URL. Aligner les noms avec src/main/resources/k8s/helm/charts/front-app-chart/values.yaml du backend (renommer NEXT_PUBLIC_API_BASE en API_BASE_URL côté chart : l'URL backend ne doit pas être exposée au client).

## Dev local
- docker-compose.yml du front : service `front` (build Dockerfile, port 3000) + inclusion du docker-compose du backend (MySQL, Redis, MongoDB, Elasticsearch, Keycloak, LocalStack, Mailpit, moderation-api) ; le backend Spring tourne soit sur l'hôte (`./mvnw spring-boot:run`, joint via host.docker.internal:8081), soit via son Dockerfile (`src/main/resources/docker/dockerfile`).
- Le stack réel utilise MySQL (pas PostgreSQL) : le compose suit le code.
- Script `npm run gen:api` (openapi-typescript sur http://localhost:8081/v3/api-docs).
- Prérequis : créer le client Keycloak `cybertech-front-client` (redirect http://localhost:3000/api/auth/callback/keycloak, post-logout http://localhost:3000/*, web origin http://localhost:3000) et l'ajouter au realm exporté du backend.

## Tests
- Unitaires : schémas Zod (cas valides/invalides miroir de Bean Validation), errors.ts (chaque statut), normalisation panier, fusion panier invité, hooks TanStack Query (optimistic + rollback), composants a11y.
- E2E Playwright : recherche avec faute de frappe, filtres + URL, fiche produit, inscription (erreurs champ), login/logout Keycloak, ajout panier invité puis fusion, stock insuffisant, session expirée (token forcé expiré), backend coupé ; axe-core sans violation sérieuse ; projet « reduced-motion ».

## Livrables d'infra
Dockerfile multi-stage (node:24-alpine, utilisateur non-root, `HOSTNAME=0.0.0.0`, `PORT=3000`), `.dockerignore`, `.env.example`, health route `app/api/health/route.ts` pour les sondes du chart Helm.
````

---

## 4.4 Questions ouvertes et décisions à prendre

| # | Question / ⚠️ À CONFIRMER | Recommandation |
|---|---|---|
| 1 | **Client Keycloak du front** : absent du realm exporté alors que le chart Helm attend `cybertech-front-client`. | Le créer (confidentiel, standard flow + PKCE S256, direct access grants désactivé, redirects `http://localhost:3000/*` et `https://cybertech.local/*`) et l'ajouter à `src/main/resources/keycloak/import/cybertech-realm.json` côté backend. **Bloquant.** |
| 2 | **Panier invité** : non supporté par le backend. Le porter dans le BFF ou l'exclure du lot 1 ? | BFF (cookie signé + fusion via `/cart/add`), comme décrit dans le plan. Alternative backend plus propre à moyen terme : `POST /cart/merge`. |
| 3 | **Pas de `GET /user/me`**. | Ajouter l'endpoint côté backend (5 lignes, réutilise `getByKeycloakId`). En attendant : claims de l'ID token. |
| 4 | **Stock non exposé** sur `ProductResponseDto`. | Ajouter `availableStock` (= `stock - reservedStock`) côté backend ; le lot 1 gère le 409. |
| 5 | **Avis publics / note moyenne** non disponibles. | Hors lot 1 ; prévoir `GET /review/product/{uuid}` public pour le lot 2. |
| 6 | **Paiement simulé côté serveur** (`pm_card_visa`). Lot 2 avec vrai paiement ? | Garder la simulation pour un projet pédagogique, ou ajouter un endpoint renvoyant le `client_secret` pour Stripe Payment Element. À décider avant le lot 2. |
| 7 | **Liste publique des catégories** absente. | Exposer `GET /product-category-schemas` public ; en attendant, liste statique `COMPUTER`, `MONITOR`. |
| 8 | **Tri et facettes** absents de la recherche. | Ajouter `sort` + agrégations ES côté backend ; lot 1 sans tri. |
| 9 | **Rate limit d'inscription** global derrière le BFF en dev. | Transmettre `X-Forwarded-For` depuis le BFF et activer `server.forward-headers-strategy=framework` aussi en dev. |
| 10 | **Erreurs sans code machine** ; panier vide en 403 ; verrou panier en 500. | Ajouter `errorCode` (nom de l'enum) à `ErrorResponseDto` et passer le verrou en 409 ; le BFF contourne en attendant. |
| 11 | **`application.frontend.url=http://localhost:4200`** (liens d'email). | Passer à `http://localhost:3000`. |
| 12 | **Format JSON de `UserResponseDto.birthDate`** (`java.util.Date` avec Jackson 3) non vérifié. | Vérifier sur une réponse réelle ; idéalement migrer en `LocalDate`. |
| 13 | **Fuseau des `LocalDateTime`** (remises, wishlist) non précisé. | Considérer UTC (JDBC `serverTimezone=UTC`) ; à confirmer. |
| 14 | **Recherche vide** (aucun filtre) renvoie-t-elle tout le catalogue ? | Tester `POST /product/search {}` ; sinon le front envoie `keyword` vide → à ajuster. |
| 15 | **Politique de mot de passe Keycloak** éventuellement plus stricte que `@Size(min=8)`. | Vérifier dans la console Keycloak ; aligner le schéma Zod. |
| 16 | **Purge des paniers abandonnés** : aucun job identifié. | Accepter pour le lot 1. |
| 17 | **Ton des messages** (tutoiement ou vouvoiement). La direction artistique utilise « Content de te revoir ». | Tutoiement cohérent partout. |
| 18 | **Auth.js v5 encore en bêta** (`5.0.0-beta.32`). | L'utiliser (le chart Helm est déjà câblé dessus) ; alternative : `openid-client` + session maison si la bêta pose problème. |
| 19 | **Skill `frontend-design`** : non installé dans ce Claude Code. | Installer le plugin officiel `frontend-design` (marketplace Anthropic) avant `/speckit-implement`. |
| 20 | **Domaine S3 de production** pour `next/image`. | À fournir avec la config Helm de prod. |
| 21 | **Écarts avec le prompt initial** : PostgreSQL → MySQL, JWT maison → Keycloak, pas d'API Gateway. | Le code fait foi ; mettre à jour la présentation du projet. |
