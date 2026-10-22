# Research: Notifications Web Push

Décisions de la Phase 0. Chaque entrée : Décision, Justification, Alternatives écartées.
Sources : spec, constitution v3.0.0, backend `docs/web-push.md`, `front-spec/prompt-web-push-front.md`,
`lib/api/schema.d.ts` (types déjà générés : `PushSubscriptionRequestDto`,
`PushSubscriptionResponseDto`, `PushPublicKeyResponseDto`).

## R1. Service Worker sans bundler : `public/sw.js` + `public/sw-core.js`

**Décision** : le Service Worker est un script classique servi depuis `public/` :
- `public/sw-core.js` : fonctions pures (validation du message, contrôle du chemin de clic,
  choix « focus d'un onglet ou ouverture », comparaison de clés), en JavaScript avec
  `// @ts-check` et JSDoc, attachées à `self.ctPushCore` ;
- `public/sw.js` : `importScripts("/sw-core.js")` puis les écouteurs `push`,
  `notificationclick`, `pushsubscriptionchange`, `install` (`skipWaiting`) et `activate`
  (`clients.claim`).

Les tests Vitest chargent le **fichier servi** dans un contexte `node:vm` avec un faux `self`,
et testent les fonctions de `ctPushCore` ; les écouteurs sont testés en les déclenchant avec de
faux événements (`waitUntil`, `showNotification`, `clients.matchAll`).

**Justification** : le prompt demande « JavaScript simple, sans bundler » ; Next.js 16 ne compile
pas de Service Worker. `importScripts` marche dans tous les navigateurs desktop, contrairement aux
Service Workers en module (`type: "module"`), arrivés tard dans Firefox. Tester le fichier servi,
et non une copie TypeScript, évite que le test et le code réel divergent.

**Alternatives écartées** : un SW écrit en TypeScript et compilé par un script maison (outillage
de build en plus, contraire à « sans bundler ») ; `next-pwa` / Serwist (cache hors ligne et
précache inutiles ici, dépendance lourde) ; un Route Handler qui génère le script (le SW
dépendrait du runtime Next, en-têtes plus fragiles).

**Conséquences** : `public/**/*.js` reçoit un bloc ESLint dédié (globales `serviceworker`, règles
`js.configs.recommended`, `no-magic-numbers` avec constantes nommées en tête de fichier, sans les
règles typées TypeScript) ; `tsconfig` reste `allowJs: false` (le `// @ts-check` sert l'éditeur).
Les constantes du SW (nom du type de message, préfixe de tag, chemins des icônes) sont dupliquées
dans `lib/constants/push.ts` pour le code TypeScript ; un test vérifie que les deux copies sont
égales.

## R2. Enregistrement du SW : paresseux, réservé au client connecté

**Décision** : `navigator.serviceWorker.register("/sw.js", { scope: "/" })` est appelé
seulement (a) au clic d'activation, (b) au démarrage d'une session quand un abonnement est
mémorisé localement (R6). Jamais pour un visiteur anonyme, jamais au chargement par défaut.

**Justification** : aucun coût pour les visiteurs, aucun SW installé « au cas où » ; le SW ne
fait rien d'autre que les notifications (pas de cache), donc l'installer plus tôt n'apporte rien.

**Alternatives écartées** : enregistrement global dans `Providers` (installe un SW chez tous les
visiteurs pour rien).

## R3. Détection du support et des états

**Décision** : une fonction pure `detectPushSupport(env)` renvoie un `PushSupport` :
`SUPPORTED` si `"serviceWorker" in navigator && "PushManager" in window && "Notification" in window`
et contexte sécurisé ; `INSTALL_REQUIRED` si l'appareil est un iPhone/iPad (agent utilisateur
iOS, ou `MacIntel` avec écran tactile) hors mode application installée
(`display-mode: standalone` / `navigator.standalone`) ; sinon `UNSUPPORTED`. L'état affiché
(`PushState`, data-model §1) combine ce support, `Notification.permission`, l'abonnement mémorisé
et la dernière réponse du BFF.

**Justification** : FR-005 ; Safari macOS 16+ expose `PushManager` normalement, donc seul
iOS/iPadOS a besoin du cas « application à installer » (cible desktop : explication seule).

**Alternatives écartées** : détection par nom de navigateur (fragile) ; tenter `subscribe` pour
voir (provoquerait une demande d'autorisation non sollicitée).

## R4. Activation : séquence et annulation

**Décision** : au clic, `Notification.requestPermission()` **en premier** (dans le geste de
l'utilisateur, exigé par Safari et Firefox), puis `register` + `navigator.serviceWorker.ready`,
`GET /api/notifications/push/public-key`, `pushManager.subscribe({ userVisibleOnly: true,
applicationServerKey })` avec la clé décodée en `Uint8Array` (`base64UrlToBytes`), `POST`
de `subscription.toJSON()` au BFF, mémorisation de l'`uuid` (R6). Si le `POST` échoue, la
souscription du navigateur est annulée (`unsubscribe`, FR-003). Permission `default` après la
demande (fenêtre fermée) → retour à `IDLE` sans message ; `denied` → `DENIED`.

**Justification** : demander la permission après des `await` réseau ferait perdre le geste de
l'utilisateur (la demande serait bloquée ou ignorée).

**Alternatives écartées** : lire la clé publique au rendu serveur et la passer en prop (couplerait
la page de confirmation et le profil au service push ; une panne 503 casserait leur rendu).

## R5. Conflit 409 : « réactiver ici »

**Décision** : sur `conflict`, l'état `CONFLICT` propose « Activer pour mon compte ». Au clic :
`subscription.unsubscribe()` puis nouvelle souscription (le navigateur reçoit une nouvelle
adresse), `POST`. L'ancienne adresse reste liée à l'autre compte côté backend mais est morte :
le backend la supprimera à son prochain envoi (404/410 du service de push).

**Justification** : le backend refuse de transférer un appareil d'un compte à l'autre (409) ; une
nouvelle souscription est le seul moyen front de « réactiver ici ».

## R6. Mémoire locale : `localStorage` `ct_push_v1`, drapeau `sessionStorage` `ct_push_sync_v1`

**Décision** : `StorageKey.PUSH = "ct_push_v1"` (`localStorage`) contient
`{ subscriptionUuid }`, validé par Zod à chaque lecture (`PushRecordSchema`) ; jamais
l'adresse ni les clés de l'abonnement (elles restent dans le navigateur, gérées par lui).
`StorageKey.PUSH_SYNC = "ct_push_sync_v1"` (`sessionStorage`) marque la resynchronisation déjà
faite pour l'onglet (FR-010 « une fois par session »).

La **présence** de `ct_push_v1` est la preuve qu'un client a activé les notifications sur ce
navigateur : la resynchronisation (R7) n'a lieu que si elle existe. La déconnexion l'efface
(R8). Ainsi une autre personne qui se connecte ensuite n'est jamais abonnée sans son clic, même
si le navigateur a gardé la permission accordée.

**Justification** : constitution IV (seules des données non sensibles côté navigateur ; l'UUID
d'abonnement ne donne aucun droit sans session) ; constitution XII (clé versionnée dans l'enum
`StorageKey`).

**Alternatives écartées** : ne rien mémoriser et relire l'UUID au backend (aucun endpoint de
liste) ; mémoriser le `sub` du compte (donnée personnelle inutile : le 409 couvre le cas d'un
autre compte).

## R7. Resynchronisation au démarrage et changement de clé

**Décision** : un composant client `PushSync` (sans rendu) est monté dans `Providers` ; quand
`useSession()` passe à `authenticated`, que le support est `SUPPORTED`, que la permission est
`granted`, que `ct_push_v1` existe et que `ct_push_sync_v1` est absent : il obtient
l'enregistrement du SW, lit `pushManager.getSubscription()`, lit la clé publique, et :
- pas de souscription → nouvelle souscription silencieuse (permission déjà accordée) puis `POST` ;
- clé différente (`subscription.options.applicationServerKey` ≠ clé décodée, comparaison
  octet par octet, `sameKey` dans `sw-core.js`) → `unsubscribe`, nouvelle souscription, `POST` ;
- sinon `POST` de la souscription courante (idempotent : même adresse = même UUID).
Le nouvel UUID remplace l'ancien dans `ct_push_v1`. Tout échec est loggué (`clientLogger`) et
silencieux. `PushSync` écoute aussi les messages du SW (`PUSH_SUBSCRIPTION_CHANGED`, R9) et
relance la même séquence. Un 409 efface `ct_push_v1` (l'appareil appartient à un autre compte).

**Justification** : FR-010 à FR-012 ; une seule séquence pour les trois déclencheurs.

## R8. Déconnexion : UUID transmis à la Server Action, délai borné

**Décision** : le formulaire « Se déconnecter » (`AccountMenuPanel`) reçoit un champ caché
`pushSubscriptionUuid` rempli depuis `ct_push_v1` par un petit composant client. `onSubmit`
lance, sans attendre, `subscription.unsubscribe()` et efface `ct_push_v1` / `ct_push_sync_v1`.
`signOutEverywhere(formData)` valide l'UUID (Zod), appelle `deletePushSubscription` avec
`timeoutMs: PUSH_SIGN_OUT_TIMEOUT_MS` (2 000 ms) **avant** `signOut`, avale toute erreur
(`log.warn`), puis continue la déconnexion comme aujourd'hui.

**Justification** : FR-009 ; la suppression côté serveur a besoin du jeton, que seule la Server
Action possède, et doit précéder la fermeture de session ; le délai borné garantit que la
déconnexion n'attend pas un backend en panne (SC-007). Le formulaire fonctionne toujours sans
JavaScript (pas d'UUID → pas de suppression, et pas de SW sans JavaScript).

**Alternatives écartées** : `fetch` DELETE côté client puis soumission (deux allers-retours,
`preventDefault` et re-soumission fragile, perte du fonctionnement sans JS) ; suppression après
`signOut` (plus de jeton).

## R9. `pushsubscriptionchange`

**Décision** : le SW se réabonne avec `event.oldSubscription?.options.applicationServerKey`
(même clé), puis `postMessage({ type: PUSH_SUBSCRIPTION_CHANGED })` à toutes les fenêtres
(`clients.matchAll({ type: "window", includeUncontrolled: true })`). Sans clé disponible ou en
cas d'échec, il ne fait rien : la resynchronisation du prochain démarrage (R7) rattrape.

**Justification** : FR-012 ; le SW n'a ni session ni jeton, il ne peut pas appeler le BFF.

## R10. Réception et clic

**Décision** :
- `push` : `parsePushMessage(event.data)` exige `title`, `body`, `url` (chaînes non vides) et
  `orderUuid` (UUID) ; sinon rien n'est affiché. `showNotification(title, { body, icon, badge,
  tag: "order-" + orderUuid, renotify: true, data: { url } })`. `renotify` pour que le second
  message (expédition) se signale même s'il remplace le premier.
- `notificationclick` : `close()`, puis `safeNotificationPath(url, self.location.origin)` :
  accepte uniquement une chaîne qui commence par `/` mais pas par `//` ni `/\`, et dont la
  résolution `new URL(url, origin)` garde la même origine ; sinon **rien** n'est ouvert (pas
  même une page de repli). Puis
  `pickClientToFocus(clients)` choisit la première fenêtre de même origine : `focus()` +
  `navigate(path)` ; à défaut `clients.openWindow(path)`.

**Justification** : FR-013, FR-014 ; refuser toute URL absolue empêche d'utiliser une
notification pour ouvrir un site extérieur, même si le backend était compromis.

**Note Chrome** : un message reçu sans notification affichée est toléré quelques fois puis
Chrome affiche une notification générique (« Ce site a été mis à jour en arrière-plan ») : le
cas « message illisible » est rare (format backend stable) et accepté.

## R11. Icônes locales

**Décision** : `public/icons/notification-192.png` (logo couleur, 192 px) et
`public/icons/notification-badge-96.png` (silhouette monochrome blanche sur transparent, 96 px,
pour la barre Android/ChromeOS), générés une fois depuis un SVG du monogramme cybertech
(`public/icons/notification.svg`) avec `sharp` (déjà installé par Next.js) via un script
`scripts/generate-notification-icons.mjs` commité.

**Justification** : le prompt interdit les URL externes ; PNG requis (les SVG ne sont pas
acceptés comme icône de notification partout).

## R12. Routes BFF et journalisation

**Décision** : trois Route Handlers sous `app/api/notifications/push/` (contrats :
[contracts/bff-routes.md](./contracts/bff-routes.md)), appelant `lib/api/endpoints/push.ts`
(`getPushPublicKey`, `savePushSubscription`, `deletePushSubscription`). Le body du `POST` est
validé par `PushSubscriptionBodySchema` (Zod strict : `endpoint` URL `https:`, ≤ 2 048
caractères ; `expirationTime` nombre ou `null` ; `keys.p256dh` et `keys.auth` base64url non
vides) ; `expirationTime: null` n'est pas transmis (le DTO backend l'attend absent ou entier).
Un `404` au `DELETE` est rendu `204` par le BFF (déjà désabonné). Logs : `maskPushEndpoint`
(nouveau, `lib/log-safety.ts`) ne garde que l'hôte du service de push
(`fcm.googleapis.com/…`) ; l'UUID d'abonnement passe par `maskUuid` dans les logs métier.

Le chemin backend du `DELETE` contient l'UUID d'abonnement, loggué en clair par `backendFetch`
comme les UUID de commande aujourd'hui : il ne donne aucun droit sans jeton du propriétaire
(403 sinon) et n'identifie pas l'appareil ; l'adresse d'abonnement, elle, n'est jamais dans un
chemin ni un log (SC-006).

**Codes front** : déjà mappés dans `lib/api/errors.ts` (`PUSH_SERVICE_NOT_CONFIGURED` →
`unavailable`, `PUSH_SUBSCRIPTION_CONFLICT` → `conflict`, `INVALID_PUSH_ENDPOINT` → `invalid`,
`PUSH_SUBSCRIPTION_NOT_FOUND` → `not-found`, `PUSH_SUBSCRIPTION_NOT_OWNED` → `forbidden`) ; seul
le commentaire « not used yet » est retiré.

## R13. CSP et en-têtes

**Décision** :
- `buildCsp` ajoute `worker-src 'self'` (le SW est servi depuis la même origine ; sans cette
  directive, `script-src` avec nonce et `'strict-dynamic'` s'appliquerait et bloquerait
  l'enregistrement, le script du SW n'ayant pas de nonce).
- `next.config.ts` : pour `/sw.js` et `/sw-core.js`, `Cache-Control: no-cache` ;
  pour `/sw.js`, `Service-Worker-Allowed: /`.
- `Permissions-Policy` inchangée (les notifications n'y sont pas soumises).

**Justification** : FR-017 ; `no-cache` (revalidation à chaque chargement) fait prendre une
nouvelle version du SW au prochain passage ; `importScripts` est aussi revérifié par le
navigateur à chaque mise à jour.

## R14. Interface : encart de confirmation et interrupteur du profil

**Décision** :
- `features/notifications/components/PushOptIn.tsx` : encart `glass` sur la page de
  confirmation, sous le suivi du paiement ; un bouton `cta-gradient` « Activer les
  notifications » ; texte et bouton remplacés selon `PushState` ; rien n'est rendu en
  `UNSUPPORTED` ni avant l'hydratation (le support se lit côté client : pas de rendu serveur
  trompeur).
- `features/notifications/components/PushToggle.tsx` : section « Notifications du navigateur »
  du profil, `Switch` Radix existant (`components/ui/switch.tsx`), libellé associé, texte d'état
  sous l'interrupteur ; désactivé pendant `PENDING`.
- Un même hook `usePushNotifications()` (état + `enable`, `disable`, `reclaim`) sert les deux,
  adossé à un petit store externe (`useSyncExternalStore`) pour que `PushSync`, l'encart et
  l'interrupteur voient le même état dans l'onglet.
- Annonces : région `aria-live="polite"` dans chaque composant (FR-007).
- Textes dans `features/notifications/messages.ts` (tutoiement) ; marche à suivre « refusées »
  générique : « clique sur le cadenas à gauche de l'adresse, puis autorise les notifications ».

**Justification** : réutilise les composants existants (Switch, surfaces `glass`, boutons) et
les tokens de thème (constitution XIII) ; aucun effet visuel nouveau.

## R15. Tests

**Décision** :
- Vitest : `sw-core.js` et `sw.js` chargés dans `node:vm` (R1) ; routes BFF avec MSW (succès,
  `404 → 204`, `409`, `503`, body invalide, aucune adresse dans les logs : logger espionné) ;
  `push-support.ts`, `push-record.ts`, `base64UrlToBytes` ; `usePushNotifications` avec faux
  `Notification`, `navigator.serviceWorker`, `PushManager` (accordée, refusée, fermée, non
  supporté, échec du POST → `unsubscribe`, conflit puis « réactiver ici ») ; `PushSync` (pas de
  mémoire → rien ; clé changée → réabonnement ; message du SW) ; `signOutEverywhere` (UUID
  valide → DELETE avec délai, échec avalé, UUID invalide ignoré) ; composants + `jest-axe`.
- Playwright (`tests/e2e/push-notifications.spec.ts`, projet chromium) : un script d'init
  remplace `PushManager.prototype.subscribe` / `getSubscription` par une fausse souscription
  (le service de push réel n'est pas joignable de façon fiable depuis Chromium automatisé),
  `context.grantPermissions(["notifications"])`, `page.route` sur le BFF : bouton visible après
  une commande, `POST` intercepté avec le bon corps, état « Notifications activées » ;
  interrupteur du profil qui envoie le `DELETE` ; permission refusée → marche à suivre ; aucune
  demande de permission au chargement (espion sur `Notification.requestPermission`).
- Validation manuelle (quickstart) pour la réception réelle.

**Alternatives écartées** : e2e avec un vrai abonnement FCM (instable, dépend du réseau et de
Google).
