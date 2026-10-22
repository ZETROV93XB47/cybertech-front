# Feature Specification: Notifications Web Push

**Feature Branch**: `005-web-push-notifications` (pas de branche git : le repo travaille sur `main`)

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Notifications du navigateur quand le paiement d'une commande est confirmé et quand la commande est expédiée, activables après une commande et depuis le profil, en s'appuyant sur le Web Push déjà livré par le backend (`front-spec/prompt-web-push-front.md`, `docs/web-push.md` du backend)."

## Contexte

- Le backend envoie déjà, pour deux événements d'une commande (**paiement confirmé**,
  **commande remise au transporteur**), une notification à **chaque navigateur abonné** du
  client, en plus de l'email ou du SMS qu'il a choisi (commits backend `839f18c`, `069cf3a`).
  Le push n'est pas un canal au choix : depuis le commit front `1b39592`, l'inscription ne
  propose plus que l'email et le SMS.
- Le backend expose la clé publique du serveur de notifications (sans authentification), et
  permet à un client connecté d'enregistrer ou de supprimer l'abonnement d'un navigateur.
  Un même appareil renvoyé deux fois met à jour l'abonnement existant ; un compte garde au plus
  cinq navigateurs, le sixième remplaçant le plus ancien sans erreur ; un appareil déjà lié à
  un autre compte est refusé ; un abonnement déjà supprimé ou remplacé est signalé comme
  introuvable.
- Le message reçu contient un titre, un texte générique (jamais de prix ni de détail de
  paiement), l'identifiant de la commande et le chemin de sa page (`/account/orders/{uuid}`,
  la page de suivi de commande livrée par la feature 003).
- Le front ne fait rien de tout cela aujourd'hui : aucun navigateur n'est abonné, donc aucune
  notification n'est reçue. En local, l'utilisateur a généré et configuré les clés du serveur
  de notifications dans le backend (2026-10-22).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Être prévenu de l'avancement d'une commande (Priority: P1)

En tant que client qui vient de passer commande, je veux pouvoir activer, d'un clic sur la
page de confirmation, les notifications de mon navigateur, pour être prévenu quand mon paiement
est confirmé et quand ma commande est expédiée, même si l'onglet du site est fermé, et
retrouver ma commande en cliquant sur la notification.

**Why this priority**: c'est la seule raison d'être de la feature : sans abonnement, le
backend n'a aucun navigateur à prévenir. La page de confirmation est le moment où le client a
une raison concrète de vouloir être prévenu.

**Independent Test**: se connecter, passer une commande, cliquer sur « Activer les
notifications » sur la page de confirmation, accepter la demande du navigateur, payer la
commande de test : une notification « Paiement confirmé » s'affiche ; un clic dessus ouvre la
page de la commande.

**Acceptance Scenarios**:

1. **Given** un client connecté sur la page de confirmation de sa commande, dans un navigateur
   qui sait recevoir des notifications et qui ne les a ni accordées ni refusées, **When** la
   page s'affiche, **Then** une invitation « Sois prévenu quand ta commande est expédiée » et
   un bouton « Activer les notifications » sont visibles, et le navigateur n'affiche **aucune**
   demande d'autorisation tant que le client n'a pas cliqué.
2. **Given** cette invitation, **When** le client clique sur le bouton puis accepte la demande
   du navigateur, **Then** le navigateur est abonné à son compte et l'invitation devient une
   confirmation (« Notifications activées »).
3. **Given** un navigateur abonné, **When** le paiement d'une commande du client est confirmé,
   **Then** une notification du système apparaît avec le titre et le texte reçus, même si
   aucun onglet du site n'est ouvert.
4. **Given** deux messages pour la même commande (paiement confirmé puis commande expédiée),
   **When** le second arrive, **Then** il remplace la notification précédente de cette commande
   au lieu de s'y empiler.
5. **Given** une notification affichée, **When** le client clique dessus, **Then** elle se
   ferme et la page de la commande s'ouvre : dans un onglet du site déjà ouvert, mis au premier
   plan, sinon dans un nouvel onglet.
6. **Given** un message reçu illisible ou incomplet, ou dont le chemin désigne un autre site
   ou une adresse absolue, **When** il arrive ou qu'on clique dessus, **Then** rien n'est
   affiché pour un message illisible, et aucune page extérieure au site n'est jamais ouverte.
7. **Given** un navigateur abonné ou ayant refusé, **When** le client revient sur une page de
   confirmation, **Then** il voit l'état actuel (activées, ou refusées avec la marche à suivre)
   au lieu du bouton d'activation.

---

### User Story 2 - Gérer les notifications depuis mon profil (Priority: P2)

En tant que client connecté, je veux un interrupteur « Notifications du navigateur » dans mon
profil pour les activer ou les couper sur ce navigateur à tout moment, et comprendre pourquoi
elles ne peuvent pas être activées quand c'est le cas.

**Why this priority**: le client doit pouvoir revenir sur son choix sans fouiller dans les
réglages du navigateur, et savoir quoi faire quand l'activation échoue.

**Independent Test**: depuis le profil, activer l'interrupteur (abonnement enregistré), le
couper (abonnement supprimé côté serveur et dans le navigateur), puis simuler chaque refus
(autorisation refusée, service indisponible, appareil lié à un autre compte) et vérifier le
message affiché.

**Acceptance Scenarios**:

1. **Given** le profil d'un client sur un navigateur non abonné, **When** il active
   l'interrupteur et accepte la demande du navigateur, **Then** le navigateur est abonné et
   l'interrupteur reste activé.
2. **Given** un navigateur abonné, **When** le client coupe l'interrupteur, **Then**
   l'abonnement est supprimé côté serveur puis dans le navigateur, et plus aucune notification
   n'arrive sur ce navigateur ; un abonnement déjà supprimé ou remplacé côté serveur compte
   comme une désactivation réussie.
3. **Given** un client qui refuse la demande du navigateur, ou un navigateur où les
   notifications du site sont bloquées, **When** l'état s'affiche, **Then** le site explique
   comment les réautoriser dans les réglages du navigateur et ne redemande jamais
   l'autorisation de lui-même.
4. **Given** le service de notifications indisponible côté serveur, **When** le client tente
   d'activer, **Then** un message indique que les notifications sont momentanément
   indisponibles et que rien n'a changé ; le reste du site fonctionne normalement.
5. **Given** un navigateur déjà lié au compte d'une autre personne, **When** le client tente
   d'activer, **Then** un message l'explique et propose de réactiver les notifications pour son
   compte sur ce navigateur ; s'il accepte, le navigateur est désabonné puis réabonné à son
   compte.
6. **Given** un navigateur qui ne sait pas recevoir de notifications, **When** le profil ou la
   page de confirmation s'affiche, **Then** l'interrupteur et l'invitation sont absents, sans
   message d'erreur ; un navigateur qui ne les reçoit que dans une application installée (iPhone,
   iPad) affiche à la place une courte explication.

---

### User Story 3 - Un abonnement toujours juste (Priority: P3)

En tant que client, je veux que les notifications continuent d'arriver sans rien refaire quand
mon navigateur renouvelle son abonnement ou que le serveur change de clé, et qu'elles cessent
sur ce navigateur quand je me déconnecte, pour qu'une autre personne qui se connecte ensuite ne
reçoive pas les miennes.

**Why this priority**: sans cela, l'abonnement se dégrade en silence (plus de notifications)
ou fuit d'un compte à l'autre sur un navigateur partagé ; la feature reste utilisable sans,
mais moins fiable.

**Independent Test**: avec un navigateur abonné, se déconnecter puis vérifier que l'abonnement
a été supprimé côté serveur ; se reconnecter avec l'autorisation déjà accordée et vérifier que
l'abonnement est renvoyé sans clic ; changer la clé du serveur et vérifier que le navigateur se
réabonne.

**Acceptance Scenarios**:

1. **Given** un client connecté dont le navigateur a déjà accordé l'autorisation, **When** il
   ouvre le site, **Then** l'abonnement courant du navigateur est renvoyé au serveur sans aucune
   action de sa part (une seule fois par session), ce qui corrige un appareil dont l'adresse a
   changé.
2. **Given** un abonnement créé avec une ancienne clé du serveur, **When** le site détecte que
   la clé a changé, **Then** le navigateur se désabonne puis se réabonne avec la nouvelle clé,
   sans redemander l'autorisation.
3. **Given** un navigateur qui renouvelle de lui-même son abonnement, **When** cela arrive,
   **Then** il se réabonne avec la même clé et, dès qu'une page du site est ouverte avec une
   session, le nouvel abonnement est envoyé au serveur.
4. **Given** un navigateur abonné, **When** le client se déconnecte, **Then** l'abonnement de
   ce navigateur est supprimé côté serveur avant la fermeture de la session ; si cette
   suppression échoue, la déconnexion se fait quand même.
5. **Given** un visiteur non connecté, **When** il navigue, **Then** aucun abonnement n'est
   envoyé ni demandé.

---

### Edge Cases

- Le paiement est confirmé avant que le client clique sur « Activer les notifications » : la
  notification de paiement de cette commande n'arrive pas (rien n'est rattrapé), celle de
  l'expédition arrivera ; le texte de l'invitation parle donc de l'expédition.
- Le client ferme la demande du navigateur sans répondre : l'état reste « à activer », le
  bouton reste proposé, aucun message d'erreur.
- Le client active depuis deux onglets en même temps : le serveur traite le même appareil comme
  une mise à jour ; l'état final est « activées » dans les deux.
- Un sixième navigateur est abonné au compte : le plus ancien cesse de recevoir les
  notifications, sans erreur ni message.
- Le client a coupé les notifications dans les réglages du navigateur après les avoir activées
  sur le site : le site affiche l'état « refusées » et la marche à suivre ; la resynchronisation
  ne renvoie rien.
- Le souvenir local de l'abonnement est perdu (données du site effacées) : la désactivation et
  la déconnexion ne peuvent pas supprimer l'abonnement côté serveur ; le navigateur est quand
  même désabonné localement, et le serveur supprime l'abonnement expiré à son prochain envoi.
- La session expire pendant l'activation : l'activation échoue avec le message de session
  expirée habituel, sans abonnement à moitié créé côté navigateur.
- Le site est servi en HTTP sur une autre adresse que la machine locale : le navigateur refuse
  les notifications ; c'est le cas « non supporté ».
- Un message arrive alors qu'un onglet du site est ouvert et au premier plan : la notification
  du système s'affiche quand même (même comportement partout).

## Requirements *(mandatory)*

### Functional Requirements

**Activation et autorisation**

- **FR-001**: Le site MUST demander l'autorisation des notifications uniquement à la suite
  d'un clic explicite du client (« Activer les notifications » ou interrupteur du profil),
  jamais au chargement d'une page ni de lui-même.
- **FR-002**: L'activation MUST : obtenir l'autorisation du navigateur, récupérer la clé
  publique du serveur, abonner le navigateur avec cette clé, envoyer l'abonnement au serveur
  pour le compte du client, et conserver localement l'identifiant d'abonnement renvoyé (sous
  une clé de stockage versionnée) pour pouvoir le supprimer plus tard.
- **FR-003**: Une activation qui échoue après l'abonnement du navigateur MUST désabonner le
  navigateur, pour ne pas laisser un abonnement que le serveur ne connaît pas.
- **FR-004**: Les points d'activation MUST être : un encart sur la page de confirmation de
  commande (« Sois prévenu quand ta commande est expédiée ») et un interrupteur
  « Notifications du navigateur » dans le profil ; ils ne sont proposés qu'à un client connecté.

**États affichés**

- **FR-005**: Chaque point d'activation MUST afficher l'un des états suivants, avec un texte
  en français (tutoiement) : non supporté (rien n'est affiché), application à installer
  (iPhone, iPad : explication courte), à activer, activation en cours, activées, refusées
  (marche à suivre pour les réautoriser dans le navigateur, sans bouton qui redemande),
  service indisponible, appareil lié à un autre compte (avec proposition de réactiver ici),
  erreur inattendue.
- **FR-006**: Une réponse du serveur « appareil lié à un autre compte » MUST proposer de
  réactiver ici ; l'acceptation désabonne le navigateur puis le réabonne (nouvel appareil
  pour le serveur) au compte du client.
- **FR-007**: Les changements d'état (activation réussie, échec) MUST être annoncés aux
  technologies d'assistance, et l'interrupteur MUST être utilisable au clavier avec un nom
  accessible.

**Désactivation et déconnexion**

- **FR-008**: La désactivation MUST supprimer l'abonnement côté serveur avec l'identifiant
  conservé, puis désabonner le navigateur et oublier l'identifiant ; un abonnement
  introuvable côté serveur compte comme un succès.
- **FR-009**: La déconnexion (y compris « se déconnecter partout ») MUST tenter de supprimer
  l'abonnement de ce navigateur côté serveur avant de fermer la session, puis désabonner le
  navigateur ; un échec de cette étape MUST NOT bloquer ni retarder de façon visible la
  déconnexion (délai borné).

**Synchronisation**

- **FR-010**: Pour un client connecté dont le navigateur a déjà accordé l'autorisation, le site
  MUST renvoyer au serveur l'abonnement courant du navigateur au démarrage, au plus une fois par
  session et sans aucune demande d'autorisation.
- **FR-011**: Si la clé publique du serveur ne correspond plus à celle de l'abonnement du
  navigateur, le site MUST désabonner puis réabonner le navigateur avec la nouvelle clé et
  envoyer le nouvel abonnement.
- **FR-012**: Quand le navigateur renouvelle l'abonnement de lui-même, le réabonnement MUST se
  faire avec la même clé, et les pages ouvertes du site MUST en être prévenues pour envoyer le
  nouvel abonnement au serveur (le code d'arrière-plan n'a pas la session du client).

**Réception et clic**

- **FR-013**: À la réception d'un message, le navigateur MUST afficher une notification avec le
  titre et le texte reçus et les icônes du site (hébergées par le site, aucune adresse
  extérieure), regroupée par commande pour qu'un nouveau message de la même commande remplace
  le précédent ; un message illisible ou incomplet MUST être ignoré sans rien afficher.
- **FR-014**: Au clic, la notification MUST se fermer et ouvrir le chemin reçu **seulement**
  s'il s'agit d'un chemin relatif du site (une adresse absolue, d'un autre site ou d'un autre
  protocole MUST être refusée) ; un onglet du site déjà ouvert MUST être mis au premier plan
  et dirigé vers ce chemin, sinon un nouvel onglet est ouvert.

**Échanges avec le serveur, sécurité, observabilité**

- **FR-015**: Le navigateur MUST NOT appeler le backend directement : la clé publique,
  l'enregistrement et la suppression d'un abonnement passent par le serveur du site, qui
  ajoute la session du client, valide les données envoyées et traduit les erreurs du backend en
  codes stables (constitution III).
- **FR-016**: L'adresse d'abonnement d'un appareil et ses clés MUST NOT apparaître en clair
  dans les journaux ; chaque appel au backend est journalisé selon la règle commune (méthode,
  route, statut, durée, identifiant de requête, code d'erreur) avec l'identifiant
  d'abonnement masqué.
- **FR-017**: La politique de sécurité du contenu MUST autoriser le code d'arrière-plan du site
  (même origine uniquement), et ce code MUST être servi sans mise en cache durable, avec une
  portée couvrant tout le site, pour qu'une nouvelle version soit prise rapidement.
- **FR-018**: Le texte affiché par le site autour des notifications MUST rester générique : il
  ne reprend ni montant ni détail de paiement.

**Documentation**

- **FR-019**: Le README MUST indiquer que les notifications exigent HTTPS, sauf sur la machine
  locale, et comment configurer les clés du serveur de notifications en local ; la procédure de
  validation manuelle (voir Success Criteria) MUST être décrite dans la feature.

### Key Entities

- **Abonnement du navigateur**: lien entre un navigateur et un compte client, créé par
  l'activation ; connu du serveur par un identifiant, conservé localement par le navigateur
  pour pouvoir le supprimer ; un compte en a au plus cinq.
- **Message de notification**: titre, texte générique, identifiant de commande, chemin de la
  page de la commande ; produit par le backend, affiché par le navigateur.
- **État des notifications**: situation affichée au client sur ce navigateur (voir FR-005),
  déduite du support du navigateur, de l'autorisation accordée, de l'abonnement local et de la
  dernière réponse du serveur.
- **Clé publique du serveur**: identifie le serveur qui envoie les notifications ; un
  changement de clé impose un réabonnement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Après une commande, un client active les notifications en au plus 2 actions (un
  clic sur le site, une acceptation dans le navigateur).
- **SC-002**: Sur un navigateur abonné, la notification « Paiement confirmé » d'une commande de
  test apparaît en moins de 30 secondes après la confirmation du paiement, et un clic dessus
  ouvre la page de cette commande dans 100 % des essais.
- **SC-003**: Aucune demande d'autorisation n'apparaît au chargement d'une page, sur
  l'ensemble des parcours testés (0 demande non sollicitée).
- **SC-004**: Après une déconnexion, le navigateur ne reçoit plus aucune notification du compte
  qui s'est déconnecté (0 notification reçue lors d'une commande payée ensuite sur ce compte).
- **SC-005**: Dans chacun des états de FR-005, le client voit un message qui dit quoi faire ou
  pourquoi rien n'est possible ; aucun bouton proposé ne reste sans effet.
- **SC-006**: Aucune adresse d'abonnement d'appareil n'est lisible en clair dans les journaux
  du site (0 occurrence lors des tests).
- **SC-007**: Une indisponibilité du service de notifications ou un échec de suppression
  d'abonnement n'empêche ni de commander, ni de consulter le profil, ni de se déconnecter.

### Validation manuelle

1. Clés du serveur de notifications configurées dans le backend local (fait par l'utilisateur
   le 2026-10-22 avec `npx web-push generate-vapid-keys`), backend relancé ; la clé publique
   est bien renvoyée par le serveur du site.
2. Dans Chrome, sur `http://localhost:3000`, se connecter, passer une commande et activer les
   notifications depuis la page de confirmation.
3. Payer la commande de test avec la Stripe CLI (déclenchement de l'événement de paiement) ;
   vérifier que la notification « Paiement confirmé » s'affiche, puis que le clic ouvre
   `/account/orders/{uuid}` de cette commande.
4. Couper l'interrupteur du profil, repayer une commande : aucune notification.
5. Réactiver, se déconnecter, payer une commande du même compte par un autre moyen : aucune
   notification sur ce navigateur.

## Assumptions

- La cible reste le navigateur de bureau (constitution X) : Chrome, Edge, Firefox et Safari
  récents savent recevoir des notifications sur ordinateur. Le cas iPhone/iPad (notifications
  réservées aux applications installées) se limite à une explication, sans parcours
  d'installation.
- Le site tourne en local sur `localhost`, que les navigateurs traitent comme sécurisé : aucun
  certificat n'est nécessaire pour cette feature.
- Le contrat backend est celui de `docs/web-push.md` et de l'OpenAPI du backend au 2026-10-22 ;
  le backend reste en lecture seule. Le texte des notifications est produit par le backend et
  n'est pas traduit ni réécrit par le front.
- Un seul abonnement par navigateur et par profil de navigateur ; l'abonnement suit le compte
  connecté, pas l'appareil physique.
- Les messages d'autres événements (commande annulée, remboursée…) ne sont pas envoyés par le
  backend aujourd'hui et sont hors périmètre ; un message de forme valide pour un autre
  événement serait affiché de la même façon.
- L'identifiant d'abonnement conservé localement n'est pas une donnée sensible (il ne donne
  aucun droit sans la session du client) ; l'adresse d'abonnement, elle, n'est jamais stockée
  par le site en dehors du navigateur.
- Les tests automatisés de bout en bout simulent l'autorisation et interceptent l'envoi de
  l'abonnement, un vrai service de notifications n'étant pas joignable de façon fiable depuis
  les tests ; la réception réelle est couverte par la validation manuelle.
- Hors périmètre : le correctif du formulaire d'inscription (déjà livré, `1b39592`), une page
  listant les navigateurs abonnés du compte, le choix des événements notifiés.
