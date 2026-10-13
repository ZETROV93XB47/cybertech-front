# Quickstart — 002 Catalogue et navigation

Guide de validation de la feature. Environnement identique au lot 1
(`specs/001-catalog-auth-cart/quickstart.md` §1 et §2) : services du backend via son
docker-compose, backend Spring depuis IntelliJ sur `http://localhost:8081`, front sur
`http://localhost:3000`.

## 1. Préparation

1. Backend à jour (`develop_back`) avec l'endpoint de facettes s'il est livré ; vérifier :
   `curl -s -X POST -H 'X-API-VERSION: 1.0' -H 'Content-Type: application/json' -d '{"category":"COMPUTER"}' http://localhost:8081/api/v1/services/product/search/facets`
   → JSON avec `totalHits`, `brands`, `attributes.cpu`… ; un 404 signifie que le front utilisera
   le repli sans compteurs.
2. `npm run gen:api` : le type `ProductFacetsResponseDto` apparaît dans `lib/api/schema.d.ts`
   quand l'endpoint est exposé ; le test de type des facettes le compare au schéma Zod.
3. Écrans (MONITOR) : la recherche locale n'en contient aucun au 2026-10-13 ; demander une
   réindexation au backend pour valider les scénarios « Écrans », sinon les noter « non
   testables ».
4. `npm run dev` (ou réutiliser le serveur déjà lancé sur le port 3000).

## 2. Contrôles automatiques

`npm run typecheck`, `npm run lint` (0 warning), `npm run test`, puis les parcours Playwright
de la feature un par un (`--workers=1`) : `catalog-filters.spec.ts`, `compare.spec.ts`,
`navigation.spec.ts`, `home.spec.ts`, plus `a11y.spec.ts` et `long-tasks.spec.ts` étendus.

## 3. Scénarios manuels

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| 1 | `/products`, choisir « Ordinateurs » | Filtres Processeur, Carte graphique, Système, Type d'écran (cases), Mémoire vive (Go) et Stockage (Go) (plages) ; pas de Connectique | US1-1, FR-001 |
| 2 | Cocher « AMD Ryzen 7 » et « Intel Core Ultra 7 » | Produits de l'un ou l'autre processeur, 2 pastilles, compteur de résultats annoncé | US1-2, FR-003, FR-009 |
| 3 | Avec l'endpoint de facettes : cocher LENOVO | Compteurs des processeurs restreints à LENOVO ; autres marques toujours listées ; valeurs à 0 grisées | US1-3, FR-004 |
| 4 | Sans l'endpoint (backend ancien) | Mêmes filtres, sans compteurs ; page entièrement fonctionnelle | FR-005 |
| 5 | Carte graphique : ouvrir « Voir tout » | 6 valeurs visibles d'abord, toutes les autres dépliées | US1-7, FR-006 |
| 6 | Retirer une pastille, puis « Tout effacer » avec un mot-clé | Seul ce filtre retiré ; puis tout retiré sauf le mot-clé | US1-5 |
| 7 | Copier l'adresse filtrée dans une fenêtre privée | Mêmes filtres, mêmes résultats | US1-6, FR-010 |
| 8 | JavaScript désactivé : filtrer, pastilles, « Voir tout » | Tout fonctionne par rechargement de page | FR-010 |
| 9 | Mémoire vive minimum 200 | Refus sur le champ, message au tutoiement | Edge Cases |
| 10 | Cocher « Comparer » sur un ordinateur | Barre en bas avec invitation ; cases des autres catégories indisponibles avec la raison | US2-1, FR-014 |
| 11 | Cocher un 2e, puis un 3e (page 2) | « Comparer » apparaît au 2e ; au 3e, les autres cases indiquent « 3 produits maximum » | US2-2, US2-3 |
| 12 | Changer de filtres, revenir, recharger | Sélection intacte | US2-4, FR-016 |
| 13 | « Comparer » | Cadre au-dessus de la page : image, nom, marque, prix, disponibilité, ajout au panier ; une ligne par caractéristique avec « — » si absente, connectique comprise | US2-5, FR-018 |
| 14 | « Afficher seulement les différences », puis Échap | Lignes identiques masquées ; cadre fermé, focus sur « Comparer » | US2-6, US2-7 |
| 15 | Fiche d'un 3e ordinateur, « Ajouter à la comparaison » | Ajouté, bouton devient « Retirer de la comparaison », barre visible sur la fiche | US2-8 |
| 16 | Fermer l'onglet, rouvrir le catalogue | Sélection vide | Clarification 3 |
| 17 | Modifier `ct_compare_v1` à la main (UUID faux, 4 produits) | Sélection nettoyée sans erreur visible | Edge Cases |
| 18 | Parcourir Accueil, Catalogue, Ordinateurs, une fiche, le panier, inscription, connexion | Même barre partout ; rubrique courante soulignée et `aria-current` ; Ordinateurs actif sur la fiche d'un ordinateur | US3, FR-025, FR-026 |
| 19 | Tab au chargement | « Aller au contenu » apparaît, puis place le focus sur le contenu | US3-3, FR-027 |
| 20 | Accueil puis catalogue côte à côte | Même largeur, marges, titres, cartes ; tuile « Ordinateurs » → catalogue filtré | US4-1, US4-2 |
| 21 | Effets « désactivés » puis `prefers-reduced-motion` | Barre, cadre et pastilles en fondu simple ; aucune animation de mouvement | Edge Cases, FR-031 |

## 4. Performances et accessibilité

- Lighthouse desktop sur un build de production (`NEXT_DIST_DIR=.next-prod npx next build`,
  `next start -p 3124`) : `/`, `/products?category=COMPUTER` ; LCP ≤ 2,5 s, CLS ≤ 0,1,
  TBT ≤ 200 ms ; résultats consignés en §5.
- axe : 0 violation `serious` / `critical` sur l'accueil, le catalogue filtré et le cadre de
  comparaison ouvert.
- `long-tasks.spec.ts` : aucune tâche > 50 ms due aux effets, comparaison ouverte comprise.

## 5. Résultats

À compléter à la fin de chaque user story (date, contrôles, captures avant / après, scénarios
OK / KO / non testables).

### US1 — Filtres par caractéristique (2026-10-13)

**Environnement** : backend `develop_back` au commit `3a3a62c` (facettes livrées), front sur
`next dev -p 3123` (`playwright.capture.config.ts`). `npm run gen:api` depuis le backend en
direct : identique au fichier produit depuis `docs/openapi/openapi.yaml`.

**Contrôles automatiques** : `npm run typecheck` 0 erreur, `npm run lint` 0 erreur et 0 warning,
`npm run test` 369 tests verts (45 fichiers, dont 2 tests de type sur le contrat des facettes),
`catalog-filters.spec.ts` 9/9, `catalog.spec.ts` (lot 1) 8/8.

**Source des facettes observée** : endpoint backend (compteurs disjonctifs). Le repli sans
compteurs est couvert en unitaire (`facets-endpoint.test.ts`).

**Captures** : avant dans `screenshots/before/` (seules Mémoire vive et Stockage étaient
filtrables) ; catalogue filtré relu (pastilles, compteurs, « Voir moins », bornes).

| # | Résultat | Commentaire |
|---|---|---|
| 1 | OK | Processeur, Carte graphique, Système, Type d'écran, Mémoire vive (Go), Stockage (Go) ; pas de Connectique. |
| 2 | OK | Deux processeurs → deux pastilles, résultats filtrés, rechargement identique. |
| 3 | OK | Avec LENOVO : compteurs restreints, toutes les marques restent listées (comptage disjonctif vérifié aussi en direct sur l'API). |
| 4 | OK (unitaire) | Repli sans compteurs testé avec MSW ; non rejoué en réel (le backend expose l'endpoint). |
| 5 | OK | 35 cartes graphiques : 6 visibles, le reste sous « Voir tout ». |
| 6 | OK | Pastille retirée seule ; « Tout effacer » garde le mot-clé. |
| 7 | OK | Adresse rechargée et partagée : mêmes filtres. |
| 8 | OK | Sans JavaScript : formulaire, pastilles et « Voir tout » par rechargement. |
| 9 | OK | Mémoire vive 9999 refusée sur le champ (« Choisis une valeur entre… »). |

**Correctif trouvé pendant la vérification** : une plage déjà choisie pouvait sortir des
bornes observées sous d'autres filtres (ex. ≥ 8 Go puis un processeur dont les machines
commencent à 16 Go) ; le champ devenait invalide et bloquait toute soumission du formulaire.
Les bornes acceptées s'élargissent désormais à la plage choisie (test unitaire et e2e ajoutés).

**Points restants** : scénarios MONITOR non testables (aucun écran dans l'index local).

### US2 — Comparateur (2026-10-13)

**Environnement** : backend local (Spring sur 8081), front sur `next dev -p 3123`
(`playwright.capture.config.ts`).

**Contrôles automatiques** : `npm run typecheck` 0 erreur, `npm run lint` 0 erreur et 0 warning,
`npm run test` 406 tests verts (49 fichiers), `compare.spec.ts` 5/5. `catalog.spec.ts` : 7/8 ;
`cart.spec.ts` (parcours invité) : 3/4. Les deux échecs restants ne viennent pas d'US2 :

- palette Ctrl+K : le raccourci est envoyé avant l'hydratation sous Turbopack (l'événement `load`
  arrive environ 150 ms plus tôt) ; l'échec se reproduit à l'identique sur le commit `67722fd`
  sous Turbopack, alors que le test passe avec webpack, que ce soit sur `67722fd` ou avec US2 ;
- « Indisponible » sur la fiche : le sélecteur `getByRole("button", { name: "Indisponible" })`
  trouve aussi les boutons des produits similaires (lot 1).

`catalog.spec.ts` a été ajusté : la case « Lenovo » est cherchée dans le formulaire des filtres,
car les cases « Comparer Lenovo… » des cartes rendaient le sélecteur ambigu.

**Captures relues** : barre avec 1 produit (invitation), barre avec 3 produits et infobulle
« 3 produits maximum » sur une carte, cadre ouvert, cadre filtré sur les différences, fiche
produit avec le bouton et sa raison. Infobulle d'abord rognée par la carte : elle s'ouvre
désormais sous la case, sur un fond opaque.

| # | Résultat | Commentaire |
|---|---|---|
| 10 | OK | Barre et invitation dès le 1er produit. Refus « autre catégorie » couvert en unitaire uniquement (aucun écran dans l'index local). |
| 11 | OK | « Comparer » au 2e ; au 3e (page 2), les autres cases sont `aria-disabled` avec la raison. |
| 12 | OK | Filtre marque puis rechargement : 3 produits toujours dans la barre. |
| 13 | OK | 3 colonnes (image, marque, nom, prix, stock, panier), lignes Processeur → Connectique, « — » si absent. |
| 14 | OK | Différences seulement ; Échap ferme et rend le focus à « Comparer ». |
| 15 | OK | Fiche d'un 3e ordinateur : ajouté, bouton « Retirer de la comparaison », barre visible. |
| 16 | OK | Nouveau contexte navigateur : sélection vide. |
| 17 | OK | JSON cassé nettoyé sans message ; UUID inconnu retiré au chargement avec le message (4 UUID : unitaire). |

**Points restants** : refus « autre catégorie » non testable en réel tant que les écrans ne sont
pas indexés ; animations de la barre et du cadre reportées à la phase 7 (T069).

### US3 — Barre de navigation (2026-10-13)

**Contrôles automatiques** : `npm run typecheck` 0 erreur, `npm run lint` 0 erreur et 0 warning,
`npm run test` 427 tests verts (51 fichiers), `navigation.spec.ts` 3/3, `preferences.spec.ts`
vert (front sur 3123). `auth.spec.ts` 4/4 sur le port 3000 (les 2 tests d'expiration de
session sont ignorés sans `E2E=true`), rejoué après un arrêt temporaire du backend.

**Changements** : liens Accueil, Catalogue, Ordinateurs, Écrans (`MainNav` dans un `Suspense`,
version statique sans rubrique courante en repli) ; rubrique courante soulignée en or et
`aria-current="page"` ; la fiche produit publie sa catégorie (`NavSectionMarker`). Hauteur
(40 px), taille d'icône et survol communs à tous les contrôles de l'en-tête
(`components/layout/header-controls.ts`). `main` reçoit `tabIndex={-1}` pour que « Aller au
contenu » y place réellement le focus.

| # | Résultat | Commentaire |
|---|---|---|
| 18 | OK | Mêmes liens dans le même ordre sur l'accueil, le catalogue, Ordinateurs, une fiche d'ordinateur (Ordinateurs actif), le panier, l'inscription et la connexion. |
| 19 | OK | Premier Tab : « Aller au contenu » visible ; Entrée place le focus sur `main` ; tous les contrôles de l'en-tête atteints au clavier. |

### US4 — Accueil et catalogue cohérents (2026-10-13)

**Contrôles automatiques** : `npm run typecheck` 0 erreur, `npm run lint` 0 erreur et 0 warning,
`npm run test` 437 tests verts (53 fichiers), `home.spec.ts` 3/3, `catalog-filters.spec.ts` 9/9,
`compare.spec.ts` 5/5, `navigation.spec.ts` 3/3, `catalog.spec.ts` 7/8 (palette Ctrl+K, échec
connu sous Turbopack, voir US2).

**Changements** : `PageShell` (largeur, marges, rythme vertical), `PageHeader` (fil d'Ariane
optionnel, titre vivant, sous-titre, actions, compteur annoncé), `SectionHeading`, `EmptyState`
et squelettes de cartes (`ProductCardSkeleton`, `ProductGridSkeleton`, utilisés par « Tu
regardais » pendant le chargement) partagés par l'accueil et le catalogue. Accueil : tuiles
Ordinateurs / Écrans avec le nombre réel de produits (`getCategoryCounts`, `totalHits` des
facettes), offre affichée seulement si une campagne est active, état vide illustré sans
meilleure vente. Catalogue : fil d'Ariane Accueil › Catalogue › catégorie, titre vivant, nombre
de résultats annoncé ; colonne de filtres et grille à 3 colonnes inchangées. Les vignettes de la
barre de comparaison gardent leur petit bloc `skeleton-shimmer` (format vignette).

| # | Résultat | Commentaire |
|---|---|---|
| 20 | OK | Même largeur, mêmes marges et même style de titre mesurés sur l'accueil et le catalogue ; tuile « Ordinateurs » (531 produits) → `/products?category=COMPUTER` ; « Écrans » : « Aucun produit pour l'instant » (index local sans écran). Offre BLACK_FRIDAY active, affichée. |

### Phase 7 — Interface vivante et cohérente (2026-10-13)

**Audit (T066)** : captures dans `screenshots/audit/` (accueil, catalogue, catalogue filtré, sans
résultat, panier, barre de comparaison à 1 et 3 produits, cadre, fiche avec le bouton), en
visiteur seulement (l'en-tête connecté exige Keycloak sur le port 3000 ; vérifié par
`auth.spec.ts`). État « facettes indisponibles » non capturable sans couper le backend (couvert
en unitaire). Constats :

| Constat | Correction |
|---|---|
| Fil d'Ariane de la fiche commençant à « Catalogue », celui du catalogue à « Accueil » | « Accueil » ajouté en tête du fil de la fiche |
| Bouton « Ajouter à la comparaison » isolé loin du panier | Regroupé sous « Ajouter au panier » |
| Action de l'état vide en bouton plat, CTA de l'accueil en dégradé | `PRIMARY_CTA_CLASS` + `MagneticButton` partout (`components/layout/cta.ts`) |
| Titre « Catalogue » sur le catalogue filtré par catégorie | Titre = catégorie choisie (donnée réelle) |
| Panier : titre plus petit et état vide centré | Laissé en l'état (hors périmètre de la feature 002, à reprendre avec la feature commande) |

Rien n'a été ajouté de fictif (T067) : les blocs de l'accueil restent les meilleures ventes,
l'offre active, les produits consultés et les tuiles avec les comptes réels.

**Animations (T069–T071)** : grille de résultats, sections de l'accueil et pastilles entrent
en CSS (`.enter-rise`, `.enter-fade`, retard `--enter-index` × `--stagger`), donc visibles sans
JavaScript ; barre de comparaison qui glisse depuis le bas, cadre en fondu + échelle, soulignement
de la navigation qui glisse d'un lien à l'autre (`layoutId`), coche animée sur « Comparer »,
bouton « Comparer » en chargement (`aria-busy`). Effets réduits ou désactivés et
`prefers-reduced-motion` : fondu seul (`useSurfaceMotion`, `data-entrance`). Inclinaison
(`TiltCard`) sur les tuiles de catégorie et les cartes d'en-tête du cadre. Son à l'ajout : non
ajouté (aucun son adapté dans `UiSound`, optionnel).

**Contrôles** : `npm run test` 457 tests verts (54 fichiers, dont
`compare-effects-levels.test.tsx` : barre, cadre, soulignement, coche et pastilles × 4 situations
d'effets) ; `a11y.spec.ts` (catalogue filtré, cadre ouvert, fiche avec bouton) 0 violation
`serious` / `critical` ; `long-tasks.spec.ts` sur build de production : aucune tâche > 50 ms
(accueil et comparaison de 3 produits, cadre ouvert puis fermé).

**Lighthouse desktop (T075)**, build de production (`.next-prod`, `next start -p 3124`) :

| Page | Score | LCP | CLS | TBT |
|---|---|---|---|---|
| `/` | 99 | 1,04 s | 0,002 | 5 ms |
| `/products?category=COMPUTER` | 98 | 1,15 s | 0,002 | 0 ms |

**Captures après (T076)** : `screenshots/after/` (mêmes pages que `before/` plus les états de
l'audit). Scénario 21 (effets désactivés, `prefers-reduced-motion`) : OK en unitaire (fondu
seul, aucune transformation).
