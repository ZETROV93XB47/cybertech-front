# Research — 003 Mon compte et mes commandes

Décisions techniques de la feature, numérotées R1 à R21. Le socle (Next.js 16 App Router, BFF,
Zod, TanStack Query, Auth.js, thème unique, effets) est celui du lot 1 et de la feature 002 :
voir `specs/001-catalog-auth-cart/research.md` et `specs/002-catalog-refresh/research.md`.
Seules dépendances npm ajoutées : `@stripe/stripe-js` et `@stripe/react-stripe-js` (R21,
décision du 2026-10-14). Backend vérifié au commit `84dc038` le 2026-10-14
(`docs/backend/api-map.md`).

## R1 — Protection des pages privées : proxy + vérification serveur

- **Decision** : `proxy.ts` redirige vers `/login?callbackUrl=…` toute requête sur
  `PRIVATE_PATH_PREFIXES` (`/account`, `/checkout`) sans cookie de session Auth.js (nom fourni
  par `lib/auth/session-cookie.ts`, sans module `server-only`). Chaque layout privé
  (`app/(account)/layout.tsx`) appelle ensuite `requireSession(pathname)`, qui valide
  réellement la session. Les pages privées sont dynamiques (`no-store`), jamais en cache.
- **Rationale** : constitution II (double vérification) ; le proxy ne fait qu'un contrôle de
  présence, peu coûteux, la vraie validation reste serveur.
- **Alternatives considered** : vérification dans les seuls layouts (contraire à II) ;
  décoder le JWT dans le proxy (il faudrait le secret et `server-only` dans le proxy).

## R2 — Arborescence des routes

- **Decision** : groupe de routes `app/(account)/` partageant le layout privé :
  `/checkout`, `/checkout/confirmation/[uuid]`, `/account` (redirige vers
  `/account/orders`), `/account/profile`, `/account/orders`, `/account/orders/[uuid]`,
  `/account/orders/[uuid]/edit`, `/account/card`. Une navigation secondaire du compte
  (`AccountNav` : Commandes, Profil, Carte) est commune aux pages `/account/**`.
- **Rationale** : chemins en anglais comme `/products` et `/cart` ; la confirmation porte
  l'UUID de la commande (rechargeable, partageable avec soi-même) ; la modification a sa page
  (formulaire long, recherche de produits) plutôt qu'un cadre modal.
- **Alternatives considered** : modification en ligne dans le détail (page trop dense) ;
  confirmation sans UUID dans l'adresse (perdue au rechargement).

## R3 — Tunnel sur une seule page à étapes (clarification Q1)

- **Decision** : `/checkout` est un Server Component qui charge en parallèle le profil
  (`GET /user/me`), le panier (`GET /cart/get`), les options de livraison et les campagnes
  actives, puis rend un îlot client `CheckoutFlow`. Les étapes `ADDRESS`, `SHIPPING`,
  `PAYMENT` (enum `CheckoutStep`) se déplient l'une après l'autre ; une étape validée se replie
  en résumé avec « Modifier ». Le récapitulatif (`CheckoutSummary`) reste collant à droite.
  Panier vide → redirection serveur vers `/cart`.
- **Rationale** : un seul état client, le devis toujours visible, aucun état à transporter entre
  pages ; le rendu serveur évite un premier écran vide.
- **Alternatives considered** : une page par étape (état à persister entre pages, devis à
  refaire à chaque page) — écarté en clarification.

## R4 — Devis : route BFF, TanStack Query, annulation et montants « en cours »

- **Decision** : `POST /api/checkout/quote` (BFF, USER) → `POST /management/order/quote`.
  Côté client, `useQuote({ shippingType, shippingProvider, discountKey })` (TanStack Query) :
  la clé de requête contient les trois choix et la version du panier ; le `signal` de TanStack
  annule la requête obsolète (`fetch` abandonné, FR-011) ; `placeholderData` garde les
  derniers montants affichés avec un indicateur « mise à jour » (`aria-busy`) ; `staleTime` 0,
  pas de rejeu automatique sur 4xx. Une invalidation est faite à chaque changement du panier
  (`accountCartQueryKey`).
- **Rationale** : la déduplication et l'annulation sont natives à TanStack ; seuls les montants
  du dernier choix peuvent s'afficher, car l'affichage lit la donnée de la clé courante.
- **Alternatives considered** : Server Action (pas d'annulation, séquentielles) ; debounce
  maison avec `AbortController` (réécrit ce que TanStack fait).

## R5 — Devis sur la page panier (clarification Q3)

- **Decision** : le bloc réduction du panier appelle le même devis avec
  `CART_QUOTE_SHIPPING` (`STANDARD` + premier transporteur des options, constante documentée)
  mais n'affiche que `subtotalAmount`, `discountAmount`, `discountApplied` et le montant
  manquant, suivis de « Livraison et total calculés à l'étape suivante ». Visiteur : le bloc
  invite à se connecter, sans appel.
- **Rationale** : le sous-total et la remise ne dépendent pas de la livraison
  (`OrderPriceCalculationServiceImp`) ; un seul endpoint, un seul schéma.
- **Alternatives considered** : calculer la remise côté front (interdit, constitution V) ;
  afficher le total avec livraison Standard (écarté en clarification).

## R6 — Montant manquant pour le minimum de commande

- **Decision** : `missingAmountForDiscount(quote)` = `roundToCents(minOrderAmount −
  subtotalAmount)` si `discountApplied` est faux et `minOrderAmount` non nul ; sinon `null`.
  Les deux opérandes viennent du devis ; le résultat n'est ni facturé ni envoyé au backend.
- **Rationale** : FR-019 exige le montant manquant ; ce n'est pas un montant qui fait foi
  (constitution V vise totaux et remises). Test unitaire par cas (atteint, non atteint, pas de
  minimum, campagne `NO_DISCOUNT`).
- **Alternatives considered** : message sans montant (moins utile, contraire à l'exemple de la
  spec).

## R7 — Réduction choisie : clé en `sessionStorage`, validée par le devis

- **Decision** : la clé choisie est stockée sous `ct_discount_v1` (`StorageKey.DISCOUNT`,
  schéma Zod : chaîne 1–64, `[A-Z0-9_]`) et lue par le panier et le tunnel. Une clé saisie est
  normalisée en majuscules puis testée par un devis : `400 DISCOUNT_TYPE_NOT_ACTIVE` →
  `FrontErrorCode.DISCOUNT_INVALID`, la clé précédente est rétablie (FR-018). Les campagnes
  proposées viennent de `getActiveDiscounts()` (cache existant), filtrées par
  `isDisplayableDiscount`.
- **Rationale** : donnée non sensible (constitution IV), conservée le temps de l'onglet
  (hypothèse de la spec) ; le backend reste seul juge de la validité.
- **Alternatives considered** : paramètre d'adresse (clé visible et partagée) ; état React
  seul (perdu entre panier et tunnel).

## R8 — Livraison : options réelles, délais, retrait en magasin grisé (clarification Q2)

- **Decision** : `buildShippingChoices(options, now)` (nouveau, `features/checkout/`) réutilise
  `SHIPPING_DELAYS` et `expressPromise` de `features/catalog/delivery.ts` et renvoie un choix
  par couple (type, transporteur) du backend, avec son prix. Le schéma `ShippingOptionSchema`
  accepte dès maintenant des champs de délai optionnels (`minDeliveryDays`, `maxDeliveryDays`) :
  présents, ils remplacent `SHIPPING_DELAYS` sans calcul de jours ouvrés ni de jours fériés ;
  absents, le délai est marqué « estimatif ». Une entrée « Retrait en magasin » vient d'une
  constante d'affichage (`PICKUP_PLACEHOLDER`), rendue `aria-disabled` avec « Bientôt
  disponible », jamais envoyée au backend.
- **Rationale** : spec FR-008 et note du 2026-10-14 (délais fixes de configuration côté
  backend) ; les noms exacts des futurs champs seront confirmés par `gen:api` (test de type).
- **Alternatives considered** : enum `ShippingType.PICKUP` (le backend le refuserait).

## R9 — Validation de commande : une seule commande, pas de rejeu automatique

- **Decision** : `POST /api/checkout/place` (BFF) → `POST /management/order/place`, via
  `useMutation` ; le bouton est désactivé pendant l'envoi et tant que le devis n'est pas à jour
  (`isPlaceable`). Aucun rejeu automatique (`isRetryableWrite` faux pour place). Session
  expirée : un brouillon non personnel (type, transporteur, paiement, étape) est rangé sous
  `ct_checkout_v1` (`sessionStorage`), puis l'utilisateur revient sur `/checkout` et **valide
  à nouveau** lui-même. L'adresse n'est pas stockée côté navigateur : elle est préremplie à nouveau
  depuis le profil, avec un message si elle avait été modifiée.
- **Dernier devis avant validation** : au clic, `usePlaceOrder` redemande un devis ; si son
  `totalAmount` diffère du total affiché (panier modifié dans un autre onglet), la commande
  n'est pas créée, le nouveau total est affiché et un nouveau clic est exigé. Le panier est
  aussi relu au retour sur l'onglet (devis invalidé).
- **Formulaires du compte** (profil, carte, modification de commande) : une session expirée
  donne une erreur de formulaire invitant à se reconnecter, la saisie restant en place ; la
  modification de commande est aussi gardée sous `ct_order_edit_v1` (sans adresse) pour être
  restaurée après reconnexion, jamais renvoyée automatiquement.
- **Rationale** : le backend n'offre pas de clé d'idempotence pour place ; un rejeu automatique
  risquerait une commande en double (FR-012). L'adresse est une donnée personnelle : pas de
  stockage navigateur (constitution IV, lecture prudente).
- **Alternatives considered** : rejouer place après reconnexion (doublon possible) ; stocker
  l'adresse (donnée personnelle dans `sessionStorage`).

## R10 — Après la commande : panier et confirmation

- **Decision** : succès → `queryClient.setQueryData(accountCartQueryKey, emptyCartView)`,
  suppression de `ct_checkout_v1`, `router.replace('/checkout/confirmation/{uuid}')` (le
  retour arrière ne ramène pas au tunnel). Erreurs : `409 NOT_ENOUGH_STOCK` →
  `/cart?issue=stock&product=…` (les lignes sont relues et signalées), `409 CART_IS_EMPTY` →
  `/cart?issue=empty` (enum `CartIssue`, lu par la page panier), `403 USER_NOT_ACTIVE` → message dédié, `400 DISCOUNT_TYPE_NOT_ACTIVE`
  → clé effacée, devis refait, message (FR-020).
- **Rationale** : FR-013, FR-015, FR-020 ; `replace` couvre le cas limite « retour arrière ».

## R11 — Suivi du paiement : sondage borné

- **Decision** : `useOrderStatus(uuid)` interroge `GET /api/orders/{uuid}/status` toutes les
  `ORDER_STATUS_POLL_INTERVAL_MS` (2 000) jusqu'à un statut terminal pour la confirmation
  (`PAID`, `PAYMENT_FAILED` et tous les statuts postérieurs) ou
  `ORDER_STATUS_POLL_TIMEOUT_MS` (60 000) ; au-delà, message et lien vers le détail. Sondage
  suspendu onglet masqué (`refetchIntervalInBackground: false`). Relance :
  `POST /api/orders/{uuid}/retry-payment` puis reprise du sondage ; `409
  PAYMENT_ALREADY_COMPLETED` → affiché comme payé.
- **Rationale** : place ne renvoie jamais 402 (api-map §E 26) ; SC-005 (15 s dans 95 % des cas)
  est tenu largement par 2 s d'intervalle.

## R12 — Mes commandes : liste et filtre en Server Component

- **Decision** : `/account/orders?status=PAID&status=SHIPPED&page=2` lu par un Server
  Component (`getMyOrders`, `no-store`, jeton de l'utilisateur), `ORDERS_PAGE_SIZE` = 10, tri
  `createdAt,desc`. Le filtre est un formulaire GET (fonctionne sans JavaScript, comme les
  filtres du catalogue) ; statuts inconnus dans l'adresse ignorés.
- **Rationale** : données privées non mises en cache ; adresse partageable et retour arrière
  natifs (FR-022).

## R13 — Détail : décomposition du total, frise, actions

- **Decision** : `toOrderView(dto)` (fonction pure) produit un `OrderView` : `breakdown` est
  `null` si `subtotalAmount`, `discountAmount` ou `shippingCost` est `null` (commande
  ancienne), sinon complet ; `timeline` place le statut dans la frise nominale
  (`ORDER_TIMELINE_STEPS`) ou le classe en issue (`OrderOutcome`) ; `canEdit` /
  `canCancel` / `canRetryPayment` sont dérivés du statut (indicatifs, le backend reste juge,
  FR-027). `refundedAmount > 0` est affiché. Chaque statut porte un ton visuel (enum
  `StatusTone` : en cours, réussi, échec, neutre) traduit en tokens du thème. Le backend
  accepte la modification jusqu'à `AWAITING_SHIPPING` inclus mais refuse l'annulation dès ce
  statut : une commande en préparation est modifiable, pas annulable.
- **Rationale** : toutes les règles d'affichage dans une fonction testable ; composants
  d'affichage seulement.

## R14 — Modification d'une commande (clarification Q4)

- **Decision** : `/account/orders/[uuid]/edit` charge la commande et rend `OrderEditForm`
  (client) : lignes avec `QuantityStepper` existant, retrait de ligne (désactivé s'il ne reste
  qu'une ligne, avec lien vers l'annulation), ajout par recherche de produits (route existante
  `GET /api/search`, debounce `ORDER_EDIT_SEARCH_DEBOUNCE_MS`), adresse (découpée depuis
  `shippingAddress`, R16), type, transporteur et moyen de paiement. Envoi :
  `POST /api/orders/{uuid}` → `POST /order/update` avec la liste **complète** des lignes. Le
  moyen de paiement n'est pas renvoyé par le backend : le champ est requis, sans valeur
  préremplie (dépendance backend notée). Erreurs : `409 ORDER_ALREADY_SHIPPED` → retour au
  détail rafraîchi ; `409 NOT_ENOUGH_STOCK` → ligne signalée, formulaire conservé ;
  `402 PAYMENT_FAILED` → complément refusé expliqué.
- **Rationale** : `OrderUpdateRequestDto` remplace toutes les lignes et exige tous les champs ;
  aucun devis de modification n'existe (spec : montants affichés après enregistrement).

## R15 — Annulation

- **Decision** : bouton dans le détail, `AlertDialog` de confirmation, `POST
  /api/orders/{uuid}/cancel` → `POST /order/cancel` ; succès → `router.refresh()` ; `409
  CANNOT_CANCEL_ORDER` / `ORDER_ALREADY_SHIPPED` / `ORDER_REFUND_FAILED` → message dédié puis
  rafraîchissement.

## R16 — Découpage de l'adresse aplatie

- **Decision** : `parseFlatAddress(text)` découpe `"rue, code postal ville, pays"` (format de
  `UserMapper#mapAddressToString` et `OrderMapper`) : dernier segment = pays, avant-dernier =
  code postal + ville (premier espace), le reste rejoint par `", "` = rue. Un segment égal à
  `"null"` (sortie de `String.format` sur un champ vide) ou un format inattendu donne un champ
  vide. Utilisé par le profil, le tunnel et la modification de commande.
- **Rationale** : FR-030 (ne jamais deviner en silence) ; tests sur rue avec virgule, ville
  composée, champ `null`, chaîne vide.
- **Alternatives considered** : demander l'adresse à chaque fois (pénible) ; attendre un DTO
  structuré (dépendance backend notée, non bloquante).

## R17 — Profil et carte : Server Actions

- **Decision** : formulaires profil et carte en Server Actions avec `useActionState`
  (comme l'inscription, `features/auth/actions.ts`) : validation Zod côté serveur reprenant
  Bean Validation (`@Size(2..50)`, `MM/YYYY` non passé), `fieldErrors` du backend reportés sur
  les champs, `revalidatePath` après succès. Téléphone : envoyé seulement s'il est saisi. Lien
  « Changer de mot de passe » : `KEYCLOAK_ACCOUNT_URL` dérivée de `AUTH_KEYCLOAK_ISSUER` +
  `/account` (constante serveur). Suppression de carte : `AlertDialog` puis action. L'ajout
  et le remplacement de la carte passent par la route BFF `POST /api/bank-card` (R21), pas par
  une Server Action.
- **Rationale** : formulaires simples, fonctionnent sans JavaScript, aucun état client à
  synchroniser ; pas de TanStack pour des données lues une fois.

## R18 — Codes d'erreur front ajoutés

- **Decision** : `FrontErrorCode` gagne `DISCOUNT_INVALID`, `PAYMENT_FAILED`,
  `PAYMENT_ALREADY_COMPLETED`, `ORDER_LOCKED` (déjà expédiée / non annulable),
  `REFUND_FAILED`, `ACCOUNT_INACTIVE`, `CARD_EXPIRED` ; le mapping de `lib/api/errors.ts` est
  complété et le test T020 vérifie l'exhaustivité. Messages en français dans
  `features/checkout/messages.ts`, `features/orders/messages.ts`,
  `features/account/messages.ts`.

## R19 — Page panier : gabarit commun et bouton « Passer commande »

- **Decision** : la page panier passe sur `PageShell` / `PageHeader` (point restant de la 002,
  quickstart §5) ; `CartSummary` gagne `DiscountBlock` (connecté) et « Passer commande »
  (`/checkout`, ou `/login?callbackUrl=/checkout` pour un visiteur, la fusion du panier invité
  existante s'exécutant au retour). `NavSection.ACCOUNT` marque la rubrique courante ; `MainNav` / `AccountMenu` gagnent « Mes commandes »,
  « Mon profil », « Ma carte ».

## R20 — Interface vivante

- **Decision** : étapes du tunnel en `RevealGroup` ; montants du récapitulatif avec fondu
  enchaîné (`useMotionTokens`) annoncés par une zone `aria-live="polite"` ; frise de commande
  qui se remplit étape par étape ; listes de commandes en apparition en cascade ; états vides
  avec `StateIllustration`. Version statique quand `useEffectiveEffects()` est réduit ou
  désactivé ; tests par niveau d'effet comme en 002.

## R21 — Carte de l'utilisateur : formulaire du site, envoyée au backend (révisée le 2026-10-20)

- **Decision** : « Ajouter une carte » sur « Ma carte » est un formulaire du site (titulaire,
  numéro, expiration `MM/AAAA`, réseau `BankCardType`) envoyé par `fetch` à la route BFF
  `POST /api/bank-card` (USER), qui valide le corps avec `BankCardAddBodySchema` (strict, mêmes
  contraintes que `BankCardCreationRequestDto` : numéro `^\d{13,19}$` après retrait des
  espaces, expiration future) puis appelle `POST /bank-card/add` et renvoie la carte masquée.
  Remplacer = confirmation, puis `DELETE /bank-card/delete` suivi de l'ajout (le backend refuse
  une deuxième carte) ; si l'ajout échoue après la suppression, le message le dit et invite à
  ressaisir. Le numéro vit seulement dans l'état du formulaire jusqu'à l'envoi, puis est
  effacé ; jamais loggué (le logger du BFF ne reçoit ni le corps ni le numéro, seulement le
  réseau et le résultat), jamais en `sessionStorage`, jamais dans une réponse. Champs avec
  `autoComplete="off"` et `inputMode="numeric"`. Le tunnel affiche la carte enregistrée et,
  sans carte, renvoie vers `/account/card?returnTo=/checkout` (`safeCallbackPath`).
- **Rationale** : le backend a abandonné le flux Stripe (`ae1d263`, propriétaire sans compte
  Stripe) et attend le numéro ; constitution V v3.0.0 (cartes de test uniquement, numéro traité
  comme donnée sensible). Aucune dépendance npm ni origine tierce n'est ajoutée.
- **Alternatives considered** : Stripe Elements (v2.3.0, abandonné : plus d'endpoint
  `setup-intent`) ; carte seulement à l'inscription (aucun moyen de remplacer une carte
  refusée, le scénario « refusé puis relancé » devient impossible).

## R22 — Wishlist : un cœur par produit, une lecture partagée (US6, ajoutée le 2026-10-14)

- **Decision** : trois routes BFF (USER) : `GET /api/wishlist/ids` lit la première page de
  `GET /wishlist/my-wishlist?size=WISHLIST_IDS_MAX&sort=createdAt,desc` et ne renvoie que
  `{ productUuids: uuid[] }` ; `PUT /api/wishlist/[productUuid]` → `POST /wishlist/add/{uuid}`
  (`409 PRODUCT_ALREADY_IN_WISHLIST` = succès) ; `DELETE /api/wishlist/[productUuid]` →
  `DELETE /wishlist/remove/{uuid}` (`404` = succès). Côté client, `useWishlistIds()` (TanStack,
  `QueryKey.WISHLIST`, activé seulement pour une session connectée) alimente tous les cœurs
  d'une page ; `useToggleWishlist()` met à jour le cache de façon optimiste et le rétablit sur
  erreur. Visiteur : `ct_wishlist_pending_v1` (`sessionStorage`, `{ productUuid }` validé par
  Zod) puis `loginPath(page courante)` ; `WishlistPendingReplayer` (monté dans le layout
  racine à côté de `GuestCartMerger`) rejoue l'ajout une fois au retour et le supprime. La page
  « Ma wishlist » est un Server Component (`/account/wishlist?page=`, lecture `no-store` avec le
  jeton, `WISHLIST_PAGE_SIZE` = 20, défaut du backend) ; disponibilité par
  `GET /product/availability` (déjà utilisé par le panier invité). `PUT` plutôt que `POST`
  côté BFF : l'opération est idempotente une fois le 409 absorbé. Les deux routes répondent
  `200 { productUuid, isInWishlist }` (et non `204`) : `bffSend` lit toujours un corps JSON.
  Disponibilité de la page : badges et bouton panier existants (`useAvailability`, lecture
  groupée `GET /api/availability`) plutôt qu'une lecture serveur.
- **Rationale** : aucun endpoint « ce produit est-il dans ma wishlist ? » ; une lecture par page
  vue évite un appel par carte (FR-039) ; 100 = `max-page-size` du backend.
- **Alternatives considered** : un appel par carte (N requêtes) ; lire toutes les pages (coût
  non borné) ; Server Action (le cœur vit dans des cartes rendues côté client et serveur, une
  route BFF + TanStack partage plus simplement l'état optimiste).

## Prérequis hors feature

- `lib/enums/brand.ts` n'a que 13 marques sur les 43 du backend (`api-map.md` §E 29) : à
  corriger en tâche préalable (T001), sinon des produits du panier ou des commandes pourraient
  échouer à la validation Zod.
