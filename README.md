# cybertech-front

Front **Next.js 16** (App Router, React 19, TypeScript strict) de **cybertech**, boutique
pédagogique de matériel informatique. Le lot 1 couvre le catalogue, l'inscription, la connexion
Keycloak, le panier (invité et compte) et les préférences d'interface, dans la direction
artistique « Aurora Glow ».

Les règles du projet sont dans `.specify/memory/constitution.md` (texte de référence) et
`CLAUDE.md` (règles de code). La spécification du lot 1 est dans `specs/001-catalog-auth-cart/`.

## Démarrer en local

L'exécution est uniquement locale (pas de Docker pour le front, pas de CI).

1. **Services du backend** : depuis le repo backend
   (`C:\Users\guill\Downloads\cybertech-dev-develop_cybertech`, lu en lecture seule), lancer
   son `docker-compose` (MySQL, Redis, MongoDB, Elasticsearch, Keycloak, LocalStack…).
2. **Backend Spring** : le lancer depuis IntelliJ, il écoute sur `http://localhost:8081`.
3. **Keycloak** : le realm `cybertech` doit contenir le client `cybertech-front-client`
   (redirection autorisée : `http://localhost:3000/api/auth/callback/keycloak`). Keycloak
   n'importe `cybertech-realm.json` qu'à son premier démarrage : si le client manque
   (« Client not found »), le créer à partir de ce fichier.
4. **Front** : copier `.env.example` en `.env.local`, renseigner `AUTH_SECRET`
   (`npx auth secret`), puis :

   ```powershell
   npm install
   npm run dev        # http://localhost:3000
   ```

Le front refuse de démarrer si une variable d'environnement manque ou est invalide
(`lib/env.ts`).

Les comptes se créent sur `/register` (ou `POST /user/register` du backend). Un compte créé
directement dans la console Keycloak n'a pas de profil dans la base du backend : son panier
répond « utilisateur introuvable ».

## Scripts

| Commande                          | Rôle                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                     | Serveur de développement sur le port 3000.                                                                                     |
| `npm run build` / `npm run start` | Build et serveur de production. `NEXT_DIST_DIR=.next-prod` permet de builder sans toucher au `.next` d'un `next dev` en cours. |
| `npm run typecheck`               | `tsc --noEmit`.                                                                                                                |
| `npm run lint`                    | ESLint, 0 warning toléré (règles de la constitution, principe XII).                                                            |
| `npm run test`                    | Vitest : schémas, client API, panier, fusion, session, préférences, effets.                                                    |
| `npm run test:e2e`                | Playwright contre l'environnement local réel, projets `chromium` et `reduced-motion`.                                          |
| `npm run gen:api`                 | Régénère `lib/api/schema.d.ts` depuis l'OpenAPI du backend.                                                                    |

### Tests de bout en bout

- La connexion n'est possible que sur le port 3000 : c'est la seule URI de redirection autorisée
  par le client Keycloak.
- Les parcours d'expiration de session (`auth.spec.ts`) demandent un front lancé avec
  `E2E=true` ; ils sont ignorés sinon.
- Le backend limite les inscriptions à 5 par minute et par IP : lancer les specs une à une
  (`--workers=1`) en laissant une minute entre deux specs qui créent des comptes.
- `backend-down.spec.ts` attend un front dont le backend est injoignable, par défaut sur le port
  3123 : `NEXT_DIST_DIR=.next-prod API_BASE_URL=http://127.0.0.1:9 npx next start -p 3123`.
- `long-tasks.spec.ts` mesure un build de production quand `E2E_PERF_URL` est défini.

## Architecture

| Dossier                        | Contenu                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `app/`                         | Pages (App Router) et routes BFF `app/api/**` : le navigateur n'appelle jamais Spring ni Keycloak directement.             |
| `features/<domaine>/`          | Catalogue, panier, authentification, préférences : composants, hooks, logique serveur, `messages.ts` (textes en français). |
| `components/`                  | Mise en page (en-tête, badge panier), effets signature (`components/effects/`), primitives shadcn/ui (`components/ui/`).   |
| `lib/api/`                     | Client HTTP serveur unique (`backendFetch`), erreurs du backend, endpoints.                                                |
| `lib/auth/`                    | Auth.js v5 + Keycloak : tokens dans le cookie chiffré, refresh, gardes.                                                    |
| `lib/schemas/`                 | Schémas Zod de tout ce qui entre (backend, formulaires, stockage navigateur).                                              |
| `lib/constants/`, `lib/enums/` | Constantes nommées et enums string : aucune valeur en dur ailleurs.                                                        |
| `lib/theme/`                   | `theme.config.ts`, la seule source des valeurs visuelles, transformée en variables CSS.                                    |
| `docs/`                        | Cartographie de l'API backend, analyse, conception du panier invité.                                                       |

Points clés :

- **Panier invité** dans `localStorage` (`ct_guest_cart_v1`), relu en direct via
  `POST /api/cart/preview`, puis fusionné une seule fois à la connexion (Web Locks)
  (`docs/guest-cart.md`).
- **Session** : refresh transparent du token Keycloak ; déconnexion côté application et côté
  Keycloak ; une action panier refusée pour session expirée est rejouée après reconnexion.
- **Préférences** (effets, animations, accent, sons) dans le cookie `ct_prefs_v1`, appliquées
  dès le rendu serveur (pas de flash). La préférence système « réduire les animations »
  l'emporte toujours.

## Conventions

- Code, commentaires et logs en anglais ; textes de l'interface en français, au tutoiement,
  uniquement dans `features/*/messages.ts`.
- Aucun nombre ou texte « magique », ensembles fermés en enums string, TSDoc sur chaque export.
- Logs serveur structurés via `lib/logger.ts`, identifiants masqués, jamais de token ni de mot
  de passe.
- Aucune couleur, taille ou durée en dur dans `components/` et `features/` : tout vient du thème.

Détail complet : `CLAUDE.md` et la constitution.
