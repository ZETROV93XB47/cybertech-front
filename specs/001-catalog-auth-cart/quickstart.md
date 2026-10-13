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
