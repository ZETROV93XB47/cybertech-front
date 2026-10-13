# Quickstart — valider le lot 1 de bout en bout

Guide de validation, pas d'implémentation. Contrats : `contracts/`, schémas : `data-model.md`.
Exécution locale uniquement, navigateur desktop (constitution X).

## Prérequis

- Node 24 LTS, npm 11 ; Docker Desktop (pour les services du backend) ; IntelliJ IDEA + JDK 26.
- Repo backend en lecture seule : `C:\Users\guill\Downloads\cybertech-dev-develop_cybertech`
  (branche `develop_back`, commits ≥ `d50e661`).
- Client Keycloak `cybertech-front-client` présent (importé avec le realm ; sur une base Keycloak
  existante : `src/main/resources/bash/createKeycloakFrontClient.ps1` du backend).

## 1. Démarrer l'environnement

1. **Services du backend** (MySQL, Redis, Mongo, Elasticsearch, Keycloak, LocalStack, Mailpit,
   moderation-api) :
   ```powershell
   cd C:\Users\guill\Downloads\cybertech-dev-develop_cybertech\src\main\resources\docker
   docker compose up -d
   ```
2. **Backend Spring** : lancer l'application depuis IntelliJ (port 8081).
3. **Front** :
   ```powershell
   cd C:\Users\guill\Downloads\cybertech-front
   Copy-Item .env.example .env.local ; npm ci ; npm run gen:api ; npm run dev
   ```

Attendu : `http://localhost:8081/swagger-ui.html` répond ; `http://localhost:3000` affiche
l'accueil. Une variable obligatoire manquante fait échouer `npm run dev` avec un message listant
la variable (principe VI).

## 2. Contrôles automatiques

```powershell
npm run typecheck      # tsc --noEmit, 0 erreur
npm run lint           # 0 erreur, 0 warning
npm run test           # Vitest : schémas, erreurs, panier invité, fusion, hooks
npm run test:e2e       # Playwright (environnement démarré), projets chromium + reduced-motion
```

## 3. Performances (manuel, fin de chaque story)

Chrome → F12 → onglet **Lighthouse** → mode **Desktop** → « Analyze page load » sur `/`,
`/products` et une fiche produit. Attendu : LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms.

Mesurer un **build de production**, pas `next dev`. Pour ne pas toucher au `.next` du serveur de
développement : `NEXT_DIST_DIR=.next-prod npx next build` puis
`NEXT_DIST_DIR=.next-prod npx next start -p 3124`.

### Résultats du 2026-10-13 (T116)

Lighthouse 12.6.1 en CLI (`--preset=desktop`, catégorie performance), Chromium 1248, build de
production sur `http://localhost:3124`, backend local réel, effets au niveau « complets ».

| Page | Score | LCP | CLS | TBT |
|---|---|---|---|---|
| `/` | 99 | 904 ms | 0,002 | 3 ms |
| `/products` | 98 | 1 128 ms | 0,002 | 5 ms |
| `/products/01a1347f-7f21-713f-b67e-db063b2d9b2c` | 99 | 927 ms | 0,002 | 0 ms |

Tous les budgets sont tenus. Le parcours `tests/e2e/long-tasks.spec.ts` (5 s de mouvements du
curseur sur l'accueil) ne relève aucune tâche longue, ni en développement ni sur ce build.

## 4. Scénarios manuels

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| 1 | Taper « lenvo » dans ⌘K | Produits LENOVO listés en direct | US1-1, FR-009 |
| 2 | `/products` : COMPUTER + LENOVO + prix 500–1500, recharger | Mêmes résultats, filtres dans l'URL | US1-2, FR-004 |
| 3 | Filtres sans résultat | État vide + « Réinitialiser les filtres » | US1-3 |
| 4 | `/products/00000000-0000-0000-0000-000000000000` | Page « produit introuvable » | US1-4 |
| 5 | Fiche d'un produit en rupture (stock mis à 0 via l'admin) | « Rupture » ; bouton d'ajout désactivé (après US4) | US1-5, US4-7 |
| 6 | Inscription avec email invalide | Erreur sur le champ, aucun appel réseau | US2-1 |
| 7 | Inscription avec un email existant | « Un compte existe déjà avec cet email. » | US2-2 |
| 8 | 6 inscriptions en moins d'une minute | « Réessaie dans N s » | US2-3 |
| 9 | Visiteur : ajouter 2 produits, se connecter (compte ayant 1 ligne) | Panier fusionné + toast récapitulatif ; localStorage vidé | US4-4, FR-025 |
| 10 | Ouvrir 2 onglets invités avec panier, se connecter dans l'un | Une seule fusion, aucune quantité doublée | SC-007 |
| 11 | Demander 5 unités d'un produit qui en a 3 | « Il n'en reste que 3. », panier inchangé | US4-2 |
| 12 | Même compte sur un second navigateur | Même panier | US4-3 |
| 13 | Rester connecté 20 min en naviguant | Jamais déconnecté | US3-2 |
| 14 | Se déconnecter puis « retour » | Ni panier du compte ni prénom affichés ; session Keycloak fermée | US3-3, FR-017 |
| 15 | Couper le backend dans IntelliJ, recharger `/products` | Message bienveillant + « Réessayer » | FR-029 |
| 16 | Windows en « Afficher les animations : désactivé » | Grille de points et blobs figés, transitions en fondu | FR-031 |
| 17 | Navigation complète au clavier (Tab, ⌘K/Ctrl+K, Échap, panier) | Tout accessible, focus visible | SC-009 |
| 18 | Désactiver JavaScript, ouvrir `/products?category=COMPUTER` puis une fiche | Contenu lisible, filtres utilisables (formulaire) | FR-010 |

## 5. Déroulé du 2026-10-13 (T119)

**Contrôles automatiques** : `npm run typecheck` 0 erreur, `npm run lint` 0 erreur et 0 warning,
`npm run test` 331 tests verts, `npm run test:e2e` lancé spec par spec (`--workers=1`) sur le
front du port 3000 : 58 parcours verts, 0 échec. Parcours ignorés volontairement : projet
`reduced-motion` pour les parcours qui créent des comptes, expiration de session hors
`E2E=true` (validée le même jour sur un front lancé avec `E2E=true` : 6/6), courriel déjà
utilisé (`test.fixme`, voir n° 7).

**Performances** : voir §3, tous les budgets tenus.

**Scénarios** :

| # | Résultat | Comment |
|---|---|---|
| 1 | OK | `catalog.spec.ts` (« lenvo » → Lenovo, palette Ctrl+K). |
| 2 | OK | `catalog.spec.ts` (filtres combinés, rechargement). |
| 3 | OK | `catalog.spec.ts` (état vide + réinitialisation). |
| 4 | OK | `catalog.spec.ts` (404 « produit introuvable »). |
| 5 | OK (simulé) | Aucun produit en rupture dans le jeu de données : stock simulé à 0 dans `catalog.spec.ts` et `cart.spec.ts` (badge « Rupture », bouton « Indisponible » sur carte et fiche). À refaire à la main avec un stock réel à 0. |
| 6 | OK | `register.spec.ts` (erreur sur le champ, aucune requête). |
| 7 | **Bloqué backend** | Le backend répond 500 `APPLICATION_ERROR` au lieu de 409 `USER_ALREADY_EXISTS` (exception jamais levée). Front prêt et testé en unitaire ; parcours en `test.fixme`. |
| 8 | OK (unitaire) | 429 + `Retry-After` → « Doucement ! Réessaie dans N s. » (`register-action.test.ts`). Non rejoué en réel pour ne pas bloquer les autres parcours. |
| 9 | OK | `cart.spec.ts` (fusion + toast, `localStorage` vidé). |
| 10 | OK | `cart.spec.ts` (deux onglets, une seule fusion). |
| 11 | OK (simulé) | Stock réel de 10 000 : refus simulé dans `cart.spec.ts` (« Il n'en reste que 2. », panier inchangé) ; logique BFF couverte en unitaire. |
| 12 | OK | `cart.spec.ts` (second navigateur, même panier). |
| 13 | OK (accéléré) | `auth.spec.ts` : jeton d'accès expiré à la demande puis navigation, renouvelé sans interruption. Les 20 min réelles restent à faire à la main. |
| 14 | OK | `auth.spec.ts` (déconnexion, « retour », Keycloak redemande les identifiants). |
| 15 | OK | `backend-down.spec.ts` sur un build dont le backend est injoignable (port fermé) plutôt qu'en arrêtant Spring. |
| 16 | OK | Projet `reduced-motion` : effets absents ou figés, avis dans le panneau (`preferences.spec.ts`, `effects-levels.test.tsx`). |
| 17 | OK (partiel) | Parcours clavier : inscription complète, panneau Préférences, Ctrl+K/Échap. Un passage manuel complet au clavier reste conseillé. |
| 18 | OK | `catalog.spec.ts` et `register.spec.ts` sans JavaScript. |
