# Feature Specification: Mon compte et mes commandes

**Feature Branch**: `003-account-orders`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Feature 003 « Mon compte et mes commandes » du front cybertech, dans la continuité du lot 1 et de la feature 002 : profil, bouton « Passer commande » et réduction sur le panier, tunnel de commande chiffré par le devis du backend, livraison aux prix réels, suivi et historique des commandes, carte bancaire enregistrée. Texte complet : §3 de docs/speckit-prompts-lot2.md."

## Contexte

Le lot 1 (`specs/001-catalog-auth-cart`) a livré le catalogue, la connexion, l'inscription et le
panier (invité puis fusionné à la connexion). La feature 002 (`specs/002-catalog-refresh`) a
livré les filtres, le comparateur, la barre de navigation commune, le gabarit de page commun
et le bloc « Livraison » de la fiche produit. Aujourd'hui, un client peut remplir son panier
mais **ne peut pas commander** : la page panier n'a ni bouton « Passer commande » ni
réduction, et il n'existe aucun espace « Mon compte ».

Cette feature ferme la boucle d'achat : passer commande, suivre et gérer ses commandes, tenir
son profil et sa carte enregistrée à jour.

**Ce que le backend fournit (constaté le 2026-10-14)** :

- **Devis** : le backend chiffre le panier de l'utilisateur pour un type de livraison, un
  transporteur et une réduction donnés, sans rien créer : sous-total, remise, indication
  « remise appliquée ou non », minimum de commande de la campagne, frais de port, total et
  devise. Ce sont les montants qui seront réellement facturés.
- **Options de livraison** : liste publique des couples (transporteur, type) avec leur prix
  réel. Deux transporteurs (DHL, FedEx), deux types (Standard, Express), aucun délai fourni.
- **Réductions** : liste publique des campagnes actives (pourcentage, montant fixe, « un
  acheté, un offert »), avec minimum de commande et plafond éventuels ; la campagne
  « aucune remise » y figure aussi.
- **Commande** : la commande est créée à partir du panier du serveur, qui est vidé ; le
  paiement est **simulé côté serveur** (le moyen de paiement choisi est enregistré mais
  n'influence pas le débit) ; l'issue du paiement ne se lit que dans le statut de la commande.
- **Détail d'une commande** : sous-total, remise et sa clé, frais de port, type et
  transporteur ; ces champs sont vides sur les commandes passées avant leur ajout.
- **Profil** : l'adresse est renvoyée **en une seule ligne** (« rue, code postal ville,
  pays ») alors qu'elle se modifie champ par champ ; le téléphone se modifie mais n'est jamais
  renvoyé.

## Clarifications

### Session 2026-10-14

- Q: Le tunnel est-il une seule page à étapes dépliables ou une page par étape ? → A: Une
  seule page de commande : adresse, livraison et paiement se déplient l'une après l'autre, à
  côté d'un récapitulatif fixe mis à jour à chaque devis ; la confirmation est une page à part.
- Note (2026-10-14, hors questionnaire) : les prompts backend sont modifiés : les délais de
  livraison seront des valeurs fixes de configuration du backend, sans calcul (jours fériés et
  jours ouvrés ignorés : projet de portfolio) ; le retrait en magasin sera purement
  esthétique, sans logique côté backend.
- Q: Que fait l'option « Retrait en magasin » dans le tunnel, le backend ne la gérant pas ?
  → A: Elle est affichée parmi les modes de livraison, grisée, avec la mention « Bientôt
  disponible », et n'est pas sélectionnable.
- Q: Quels montants le bloc réduction affiche-t-il sur la page panier, avant tout choix de
  livraison ? → A: Le sous-total et la remise du devis seulement (avec le message de minimum
  non atteint), puis « Livraison et total calculés à l'étape suivante » ; ni port ni total sur
  le panier.
- Q: Que peut-on changer aux articles d'une commande non expédiée ? → A: Les quantités, le
  retrait de lignes (au moins une ligne doit rester) et l'ajout de produits depuis une
  recherche dans la commande ; l'adresse, la livraison et le paiement restent modifiables.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Passer commande depuis le panier (Priority: P1)

En tant que client, je veux passer de mon panier à une commande payée en quelques étapes
claires, en voyant à chaque instant les montants exacts qui me seront facturés.

- La page panier propose « Passer commande ». Un visiteur est invité à se connecter, son
  panier invité est fusionné comme aujourd'hui, puis il arrive dans le tunnel.
- Le tunnel est une seule page : adresse de livraison (préremplie depuis le profil),
  livraison (type et transporteur, prix réels, délais annoncés), paiement (Mastercard, Visa,
  Apple Pay, Google Pay) se déplient l'une après l'autre, à côté d'un récapitulatif fixe ; la
  confirmation est une page à part.
- Le récapitulatif affiche le sous-total, la remise, les frais de port et le total **tels
  que chiffrés par le backend** ; ces montants sont recalculés à chaque changement de
  livraison ou de réduction.
- Après validation, une page de confirmation suit le paiement jusqu'à son issue (payé ou
  refusé) ; un paiement refusé peut être relancé depuis cette page.

**Why this priority**: c'est le cœur d'un site marchand ; sans elle, le catalogue et le panier
ne mènent à rien.

**Independent Test**: avec un compte et un panier de 2 produits, cliquer « Passer commande »,
garder l'adresse préremplie, choisir Express FedEx et Visa, vérifier que le total du
récapitulatif est identique à celui de la commande créée, puis voir la confirmation passer à
« Payée ».

**Acceptance Scenarios**:

1. **Given** un visiteur avec un panier invité, **When** il clique « Passer commande »,
   **Then** il est invité à se connecter et, une fois connecté, arrive dans le tunnel avec
   son panier fusionné.
2. **Given** un client connecté au profil complet, **When** il ouvre le tunnel, **Then**
   l'adresse de livraison est préremplie (rue, code postal, ville, pays) et modifiable pour
   cette commande seulement.
3. **Given** l'étape livraison, **When** le client passe de Standard à Express ou change de
   transporteur, **Then** le prix de chaque option affiché est celui du backend, avec un délai
   indiqué comme estimatif, et le récapitulatif est rechiffré.
4. **Given** plusieurs changements rapides de livraison, **When** les réponses arrivent dans
   le désordre, **Then** seuls les montants correspondant au dernier choix sont affichés.
5. **Given** le récapitulatif, **When** le client valide, **Then** la commande est créée, le
   panier affiché devient vide et la page de confirmation indique « Paiement en cours » puis
   « Payée ».
6. **Given** un paiement refusé, **When** la confirmation l'indique, **Then** le client voit
   un message clair et un bouton « Relancer le paiement » ; une relance réussie fait passer la
   commande à « Payée ».
7. **Given** un produit dont le stock est devenu insuffisant, **When** le client valide,
   **Then** il revient au panier avec les lignes concernées signalées et la quantité encore
   disponible.
8. **Given** un panier vide côté serveur (vidé dans un autre onglet), **When** le client
   valide, **Then** il revient au panier avec un message expliquant que celui-ci est vide.
9. **Given** une session expirée pendant le tunnel, **When** le client valide, **Then** il
   se reconnecte et retrouve le tunnel avec ses choix de livraison, de paiement et de
   réduction (une adresse modifiée est préremplie à nouveau depuis le profil, avec un
   message), puis valide lui-même : aucune commande n'est créée sans ce nouveau clic, et
   jamais en double.

---

### User Story 2 - Appliquer une réduction (Priority: P1)

En tant que client, je veux appliquer une campagne de réduction active à ma commande et voir
immédiatement ce qu'elle me fait économiser, ou pourquoi elle ne s'applique pas.

- Un bloc « Appliquer une réduction » est proposé sur le panier (client connecté) et sur le
  récapitulatif du tunnel : choix parmi les campagnes actives, ou saisie de la clé d'une
  campagne.
- Chaque campagne proposée indique son avantage (« −20 % », « −10 € », « 1 acheté = 1
  offert »), son minimum de commande, son plafond et sa date de fin quand ils existent.
- Les montants affichés (remise, total) sont ceux du devis du backend, jamais un calcul du
  front.
- Si le minimum de commande n'est pas atteint, le backend retire la remise sans erreur :
  l'interface le dit clairement (« Il te manque 32,10 € pour profiter de BLACK_FRIDAY »)
  et la réduction reste sélectionnée pour s'appliquer dès que le minimum est atteint.

**Why this priority**: une campagne active (BLACK_FRIDAY) existe déjà côté backend mais aucun
client ne peut en profiter ; la remise influe directement sur le total facturé.

**Independent Test**: avec BLACK_FRIDAY active, appliquer la campagne sur un panier de 500 €,
lire une remise de 100 € dans le récapitulatif, passer commande et retrouver la même remise
dans le détail de la commande.

**Acceptance Scenarios**:

1. **Given** des campagnes actives, **When** le client ouvre le bloc réduction, **Then** il
   voit chaque campagne avec son avantage et ses conditions, sans la campagne « aucune
   remise ».
2. **Given** une campagne choisie dont le minimum est atteint, **When** le devis revient,
   **Then** la remise s'affiche avec la clé de la campagne, ainsi que le nouveau total dans
   le tunnel (sur le panier : sous-total et remise seulement).
3. **Given** une campagne dont le minimum n'est pas atteint, **When** le devis revient,
   **Then** la remise vaut 0 et un message indique le montant manquant, sans bloquer la
   commande.
4. **Given** une clé saisie inconnue ou inactive, **When** le client l'applique, **Then** un
   refus clair s'affiche et la réduction précédente est conservée.
5. **Given** une réduction appliquée sur le panier, **When** le client entre dans le tunnel,
   **Then** elle est déjà appliquée sur le récapitulatif.
6. **Given** une campagne expirée entre le devis et la validation, **When** le client
   valide, **Then** la commande n'est pas créée, un message explique que la réduction n'est
   plus valable et le récapitulatif est rechiffré sans elle, pour une nouvelle validation
   explicite.
7. **Given** aucune campagne active (hors « aucune remise »), **When** le client regarde le
   panier, **Then** le bloc propose seulement la saisie d'une clé, sans liste vide.

---

### User Story 3 - Suivre et gérer mes commandes (Priority: P2)

En tant que client, je veux retrouver toutes mes commandes, comprendre où en est chacune, et
la modifier ou l'annuler tant que c'est possible.

- « Mes commandes » liste mes commandes, les plus récentes d'abord, page par page, avec un
  filtre par statut.
- Le détail d'une commande montre les produits, l'adresse, la décomposition du total
  (sous-total, remise et sa clé, frais de port, type et transporteur), ou seulement le total
  pour les commandes anciennes qui n'ont pas ce détail.
- Une frise montre l'avancement : Créée → En attente de paiement → Payée → En préparation →
  Expédiée → Livrée, avec les issues Annulée, Remboursée, Retournée et Paiement refusé.
- Tant que la commande n'est pas expédiée, je peux changer les quantités, retirer des lignes
  (au moins une doit rester), ajouter des produits trouvés par une recherche dans la commande,
  et modifier l'adresse, la livraison et le moyen de paiement ; la commande garde la réduction avec laquelle elle a été
  passée, et l'interface le précise.
- Tant que l'annulation est possible, je peux annuler, après confirmation.

**Why this priority**: indispensable après la première commande, mais le tunnel (P1) doit
exister avant.

**Independent Test**: après deux commandes, ouvrir « Mes commandes », filtrer sur « Payée »,
ouvrir le détail, réduire une quantité, vérifier le nouveau total et la remise conservée, puis
annuler une autre commande.

**Acceptance Scenarios**:

1. **Given** un client avec 25 commandes, **When** il ouvre « Mes commandes », **Then** il
   voit les plus récentes d'abord, avec date, statut, nombre d'articles et total, et peut
   passer à la page suivante.
2. **Given** la liste, **When** le client filtre sur un ou plusieurs statuts, **Then** seules
   ces commandes s'affichent et l'adresse de la page reflète le filtre.
3. **Given** une commande récente, **When** le client ouvre son détail, **Then** il voit
   sous-total, remise (avec la clé de la campagne), frais de port, type et transporteur, et
   le total.
4. **Given** une commande ancienne sans détail du total, **When** le client ouvre son
   détail, **Then** seul le total est affiché, sans valeurs vides ni zéros trompeurs.
5. **Given** une commande non expédiée, **When** le client modifie une quantité et
   enregistre, **Then** le nouveau total est affiché, la remise d'origine est conservée, et
   un complément ou remboursement éventuel est expliqué.
6. **Given** une commande déjà expédiée, **When** le client tente de la modifier, **Then**
   l'action est refusée avec une explication et la page affiche le statut à jour.
7. **Given** une commande annulable, **When** le client confirme l'annulation, **Then** le
   statut passe à « Annulée » ; si le remboursement échoue, un message explique la marche à
   suivre.
8. **Given** une commande au paiement refusé, **When** le client ouvre son détail, **Then** il
   peut relancer le paiement.
9. **Given** une commande non expédiée en modification, **When** le client recherche un
   produit, l'ajoute avec une quantité et enregistre, **Then** la ligne apparaît dans la
   commande et le nouveau total est affiché ; un stock insuffisant est signalé sur la ligne
   ajoutée sans perdre les autres changements.
10. **Given** une commande en modification réduite à une seule ligne, **When** le client
    regarde cette ligne, **Then** son retrait est impossible, avec l'explication et un lien
    vers l'annulation de la commande.
11. **Given** aucune commande, **When** le client ouvre « Mes commandes », **Then** un état vide
   illustré l'invite à découvrir le catalogue.

---

### User Story 4 - Consulter et modifier mon profil (Priority: P2)

En tant que client, je veux voir mes informations et corriger mon nom, mon téléphone et mon
adresse, qui serviront à préremplir mes commandes.

- « Mon profil » affiche nom, prénom, adresse email, nom d'utilisateur et adresse.
- Le formulaire permet de modifier prénom, nom, téléphone, rue, code postal, ville et pays ;
  l'email et le mot de passe ne sont pas modifiables ici.
- Un lien mène à la console de compte pour changer de mot de passe.
- La suppression de compte n'existe pas : le profil n'en propose pas.

**Why this priority**: utile mais non bloquant : le tunnel accepte une adresse saisie pour la
commande.

**Independent Test**: modifier la ville du profil, recharger, retrouver la nouvelle ville,
puis ouvrir le tunnel et la voir préremplie.

**Acceptance Scenarios**:

1. **Given** un client connecté, **When** il ouvre « Mon profil », **Then** il voit ses
   informations et le formulaire prérempli avec l'adresse découpée en champs.
2. **Given** un prénom d'une seule lettre, **When** il enregistre, **Then** une erreur
   accessible est affichée sur le champ concerné et rien n'est envoyé.
3. **Given** une modification valide, **When** il enregistre, **Then** un message confirme
   l'enregistrement et les informations affichées sont à jour.
4. **Given** le profil, **When** il cherche à changer son mot de passe, **Then** un lien
   l'emmène vers la console de compte dans un nouvel onglet (le site reste ouvert dans
   l'onglet d'origine), ce qui est indiqué dans le libellé du lien.
5. **Given** un téléphone déjà enregistré, **When** il ouvre le formulaire, **Then** le champ
   est vide avec une mention indiquant qu'un numéro saisi remplacera l'ancien.

---

### User Story 5 - Gérer ma carte enregistrée (Priority: P3)

En tant que client, je veux voir la carte enregistrée sur mon compte, la tenir à jour ou la
supprimer.

- La carte est affichée masquée (4 derniers chiffres), avec titulaire, expiration et réseau.
- Je peux modifier le titulaire et la date d'expiration, ou supprimer la carte après
  confirmation.
- Le site ne permet pas d'ajouter une carte : aucune saisie de numéro de carte. L'état
  « aucune carte » l'explique simplement.

**Why this priority**: le paiement est simulé côté serveur et n'utilise pas cette carte ; la
gestion reste utile pour les comptes qui en ont une.

**Independent Test**: avec un compte doté d'une carte, modifier l'expiration, recharger, puis
supprimer la carte et voir l'état « aucune carte ».

**Acceptance Scenarios**:

1. **Given** une carte enregistrée, **When** le client ouvre « Ma carte », **Then** il voit
   le numéro masqué, le titulaire, l'expiration et le réseau ; jamais le numéro complet.
2. **Given** une date d'expiration passée, **When** il enregistre, **Then** une erreur claire
   est affichée sur le champ.
3. **Given** une carte, **When** il confirme la suppression, **Then** l'état « aucune carte »
   s'affiche.
4. **Given** aucune carte, **When** il ouvre « Ma carte », **Then** un état illustré explique
   qu'aucune carte n'est enregistrée et que l'ajout n'est pas proposé sur le site.

---

### Edge Cases

- **Panier vide au moment du devis** (vidé dans un autre onglet) : retour au panier avec un
  message, comme à la validation.
- **Devis indisponible** (backend injoignable) : le récapitulatif n'affiche aucun montant
  inventé ; la validation est impossible tant qu'un devis à jour n'est pas obtenu, avec un
  bouton « Réessayer ».
- **Panier modifié dans un autre onglet** pendant le tunnel : le panier est relu au retour sur
  l'onglet et le devis refait ; au clic sur « Valider la commande », un dernier devis est
  demandé : si son total diffère du total affiché, la commande n'est pas créée, le nouveau
  total est montré et le client valide à nouveau.
- **Double clic sur « Valider la commande »** : une seule commande est créée.
- **Retour arrière du navigateur** depuis la confirmation : le client ne revient pas sur un
  tunnel prêt à recommander ; il voit la confirmation ou le panier vide.
- **Paiement toujours en cours** après la durée d'attente maximale : la confirmation l'indique
  et renvoie vers le détail de la commande, qui affiche le statut à jour.
- **Remise supérieure au sous-total** (montant fixe) : le total ne descend jamais sous les
  frais de port ; affichage tel que chiffré par le backend.
- **Adresse du profil incomplète ou impossible à découper** : les champs concernés sont vides
  et à saisir ; rien n'est deviné en silence.
- **Commande d'un autre utilisateur** (adresse copiée) : page « commande introuvable »,
  sans révéler son existence.
- **Compte désactivé** : la commande est refusée avec un message dédié invitant à contacter
  le support.
- **Trop de requêtes** : message d'attente avec le délai indiqué par le backend.
- **Produit retiré du catalogue** présent dans une commande : la ligne reste affichée avec son
  nom et son prix d'achat, sans lien vers la fiche.
- **Visiteur** qui ouvre une page de compte ou le tunnel : redirection vers la connexion puis
  retour à la page demandée.

## Requirements *(mandatory)*

### Functional Requirements

**Accès et socle**

- **FR-001**: Les pages du compte (profil, commandes, détail, carte) et le tunnel de commande
  MUST être réservés aux utilisateurs connectés ; un visiteur MUST être redirigé vers la
  connexion puis ramené à la page demandée.
- **FR-002**: Les pages privées MUST ne jamais être mises en cache partagé, et une session
  expirée pendant une action MUST permettre de se reconnecter sans perdre son travail :
  les actions du panier sont rejouées automatiquement comme aujourd'hui ; la validation d'une
  commande n'est **jamais** rejouée automatiquement (risque de doublon) : le client retrouve le
  tunnel avec ses choix de livraison, de paiement et de réduction, et valide lui-même ; une
  adresse modifiée pour la commande est préremplie à nouveau depuis le profil, avec un
  message ; les formulaires du compte (profil, carte, modification de commande) affichent un
  message invitant à se reconnecter, et la saisie en cours est conservée jusqu'à la
  reconnexion quand elle ne contient pas de données de carte.
- **FR-003**: La barre de navigation commune MUST donner accès à « Mon compte » (profil,
  commandes, carte) pour un utilisateur connecté.
- **FR-004**: Toutes les pages de la feature MUST utiliser le gabarit commun (en-tête de page,
  titres de section, états vides illustrés), les textes en français au tutoiement, et les
  valeurs visuelles du thème.

**Tunnel de commande**

- **FR-005**: La page panier MUST proposer « Passer commande » dès qu'elle contient au moins un
  article ; pour un visiteur, ce bouton MUST mener à la connexion, puis au tunnel après fusion
  du panier invité.
- **FR-006**: Le tunnel MUST tenir sur une seule page : les étapes adresse, livraison et
  paiement se déplient l'une après l'autre (une étape validée se replie en résumé modifiable),
  à côté d'un récapitulatif toujours visible ; un indicateur d'étape MUST être accessible, et
  rouvrir une étape précédente MUST ne pas perdre les choix faits. La confirmation MUST être
  une page distincte, propre à la commande créée.
- **FR-007**: L'adresse de livraison MUST être préremplie depuis le profil quand elle est
  disponible ; rue, code postal, ville et pays MUST être obligatoires ; la modifier dans le
  tunnel MUST ne pas modifier le profil.
- **FR-008**: L'étape livraison MUST proposer chaque couple (type, transporteur) fourni par le
  backend avec son prix réel et son délai : celui fourni par le backend dès qu'il
  le fournit (valeur fixe, sans calcul de jours ouvrés ni de jours fériés), sinon le délai
  indicatif du front, présenté comme estimatif ; avec la même présentation que le bloc « Livraison » de la fiche produit
  (promesse express comprise). L'option « Retrait en magasin » MUST être
  affichée grisée avec la mention « Bientôt disponible », non sélectionnable (désactivation
  annoncée aux lecteurs d'écran).
- **FR-009**: Le paiement MUST proposer Mastercard, Visa, Apple Pay et Google Pay, sans
  aucune saisie de numéro de carte ; l'interface MUST indiquer que le paiement est simulé.
- **FR-010**: Le récapitulatif MUST afficher les produits, l'adresse, la livraison, le
  paiement, la réduction et les montants (sous-total, remise, frais de port, total, devise)
  **issus du devis du backend** ; aucun montant ne MUST être calculé par le front.
- **FR-011**: Un nouveau devis MUST être demandé à chaque changement de type, de transporteur
  ou de réduction ; un devis devenu obsolète MUST être abandonné, et seuls les montants du
  dernier choix MUST être affichés. Pendant le chiffrage, les anciens montants MUST être
  signalés comme en cours de mise à jour.
- **FR-012**: La validation MUST être impossible sans devis à jour, et MUST créer au plus une
  commande même en cas de clics répétés ou de rejeu après reconnexion.
- **FR-013**: Après la création, l'affichage du panier MUST être vidé, puis la page de
  confirmation MUST suivre le statut de la commande à intervalles réguliers, pendant une
  durée bornée, jusqu'à « Payée » ou « Paiement refusé ».
- **FR-014**: En cas de paiement refusé, la confirmation et le détail de la commande MUST
  proposer « Relancer le paiement », et traiter les cas « paiement déjà effectué » (afficher
  l'état payé) et « relance impossible » (message et lien vers le détail).
- **FR-015**: Un stock insuffisant ou un panier vide au moment de la validation MUST ramener
  au panier avec les lignes concernées signalées ; un compte inactif MUST afficher un message
  dédié.

**Réduction**

- **FR-016**: Le bloc « Appliquer une réduction » MUST être proposé sur le panier d'un client
  connecté et sur le récapitulatif du tunnel, et MUST permettre de choisir une campagne active
  ou de saisir sa clé ; la réduction choisie MUST être conservée du panier au tunnel. Sur le
  panier, le bloc MUST afficher uniquement le sous-total et la remise issus du devis (et le
  message de minimum non atteint), suivis de « Livraison et total calculés à l'étape
  suivante » ; aucun frais de port ni total n'y est affiché.
- **FR-017**: Chaque campagne MUST être présentée avec son avantage, et, quand ils existent,
  son minimum de commande, son plafond et sa date de fin ; la campagne « aucune remise » MUST
  ne pas être proposée comme une réduction.
- **FR-018**: Une clé inconnue ou inactive MUST être refusée avec un message clair, sans
  perdre la réduction précédemment appliquée.
- **FR-019**: Quand le devis indique que la remise n'est pas appliquée faute d'atteindre le
  minimum, l'interface MUST l'afficher clairement avec le montant manquant, MUST garder la
  réduction sélectionnée, et MUST ne pas bloquer la commande.
- **FR-020**: Si la réduction expire entre le devis et la validation, la commande MUST ne pas
  être créée ; le client MUST en être informé et le récapitulatif MUST être rechiffré sans
  réduction avant une nouvelle validation explicite.
- **FR-021**: Pour un visiteur, le bloc réduction MUST inviter à se connecter, les montants
  dépendant du panier du compte.

**Mes commandes**

- **FR-022**: « Mes commandes » MUST lister les commandes de l'utilisateur, plus récentes
  d'abord, paginées, avec date, statut, nombre d'articles et total ; un filtre multi-statut
  MUST être reflété dans l'adresse de la page.
- **FR-023**: Le détail d'une commande MUST afficher produits, quantités, prix unitaires,
  adresse, statut, et la décomposition du total (sous-total, remise et clé de campagne, frais
  de port, type et transporteur) ; quand ce détail est absent (commande ancienne), seul le
  total MUST être affiché.
- **FR-024**: Le détail MUST montrer une frise du cycle de vie de la commande, l'étape
  courante étant signalée visuellement et aux lecteurs d'écran ; les issues Annulée,
  Remboursée, Retournée et Paiement refusé MUST être présentées comme des issues, pas comme
  des étapes de la frise normale.
- **FR-025**: Une commande non expédiée MUST pouvoir être modifiée : quantités, retrait de
  lignes (au moins une ligne MUST rester ; vider la commande passe par l'annulation), ajout de
  produits trouvés par une recherche dans le catalogue depuis la commande (un produit déjà
  présent voit sa quantité augmentée), adresse, livraison et moyen de paiement ; l'interface MUST préciser que la réduction d'origine est
  conservée ; après enregistrement, l'ancien et le nouveau total MUST être affichés (tous deux
  renvoyés par le backend), avec le montant remboursé s'il a augmenté, ou la mention qu'un
  complément est débité sur le moyen de paiement si le total a augmenté, sans que le front
  calcule ce complément ; un complément refusé
  MUST être expliqué.
- **FR-026**: Une commande annulable MUST pouvoir être annulée après confirmation ; les refus
  (déjà expédiée, non annulable, remboursement échoué) MUST être expliqués et le statut MUST
  être rafraîchi.
- **FR-027**: Les actions « Modifier » et « Annuler » MUST n'être proposées que pour les
  statuts qui les permettent, le backend restant seul juge.

**Profil**

- **FR-028**: « Mon profil » MUST afficher prénom, nom, email, nom d'utilisateur et adresse, et
  permettre de modifier prénom, nom (2 à 50 caractères), téléphone, rue, code postal, ville et
  pays, avec validation champ par champ avant envoi.
- **FR-029**: L'email et le mot de passe MUST ne pas être modifiables ; un lien MUST mener à
  la console de compte pour le mot de passe. Aucune suppression de compte ne MUST être
  simulée.
- **FR-030**: L'adresse du profil MUST être découpée en rue, code postal, ville et pays pour
  préremplir les formulaires ; un découpage incertain MUST laisser les champs concernés vides
  plutôt que de deviner.

**Carte enregistrée**

- **FR-031**: « Ma carte » MUST afficher la carte enregistrée masquée (titulaire, 4 derniers
  chiffres, expiration, réseau) et permettre de modifier titulaire et expiration (mois et
  année, non passée) ou de supprimer la carte après confirmation.
- **FR-032**: Le site MUST ne jamais proposer de saisir un numéro de carte ; l'état « aucune
  carte » MUST l'expliquer simplement.

**Interface vivante**

- **FR-033**: Chaque page de la feature MUST avoir une apparition orchestrée et utile
  (étapes du tunnel, montants qui se mettent à jour, frise de la commande), avec une version
  statique quand les effets sont réduits ou désactivés.
- **FR-034**: Toute mise à jour de montant, de statut ou d'erreur MUST être annoncée aux
  lecteurs d'écran.

### Key Entities

- **Profil** : prénom, nom, email, nom d'utilisateur, adresse (rue, code postal, ville,
  pays), téléphone (modifiable, jamais relu).
- **Option de livraison** : transporteur, type, prix réel, devise, délai indicatif (front).
- **Campagne de réduction** : clé, nature (pourcentage, montant fixe, un acheté un offert),
  valeur, minimum de commande, plafond, dates de validité.
- **Devis** : sous-total, réduction demandée, remise appliquée ou non, montant de la remise,
  minimum de commande, frais de port, total, devise ; lié à un choix (type, transporteur,
  réduction) et à l'état du panier.
- **Commande** : identifiant, date, statut, lignes (produit, quantité, prix unitaire, total),
  adresse de livraison, type et transporteur, moyen de paiement, sous-total, remise et sa clé,
  frais de port, total, montant remboursé, devise.
- **Statut de commande** : Créée, En attente de paiement, Payée, Paiement refusé, En
  préparation, Expédiée, Livrée, Annulée, Remboursée, Retournée.
- **Carte enregistrée** : titulaire, numéro masqué, expiration (mois/année), réseau ; une
  au plus par utilisateur.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un client connecté au profil complet passe commande depuis le panier en 6
  interactions au plus (« Passer commande », 3 étapes validées, « Valider », lecture de la
  confirmation).
- **SC-002**: Dans 100 % des commandes de test, le total du récapitulatif est égal au total
  de la commande créée, remise et frais de port compris.
- **SC-003**: Après un changement de livraison ou de réduction, les nouveaux montants
  s'affichent en moins d'une seconde dans les conditions locales.
- **SC-004**: 100 % des cas « minimum de commande non atteint » affichent le montant manquant.
- **SC-005**: L'issue du paiement (payée ou refusée) est affichée sans action du client dans
  95 % des cas en moins de 15 secondes.
- **SC-006**: Le détail de 100 % des commandes s'affiche sans valeur vide ni zéro trompeur,
  qu'elles aient ou non la décomposition du total.
- **SC-007**: Aucune violation d'accessibilité détectée par l'audit automatique sur le
  panier, chaque étape du tunnel, la confirmation, « Mes commandes », le détail, le profil et
  la carte ; tout le parcours de commande est utilisable au clavier seul.
- **SC-008**: Aucun numéro de carte complet n'est jamais saisi, affiché ni transmis par le
  site.
- **SC-009**: Budgets de performance du lot 1 tenus sur le panier, le tunnel et « Mes
  commandes ».

## Assumptions

- La cible reste le navigateur de bureau (constitution IX).
- Le paiement reste simulé côté serveur : le moyen de paiement choisi est enregistré sur la
  commande sans formulaire de paiement réel ; l'interface le dit.
- Les délais de livraison seront des valeurs fixes fournies par le backend (configuration),
  sans calcul ni jours fériés ; tant qu'ils ne sont pas livrés, les délais indicatifs du front,
  déjà utilisés par la fiche produit, prennent le relais.
- La réduction choisie sur le panier est conservée le temps de la session de navigation
  (onglet), pas dans le compte.
- L'adresse du profil, renvoyée en une ligne « rue, code postal ville, pays », est découpée par
  le front ; une adresse qui ne suit pas ce format laisse les champs à saisir.
- Le téléphone n'étant jamais renvoyé par le backend, il ne peut pas être affiché ni
  prérempli.
- La modification d'une commande reprend les choix actuels de la commande comme point de
  départ ; ses montants ne sont pas prévisualisés (aucun devis pour une commande existante)
  et sont affichés après enregistrement.
- Une commande ancienne sans décomposition du total l'obtient à sa première modification ;
  le détail affiche alors la décomposition complète.
- Le devis ne vérifie pas le stock : un stock insuffisant n'est détecté qu'à la validation
  (FR-015).
- La page de confirmation interroge le statut pendant une durée bornée (de l'ordre d'une
  minute) puis renvoie vers le détail de la commande.
- La barre de navigation de la feature 002 accueille l'entrée « Mon compte » sans changer
  d'ordre ni de présentation.

## Dépendances backend

- **Adresse structurée et téléphone dans le profil** (recommandée, non bloquante) : le profil
  renvoie l'adresse en une ligne et jamais le téléphone (`docs/backend/api-map.md` §E 14) ;
  contournement : découpage par le front, téléphone non relu.
- **Délais de livraison et retrait en magasin** (non bloquante) : demandés
  (`docs/backend/backend-prompts-lot2.md` §9) : délais fixes de configuration, sans calcul ;
  retrait en magasin purement esthétique. Délais indicatifs du front en attendant.
- **Devis pour la modification d'une commande** (non bloquante) : aucun moyen de chiffrer une
  modification avant de l'enregistrer.
- **Suppression de compte** et **suivi de livraison** : absents (`api-map.md` §F), hors
  périmètre.
- **Paiement réel côté client** : absent (§F), hors périmètre.

## Hors périmètre

- Ajout d'une carte bancaire depuis le site (saisie de numéro interdite, constitution V).
- Retrait en magasin effectif (l'option n'est qu'affichée, grisée), suivi de colis, factures téléchargeables.
- Suppression de compte, modification de l'email ou du mot de passe dans le site.
- Paiement réel (formulaire de carte, 3-D Secure).
- Commande sans compte (le panier invité reste fusionné à la connexion).
- Administration des commandes et des campagnes (feature 005).
- Navigation mobile.
