# Feature Specification: Catalogue et navigation

**Feature Branch**: `002-catalog-refresh`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Feature 002 « Catalogue et navigation » du front cybertech, dans la continuité du lot 1 : filtres par attribut complets sur le catalogue, grille de 4 produits par ligne (reportée), accueil et catalogue cohérents, barre de navigation cohérente, comparateur de 2 à 3 produits d'une même catégorie, puis phase « Interface vivante et cohérente ». Texte complet : §2 de docs/speckit-prompts-lot2.md."

## Contexte

Le lot 1 (`specs/001-catalog-auth-cart`) a livré le catalogue, la fiche produit, la recherche,
le compte et le panier. Cette feature rend le catalogue plus utile pour choisir : filtrer sur
toutes les caractéristiques, voir plus de produits d'un coup d'œil, comparer des produits côte à
côte, et retrouver la même présentation sur l'accueil, le catalogue et l'en-tête.

**État des données constaté le 2026-10-13** (backend local) :

- Les caractéristiques d'une catégorie sont décrites par son schéma : pour COMPUTER, processeur,
  carte graphique, système, connectique et type d'écran (texte), mémoire vive et stockage
  (nombres) ; pour MONITOR, résolution (texte) et fréquence de rafraîchissement (nombre).
- Le schéma ne donne **aucune liste de valeurs** pour les caractéristiques texte : le lot 1 ne
  propose donc que les plages numériques.
- Valeurs distinctes observées sur les 531 ordinateurs : 21 processeurs, 35 cartes graphiques,
  4 systèmes, 5 types d'écran, 8 tailles de mémoire, 11 tailles de stockage, et **90 valeurs de
  connectique**, chacune étant une phrase composée (« Wi-Fi 6E, Bluetooth 5.3, 1 X HDMI 2.1
  Femelle, Oui, Non »).
- Aucun écran (MONITOR) n'est actuellement présent dans la recherche locale.

**Capacités portées par le front ou attendues du backend** :

- **Valeurs de filtres et compteurs** : demandés au backend (« facettes du catalogue », prompt 3
  de `docs/backend/backend-prompts-lot2.md`). Tant qu'ils ne sont pas livrés, le front déduit
  les valeurs des produits de la catégorie, sans compteurs.
- **Comparateur** : entièrement porté par le front, à partir des fiches produit et du schéma de
  la catégorie ; aucune donnée nouvelle n'est demandée au backend.

## Clarifications

### Session 2026-10-13

- Q: Comment faire de la place pour 4 cartes par ligne à côté des filtres, alors que le contenu ne dépasse pas 1 200 pixels ? → A: Rien pour l'instant : la grille à 4 produits par ligne est retirée de la feature et reportée ; la grille actuelle à 3 colonnes est conservée.
- Q: Depuis quels endroits du site peut-on ajouter un produit à la comparaison ? → A: Depuis les cartes du catalogue (case « Comparer ») et depuis la fiche produit (bouton « Ajouter à la comparaison ») ; la barre de comparaison est visible sur ces deux pages.
- Q: Combien de temps la sélection de produits à comparer doit-elle être conservée ? → A: Le temps de l'onglet : elle survit à la navigation et au rechargement, et se vide à la fermeture de l'onglet ou du navigateur. La comparaison s'affiche dans un grand cadre au-dessus de la page d'où elle est ouverte, sans page dédiée.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filtrer sur toutes les caractéristiques (Priority: P1)

En tant que visiteur, je veux filtrer le catalogue sur les caractéristiques qui comptent pour
moi (processeur, carte graphique, système, type d'écran, mémoire, stockage, résolution,
fréquence) pour ne voir que les produits qui me conviennent.

- Une fois une catégorie choisie, chaque caractéristique texte filtrable propose la liste de ses
  valeurs réellement présentes dans le catalogue, à cocher (plusieurs valeurs d'une même
  caractéristique = « l'une ou l'autre »).
- Chaque caractéristique numérique propose une plage (minimum, maximum) bornée par les valeurs
  observées.
- Quand l'information est disponible, chaque valeur indique combien de produits elle donnerait
  avec les autres filtres actifs ; une valeur qui ne donnerait aucun produit est grisée.
- Les filtres actifs apparaissent en pastilles au-dessus des résultats, retirables une par une,
  avec « Tout effacer » et le nombre de résultats.
- L'adresse de la page reflète les filtres : on peut la partager, revenir en arrière, recharger,
  et la page fonctionne sans JavaScript comme au lot 1.

**Why this priority**: c'est le premier besoin d'un acheteur de matériel informatique ; les
données existent déjà dans le catalogue mais ne sont pas exploitables aujourd'hui.

**Independent Test**: choisir « Ordinateurs », cocher deux processeurs et « OLED », vérifier que
seuls des produits correspondants s'affichent, retirer une pastille, recharger la page et
retrouver le même état.

**Acceptance Scenarios**:

1. **Given** le catalogue sans catégorie, **When** je choisis « Ordinateurs », **Then** je vois
   les filtres Processeur, Carte graphique, Système, Type d'écran (valeurs à cocher), Mémoire
   vive et Stockage (plages), libellés en français avec leurs unités.
2. **Given** la catégorie « Ordinateurs », **When** je coche « AMD Ryzen 7 » et
   « Intel Core Ultra 7 », **Then** les résultats ne contiennent que des produits ayant l'un de
   ces processeurs, et deux pastilles apparaissent.
3. **Given** des compteurs disponibles et la marque LENOVO cochée, **When** je regarde le filtre
   Processeur, **Then** chaque valeur affiche le nombre de produits LENOVO correspondants, les
   autres marques restent proposées dans le filtre Marque, et une valeur à 0 est grisée et non
   cochable.
4. **Given** des filtres d'attribut actifs, **When** je passe à la catégorie « Écrans »,
   **Then** les filtres de l'ancienne catégorie sont retirés et ceux de la nouvelle proposés.
5. **Given** trois pastilles actives, **When** je clique sur la croix de l'une, **Then** seul ce
   filtre est retiré et les résultats se mettent à jour ; **When** je clique « Tout effacer »,
   **Then** tous les filtres sont retirés sauf le mot-clé de recherche.
6. **Given** une adresse de catalogue filtrée partagée, **When** un autre visiteur l'ouvre,
   **Then** il voit les mêmes filtres et les mêmes résultats.
7. **Given** une caractéristique avec plus de valeurs que l'espace prévu (ex. 35 cartes
   graphiques), **When** j'ouvre le filtre, **Then** les valeurs les plus fréquentes sont
   affichées d'abord, avec « Voir tout » pour déplier la liste complète.

---

### User Story 2 - Comparer 2 ou 3 produits (Priority: P1)

En tant que visiteur, je veux sélectionner 2 ou 3 produits d'une même catégorie depuis le
catalogue et voir leurs caractéristiques alignées, pour choisir sans ouvrir chaque fiche.

- Chaque carte produit du catalogue porte une case « Comparer », et la fiche produit un bouton
  « Ajouter à la comparaison » (qui devient « Retirer de la comparaison » une fois ajouté).
- Le premier produit coché fixe la catégorie de la comparaison ; les produits d'une autre
  catégorie ne peuvent pas être ajoutés (case désactivée, avec la raison).
- Trois produits au maximum ; au troisième, les autres cases sont désactivées avec la raison.
- Dès le premier produit coché, une barre de comparaison apparaît en bas de l'écran : vignettes
  des produits retenus, retrait d'un produit et « Tout effacer » ; avec un seul produit, elle
  invite à en choisir un autre. Le bouton « Comparer » y apparaît dès le deuxième produit
  coché.
- « Comparer » ouvre un grand cadre : en colonnes, l'image, le nom, la marque, le prix, la
  disponibilité et l'ajout au panier de chaque produit ; puis une ligne par caractéristique, au
  format « nom de caractéristique : valeur produit 1 | valeur produit 2 | valeur produit 3 ».
- La sélection est conservée quand je change de page, de filtres, ou que je reviens d'une fiche
  produit.

**Why this priority**: comparer est le geste décisif avant l'achat de matériel technique ; sans
comparateur, l'utilisateur jongle entre plusieurs onglets.

**Independent Test**: cocher deux ordinateurs sur la page 1 et un troisième sur la page 2,
ouvrir la comparaison et lire chaque caractéristique sur une ligne, avec une valeur par produit.

**Acceptance Scenarios**:

1. **Given** aucun produit sélectionné, **When** je coche « Comparer » sur un ordinateur,
   **Then** la barre de comparaison apparaît avec ce produit et m'invite à en choisir un autre,
   et les cases des produits d'une autre catégorie deviennent indisponibles avec l'explication
   « Tu ne peux comparer que des produits de la même catégorie ».
2. **Given** un produit sélectionné, **When** j'en coche un deuxième, **Then** le bouton
   « Comparer » apparaît dans la barre et le changement est annoncé aux lecteurs d'écran.
3. **Given** trois produits sélectionnés, **When** je regarde les autres cartes, **Then** leurs
   cases sont désactivées avec l'explication « 3 produits maximum » ; **When** je décoche l'un
   des trois, **Then** les cases redeviennent disponibles.
4. **Given** deux produits sélectionnés, **When** je change de page ou de filtres puis reviens,
   **Then** ma sélection est intacte et leurs cases sont cochées là où ils apparaissent.
5. **Given** trois ordinateurs sélectionnés, **When** je clique « Comparer », **Then** un grand
   cadre s'ouvre avec, en tête, image, nom, marque, prix, disponibilité et bouton d'ajout au
   panier de chaque produit, puis les lignes Processeur, Carte graphique, Mémoire vive,
   Stockage, Système, Connectique, Type d'écran, chacune avec une valeur par produit, unités
   comprises, et « — » pour une valeur absente.
6. **Given** le cadre ouvert, **When** j'active « Afficher seulement les différences »,
   **Then** seules les lignes où au moins une valeur diffère restent affichées.
7. **Given** le cadre ouvert, **When** j'appuie sur Échap ou sur le bouton de fermeture,
   **Then** le cadre se ferme et le focus revient sur le bouton « Comparer ».
8. **Given** deux ordinateurs sélectionnés depuis le catalogue, **When** j'ouvre la fiche d'un
   troisième ordinateur et clique « Ajouter à la comparaison », **Then** il rejoint la barre de
   comparaison affichée sur la fiche, et le bouton devient « Retirer de la comparaison » ;
   **When** j'ouvre la fiche d'un écran, **Then** le bouton est indisponible avec la raison.
9. **Given** un produit sélectionné qui n'existe plus dans le catalogue, **When** j'ouvre le
   catalogue, **Then** il est retiré de la sélection avec un message bienveillant.

---

### User Story 3 - Une barre de navigation cohérente partout (Priority: P2)

En tant que visiteur, je veux une barre de navigation identique sur toutes les pages, qui me
dise où je suis et me donne accès en un geste aux rubriques principales.

- Liens : Accueil, Catalogue, Ordinateurs, Écrans (catalogue préfiltré).
- La rubrique de la page courante est mise en évidence.
- À droite : recherche (raccourci Ctrl+K / ⌘K), préférences, compte ou connexion, panier avec
  le nombre d'articles.
- Un lien « Aller au contenu » apparaît au premier appui sur Tab.

**Why this priority**: la navigation actuelle ne propose qu'un lien « Catalogue » ; elle doit
être posée avant les pages compte, commande et administration des features suivantes.

**Independent Test**: parcourir Accueil, Catalogue, Ordinateurs, une fiche produit, le panier,
l'inscription et la connexion au clavier seul et vérifier que la barre est identique et que la
rubrique courante est signalée.

**Acceptance Scenarios**:

1. **Given** n'importe quelle page du site, **When** je regarde l'en-tête, **Then** je vois les
   mêmes liens, dans le même ordre, avec les mêmes espacements et tailles d'icônes.
2. **Given** le catalogue filtré sur « Ordinateurs », **When** je regarde la barre, **Then**
   « Ordinateurs » est mis en évidence visuellement et signalé comme page courante aux lecteurs
   d'écran ; sur une fiche d'ordinateur, la rubrique « Ordinateurs » est mise en évidence.
3. **Given** une page chargée, **When** j'appuie une fois sur Tab, **Then** le lien « Aller au
   contenu » apparaît et l'activer place le focus sur le contenu principal.
4. **Given** n'importe quel lien de la barre, **When** je le survole ou le focalise, **Then**
   son état est signalé de la même manière que tous les autres liens de la barre.

---

### User Story 4 - Un accueil et un catalogue qui se ressemblent (Priority: P3)

En tant que visiteur, je veux que l'accueil et le catalogue partagent la même présentation
(gabarit, titres, cartes, états vides, chargement), et que l'accueil m'amène vite vers les
bons produits.

- Même en-tête de page : fil d'Ariane, titre vivant, sous-titre.
- Mêmes cartes produit, mêmes titres de section, même rythme vertical, même largeur.
- L'accueil présente uniquement des données réelles : meilleures ventes, accès aux catégories
  vers le catalogue préfiltré, offre active s'il y en a une, derniers produits consultés.

**Why this priority**: améliore l'impression d'ensemble ; les parcours d'achat fonctionnent
déjà sans.

**Independent Test**: comparer l'accueil et le catalogue côte à côte : mêmes marges, même
largeur, même style de titre, mêmes cartes ; depuis l'accueil, atteindre le catalogue filtré
sur une catégorie en un clic.

**Acceptance Scenarios**:

1. **Given** l'accueil et le catalogue, **When** je passe de l'un à l'autre, **Then** la largeur
   du contenu, les marges, le style des titres et les cartes produit sont identiques.
2. **Given** l'accueil, **When** je clique sur la catégorie « Ordinateurs », **Then** j'arrive
   sur le catalogue filtré sur cette catégorie.
3. **Given** une offre active, **When** j'ouvre l'accueil, **Then** elle est mise en avant ;
   **Given** aucune offre active, **Then** aucun emplacement vide ne la remplace.
4. **Given** aucune meilleure vente ni produit consulté, **When** j'ouvre l'accueil, **Then**
   j'y vois le même état vide illustré que dans le catalogue, avec une invitation à parcourir.

---

### Edge Cases

- **Valeurs de filtres indisponibles** (service de valeurs en panne ou absent) : les filtres
  texte sont masqués ou réduits aux valeurs déjà sélectionnées dans l'adresse, les autres
  filtres restent utilisables, un message discret l'indique ; la liste des produits s'affiche
  quand même.
- **Valeur présente dans l'adresse mais disparue du catalogue** : la pastille reste affichée et
  retirable, les résultats sont vides avec l'état vide « aucun produit » et « Réinitialiser les
  filtres ».
- **Caractéristique à valeurs composées** (connectique : 90 phrases distinctes) : filtrer sur
  une phrase exacte n'a pas de sens pour l'utilisateur. Décision du 2026-10-13 : la connectique
  est **exclue des filtres** et reste affichée dans le comparateur et sur la fiche produit ;
  aucune évolution backend n'est demandée pour l'instant.
- **Catégorie sans produit** (MONITOR aujourd'hui) : le filtre catégorie reste proposé, l'état
  vide l'explique, aucune valeur de caractéristique n'est inventée.
- **Plage numérique incohérente** saisie (minimum > maximum, ou valeur hors des bornes
  observées) : refusée sur le champ avec un message, comme au lot 1 ; la saisie n'est jamais
  modifiée silencieusement.
- **Clé de caractéristique inconnue** dans le schéma (ajout futur côté backend) : libellé
  lisible déduit de la clé, valeurs affichées telles quelles.
- **Comparaison** :
  - un produit sélectionné dont le prix ou la disponibilité a changé : le cadre affiche les
    valeurs actuelles ;
  - la sélection est vidée si sa catégorie n'existe plus ;
  - une sélection trafiquée dans le stockage du navigateur (identifiants invalides, plus de 3
    produits, catégories mélangées) est nettoyée sans erreur visible ;
  - deux produits sans aucune caractéristique en commun : chaque ligne existe, avec « — » là
    où la valeur manque ;
  - « Afficher seulement les différences » sans aucune différence : un message l'indique au
    lieu d'un tableau vide.
- **Effets réduits ou désactivés** (`prefers-reduced-motion`, préférence utilisateur) : la
  barre de comparaison, le cadre et les pastilles apparaissent en fondu simple, sans
  mouvement.

## Requirements *(mandatory)*

### Functional Requirements

**Filtres par caractéristique**

- **FR-001**: Le catalogue MUST proposer, dès qu'une catégorie est choisie, un filtre pour
  chaque caractéristique de son schéma : valeurs à cocher pour une caractéristique texte, plage
  minimum / maximum pour une caractéristique numérique. Exception : la connectique (valeurs
  composées) est exclue des filtres ; la liste des caractéristiques exclues MUST être une
  configuration unique et documentée, pas une condition dispersée.
- **FR-002**: Les valeurs proposées MUST être celles réellement présentes dans le catalogue de
  la catégorie ; aucune valeur ne MUST être inventée ni codée en dur.
- **FR-003**: Plusieurs valeurs cochées pour une même caractéristique MUST être combinées en
  « l'une ou l'autre » ; des caractéristiques différentes MUST être combinées en « et ».
- **FR-004**: Quand le nombre de produits par valeur est disponible, il MUST être affiché à
  côté de la valeur, calculé avec tous les autres filtres actifs sauf celui de la
  caractéristique concernée ; une valeur à 0 MUST être grisée et non cochable, sauf si elle
  est déjà cochée.
- **FR-005**: Quand ce nombre n'est pas disponible, les valeurs MUST être proposées sans
  compteur, et la page MUST rester entièrement fonctionnelle.
- **FR-006**: Une caractéristique dont la liste dépasse l'espace prévu MUST afficher d'abord
  les valeurs les plus fréquentes (ou alphabétiques sans compteur), avec une commande pour
  afficher toutes les valeurs.
- **FR-007**: Les plages numériques MUST être bornées par le minimum du schéma et par les
  valeurs observées, et afficher l'unité (Go, Hz…).
- **FR-008**: Les caractéristiques et les valeurs connues MUST être libellées en français ; une
  caractéristique inconnue MUST recevoir un libellé lisible déduit de sa clé.
- **FR-009**: Les filtres actifs (mot-clé, catégorie, marques, prix, caractéristiques) MUST
  être affichés en pastilles retirables individuellement, avec « Tout effacer » qui conserve le
  mot-clé, et le nombre de résultats MUST être annoncé aux lecteurs d'écran à chaque
  changement.
- **FR-010**: Tous les filtres MUST être reflétés dans l'adresse de la page (partage, retour
  arrière, rechargement) et MUST fonctionner sans JavaScript, comme au lot 1.
- **FR-011**: Changer de catégorie MUST retirer les filtres de caractéristiques de l'ancienne
  catégorie.
- **FR-012**: Les limites du backend MUST être respectées et non simulées : prix minimum
  filtrable de 100 €, aucun tri des résultats autre que la pertinence.

**Comparateur**

- **FR-013**: Chaque carte produit du catalogue MUST proposer une case « Comparer » accessible,
  dont le libellé inclut le nom du produit ; la fiche produit MUST proposer un bouton bascule
  « Ajouter à la comparaison » / « Retirer de la comparaison », soumis aux mêmes règles (même
  catégorie, 3 produits maximum, raison affichée s'il est indisponible). Les autres cartes
  produit (accueil, produits similaires) ne proposent pas la comparaison.
- **FR-014**: La sélection MUST contenir au plus 3 produits d'une seule catégorie ; une case qui
  ne peut pas être cochée MUST être désactivée avec sa raison, visible et lue par les lecteurs
  d'écran.
- **FR-015**: Une barre de comparaison MUST apparaître, sur le catalogue et sur la fiche
  produit, dès le premier produit sélectionné ;
  elle MUST afficher les produits retenus, permettre d'en retirer un ou de tout effacer, et
  faire apparaître le bouton « Comparer » dès le deuxième produit sélectionné. Ses changements
  MUST être annoncés aux lecteurs d'écran.
- **FR-016**: La sélection MUST être conservée pendant la navigation dans l'onglet (pages,
  filtres, fiche produit, rechargement) et MUST être vidée à la fermeture de l'onglet ou du
  navigateur ; elle ne MUST contenir que des identifiants de produits, revérifiés à chaque
  lecture.
- **FR-017**: « Comparer » MUST ouvrir, au-dessus de la page courante (catalogue ou fiche
  produit) et sans changer d'adresse ni de page, un cadre modal accessible (titre, focus maintenu dans le
  cadre, fermeture par Échap et par un bouton, retour du focus sur le bouton d'ouverture).
- **FR-018**: Le cadre MUST présenter une colonne par produit avec image, nom, marque, prix,
  disponibilité à jour et ajout au panier, puis une ligne par caractéristique au format « nom :
  valeur 1 | valeur 2 | valeur 3 », dans l'ordre et avec les libellés de la fiche produit,
  unités comprises, « — » pour une valeur absente.
- **FR-019**: Le cadre MUST proposer « Afficher seulement les différences » et MUST mettre en
  évidence, de façon discrète et non uniquement par la couleur, les lignes dont les valeurs
  diffèrent.
- **FR-020**: Le tableau de comparaison MUST être structuré pour les lecteurs d'écran
  (en-têtes de colonne = produits, en-têtes de ligne = caractéristiques) ; s'il dépasse la
  largeur du cadre, seul le cadre défile horizontalement.
- **FR-021**: Un produit sélectionné devenu introuvable MUST être retiré de la sélection avec
  un message bienveillant.

**Grille**

- **FR-022** à **FR-024** : retirés le 2026-10-13 (grille à 4 produits par ligne reportée, voir
  « Hors périmètre »). La grille du lot 1 (3 produits par ligne) est conservée.

**Navigation et cohérence**

- **FR-025**: Toutes les pages MUST partager la même barre de navigation : Accueil, Catalogue,
  Ordinateurs, Écrans, recherche, préférences, compte ou connexion, panier avec compteur.
- **FR-026**: La rubrique courante MUST être signalée visuellement et aux lecteurs d'écran ;
  une fiche produit MUST rattacher la page à la rubrique de sa catégorie.
- **FR-027**: Un lien « Aller au contenu » MUST être le premier élément atteignable au clavier.
- **FR-028**: L'accueil et le catalogue MUST partager le même gabarit (largeur, marges, en-tête
  de page avec fil d'Ariane, titre vivant et sous-titre), les mêmes cartes produit, les mêmes
  titres de section, le même état vide illustré et les mêmes squelettes de chargement.
- **FR-029**: L'accueil MUST proposer un accès direct à chaque catégorie vers le catalogue
  préfiltré, et ne MUST afficher que des données réelles (meilleures ventes, offre active,
  derniers produits consultés) ; un bloc sans donnée MUST être masqué, jamais rempli de
  contenu fictif.
- **FR-030**: Tout texte visible MUST être en français, au tutoiement, et toute valeur visuelle
  (couleur, taille, durée, effet) MUST venir de la configuration du thème.

**Interface vivante**

- **FR-031**: Chaque page touchée (accueil, catalogue, en-tête, comparateur) MUST avoir une
  animation d'apparition orchestrée et utile (apparition en cascade des résultats, barre de
  comparaison qui glisse, cadre qui s'ouvre), avec une version statique quand les effets sont
  réduits ou désactivés.
- **FR-032**: Les cartes produit MUST garder les effets signature du lot 1 (inclinaison,
  disponibilité, ajout au panier avec « vole vers le panier ») dans le catalogue et dans le
  comparateur.

### Key Entities

- **Caractéristique filtrable** : clé, libellé, nature (texte ou numérique), unité, ordre dans
  le schéma de la catégorie.
- **Valeur de caractéristique** : valeur affichée, nombre de produits (si connu), état
  (cochée, disponible, grisée).
- **Plage numérique** : minimum et maximum observés, bornes choisies par l'utilisateur.
- **Filtre actif** : type (mot-clé, catégorie, marque, prix, caractéristique), valeur, libellé
  de la pastille.
- **Sélection de comparaison** : catégorie, 1 à 3 identifiants de produits, ordre d'ajout ;
  conservée le temps de l'onglet, jamais considérée comme fiable sans revalidation.
- **Ligne de comparaison** : caractéristique, valeur par produit, indicateur « valeurs
  différentes ».

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des caractéristiques texte des schémas de catégorie, connectique exceptée,
  sont proposées en filtre avec leurs valeurs réelles (contre 0 % aujourd'hui).
- **SC-002**: Un visiteur trouve les ordinateurs ayant un processeur et un type d'écran donnés
  en 4 interactions au plus depuis l'accueil.
- **SC-003**: Un visiteur compare 3 produits d'une catégorie en 5 clics au plus depuis le
  catalogue (3 cases, « Comparer », lecture).
- **SC-005**: L'accueil, le catalogue, la fiche produit, le panier, l'inscription et la
  connexion affichent une barre de navigation identique (même contenu, même ordre), et 100 %
  de ses commandes sont utilisables au clavier seul.
- **SC-006**: Aucune violation d'accessibilité détectée par l'audit automatique sur l'accueil,
  le catalogue filtré et le cadre de comparaison ouvert.
- **SC-007**: Budgets de performance du lot 1 tenus sur l'accueil et le catalogue (affichage du
  contenu principal ≤ 2,5 s, décalage de mise en page ≤ 0,1, blocage du fil principal ≤
  200 ms), comparateur ouvert compris.
- **SC-008**: Aucun chiffre, valeur de caractéristique ou contenu d'accueil n'est inventé :
  chaque valeur affichée est traçable à une donnée du catalogue.

## Assumptions

- La cible reste le navigateur de bureau (constitution IX).
- Le comparateur est proposé sur les cartes du catalogue et sur la fiche produit, pas sur
  l'accueil ni dans les produits similaires ; la barre de comparaison est visible sur ces deux
  pages tant qu'une sélection existe.
- La sélection de comparaison est conservée pour l'onglet (fermer l'onglet ou le navigateur
  la vide) ; elle est indépendante du compte et du panier.
- Le service de valeurs et compteurs demandé au backend est utilisé dès qu'il est disponible ;
  le repli sans compteurs reste en place tant qu'il ne l'est pas.
- Les catégories restent COMPUTER et MONITOR, en liste fixe, faute d'API publique des
  catégories (lot 1).
- Les libellés français des caractéristiques existent déjà pour les 9 caractéristiques
  connues ; les valeurs (noms de processeurs, systèmes…) sont affichées telles que fournies
  par le catalogue.
- Les capacités des features suivantes (compte, commande, administration) ne sont pas
  livrées ici ; la barre de navigation est seulement conçue pour les accueillir.

## Dépendances backend

- **Facettes du catalogue** (recommandée, non bloquante) : valeurs et compteurs par
  caractéristique, bornes des plages, compteurs par marque — prompt 3 de
  `docs/backend/backend-prompts-lot2.md`.
- **Tri du catalogue** et **liste publique des catégories** : toujours absents
  (`docs/backend/api-map.md` §F), hors périmètre.
- **Écrans absents de la recherche locale** : à réindexer côté backend pour tester les filtres
  MONITOR (point d'environnement, pas une évolution d'API).

## Hors périmètre

- Grille du catalogue à 4 produits par ligne : reportée à une feature ultérieure (décision du
  2026-10-13) ; la largeur de contenu actuelle (1 200 pixels) ne laisserait qu'environ
  195 pixels par carte à côté des filtres, à arbitrer plus tard.
- Tri des résultats (prix, nouveautés) et compteurs par valeur sans le service backend.
- Comparaison de produits de catégories différentes ou de plus de 3 produits.
- Comparateur sauvegardé dans le compte, conservé d'une visite à l'autre, partagé par lien ou
  affiché sur une page dédiée.
- Navigation mobile.
