# Quickstart — 004 Catalogue élargi, promotions et avis

Guide de validation. Environnement identique aux features précédentes
(`specs/003-account-orders/quickstart.md` §1) : services du backend démarrés, Spring sur
`http://localhost:8081`, front sur `http://localhost:3000` (seul port accepté par Keycloak
pour la connexion). Décisions : [research.md](./research.md). Routes :
[contracts/bff-routes.md](./contracts/bff-routes.md). Modèle : [data-model.md](./data-model.md).

## 1. Préparation

1. **Backend** (vérifié au commit `abe674d` le 2026-10-21) :
   - `curl -s -H 'X-API-VERSION: 1.0' http://localhost:8081/api/v1/services/product-category-schemas`
     → les cinq catégories actives (`categoryKey`, `label`) ;
   - les cinq schémas répondent :
     `curl -s -H 'X-API-VERSION: 1.0' http://localhost:8081/api/v1/services/product-category-schemas/SMARTWATCH`
     → `active: true` (idem `COMPUTER`, `DESKTOP`, `MONITOR`, `SMARTPHONE`) ;
   - comptes de produits (`totalHits` de `POST /product/search/facets` avec `{"category": …}`) :
     576, 262, 410, 616, 315 au 2026-10-21 (ils changent au réensemencement) ;
   - `GET /discounts/active` → `NO_DISCOUNT` et `BLACK_FRIDAY` (20 %) ;
   - `GET /review/product/{uuid}` répond sans jeton (avis vides au départ).
2. **Types** : `npm run gen:api` ; les tests de type des avis comparent les schémas Zod à
   l'OpenAPI.
3. **Images** : `public/images/categories/*.jpg` (5) et `public/images/promotions/*.jpg` (5),
   crédits dans `docs/credits.md`.
4. **Comptes** : un compte avec une commande **payée** (carte `1111…`,
   `registerUser(context, { withBankCard: true })`, puis commande) pour les avis ; noms uniques,
   5 inscriptions par minute au plus.

## 2. Contrôles automatiques

`npm run typecheck` · `npm run lint` (0 warning) · `npm run test` · puis, un par un avec
`--workers=1` et une minute de pause entre les specs qui créent des comptes :
`categories.spec.ts` (US1), `catalog-menu.spec.ts` (US2), `home-carousel.spec.ts` (US3),
`promotions.spec.ts` (US4), `reviews.spec.ts` (US5) ; `a11y.spec.ts`, `navigation.spec.ts` et
`long-tasks.spec.ts` étendus.

## 3. Scénarios manuels

### US1 — Catégories

| # | Action | Attendu |
|---|---|---|
| 1 | Catalogue, filtre « Smartphones » | 616 produits (valeur du jour), filtres propres aux smartphones (stockage, NFC, double SIM…) |
| 2 | Idem pour les quatre autres catégories | nombre exact et filtres de la catégorie |
| 3 | Ouvrir une montre connectée | fil d'Ariane « Montres connectées », icône montre |
| 4 | Ajouter un smartphone au panier (invité puis connecté) et au comparateur, le commander | libellé et icône de catégorie sur la carte, la fiche, le comparateur, les lignes du panier et de la commande, la wishlist |
| 5 | Accueil | cinq tuiles avec leur nombre de produits |
| 5 bis | Catégorie désactivée côté backend (si l'admin le permet) | absente du menu, des tuiles et du carrousel ; ses produits gardent leur libellé |

### US2 — Menu « Catalogue »

| # | Action | Attendu |
|---|---|---|
| 6 | Survoler « Catalogue » | panneau : « Tout le catalogue » + 5 catégories ; plus de liens « Ordinateurs » / « Écrans » dans la barre |
| 7 | Au clavier : Tab jusqu'à « Catalogue », Entrée, Tab, Entrée | catalogue filtré ; Échap referme et rend le focus |
| 8 | Sur une fiche smartphone | « Smartphones » signalé dans le panneau ; « Catalogue » courant dans la barre |
| 9 | Effets réduits | panneau sans animation |

### US3 — Carrousel

| # | Action | Attendu |
|---|---|---|
| 10 | Ouvrir l'accueil | une diapositive, défilement toutes les 6 s, catégories et campagne alternées |
| 11 | Survol ou focus dans le carrousel | pause ; reprise en sortant |
| 12 | « Suivant » jusqu'à « Smartphones », cliquer l'image | catalogue filtré sur les smartphones |
| 13 | Diapositive BLACK_FRIDAY, cliquer | `/promotions/BLACK_FRIDAY` |
| 14 | Bouton pause, puis onglet caché | aucun défilement |
| 15 | Effets réduits ou `prefers-reduced-motion` | pas de lecture automatique, changement sans animation |

### US4 — Promotions

| # | Action | Attendu |
|---|---|---|
| 16 | « Promotions » dans l'en-tête | liste des campagnes actives sans « aucune remise », image, avantage, conditions |
| 17 | Ouvrir BLACK_FRIDAY | « −20 % », « Sans date de fin », « Appliquer à mon panier », « Voir le catalogue » |
| 18 | Connecté : « Appliquer à mon panier », puis panier | « Réduction choisie : BLACK_FRIDAY » |
| 19 | Visiteur : « Appliquer à mon panier » | clé gardée, invitation à se connecter ; après connexion le panier la propose |
| 20 | `/promotions/INCONNUE` | « campagne introuvable ou terminée », lien vers les promotions |

### US5 — Avis

| # | Action | Attendu |
|---|---|---|
| 21 | Menu avatar → « Mes avis » | produits notables avec la date de la commande |
| 22 | Noter 4 étoiles (clavier : flèches) avec un commentaire, publier | confirmation annoncée ; le produit quitte « À noter » et apparaît sous « Mes avis publiés » |
| 23 | Ouvrir la fiche du produit | moyenne, répartition, avis avec le prénom et la date |
| 24 | Modifier la note de cet avis (plus tard, après rechargement) | mise à jour sur « Mes avis » et sur la fiche |
| 25 | Supprimer (confirmation) | avis retiré, produit de nouveau notable |
| 26 | Commentaire injurieux | refus bienveillant, saisie gardée |
| 27 | Note seule, sans commentaire | publiée (backend `8cc5ded`, research R9) |
| 28 | Détail d'une commande payée, puis en préparation (`AWAITING_SHIPPING`) | « Donner mon avis » sur chaque produit encore notable, dans les deux cas |
| 29 | Fiche d'un produit sans avis | état vide honnête, aucune note fictive |

## 4. Performance

Lighthouse desktop sur un build de production (`NEXT_DIST_DIR=.next-prod npx next build`,
`next start` sur un autre port) : accueil (avec carrousel), `/promotions`, une fiche avec
avis. Budgets : LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms.

## 5. Résultats

À remplir story par story (date, commit backend, contrôles, e2e, captures relues, points
manuels).

### Setup, socle et US1 — Toutes les catégories

Vérifié le 2026-10-21 (T001–T021) : backend `abe674d` sur 8081, front de l'utilisateur sur
3000 (rechargement à chaud).

- Contrôles : `typecheck` OK, `lint` 0 warning, `test` 938 tests verts (93 fichiers).
- Photos (T009) : 10 photos Unsplash recadrées 16:9, 1 920 × 1 080, de 62 à 265 Ko, crédits
  dans `docs/credits.md` ; la première photo générique (sac Uniqlo, logo lisible) a été
  remplacée.
- Libellés : les attributs des cinq schémas ont maintenant un nom français et une unité
  (NFC, double SIM, taille du boîtier en mm, autonomie en h…) ; sans cela ils s'affichaient
  en anglais « humanisé ».
- E2E (`--workers=1`) : `categories.spec.ts` 8 OK (comptes lus sur les facettes du backend :
  576, 262, 410, 616, 315), `catalog.spec.ts` 8 OK, `catalog-filters.spec.ts` 9 OK,
  `product-page.spec.ts` 2 OK, `compare.spec.ts` 5 OK, `home.spec.ts` 4 OK,
  `navigation.spec.ts` 3 OK, `cart.spec.ts` 7 OK. Un premier passage de `catalog` et
  `catalog-filters` a donné des dépassements de 30 s dus au serveur de dev (compilation à
  chaud) ; repassés verts sans changement de code.
- Captures relues : `screenshots/before/` et `screenshots/us1/` (accueil à cinq tuiles,
  catalogue par catégorie, fiche d'une montre). Correctif : l'accroche de l'accueil et la
  description du site ne parlaient que d'« ordinateurs et écrans ».
- Lighthouse desktop (build de production, port 3124) : accueil 0,95 (LCP 1,45 s, CLS 0,002,
  TBT 0), smartphones 0,98 (LCP 1,09 s), fiche smartphone 0,99 (LCP 0,91 s).
- Écart assumé : la page de **modification** d'une commande n'affiche pas la catégorie (son
  brouillon sauvegardé ne la conserve pas) ; le détail de la commande l'affiche.
- Barre de navigation provisoire : « Accueil · Catalogue » ; le menu des catégories arrive en
  US2.

| # | Résultat | Commentaire |
|---|---|---|
| 1 | OK | « Smartphones » : 616 produits, filtres NFC, double SIM, réseau mobile, stockage |
| 2 | OK | idem pour les quatre autres catégories (e2e) |
| 3 | OK | fil d'Ariane « Montres connectées » et étiquette à côté de la marque |
| 4 | OK | catégorie sur les cartes, la fiche, le comparateur, les lignes du panier (invité et connecté), le détail de commande, la wishlist |
| 5 | OK | cinq tuiles avec leur nombre de produits |
| 5 bis | non testé | aucune catégorie désactivable sans l'administration ; couvert par les tests unitaires de `getActiveCategories` |

### US2 — Menu « Catalogue »

Vérifié le 2026-10-21 (T022–T027) : backend `abe674d` sur 8081, front de l'utilisateur sur
3000 (rechargement à chaud).

- Contrôles : `typecheck` OK, `lint` 0 warning, `test` 951 tests verts (94 fichiers), dont
  `catalog-menu.test.tsx` (13 tests : ouverture, ordre, comptes, Échap, Tab, catégorie
  courante, clic après survol, un test par niveau d'effets).
- Le menu est testé dans `navigation.spec.ts` (T023) plutôt que dans un
  `catalog-menu.spec.ts` séparé.
- E2E (`--workers=1`) : `navigation.spec.ts` 7 OK, `a11y.spec.ts` 4 OK (nouveau cas : en-tête
  avec le menu ouvert), `home.spec.ts` 4 OK.
- Écart assumé (axe) : Radix `NavigationMenu` ajoute, menu ouvert, un « focus proxy »
  (`span aria-hidden` focusable) qui renvoie aussitôt le focus dans le panneau ; axe le signale
  en `aria-hidden-focus`. Il est exclu de l'audit de ce seul cas
  (`NAVIGATION_MENU_FOCUS_PROXY`, `tests/e2e/support/a11y.ts`).
- Comportement ajouté : un clic sur « Catalogue » juste après une ouverture au survol garde le
  panneau ouvert (Radix le refermait), comme pour le menu du compte ; le clic suivant le ferme.
- Chargement : les catégories et leurs comptes sont lus côté serveur dans un `Suspense` ; en
  attendant, la barre statique montre les cinq catégories connues sans compte (même
  dimensions, pas de décalage).
- Captures relues : `screenshots/us2/` (menu fermé, ouvert au survol, catégorie courante,
  focus clavier). Correctif : panneau élargi, les noms « Ordinateurs portables / de bureau »
  passaient sur deux lignes.
- Lighthouse desktop (build de production, port 3124, deux passages) : accueil 0,98–0,99
  (LCP 1,01–1,12 s, CLS 0,002, TBT ≤ 12 ms), catalogue 0,98 (LCP 1,14–1,16 s), fiche
  smartphone 0,99 (LCP 0,85 s).

| # | Résultat | Commentaire |
|---|---|---|
| 6 | OK | « Tout le catalogue » + 5 catégories avec leurs comptes (576, 262, 410, 616, 315) ; plus de liens « Ordinateurs » / « Écrans » |
| 7 | OK | Tab, Entrée, Tab, Entrée → catalogue filtré ; Échap referme et rend le focus (e2e) |
| 8 | OK | sur une fiche smartphone, « Catalogue » courant et « Smartphones » marqué (e2e) |
| 9 | OK | panneau statique aux effets réduits, désactivés ou avec `prefers-reduced-motion` (tests unitaires) |
