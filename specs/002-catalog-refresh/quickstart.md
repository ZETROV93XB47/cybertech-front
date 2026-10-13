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
