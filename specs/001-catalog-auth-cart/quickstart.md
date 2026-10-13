# Quickstart — valider le lot 1 de bout en bout

Guide de validation, pas d'implémentation. Contrats : `contracts/`, schémas : `data-model.md`.

## Prérequis

- Node 24 LTS, npm 11 ; Docker Desktop.
- Repo backend en lecture seule : `C:\Users\guill\Downloads\cybertech-dev-develop_cybertech`
  (branche `develop_back`, commits ≥ `d50e661`), JDK 26.
- Client Keycloak `cybertech-front-client` présent (importé avec le realm ; sur une base Keycloak
  existante : `src/main/resources/bash/createKeycloakFrontClient.ps1` du backend).

## 1. Démarrer la stack

```powershell
# Infra backend (MySQL, Redis, Mongo, Elasticsearch, Keycloak, LocalStack, Mailpit, moderation-api)
docker compose up -d                       # depuis la racine du front (inclut le compose backend)
# Backend Spring, sur l'hôte
cd ..\cybertech-dev-develop_cybertech ; .\mvnw spring-boot:run
# Front
cd ..\cybertech-front ; Copy-Item .env.example .env.local ; npm ci ; npm run gen:api ; npm run dev
```

Attendu : `http://localhost:8081/swagger-ui.html` répond ; `http://localhost:3000` affiche
l'accueil ; `http://localhost:3000/api/health` → `{"status":"ok"}`. Une variable d'environnement
manquante fait échouer `npm run dev` avec un message listant la variable (principe VI).

## 2. Contrôles automatiques

```powershell
npm run typecheck      # tsc --noEmit, 0 erreur
npm run lint           # 0 erreur, no-explicit-any actif
npm run test           # Vitest : schémas, erreurs, panier invité, fusion, hooks
npm run test:e2e       # Playwright (stack démarrée), projets chromium + reduced-motion
npm run lhci           # Lighthouse CI : LCP < 2,5 s, CLS < 0,1 sur /, /products, une fiche
```

## 3. Scénarios manuels (un par user story)

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| 1 | Taper « lenvo » dans ⌘K | Produits LENOVO listés en direct | US1-1, FR-009 |
| 2 | `/products` : COMPUTER + LENOVO + prix 500–1500, recharger | Mêmes résultats, filtres dans l'URL | US1-2, FR-004 |
| 3 | Filtres sans résultat | État vide + « Réinitialiser les filtres » | US1-3 |
| 4 | `/products/00000000-0000-0000-0000-000000000000` | Page « produit introuvable » | US1-4 |
| 5 | Fiche d'un produit en rupture (stock mis à 0 via l'admin) | « Rupture », bouton désactivé | US1-5, FR-007 |
| 6 | Inscription avec email invalide | Erreur sur le champ, aucun appel réseau | US2-1 |
| 7 | Inscription avec un email existant | « Un compte existe déjà avec cet email. » | US2-2 |
| 8 | 6 inscriptions en moins d'une minute | « Réessaie dans N s » | US2-3 |
| 9 | Visiteur : ajouter 2 produits, se connecter (compte ayant 1 ligne) | Panier fusionné + toast récapitulatif ; localStorage vidé | US4-4, FR-025 |
| 10 | Ouvrir 2 onglets invités avec panier, se connecter dans l'un | Une seule fusion, aucune quantité doublée | SC-007 |
| 11 | Demander 5 unités d'un produit qui en a 3 | « Il n'en reste que 3. », panier inchangé | US4-2 |
| 12 | Même compte sur un second navigateur | Même panier | US4-3 |
| 13 | Rester connecté 20 min en naviguant | Jamais déconnecté | US3-2 |
| 14 | Se déconnecter puis « retour » | Aucune donnée privée ; session Keycloak fermée | US3-3 |
| 15 | Couper le backend, recharger `/products` | Message bienveillant + « Réessayer » | FR-029 |
| 16 | OS en « réduire les animations » | Grille de points et blobs figés, transitions en fondu | FR-031 |
| 17 | Navigation complète au clavier (Tab, ⌘K, Échap, panier) | Tout accessible, focus visible | SC-009 |

## 4. Conteneur

```powershell
docker build -t cybertech-front:local .
docker run --rm --network host --env-file .env.local cybertech-front:local
```

Attendu : image fondée sur `node:24-alpine`, utilisateur non-root, port 3000, `/api/health`
répond. (`--network host` en dev pour que l'issuer Keycloak `localhost:8080` soit identique
pour le navigateur et le serveur ; voir research R16.)
