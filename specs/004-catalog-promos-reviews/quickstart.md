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

### US4 — Promotions

Vérifié le 2026-10-21 (T028–T037) : backend `abe674d` sur 8081 (seule BLACK_FRIDAY active,
−20 %, sans condition), front de l'utilisateur sur 3000.

- Contrôles : `typecheck` OK, `lint` 0 warning, `test` 981 tests verts (97 fichiers), dont
  `campaign-view.test.ts` (12), `promotions-pages.test.tsx` (10), `apply-campaign.test.tsx`
  (6).
- Vitest importe maintenant les photos comme Next (`src`, taille, flou) grâce à un petit
  plugin de `vitest.config.mts`, pour tester `next/image` avec les imports statiques.
- Avantage et conditions repris de `describeDiscountOffer` (bloc réduction de 003) : le panier
  et les pages promotions formulent une campagne de la même façon ; seul « Sans date de fin »
  est ajouté.
- E2E (`--workers=1`) : `promotions.spec.ts` 4 OK, `navigation.spec.ts` 7 OK (barre
  « Accueil · Catalogue · Promotions »), `a11y.spec.ts` 4 OK, `discount.spec.ts` 1 OK et
  1 ignoré (aucune campagne locale avec minimum de commande, comme avant).
- Captures relues : `screenshots/us4/` (liste, page de campagne, appliquée connecté, visiteur,
  panier avec « Réduction choisie : BLACK_FRIDAY », introuvable). Correctif : « Voir le
  catalogue » passait sous le message de confirmation ; les deux boutons sont maintenant sur
  la même ligne, le message dessous. État vide non reproductible en local (BLACK_FRIDAY ne se
  désactive pas sans l'administration) : couvert par les tests unitaires.
- Lighthouse desktop (build de production, port 3124, deux passages) : `/promotions`
  0,99–1,00 (LCP 0,77–0,89 s, CLS 0,002, TBT ≤ 10 ms), `/promotions/BLACK_FRIDAY` 0,99
  (LCP 0,83–0,90 s, CLS 0,003, TBT ≤ 33 ms).

| # | Résultat | Commentaire |
|---|---|---|
| 16 | OK | « Promotions » courant dans la barre ; BLACK_FRIDAY avec photo, « −20 % », « Sans date de fin » ; pas de « aucune remise » |
| 17 | OK | « −20 % », « Sans date de fin », « Appliquer à mon panier », « Voir le catalogue » |
| 18 | OK | connecté : confirmation puis « Réduction choisie : BLACK_FRIDAY » sur le panier (remise du devis : −23,99 € sur 119,95 €) |
| 19 | OK | visiteur : clé gardée, « Me connecter » → Keycloak → panier avec « Réduction choisie : BLACK_FRIDAY » |
| 20 | OK | `/promotions/INCONNUE` : « Campagne introuvable ou terminée », lien vers les promotions |

### US3 — Carrousel d'accueil

Vérifié le 2026-10-21 (T038–T047) : backend `abe674d` sur 8081 (5 catégories, BLACK_FRIDAY
active : 6 diapositives C, P, C, C, C, C), front de l'utilisateur sur 3000.

- Contrôles : `typecheck` OK, `lint` 0 warning, `test` 1 013 tests verts (100 fichiers), dont
  `home-slides.test.ts` (8), `use-carousel.test.tsx` (10), `home-carousel.test.tsx` (12).
- Le carrousel remplace la bannière photo de l'accueil (`HomeHero` et `hero-laptop.jpg`
  supprimés, crédit retiré de `docs/credits.md`) ; le message d'accueil reste au-dessus.
- Écart corrigé dans le thème : au niveau d'effets « réduit », `carousel.crossFade` valait
  `true` alors que FR-010 demande un changement sans animation ; il vaut maintenant `false`.
- Le helper axe des e2e (`tests/e2e/support/a11y.ts`) n'attend plus l'opacité 1 des éléments
  `inert` : les diapositives cachées restent transparentes et ne sont pas perçues.
- E2E (`--workers=1`) : `home-carousel.spec.ts` 6 OK (défilement seul, pause au survol,
  « Suivant » jusqu'à « Smartphones » puis clic sur l'image, diapositive BLACK_FRIDAY, bouton
  pause, `reducedMotion: "reduce"`), `home.spec.ts` 4 OK, `a11y.spec.ts` 4 OK,
  `long-tasks.spec.ts` 2 OK (build de production).
- Captures relues : `screenshots/us3/` (diapositive catégorie, diapositive campagne en pause,
  focus clavier, effets réduits, accueil complet). Correctif : bloc de texte élargi, « Ordinateurs
  portables » passait sur deux lignes.
- Lighthouse desktop (build de production, port 3124, trois passages) : accueil 0,95–0,98
  (LCP 1,12–1,47 s, CLS 0,002, TBT 0).

| # | Résultat | Commentaire |
|---|---|---|
| 10 | OK | une diapositive à la fois, défilement toutes les 6 s, catégories et BLACK_FRIDAY alternées |
| 11 | OK | pause au survol et au focus, reprise en sortant (e2e survol, tests unitaires focus) |
| 12 | OK | « Suivant » jusqu'à « Smartphones », clic sur l'image → `/products?category=SMARTPHONE` |
| 13 | OK | « Voir la promotion » → `/promotions/BLACK_FRIDAY` |
| 14 | OK | bouton pause : plus de défilement ; onglet caché : pause (tests unitaires) |
| 15 | OK | effets réduits ou `prefers-reduced-motion` : pas de lecture automatique ni de bouton pause, changement instantané |

### US5 — Avis sur mes achats

Vérifié le 2026-10-21 (T048–T062) : backend `14252d5` sur 8081, front de l'utilisateur sur
3000.

- Contrôles : `typecheck` OK, `lint` 0 warning, `test` 1 088 tests verts (109 fichiers), dont
  `review-schemas` (15), `review-views` (6), `review-actions` (9), route BFF (5),
  `reviews-components` (15) et le test de type `review.test-d.ts` (champs = OpenAPI).
- Écarts au modèle de données, alignés sur les DTO réels : `authorFirstName` nullable (« Client »
  affiché), `createdAt` d'un avis public = date seule, `MyReviewDto.orderUuid` nullable.
- Modification : le front envoie toujours `comment` ; vide, il efface le texte (le backend garde
  l'ancien texte si le champ manque). Le formulaire de modification permet donc de repasser à une
  note seule.
- Formulaire : l'action serveur est appelée à la main dans une transition. Avec `<form action>`,
  React vidait le formulaire à la fin de l'action (les étoiles disparaissaient après un refus) et
  la confirmation se perdait, le produit quittant « À noter » dans le même rendu. Corrigé et
  couvert par les tests de composants et l'e2e.
- **Modération injoignable en local** : le backend appelle `moderation-api:5000/analyze`, qui ne
  se résout pas depuis la machine de dev, et refuse alors tout commentaire (fail-closed). Le
  refus bienveillant et la saisie gardée sont vérifiés ; une note seule est publiée. L'e2e accepte
  les deux situations et note l'annotation `moderation` quand le commentaire est refusé.
- E2E (`--workers=1`) : `reviews.spec.ts` 2 OK (publier, voir sur la fiche avec le prénom,
  modifier, supprimer ; note seule depuis le lien du détail de commande), `orders.spec.ts` 2 OK
  (sélecteur du produit rendu exact : le lien « Donner ton avis sur … » contient aussi son nom),
  `product-page.spec.ts` 2 OK (section d'avis réelle ou vide), `a11y.spec.ts` 4 OK,
  `navigation.spec.ts` 7 OK.
- Captures relues : `screenshots/us5/` (détail de commande avec « Donner mon avis », « Mes avis »
  à noter, formulaire, refus, deux listes, état vide, avis de la fiche, fiche sans avis).
  Correctifs : le message de refus apparaissait deux fois ; le titre « Mes avis publiés »
  s'affichait seul sans avis publié.
- Lighthouse desktop (build de production, port 3124, fiche avec 7 avis, deux passages) : 0,99
  (LCP 0,86–0,96 s, CLS 0,002, TBT ≤ 16 ms).
- `docs/backend/api-map.md` mis à jour : endpoints d'avis (§10, §D.27, §D.28),
  `GET /product-category-schemas` (§4) et tri du catalogue (§D.10).

| # | Résultat | Commentaire |
|---|---|---|
| 21 | OK | menu avatar → « Mes avis » ; produits notables avec « Commandé le … » |
| 22 | OK partiel | étoiles au clavier (tests unitaires), confirmation annoncée, produit passé sous « Mes avis publiés » ; le commentaire est refusé localement (modération injoignable), la note seule est publiée |
| 23 | OK | moyenne, répartition, avis avec le prénom et la date ; « Voir plus d'avis » (tests unitaires) |
| 24 | OK | modification après rechargement, visible sur « Mes avis » et sur la fiche |
| 25 | OK | suppression confirmée, produit de nouveau dans « À noter » |
| 26 | OK | refus bienveillant, note et texte gardés (vérifié avec la modération injoignable) |
| 27 | OK | note seule publiée |
| 28 | OK | « Donner mon avis » sur le détail d'une commande payée ; en préparation (`AWAITING_SHIPPING`) couvert par le backend `abe674d`, non reproduit (le lot d'expédition ne tourne pas pendant le test) |
| 29 | OK | fiche sans avis : « Aucun avis pour l'instant », aucune note fictive |

### Phase 8 — Finitions

Vérifié le 2026-10-22 (T063–T067) : backend `b5811c5` sur 8081 (prompt §17 livré), front de
l'utilisateur sur 3000 ; build de production dans `.next-prod`.

- Contrôles : `typecheck` OK, `lint` 0 warning, `test` 1 108 tests verts (111 fichiers), dont
  `catalog-promos-effects-levels.test.tsx` (16 : panneau « Catalogue », fondu et lecture
  automatique du carrousel, inclinaison des cartes de campagne, × 4 situations d'effets) et
  `discount-banner.test.tsx` (2).
- Audit visuel (T063) : `screenshots/after/` (accueil, menu ouvert, catalogue des cinq
  catégories, promotions, page de campagne, campagne introuvable, fiche avec avis, « Mes avis »
  vide, à noter, formulaire, publié), capturés par `tests/e2e/catalog-promos-screenshots.spec.ts`.
  Correctif : la bande « Offres en cours » de l'accueil et le bloc d'offre de la fiche
  affichaient la clé brute (`BLACK_FRIDAY`, `WINTER_SALES`) ; ils montrent maintenant le nom de
  la page Promotions (« Black Friday », « Soldes d'hiver »), et chaque ligne de la bande mène à
  sa campagne.
- Audit TSDoc et constantes (T065) : aucune valeur visuelle brute ni `console.*` dans les
  fichiers de la feature ; `@see` ajoutés là où il manquait ; logs d'avis avec UUID masqués.
- **Modération (prompt §17)** : nouveau code `MODERATION_UNAVAILABLE` (503) →
  `FrontErrorCode.MODERATION_UNAVAILABLE` ; le formulaire dit « La vérification des
  commentaires ne répond pas pour le moment. Réessaie dans un instant : ta note et ton texte sont
  gardés. », sans inviter à reformuler. `npm run gen:api` relancé. Vérifié de bout en bout : le
  backend lancé depuis IntelliJ n'a pas `MODERATION_API_URL`, il répond 503 et l'e2e voit ce
  message, puis publie la note seule.
- E2E (`--workers=1`, une minute entre deux specs, projets `chromium` et `reduced-motion`) :
  a11y 8, auth 6, bank-card-add 1, bank-card 2, cart 11, catalog-filters 18, catalog-sort 6,
  catalog 16, categories 16, checkout 4, compare 10, discount 1, home-carousel 10, home 8,
  navigation 14, orders 2, preferences 9, product-page 4, profile 2, promotions 6, register 8,
  reviews 2, wishlist 2 OK ; `backend-down` 3 OK (build de production, backend injoignable) ;
  `long-tasks` 4 OK (build de production, dont le carrousel qui tourne seul et `/promotions`).
  Les specs ignorés le sont par conception (comptes créés une seule fois, dans `chromium`).
  Deux corrections de tests : `auth.spec.ts` cherchait « Camille » dans toute la page, or la
  fiche montre désormais les avis publics d'anciens utilisateurs de test (vérification limitée
  à l'en-tête) ; `home-carousel.spec.ts` lançait les parcours de lecture automatique dans le
  projet `reduced-motion`, où elle est désactivée (ignorés là, couverts par le cas dédié).
- Lighthouse desktop (build de production, port 3124) : accueil 0,94 (LCP 1,66 s, CLS 0,002,
  TBT 0), `/promotions` 1,00 (LCP 0,80 s), fiche d'écran avec 9 avis 0,99 (LCP 0,99 s) : SC-006
  tenu.
- Points manuels restants : commentaire réellement accepté par la modération (lancer le backend
  avec `MODERATION_API_URL=http://localhost:5000/api/v1/moderation/analyze`) ; état vide de
  `/promotions` et catégorie désactivée (non reproductibles sans l'administration, couverts par
  les tests unitaires) ; palette Ctrl+K sous Turbopack (connu depuis la feature 002).
