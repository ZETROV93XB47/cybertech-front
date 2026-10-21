# Feature Specification: Catalogue élargi, promotions et avis

**Feature Branch**: `004-catalog-promos-reviews` (pas de branche git : le repo travaille sur `main`)

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Intégrer les nouvelles catégories du backend ; ranger toutes les catégories dans une liste déroulante « Catalogue » ; carrousel d'accueil mêlant catégories et promotions, avec des images libres de droits ; page Promotions et page par campagne ; laisser un avis sur un produit déjà acheté."

## Contexte

- Le backend propose désormais **cinq catégories** de produits : ordinateurs portables
  (`COMPUTER`, 576 produits au 2026-10-20), ordinateurs de bureau (`DESKTOP`, 262), écrans
  (`MONITOR`, 410), smartphones (`SMARTPHONE`, 616) et montres connectées (`SMARTWATCH`, 315).
  Le front n'en connaît que deux : les produits des trois autres s'affichent sans libellé ni
  icône de catégorie, ne sont pas filtrables par catégorie et n'apparaissent dans aucun
  raccourci. Depuis le 2026-10-21 (`28a15ae`), `GET /product-category-schemas` liste les
  catégories actives (clé et libellé anglais), sans authentification.
- L'en-tête affiche « Catalogue », « Ordinateurs » et « Écrans » côte à côte ; avec cinq
  catégories, cette rangée ne tient plus.
- Les campagnes de réduction actives ne sont visibles que sous forme de bandeau ; seule
  BLACK_FRIDAY (−20 % sur la commande) est active aujourd'hui. Une campagne s'applique à toute
  la commande, jamais à des produits précis.
- Le backend permet maintenant de lister les avis publics d'un produit (note moyenne,
  répartition, avis paginés avec le prénom de l'auteur) et les produits qu'un client peut
  noter (un par couple produit–commande payée), et, depuis le 2026-10-20 (`bddcafd`), les avis
  publiés par le client lui-même (`GET /review/mine`, paginé, du plus récent au plus ancien).
  La fiche produit affiche aujourd'hui un bloc d'avis toujours vide.

## Clarifications

### Session 2026-10-20

- Q: Comment organiser ce travail ? → A: Une feature 004 dédiée, implémentée story par
  story après la US5 de la feature 003.
- Q: D'où viennent les images du carrousel et des promotions ? → A: Photos libres de droits
  (Unsplash, Pexels) enregistrées dans le site, crédits listés dans la documentation ; aucune
  image de site marchand ni visuel de marque protégé.
- Q: Où mène un clic sur une promotion ? → A: Vers la page de la campagne (avantage,
  conditions, « Appliquer à mon panier »), une campagne ne visant aucun produit précis.

### Session 2026-10-21

- Q: Le backend liste maintenant mes avis (`GET /review/mine`, prompt §13 livré) : que
  devient « Mes avis » ? → A: « Mes avis » a deux parties : « À noter » (produits notables) et
  « Mes avis publiés » (paginée, plus récents d'abord) ; chaque avis publié peut être modifié
  ou supprimé à tout moment, pas seulement juste après sa publication.
- Q: D'où vient la liste des catégories ? → A: De `GET /product-category-schemas` (backend
  `28a15ae`) : seules les catégories actives sont proposées ; le front garde le nom français,
  l'icône, l'ordre et la photo de chaque catégorie qu'il connaît.
- Q: Le backend accepte deux avis du même produit (deux onglets) : faut-il l'empêcher ? → A:
  Non, ce n'est pas grave ; le front ne propose que les produits encore notables.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toutes les catégories du catalogue (Priority: P1)

En tant que visiteur, je veux retrouver chaque produit dans sa catégorie (ordinateurs
portables, ordinateurs de bureau, écrans, smartphones, montres connectées) et filtrer le
catalogue sur n'importe laquelle.

- Chaque catégorie a un nom, une icône et ses filtres propres (caractéristiques issues de son
  schéma), comme les deux catégories actuelles.
- Les tuiles de catégories de l'accueil, le fil d'Ariane, la fiche produit, le comparateur et
  les compteurs de produits couvrent les cinq catégories.

**Why this priority**: plus de la moitié des produits (1 193 sur 2 179) appartient à des
catégories inconnues du front ; c'est un défaut visible de la boutique, préalable aux autres
stories.

**Independent Test**: ouvrir le catalogue filtré sur « Smartphones », voir 616 produits et les
filtres propres aux smartphones, ouvrir une fiche et lire « Smartphones » dans le fil d'Ariane.

**Acceptance Scenarios**:

1. **Given** le catalogue, **When** le visiteur filtre sur une des cinq catégories, **Then**
   seuls ses produits s'affichent, avec le nombre exact et les filtres de cette catégorie.
2. **Given** un produit d'une nouvelle catégorie, **When** il s'affiche (carte, fiche,
   panier, comparateur, commande), **Then** son libellé et son icône de catégorie sont ceux de
   sa catégorie, sans valeur vide ni repli trompeur.
3. **Given** une catégorie inconnue renvoyée un jour par le backend, **When** un produit de
   cette catégorie s'affiche, **Then** il reste visible avec un libellé générique, sans erreur.
4. **Given** l'accueil, **When** le visiteur regarde les catégories, **Then** les cinq sont
   proposées avec leur nombre de produits.

---

### User Story 2 - Menu déroulant « Catalogue » (Priority: P1)

En tant que visiteur, je veux ouvrir « Catalogue » dans l'en-tête et choisir une catégorie
dans une liste, plutôt qu'une rangée de liens qui ne tient plus.

- « Catalogue » ouvre un panneau qui liste « Tout le catalogue » puis les cinq catégories
  (icône, nom, nombre de produits si connu).
- Le panneau s'ouvre au survol et au clic, se pilote au clavier, se ferme avec Échap ou en
  quittant le panneau, comme le menu du compte.
- Les liens « Ordinateurs » et « Écrans » de l'en-tête disparaissent ; « Promotions »
  (US4) prend place à côté de « Catalogue ».

**Why this priority**: c'est la seule entrée vers les nouvelles catégories depuis toutes les
pages.

**Independent Test**: depuis n'importe quelle page, survoler « Catalogue », choisir « Montres
connectées », arriver sur le catalogue filtré ; refaire le parcours au clavier seul.

**Acceptance Scenarios**:

1. **Given** l'en-tête, **When** le visiteur survole ou clique « Catalogue », **Then** le
   panneau des catégories s'ouvre ; la catégorie de la page courante y est signalée.
2. **Given** le panneau ouvert au clavier, **When** il navigue avec Tab et valide, **Then** il
   arrive sur le catalogue filtré ; Échap referme le panneau et rend le focus à « Catalogue ».
3. **Given** des effets réduits ou désactivés, **When** le panneau s'ouvre, **Then** il
   apparaît sans animation.

---

### User Story 3 - Carrousel d'accueil (Priority: P2)

En tant que visiteur, je veux un carrousel en haut de l'accueil qui fait défiler les
catégories et les promotions en cours, et y cliquer pour aller directement où ça m'intéresse.

- Une diapositive par catégorie (cinq) et une par campagne active, mélangées (catégories et
  promotions alternées quand il y en a), chacune avec une grande image, un titre et un appel à
  l'action.
- Cliquer l'image ou l'appel à l'action de la diapositive affichée mène au catalogue filtré
  sur la catégorie, ou à la page de la campagne (US4).
- Défilement automatique, en pause au survol, au focus et quand l'onglet est caché ; boutons
  précédent / suivant et indicateurs de position.

**Why this priority**: vitrine de l'accueil qui fait découvrir les nouvelles catégories et
les promotions ; utile mais non bloquant pour acheter.

**Independent Test**: sur l'accueil, laisser défiler, passer à la diapositive « Smartphones »
avec « Suivant », cliquer son image et arriver sur le catalogue filtré ; cliquer la
diapositive BLACK_FRIDAY et arriver sur la page de la campagne.

**Acceptance Scenarios**:

1. **Given** l'accueil, **When** il se charge, **Then** le carrousel montre une diapositive à
   la fois avec son image, son titre et son appel à l'action, et défile tout seul.
2. **Given** le pointeur ou le focus dans le carrousel, **When** le délai passe, **Then** le
   défilement reste en pause ; il reprend quand le pointeur et le focus en sortent.
3. **Given** une diapositive de catégorie affichée, **When** le visiteur clique son image,
   **Then** il arrive sur le catalogue filtré sur cette catégorie.
4. **Given** une diapositive de campagne affichée, **When** il clique son image, **Then** il
   arrive sur la page de cette campagne.
5. **Given** des effets réduits ou désactivés, ou une préférence système de mouvement réduit,
   **When** l'accueil s'affiche, **Then** le carrousel ne défile pas tout seul et change de
   diapositive sans animation ; les boutons restent utilisables.
6. **Given** aucune campagne active, **When** l'accueil s'affiche, **Then** le carrousel ne
   montre que les cinq catégories.

---

### User Story 4 - Promotions (Priority: P2)

En tant que visiteur, je veux une page « Promotions » qui liste les campagnes en cours, et une
page par campagne qui m'explique ce qu'elle m'apporte et me permet de l'appliquer.

- `/promotions` liste les campagnes actives (« aucune remise » exclue), chacune avec une
  image, son avantage (« −20 % », « −10 € », « 1 acheté = 1 offert ») et ses conditions.
- La page d'une campagne détaille l'avantage, le minimum de commande, le plafond et la date de
  fin quand ils existent, propose « Appliquer à mon panier » (la réduction est présélectionnée
  sur le panier et le tunnel, comme le bloc réduction de la feature 003) et « Voir le
  catalogue ».

**Why this priority**: rend les campagnes visibles et utilisables hors du panier ; dépend du
bloc réduction déjà livré.

**Independent Test**: ouvrir « Promotions », voir BLACK_FRIDAY, ouvrir sa page, cliquer
« Appliquer à mon panier », aller au panier et lire « Réduction choisie : BLACK_FRIDAY ».

**Acceptance Scenarios**:

1. **Given** des campagnes actives, **When** le visiteur ouvre « Promotions », **Then** il voit
   chaque campagne avec son image, son avantage et ses conditions, sans « aucune remise ».
2. **Given** une campagne, **When** il ouvre sa page, **Then** il lit l'avantage, les
   conditions existantes et la date de fin, ou « sans date de fin ».
3. **Given** un client connecté sur la page d'une campagne, **When** il clique « Appliquer à
   mon panier », **Then** la réduction est sélectionnée et confirmée ; sur le panier, le bloc
   réduction l'affiche comme choisie.
4. **Given** un visiteur, **When** il clique « Appliquer à mon panier », **Then** la clé est
   gardée et il est invité à se connecter pour en profiter (les réductions exigent un compte).
5. **Given** une clé de campagne inconnue ou expirée dans l'adresse, **When** la page s'ouvre,
   **Then** un état « campagne introuvable ou terminée » renvoie vers les promotions en cours.
6. **Given** aucune campagne active, **When** il ouvre « Promotions », **Then** un état vide
   illustré l'invite à revenir plus tard et à parcourir le catalogue.

---

### User Story 5 - Avis sur mes achats (Priority: P2)

En tant que client, je veux noter et commenter les produits que j'ai achetés, et lire les avis
des autres clients sur la fiche d'un produit.

- « Mes avis » (espace compte) liste les produits que je peux noter (un par couple
  produit–commande payée), avec le nom du produit et la date de la commande, puis les avis que
  j'ai déjà publiés (produit, note, commentaire, date, « modifié » le cas échéant), paginés du
  plus récent au plus ancien.
- Je donne une note de 1 à 5 étoiles et, si je veux, un commentaire (1 000 caractères au
  plus). Un commentaire refusé par la modération automatique est expliqué sans culpabiliser,
  et ma saisie est gardée pour que je la reformule.
- Je peux modifier ou supprimer chacun de mes avis publiés, à tout moment, depuis « Mes avis ».
- Le détail d'une commande payée propose « Donner mon avis » sur chacun de ses produits encore
  notables.
- La fiche produit affiche la note moyenne, la répartition des notes et les avis publics
  (prénom de l'auteur, date, note, commentaire), paginés ; un état vide honnête quand il n'y en
  a aucun.

**Why this priority**: l'avis client nourrit la confiance et les recommandations ; le bloc
d'avis de la fiche est vide depuis la feature 002.

**Independent Test**: avec un compte qui a une commande payée, ouvrir « Mes avis », noter un
produit 4 étoiles avec un commentaire, puis ouvrir sa fiche et y lire l'avis avec le prénom.

**Acceptance Scenarios**:

1. **Given** une commande payée, **When** le client ouvre « Mes avis », **Then** chaque
   produit notable est listé avec la date de sa commande ; un produit acheté dans deux commandes
   apparaît pour chacune tant qu'il n'est pas noté, puis quitte la liste dès qu'un avis est
   publié (un avis par produit, règle du backend).
2. **Given** le formulaire d'avis, **When** il choisit une note et publie, **Then** l'avis est
   confirmé, le produit quitte la liste des produits à noter et l'avis apparaît sur la fiche.
3. **Given** un commentaire refusé par la modération, **When** la réponse arrive, **Then** un
   message bienveillant explique le refus, la note et le commentaire restent dans le formulaire.
4. **Given** un avis publié (tout juste ou il y a longtemps), **When** le client clique
   « Modifier » ou « Supprimer » (avec confirmation) dans « Mes avis publiés », **Then** l'avis
   est mis à jour ou retiré, sur « Mes avis » comme sur la fiche du produit.
5. **Given** un produit sans avis, **When** un visiteur ouvre sa fiche, **Then** le bloc d'avis
   indique qu'il n'y a pas encore d'avis, sans note fictive.
6. **Given** un produit avec plus d'avis qu'une page, **When** le visiteur demande la suite,
   **Then** les avis suivants s'affichent.
7. **Given** aucun produit à noter et aucun avis publié, **When** le client ouvre « Mes avis »,
   **Then** un état vide illustré l'invite à commander.
8. **Given** des avis publiés, **When** le client ouvre « Mes avis », **Then** ils sont listés
   sous « Mes avis publiés », du plus récent au plus ancien, avec une page suivante s'il y en a
   plus de dix ; un avis supprimé rend son produit de nouveau notable.

---

### Edge Cases

- Catégorie inconnue d'un produit (nouvelle clé côté backend) : libellé générique, icône
  générique, pas de filtre propre, aucune erreur.
- Schéma de catégorie indisponible : le catalogue de la catégorie reste listé, sans filtres de
  caractéristiques, avec un message discret.
- Image du carrousel ou d'une campagne qui ne charge pas : fond dégradé et titre lisibles, lien
  toujours actif.
- Campagne sans image dédiée (campagne ajoutée plus tard) : image générique « promotion ».
- Campagne qui expire pendant que la page est ouverte : « Appliquer à mon panier » est vérifié
  par le panier (refus clair de la feature 003, FR-018).
- Carrousel avec une seule diapositive : ni défilement ni indicateurs.
- Onglet caché : le carrousel ne défile pas en arrière-plan.
- Avis sur un produit déjà noté depuis un autre onglet : refus expliqué, liste rafraîchie.
- Commentaire uniquement fait d'espaces : traité comme absent (la note seule est publiée).
- Session expirée pendant la publication d'un avis : la saisie est gardée, invitation à se
  reconnecter, aucune publication automatique.
- Produit noté retiré du catalogue : l'avis reste listable, le lien vers la fiche est retiré.
- Avis modifié ou supprimé depuis un autre onglet : la liste est rafraîchie après l'action ;
  un avis devenu introuvable est retiré de la liste avec un message.

## Requirements *(mandatory)*

### Functional Requirements

**Catégories**

- **FR-001**: Le site MUST reconnaître les cinq catégories du backend (ordinateurs portables,
  ordinateurs de bureau, écrans, smartphones, montres connectées) avec un nom français, une
  icône et un ordre d'affichage fixes.
- **FR-002**: Le catalogue MUST pouvoir être filtré sur chacune des cinq catégories, avec ses
  filtres de caractéristiques issus du schéma de la catégorie et le nombre de produits exact.
- **FR-003**: Tout affichage d'un produit (carte, fiche, fil d'Ariane, panier, comparateur,
  commande, liste de souhaits) MUST montrer le nom et l'icône de sa catégorie ; une catégorie
  inconnue MUST avoir un libellé et une icône génériques, sans erreur.
- **FR-004**: L'accueil MUST proposer les cinq catégories avec leur nombre de produits.

**Navigation**

- **FR-005**: L'en-tête MUST remplacer les liens de catégories par un menu « Catalogue »
  listant « Tout le catalogue » et les cinq catégories, ouvert au survol et au clic,
  pilotable au clavier (Tab, Entrée, Échap qui rend le focus), annoncé correctement aux
  lecteurs d'écran, avec la catégorie courante signalée.
- **FR-006**: L'en-tête MUST proposer « Promotions » à côté de « Catalogue », signalé comme
  courant sur les pages de promotions.

**Carrousel**

- **FR-007**: L'accueil MUST afficher un carrousel avec une diapositive par catégorie et une
  par campagne active, catégories et campagnes alternées tant que les deux existent.
- **FR-008**: Chaque diapositive MUST avoir une image, un titre, une phrase d'accroche et un
  appel à l'action ; l'image et l'appel à l'action de la diapositive affichée MUST mener au
  catalogue filtré sur la catégorie ou à la page de la campagne.
- **FR-009**: Le carrousel MUST défiler tout seul à intervalle fixe, MUST se mettre en pause au
  survol, au focus et quand l'onglet est caché, et MUST offrir précédent, suivant et des
  indicateurs de position utilisables au clavier ; un bouton MUST permettre d'arrêter le
  défilement automatique.
- **FR-010**: Avec des effets réduits ou désactivés, ou une préférence système de mouvement
  réduit, le carrousel MUST ne pas défiler tout seul et MUST changer de diapositive sans
  animation.
- **FR-011**: Les images MUST être des photos libres de droits enregistrées dans le site, avec
  leurs crédits listés dans la documentation ; aucune image de site marchand ni visuel de
  marque protégé.

**Promotions**

- **FR-012**: `/promotions` MUST lister les campagnes actives (sans « aucune remise »), chacune
  avec une image, son avantage et ses conditions, et un état vide illustré sans campagne.
- **FR-013**: La page d'une campagne MUST afficher son avantage et, quand ils existent, son
  minimum de commande, son plafond et sa date de fin ; une campagne inconnue ou terminée MUST
  afficher un état « introuvable ou terminée » avec un lien vers les promotions.
- **FR-014**: « Appliquer à mon panier » MUST présélectionner la réduction pour le panier et le
  tunnel (même mécanisme que le bloc réduction de la feature 003) ; pour un visiteur, la clé
  MUST être gardée et la connexion proposée. Aucun montant n'est calculé sur ces pages.

**Avis**

- **FR-015**: « Mes avis » (espace compte, navigation du compte et menu avatar) MUST lister les
  produits notables du client (produit, date de la commande), puis ses avis publiés (produit,
  note, commentaire, date, mention « modifié »), paginés du plus récent au plus ancien, et un
  état vide illustré quand il n'y a ni l'un ni l'autre.
- **FR-016**: Le formulaire d'avis MUST demander une note de 1 à 5 (étoiles utilisables au
  clavier) et un commentaire facultatif de 1 000 caractères au plus, avec un compteur.
- **FR-017**: Un commentaire refusé par la modération MUST être expliqué sans culpabiliser, en
  gardant la saisie ; les autres refus (produit déjà noté, commande non notable) MUST avoir un
  message dédié.
- **FR-018**: Chaque avis publié du client MUST pouvoir être modifié (note, commentaire, mêmes
  règles que FR-016 et FR-017) ou supprimé (suppression confirmée) depuis « Mes avis », à tout
  moment ; la liste et la fiche du produit reflètent le changement.
- **FR-019**: Le détail d'une commande payée MUST proposer « Donner mon avis » pour chacun de
  ses produits encore notables.
- **FR-020**: La fiche produit MUST afficher la note moyenne, la répartition des notes, le
  nombre d'avis et les avis publics paginés (prénom, date, note, commentaire), et un état vide
  sans note fictive ; aucune autre donnée personnelle de l'auteur n'est affichée.

**Transverse**

- **FR-021**: Tout texte visible MUST être en français et au tutoiement ; chaque nouvelle page
  MUST avoir une version statique quand les effets sont réduits.
- **FR-022**: Toute mise à jour (publication d'avis, réduction appliquée, changement de
  diapositive déclenché par l'utilisateur) MUST être annoncée aux lecteurs d'écran.

### Key Entities

- **Catégorie** : clé du backend, nom français, icône, ordre, schéma de caractéristiques,
  nombre de produits.
- **Diapositive** : catégorie ou campagne, image, titre, accroche, destination.
- **Campagne** : clé, nature (pourcentage, montant fixe, un acheté un offert), valeur, minimum
  de commande, plafond, dates, image.
- **Produit à noter** : produit, commande d'origine, date de la commande.
- **Avis** : note (1–5), commentaire facultatif, date, prénom de l'auteur (public) ; lié à un
  produit et à une commande.
- **Mon avis** : avis vu par son auteur : produit (nom), commande d'origine, note,
  commentaire, dates de création et de modification.
- **Résumé des avis d'un produit** : note moyenne, nombre d'avis, répartition par note.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des produits du catalogue s'affichent avec le nom de leur catégorie, et
  chacune des cinq catégories est atteignable en 2 interactions depuis n'importe quelle page.
- **SC-002**: Le nombre de produits affiché pour chaque catégorie est égal à celui du catalogue
  filtré sur cette catégorie.
- **SC-003**: Le carrousel, le menu « Catalogue », les promotions et « Mes avis » sont
  utilisables au clavier seul, sans violation détectée par l'audit d'accessibilité automatique.
- **SC-004**: Un client publie un avis en moins d'une minute depuis « Mes avis » et le retrouve
  sur la fiche du produit au rechargement suivant.
- **SC-005**: Depuis l'accueil, un visiteur atteint la page d'une campagne en 1 clic et la
  réduction est appliquée à son panier en 1 clic de plus (connecté).
- **SC-006**: Les budgets de performance du lot 1 sont tenus sur l'accueil (avec le carrousel),
  les promotions et une fiche produit avec avis.

## Assumptions

- Les cinq catégories sont connues du front pour cette feature ; une catégorie désactivée
  côté backend disparaît du menu, des tuiles et du carrousel ; une sixième catégorie active
  mais inconnue du front n'y apparaît pas encore (signalée dans les logs) et ses produits
  s'affichent avec le libellé générique jusqu'à une mise à jour du front.
- Les images (cinq catégories, BLACK_FRIDAY et les autres campagnes connues du backend :
  WINTER_SALES, SPRING_SALES, BUY_ONE_GET_ONE_FREE, plus une image générique) sont des photos
  Unsplash ou Pexels, libres d'usage, choisies pour l'ambiance (sans logo lisible).
- Les avis sont notables dès qu'une commande est payée (règle du backend : payée, expédiée ou
  livrée), pas seulement livrée.
- Intervalle du carrousel : 6 secondes ; les réglages exacts suivent les jetons de mouvement du
  thème.
- La cible reste le navigateur de bureau.

## Dépendances backend

- **Liste de mes avis** : **livrée** par le backend `bddcafd` (`backend-prompts-lot2.md`
  §13) : `GET /review/mine` paginé (`PagedModel<MyReviewDto>`, 10 par page, plus récents
  d'abord).
- **Liste des catégories** : **livrée** par le backend `28a15ae` :
  `GET /product-category-schemas` (public) → `[{ categoryKey, label }]` des catégories
  actives, triées par clé.
- **Note sans commentaire** : **corrigée** par le backend `8cc5ded` : une note seule n'est
  plus envoyée à la modération.
- **Images des campagnes** (non bloquante) : le backend ne fournit pas de visuel ; le front
  associe une image par clé connue et une image générique sinon.

## Hors périmètre

- Administration des catégories, des campagnes et des avis (feature d'administration).
- Réponse du vendeur aux avis, signalement d'un avis, photos dans les avis.
- Promotions ciblant des produits ou des catégories (le backend n'en a pas).
- Navigation mobile.
