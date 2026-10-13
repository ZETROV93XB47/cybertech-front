# Feature Specification: Lot 1 — Catalogue, authentification et panier

**Feature Branch**: `001-catalog-auth-cart`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Premier lot du front e-commerce cybertech : catalogue, authentification et panier. Décris le QUOI et le POURQUOI du point de vue de l'utilisateur, sans choix technologique. La spécification se base EXCLUSIVEMENT sur les capacités réelles du backend (docs/backend/api-map.md, docs/backend/analysis.md, docs/guest-cart.md) ; toute capacité absente du backend est soit exclue, soit explicitement portée par le front et signalée comme telle. Texte complet : section 4.2 de docs/speckit-prompts.md. Ton des messages : tutoiement partout."

## Contexte

cybertech vend du matériel informatique : ordinateurs et écrans (catégories COMPUTER et MONITOR
aujourd'hui), des marques ASUS, HP, LENOVO, DELL, AORUS, MSI, ACER, TOSHIBA, ALIENWARE, MICROSOFT,
ALTYK, GIGABYTE et SAMSUNG. Les prix sont en euros. Les comptes sont gérés par un fournisseur
d'identité externe ; l'inscription passe par la plateforme cybertech.

Ce premier lot couvre la découverte des produits, la création de compte, la session et le panier.
Il prépare le lot 2 (commande et paiement).

**Capacités portées par le front (absentes du backend, signalées comme telles)** :

- **Panier invité** : le backend n'a pas de panier anonyme. Le panier d'un visiteur est conservé
  sur son navigateur, puis fusionné une seule fois dans son panier de compte à la connexion
  (conception : `docs/guest-cart.md`).
- **Total estimé du panier invité** : seul montant calculé côté front, présenté comme « estimé ».
- **Derniers produits consultés** : historique conservé sur le navigateur (aucune API de lecture).
- **Liste des catégories** : liste fixe (COMPUTER, MONITOR) faute d'API publique.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parcourir le catalogue (Priority: P1)

En tant que visiteur, je veux parcourir et rechercher les produits pour trouver celui qui me
convient.

- **Accueil** : message d'accueil contextuel selon l'heure, sélection « meilleures ventes »,
  remises actives mises en avant.
- **Liste et recherche** : mot-clé tolérant aux fautes de frappe ; filtres catégorie, marques
  (choix multiple), fourchette de prix (minimum 100 €, maximum 1 000 000 €), caractéristiques
  techniques propres à la catégorie (ex. CPU, RAM, type d'écran) dérivées de la description de la
  catégorie ; pagination ; l'état des filtres est reflété dans l'adresse de la page (partageable,
  bouton retour fonctionnel).
- **Fiche produit** : nom, marque, prix, galerie de photos, description, caractéristiques
  techniques lisibles, disponibilité en temps réel (« en stock », « plus que N », « rupture ») ;
  bouton d'ajout désactivé en rupture.
- **Recherche instantanée** accessible au clavier (⌘K / Ctrl+K) avec résultats en direct.

**Why this priority**: sans catalogue, aucun autre parcours n'a de sens ; c'est aussi la seule
partie entièrement publique, démontrable seule.

**Independent Test**: un visiteur non connecté trouve un produit par recherche ou filtres et ouvre
sa fiche, sans aucune autre fonctionnalité.

**Acceptance Scenarios**:

1. **Given** le catalogue, **When** je saisis « lenvo » dans la recherche, **Then** des produits
   LENOVO apparaissent.
2. **Given** la liste, **When** je combine catégorie + marque + prix, **Then** seuls les produits
   correspondants sont listés, l'adresse contient ces filtres et recharger la page conserve le
   résultat.
3. **Given** des filtres sans résultat, **When** la liste s'affiche, **Then** un état vide
   explicite propose de réinitialiser les filtres.
4. **Given** une fiche produit inexistante, **When** je l'ouvre, **Then** une page « produit
   introuvable » s'affiche avec un retour au catalogue.
5. **Given** un produit en rupture, **When** j'ouvre sa fiche, **Then** la mention « rupture »
   s'affiche et le bouton d'ajout est désactivé.
6. **Given** n'importe quelle page du catalogue, **When** je l'utilise au clavier seul ou avec un
   lecteur d'écran, **Then** toutes les actions sont accessibles et compréhensibles.

---

### User Story 2 - Créer un compte (Priority: P2)

En tant que visiteur, je veux créer un compte pour commander et retrouver mon panier.

- Champs : email, prénom, nom (2 à 50 caractères), sexe (M/F), téléphone, canal de communication
  préféré (email, SMS, notification push), adresse (rue, ville, code postal, pays), date de
  naissance facultative (dans le passé), mot de passe (8 caractères minimum).
- Les erreurs sont affichées champ par champ avant envoi ; un email déjà utilisé produit un
  message clair.
- Après inscription réussie, l'utilisateur est invité à se connecter : l'inscription ne connecte
  pas automatiquement.

**Why this priority**: nécessaire pour avoir un compte, mais un compte de test suffit à démontrer
la connexion et le panier.

**Independent Test**: un visiteur remplit le formulaire, voit les erreurs par champ, crée son
compte, puis peut se connecter avec.

**Acceptance Scenarios**:

1. **Given** le formulaire, **When** je saisis un email invalide, **Then** une erreur s'affiche
   sur le champ sans envoi au serveur.
2. **Given** un email déjà utilisé, **When** je valide, **Then** le message « Un compte existe déjà
   avec cet email » s'affiche sur le champ email.
3. **Given** trop de tentatives d'inscription, **When** je valide, **Then** un message m'indique
   combien de temps attendre avant de réessayer.
4. **Given** des données valides, **When** je valide, **Then** mon compte est créé et je suis
   invité à me connecter.

---

### User Story 3 - Se connecter, rester connecté, se déconnecter (Priority: P2)

- Connexion via la page du fournisseur d'identité, puis retour sur la page d'origine.
- La session reste active pendant la navigation sans action de l'utilisateur, tant que la session
  du fournisseur est valide (30 min d'inactivité, 10 h maximum).
- Déconnexion : la session est fermée dans l'application ET chez le fournisseur d'identité.
- Visiteur connu : « Content de te revoir, <prénom> » avec ses derniers produits consultés
  (historique conservé sur le navigateur, non sensible).

**Why this priority**: indispensable au panier multi-appareil, mais le catalogue et le panier
invité fonctionnent sans.

**Independent Test**: avec un compte existant, se connecter, naviguer plus de 5 minutes sans
interruption, se déconnecter, vérifier que plus aucune donnée privée n'est accessible.

**Acceptance Scenarios**:

1. **Given** une page privée et aucune session, **When** j'y accède, **Then** je suis redirigé vers
   la connexion puis ramené à la page demandée.
2. **Given** une session active, **When** je navigue pendant 20 minutes, **Then** je ne suis jamais
   déconnecté ni interrompu.
3. **Given** une session active, **When** je me déconnecte puis utilise le bouton « retour »,
   **Then** aucune donnée privée ne s'affiche.
4. **Given** une session active, **When** j'arrive sur l'accueil, **Then** je vois
   « Content de te revoir, <prénom> » et mes derniers produits consultés.

---

### User Story 4 - Gérer mon panier (Priority: P1)

- Ajouter un produit depuis la liste ou la fiche, avec une quantité ; modifier la quantité ;
  supprimer une ligne ; vider le panier.
- Afficher les lignes (nom, prix unitaire, quantité, sous-total) et le total calculé par le
  serveur.
- Compteur du panier visible en permanence dans l'en-tête.
- Persistance multi-appareil : un utilisateur connecté retrouve le même panier sur tous ses
  appareils.
- Visiteur non connecté : il peut ajouter au panier ; ce panier invité est conservé sur son
  navigateur (capacité portée par le front) et fusionné dans son panier de compte à la connexion
  (quantités additionnées), avec un récapitulatif des lignes qui n'ont pas pu être fusionnées ou
  ont été limitées (stock insuffisant, produit disparu). Son total est affiché comme « estimé ».

**Why this priority**: le panier est la raison d'être d'un site marchand ; sa partie invitée est
testable sans compte, dès que le catalogue existe.

**Independent Test**: un visiteur ajoute deux produits, modifie une quantité, supprime une ligne,
se connecte et retrouve un panier fusionné cohérent.

**Acceptance Scenarios**:

1. **Given** un produit présent 1× dans le panier, **When** j'en ajoute 2, **Then** la ligne
   affiche 3.
2. **Given** un produit avec 3 unités disponibles, **When** j'en demande 5, **Then** un message
   indique « il n'en reste que 3 » et le panier reste inchangé.
3. **Given** un utilisateur connecté avec un panier, **When** il se connecte sur un second
   appareil, **Then** le même panier s'affiche.
4. **Given** un visiteur avec 2 lignes, **When** il se connecte avec un compte ayant 1 ligne,
   **Then** le panier final est cohérent (quantités additionnées) et un message résume la fusion.
5. **Given** un panier invité contenant un produit dont le stock a baissé, **When** la fusion a
   lieu, **Then** la quantité est limitée au stock disponible et l'utilisateur en est informé.
6. **Given** n'importe quelle modification du panier, **When** elle aboutit ou échoue, **Then**
   elle est annoncée aux technologies d'assistance.

---

### Edge Cases

- **Session expirée pendant une action panier** : l'action est rejouée après renouvellement
  transparent ; si la session ne peut être renouvelée, l'utilisateur est redirigé vers la
  connexion et retrouve son action en attente après connexion.
- **Stock insuffisant** à l'ajout, à la modification ou à la fusion : message explicite avec la
  quantité disponible.
- **Backend indisponible ou lent (> 8 s)** : catalogue → message bienveillant et bouton
  « Réessayer », jamais de page blanche ; panier → l'action échoue proprement, l'état affiché
  reste celui du serveur.
- **Conflit temporaire** (panier modifié en parallèle, sur-sollicitation) : un nouvel essai
  automatique unique, puis un message.
- **Trop de requêtes** : message indiquant quand réessayer.
- **Utilisateur non connecté qui ajoute au panier** : panier invité (US4), jamais d'erreur.
- **Produit supprimé** entre l'ajout et l'affichage du panier : la ligne est retirée et
  l'utilisateur en est informé.
- **Fusion depuis plusieurs onglets** : un seul onglet fusionne ; aucun article n'est ajouté deux
  fois.
- **Fusion interrompue** (coupure réseau) : les lignes non fusionnées sont conservées et
  retentées au chargement suivant.
- **Données du panier invité altérées** sur le navigateur : le panier invité est réinitialisé sans
  erreur bloquante.
- **JavaScript lent à charger** : catalogue et fiches lisibles sans JavaScript.
- **Préférence « réduire les animations »** : tous les effets sont figés ou réduits à des fondus.

## Requirements *(mandatory)*

### Functional Requirements

**Catalogue**

- **FR-001**: L'accueil MUST afficher un message selon l'heure (ex. « Bonjour », « Bonsoir »),
  les meilleures ventes et les remises actives.
- **FR-002**: Les visiteurs MUST pouvoir rechercher par mot-clé avec tolérance aux fautes de
  frappe.
- **FR-003**: Les visiteurs MUST pouvoir filtrer par catégorie, marques (multi), fourchette de prix
  (100 € à 1 000 000 €) et caractéristiques techniques propres à la catégorie choisie.
- **FR-004**: Les filtres, le mot-clé et la page courante MUST être reflétés dans l'adresse de la
  page ; recharger ou partager l'adresse MUST reproduire le même résultat.
- **FR-005**: La liste MUST être paginée et afficher un état vide avec réinitialisation des
  filtres quand aucun produit ne correspond.
- **FR-006**: La fiche produit MUST afficher nom, marque, prix en euros, photos, description et
  caractéristiques techniques en libellés lisibles.
- **FR-007**: La fiche produit et les cartes MUST afficher la disponibilité en temps réel
  (« en stock », « plus que N » sous un seuil, « rupture ») ; l'ajout MUST être impossible en
  rupture.
- **FR-008**: Une fiche inexistante MUST afficher une page « produit introuvable » avec un retour
  au catalogue.
- **FR-009**: Une recherche instantanée MUST s'ouvrir par ⌘K / Ctrl+K et afficher des résultats
  pendant la frappe, entièrement utilisable au clavier.
- **FR-010**: Les pages catalogue et fiche MUST être lisibles sans JavaScript.

**Compte et session**

- **FR-011**: Les visiteurs MUST pouvoir créer un compte avec les champs et contraintes de US2 ;
  les erreurs MUST s'afficher par champ avant envoi.
- **FR-012**: Un email déjà utilisé MUST produire le message « Un compte existe déjà avec cet
  email » sur le champ email.
- **FR-013**: Un refus pour trop de tentatives MUST indiquer le délai d'attente.
- **FR-014**: Après inscription, l'utilisateur MUST être invité à se connecter (pas de connexion
  automatique).
- **FR-015**: La connexion MUST passer par la page du fournisseur d'identité et ramener
  l'utilisateur à sa page d'origine.
- **FR-016**: La session MUST rester active sans action de l'utilisateur tant que la session du
  fournisseur d'identité est valide.
- **FR-017**: La déconnexion MUST fermer la session dans l'application et chez le fournisseur
  d'identité ; aucune donnée privée ne doit rester visible ensuite, y compris via « retour ».
- **FR-018**: Les pages privées MUST rediriger un visiteur sans session vers la connexion, puis
  le ramener à la page demandée.
- **FR-019**: Un utilisateur connecté MUST être accueilli par son prénom et voir ses derniers
  produits consultés (historique conservé sur le navigateur, capacité portée par le front).

**Panier**

- **FR-020**: Les utilisateurs (connectés ou non) MUST pouvoir ajouter un produit avec une
  quantité, modifier une quantité, supprimer une ligne et vider le panier.
- **FR-021**: Le panier MUST afficher pour chaque ligne nom, prix unitaire, quantité et
  sous-total, ainsi que le total ; pour un utilisateur connecté, le total affiché MUST être celui
  calculé par le serveur ; pour un visiteur, il MUST être marqué « estimé ».
- **FR-022**: Un compteur d'articles MUST être visible en permanence dans l'en-tête, sans
  décaler la mise en page lors de son apparition.
- **FR-023**: Le panier d'un utilisateur connecté MUST être identique sur tous ses appareils.
- **FR-024**: Le panier d'un visiteur MUST être conservé sur son navigateur, synchronisé entre ses
  onglets, et limité à 50 lignes et 99 unités par ligne.
- **FR-025**: À la connexion, le panier invité MUST être fusionné une seule fois dans le panier du
  compte (quantités additionnées), puis vidé du navigateur ; un récapitulatif MUST lister les
  lignes fusionnées, limitées au stock ou abandonnées.
- **FR-026**: Une demande dépassant le stock disponible MUST être refusée avec la quantité
  disponible, sans modifier le panier.
- **FR-027**: Après déconnexion, le panier du compte MUST NOT être recopié sur le navigateur.
- **FR-028**: Chaque modification du panier MUST être annoncée aux technologies d'assistance.

**Erreurs et expérience**

- **FR-029**: Toute indisponibilité ou lenteur (> 8 s) du service MUST produire un message
  bienveillant avec une action « Réessayer », jamais une page blanche.
- **FR-030**: Tous les messages MUST être en français, au tutoiement, au ton chaleureux et jamais
  culpabilisant.
- **FR-031**: L'interface MUST suivre la direction artistique « Aurora Glow » (annexe) et
  respecter la préférence « réduire les animations ».

### Key Entities

- **Produit** : identifiant, nom, marque, catégorie, prix en euros, photos, description,
  caractéristiques techniques propres à sa catégorie.
- **Disponibilité** : quantité disponible en direct d'un produit ; jamais conservée.
- **Catégorie** : clé (COMPUTER, MONITOR), libellé, description des caractéristiques techniques
  possibles (sert aux filtres et aux fiches).
- **Remise active** : code, type de calcul (pourcentage, montant fixe…), valeurs, période.
- **Utilisateur** : email, prénom, nom, sexe, téléphone, canal préféré, adresse, date de
  naissance facultative.
- **Panier de compte** : lignes (produit, quantité, prix unitaire, sous-total) et total ; un par
  utilisateur, source de vérité.
- **Panier invité** : lignes (produit, quantité) uniquement, sans prix ni donnée personnelle ;
  existe seulement jusqu'à la fusion.
- **Rapport de fusion** : lignes fusionnées, limitées (quantité demandée / ajoutée),
  abandonnées (rupture, produit disparu) et à retenter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visiteur trouve un produit précis (recherche ou filtres) et ouvre sa fiche en
  moins de 30 secondes.
- **SC-002**: Les pages catalogue et produit affichent leur contenu principal en moins de 2,5 s
  sur un mobile en 4G.
- **SC-003**: Chaque interaction (clic, saisie, ajout au panier) donne un retour visible en moins
  de 200 ms.
- **SC-004**: Aucun décalage visible de mise en page pendant le chargement (score de stabilité
  visuelle < 0,1).
- **SC-005**: Un visiteur crée son compte en moins de 3 minutes.
- **SC-006**: 100 % des articles d'un panier invité se retrouvent dans le panier du compte après
  connexion, ou figurent dans le récapitulatif de fusion.
- **SC-007**: Aucun article n'est compté en double lors d'une fusion, quel que soit le nombre
  d'onglets ouverts.
- **SC-008**: Une session reste active au moins 30 minutes de navigation continue sans demande de
  reconnexion.
- **SC-009**: Les parcours catalogue, inscription, connexion et panier sont réalisables au
  clavier seul et ne présentent aucune violation WCAG 2.1 AA de niveau sérieux.
- **SC-010**: Quand le service est indisponible, 100 % des pages affichent un message et une
  action « Réessayer » plutôt qu'une page blanche.

## Assumptions

- Le backend et le fournisseur d'identité sont disponibles en local ; le client de connexion du
  front existe déjà (backend `0b4a600`).
- Le profil courant et la disponibilité en temps réel sont fournis par le backend
  (backend `d50e661`).
- Le seuil « plus que N » est fixé à 5 unités.
- Une recherche sans aucun filtre renvoie l'ensemble du catalogue (à vérifier sur le backend).
- La politique de mot de passe du fournisseur d'identité n'est pas plus stricte que 8 caractères
  minimum (à vérifier).
- Le stock n'est pas réservé à l'ajout au panier ; la réservation a lieu à la commande (lot 2).
- Une fusion dont la réponse se perd alors que les articles ont déjà été ajoutés peut doubler une
  ligne ; ce cas rare est accepté pour le lot 1.
- Français uniquement, tutoiement partout.

## Hors périmètre du lot 1

Commande et paiement, historique de commandes, wishlist, avis, recommandations personnalisées,
carte bancaire, profil, mot de passe oublié, administration, tri du catalogue (non supporté par le
backend), avis et notes sur la fiche (non exposés publiquement), sons d'interface (prévus mais
désactivés), internationalisation (français uniquement).

## Annexe — Direction artistique (reprise intégrale)

> Cette annexe est reprise telle quelle, à la demande du propriétaire. Elle contient des
> indications de mise en œuvre visuelle (polices, tokens, Canvas) qui s'imposeront au plan.

### « Aurora Glow » — sombre, doux à l'œil, premium et vivant

**Intention** : une ambiance nocturne et feutrée, comme une aurore boréale vue de nuit. Les couleurs vivent en arrière-plan et dans les accents, jamais en aplats agressifs. Le doré signe le côté premium. L'œil ne doit jamais fatiguer : pas de blanc pur, pas de noir pur, pas de contrastes violents. **La page doit sembler vivante et dialoguer avec l'utilisateur.**

**Références** : Linear, Stripe, Vercel, Raycast.

**Palette** (tokens CSS / Tailwind) :
| Rôle | Token | Valeur |
|---|---|---|
| Fond principal (bleu nuit) | `--bg` | `#0A0E1F` |
| Surface (cartes) | `--surface` | `#121833` |
| Surface élevée | `--surface-2` | `#1A2142` |
| Bordures | `--border` | `#2A3150` |
| Texte principal | `--text` | `#E6E8F2` |
| Texte secondaire | `--text-muted` | `#8B93B0` |
| Violet (accent principal) | `--violet` | `#8B7CF6` |
| Bleu (accent secondaire) | `--blue` | `#4F7BFF` |
| Or champagne (premium) | `--gold` | `#D4AF6A` |
| Cyan (succès, état actif) | `--cyan` | `#5EEAD4` |
| Rose (alertes douces, rare) | `--rose` | `#F08BB8` |

**Règles d'usage des couleurs** :
- Répartition 60 / 30 / 10 : 60 % bleu nuit, 30 % surfaces et gris, 10 % accents.
- **Doré rare** : prix, badges premium, liseré au survol des cartes. Jamais en fond.
- CTA principal en dégradé violet → bleu avec un léger halo.
- Tous les couples texte / fond respectent WCAG AA.

**Typographie** (polices variables via `next/font`) :
- Titres : **Sora**, 500–600, letter-spacing -0,02em. Alternative éditoriale : **Clash Display** (Fontshare, via `next/font/local`).
- Texte : **Inter**, 400–500, interligne 1,6–1,7.
- Prix et données techniques : **JetBrains Mono**, prix en doré.
- La graisse des titres réagit à la proximité du curseur (axe variable `wght`).

**Composants** :
- Cartes en verre subtil : `--surface` à ~70 % d'opacité, `backdrop-filter: blur(12px)`, bordure 1 px `--border`. Au survol, la bordure devient un dégradé violet → or.
- Rayons de 16 à 20 px. Ombres diffuses teintées de violet, jamais noires.
- Contrôles du panier (quantité, toggles) en dark neumorphism discret, avec un liseré cyan à l'état actif.

**Effet signature : grille de points réactive autour du curseur**
- Le fond porte une grille de petits points très discrète (couleur proche de `--border`, quasi invisible au repos).
- Autour du curseur, dans un rayon d'environ 120 px, les points se révèlent progressivement, grossissent légèrement et sont repoussés vers l'extérieur, formant un anneau vivant.
- Une ombre douce et sombre suit le curseur sous cet anneau, comme si le curseur creusait légèrement la surface.
- Le mouvement est amorti avec de l'inertie : les points reviennent lentement à leur place quand le curseur s'éloigne.
- L'effet est actif uniquement sur les zones de fond, pas au-dessus des cartes ni du texte.
- Sur mobile, il se déclenche au toucher, en version allégée.
- Implémentation en Canvas 2D (ou WebGL si nécessaire), avec un nombre de points adapté à la taille d'écran. Il est désactivé avec `prefers-reduced-motion`.

**Animations** (douces, jamais agressives) :
- Arrière-plan : 2 à 3 blobs aurora (violet, bleu, touche d'or) très floutés, qui dérivent sur des cycles de 20 à 30 s et suivent lentement le curseur.
- Apparition au scroll : fondu + translation de 12 px, 300–400 ms, ease-out, avec stagger.
- Transition partagée carte produit → page détail.
- Skeletons avec un shimmer violet très léger.
- Micro-interactions : 150–250 ms. Aucun clignotement.
- Avec `prefers-reduced-motion` : effets figés, transitions réduites à des fondus.

**Interactivité : « la page dialogue avec l'utilisateur »**
- **Accueil contextuel** : message selon l'heure (« Bonsoir »). Pour un visiteur connu, « Content de te revoir » avec ses derniers produits consultés.
- **Boutons magnétiques** : les CTA principaux sont légèrement attirés par le curseur.
- **Cartes produits** : inclinaison 3D selon le curseur, spotlight interne, reflet doré qui glisse sur la bordure.
- **Titres vivants** : révélation lettre par lettre au premier affichage, graisse réactive au curseur.
- **Recherche instantanée** : palette ⌘K / Ctrl+K avec résultats en direct.
- **Panier vivant** : animation « vole vers le panier », compteur doré qui rebondit, micro-copie chaleureuse, vibration légère sur mobile si supportée.
- **États vides et erreurs** : illustrations animées et textes qui s'adressent à l'utilisateur.
- **Sons d'interface optionnels**, désactivés par défaut.
- **Mobile** : les effets liés au curseur sont remplacés par le toucher et le gyroscope (inclinaison des cartes), avec dégradation propre.
- **Pas d'effets météo ni saisonniers** (pas de neige).
