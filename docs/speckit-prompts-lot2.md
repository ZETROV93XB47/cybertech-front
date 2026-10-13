# Prompts Spec Kit — lot 2 et suivants (couverture fonctionnelle complète du backend)

> À utiliser dans une **nouvelle conversation** Claude Code ouverte à la racine de
> `cybertech-front`. Le lot 1 (`specs/001-catalog-auth-cart/`) est terminé : catalogue, fiche
> produit enrichie, recherche ⌘K, inscription (`/register`), connexion / déconnexion Keycloak,
> panier invité et compte avec fusion, préférences d'interface, effets « Aurora Glow ».
> Ce fichier contient un prompt de démarrage, puis un prompt `/speckit-specify` par feature.
> Aucun fichier supplémentaire du backend n'est à fournir : le repo backend est lisible en local
> (lecture seule) et l'OpenAPI se régénère depuis le backend lancé (`npm run gen:api`).

---

## 1. Prompt de démarrage (à coller en premier dans la nouvelle conversation)

````text
Tu reprends le front cybertech (Next.js 16, App Router) après le lot 1, livré avec Spec Kit
dans specs/001-catalog-auth-cart/ (toutes les tâches cochées). Objectif : couvrir tout le
périmètre fonctionnel exposé par le backend Spring, en plusieurs features Spec Kit successives.

Avant toute chose, lis (sans rien modifier) :
1. CLAUDE.md, puis .specify/memory/constitution.md (fait foi) ;
2. docs/backend/api-map.md (§2 à §13 et §F), docs/backend/analysis.md, docs/guest-cart.md ;
3. specs/001-catalog-auth-cart/ : spec.md, plan.md, research.md, data-model.md, contracts/,
   tasks.md, quickstart.md (§3 et §5 : résultats et points restés manuels) ;
4. le code existant, pour réutiliser ses briques au lieu d'en créer de nouvelles :
   lib/api/client.ts (backendFetch, seul client HTTP serveur), lib/api/errors.ts (mapping des
   errorCode), lib/api/bff-response.ts, lib/api/bff-client.ts (bffGet/bffSend),
   lib/auth/guards.ts (getAccessTokenOrThrow, requireSession, readSessionToken),
   features/cart/hooks/useCart.ts (requêtes TanStack + mises à jour optimistes + rejeu après
   session expirée), features/auth (Server Actions, formulaire d'inscription accessible),
   lib/theme/theme.config.ts et components/effects (effets pilotés par useEffectiveEffects),
   tests/e2e/support (inscription de comptes de test, connexion Keycloak, axe).

Ensuite, rafraîchis la connaissance du backend, qui a évolué depuis le lot 1 (correctifs
récents, notamment 409 USER_ALREADY_EXISTS à l'inscription) :
- le repo backend est C:\Users\guill\Downloads\cybertech-dev-develop_cybertech, en LECTURE
  SEULE : relis les controllers, DTO et ErrorCode, et compare-les avec docs/backend/api-map.md ;
- avec le backend lancé sur http://localhost:8081, exécute `npm run gen:api` pour régénérer
  lib/api/schema.d.ts depuis /v3/api-docs ; si un errorCode a été ajouté, mets à jour
  lib/enums/error-code.ts et le mapping de lib/api/errors.ts (le test de type T020 le détecte) ;
- mets docs/backend/api-map.md à jour (endpoints, DTO, §E incohérences, §F manques) et
  résume-moi les écarts avant de lancer la première feature.

Découpage proposé, une feature Spec Kit par ligne, dans cet ordre :
- 002-account-orders : profil, bouton « Passer commande » et réduction sur le panier, tunnel
  de commande, suivi et historique des commandes, carte bancaire enregistrée ;
- 003-engagement : wishlist, avis, recommandations personnalisées, événements comportementaux ;
- 004-admin : espace d'administration (utilisateurs, produits et images, commandes, remises,
  schémas de catégories, cartes bancaires, wishlists) ;
- 005-experience : harmonisation finale de toutes les pages, interface remplie et animée (§5).
Pour chaque feature : /speckit-specify (prompts ci-dessous, docs/speckit-prompts-lot2.md),
/speckit-clarify, /speckit-plan, /speckit-tasks, /speckit-analyze, puis /speckit-implement
UNE user story par conversation.

Chaque tasks.md DOIT se terminer par une phase « Interface vivante et cohérente » (voir §5 de
docs/speckit-prompts-lot2.md) : on ne livre pas une page fonctionnelle mais vide. Les effets de
la fiche produit (apparition en cascade RevealGroup, fondu enchaîné, loupe pilotée par le thème)
et du fond (grille de points, halos aurora) servent de référence de qualité. Après la feature
004, une feature 005-experience reprend toutes les pages (§5) pour l'harmonisation finale.

Méthode de vérification (identique au lot 1, voir aussi la mémoire « local-env-quirks ») :
- npm run typecheck, npm run lint (0 warning), npm run test avant de déclarer une story finie ;
- parcours Playwright contre le vrai backend ; la connexion ne marche que sur le port 3000
  (seule redirect URI du client Keycloak) : réutiliser mon `next dev` s'il tourne, sinon en
  lancer un et ne jamais arrêter un processus que tu n'as pas démarré (arrêter uniquement le PID
  qui écoute sur le port que tu as ouvert) ;
- inscriptions limitées à 5/min/IP : specs lancées une par une (--workers=1), pause d'une
  minute entre deux specs qui créent des comptes ; noms et emails de test uniques ;
- un compte créé directement dans la console Keycloak n'a pas de profil backend (404
  USER_NOT_FOUND) : créer les comptes via /register ou POST /user/register ; pour un ADMIN,
  le créer ainsi puis lui donner le rôle ADMIN (console Keycloak ou
  PATCH /admin/user/update-role/{uuid}) ;
- build de production à part : NEXT_DIST_DIR=.next-prod npx next build, puis next start sur
  un autre port (Lighthouse, backend injoignable) ;
- captures d'écran relues avant chaque point d'étape ; arrêt et point avec moi (en français) à
  la fin de chaque user story, commit en fin de story.

Ne commence pas à coder : fais d'abord le rafraîchissement du backend et le résumé des écarts.
````

---

## 2. Prompt `/speckit-specify` — 002-account-orders

````text
/speckit-specify Feature 002 « Mon compte et mes commandes » du front cybertech, dans la
continuité du lot 1 (specs/001-catalog-auth-cart, même constitution, mêmes conventions : BFF,
Zod, textes au tutoiement dans features/*/messages.ts, thème unique, effets Aurora Glow,
accessibilité AA). Le backend fait foi (docs/backend/api-map.md §2, §7, §8, §12) ; ne jamais
inventer un endpoint : un besoin non couvert est listé comme « dépendance backend ».

User stories (à prioriser) :
1. Profil : consulter mon profil (GET /user/me) et le modifier (PATCH /user/me,
   UserSelfUpdateRequestDto ; email et mot de passe non modifiables ici). Le changement de mot
   de passe passe par la console de compte Keycloak (lien). La suppression de compte n'existe
   pas côté backend (§F) : à signaler, pas à simuler.
2. Commande (checkout) depuis la page panier, qui aujourd'hui n'a ni bouton « Passer
   commande » ni réduction :
   - ajouter sur /cart un bouton « Passer commande » (visiteur : connexion puis retour, avec la
     fusion du panier invité déjà en place) menant à un tunnel /checkout : adresse de livraison
     (préremplie depuis le profil), type et transporteur (STANDARD/EXPRESS, DHL/FEDEX), moyen de
     paiement (MASTERCARD, VISA, APPLE_PAY, GOOGLE_PAY), récapitulatif, confirmation ;
   - réduction : le backend l'applique à la commande via le champ `discountKey` de
     OrderPlacingRequestDto (défaut « aucune remise »), choisi parmi les campagnes actives
     (GET /discounts/active, DiscountContext : PERCENTAGE, FIXED_AMOUNT, BUY_ONE_GET_ONE_FREE,
     minOrderAmount, maxDiscountAmount, dates). Proposer sur le panier et le récapitulatif un
     bloc « Appliquer une réduction » : choix d'une campagne active ou saisie de sa clé, refus
     clair si la clé est inconnue, inactive ou si le minimum de commande n'est pas atteint ;
   - aucun endpoint ne calcule le prix avant la commande (OrderPriceCalculationService n'est
     appelé qu'à la création, PriceCalculationRequestDto n'a pas de controller) : afficher
     l'économie et le total comme « estimés » (calcul front à partir du DiscountContext, même
     règles que le backend, testées) puis les montants définitifs renvoyés par OrderResponseDto ;
     lister « POST /order/quote » comme dépendance backend recommandée ;
   - POST /management/order/place, puis page de confirmation qui interroge
     GET /order/status/{uuid} (polling borné) jusqu'à PAID ou PAYMENT_FAILED ; gérer 402
     PAYMENT_FAILED (POST /order/retry-payment/{uuid}), 409 CART_IS_EMPTY / NOT_ENOUGH_STOCK
     (retour au panier avec les lignes concernées), 403 USER_NOT_ACTIVE ; vider le cache du
     panier après une commande réussie.
3. Mes commandes : liste paginée (GET /order/mine, filtre par statut, tri createdAt desc),
   détail (GET /order/get/{uuid}), frise du cycle de vie (CREATED → AWAITING_PAYMENT →
   PAID → AWAITING_SHIPPING → SHIPPED → DELIVERED, plus CANCELED, REFUNDED, RETURNED,
   PAYMENT_FAILED), modification (POST /order/update) et annulation (POST /order/cancel) quand
   le statut le permet (409 ORDER_ALREADY_SHIPPED, CANNOT_CANCEL_ORDER, ORDER_REFUND_FAILED).
4. Carte bancaire enregistrée (une par utilisateur) : voir la carte masquée, ajouter, modifier
   le titulaire et l'expiration, supprimer (/bank-card/*). Point à clarifier en priorité :
   l'ajout envoie le numéro complet au backend (chiffré AES côté serveur) ; vérifier que c'est
   compatible avec la constitution (jamais de PAN stocké ni loggé côté front, champ jamais
   renvoyé au navigateur) ou proposer de restreindre la feature à la consultation et à la
   suppression.

Pages privées sous /account/** protégées par proxy.ts et requireSession, réponses no-store,
rejeu d'action après session expirée comme pour le panier. États vides et d'erreur illustrés
(StateIllustration), apparition orchestrée (RevealGroup) sans multiplier les animations.
````

---

## 3. Prompt `/speckit-specify` — 003-engagement

````text
/speckit-specify Feature 003 « Wishlist, avis et recommandations » du front cybertech, même
socle que les features 001 et 002. Backend : docs/backend/api-map.md §9, §10, §11.

User stories :
1. Wishlist : ajouter / retirer un produit (cœur sur les cartes et la fiche produit,
   POST /wishlist/add/{uuid}, DELETE /wishlist/remove/{uuid}, 409
   PRODUCT_ALREADY_IN_WISHLIST traité comme un succès), page « Ma wishlist » paginée
   (GET /wishlist/my-wishlist) avec ajout au panier. Visiteur : proposer la connexion puis
   rejouer l'action (même mécanisme que le panier).
2. Avis : liste des produits que je peux noter (GET /review/reviewable), création avec note et
   commentaire (POST /review/create ; modération IA synchrone : 403 COMMENT_POST_NOT_ALLOWED
   doit expliquer le refus sans culpabiliser), modification et suppression de mes avis.
   Aucun endpoint public ne liste les avis d'un produit ni la note moyenne (§F) : ne pas
   afficher d'avis sur la fiche produit, lister ce manque comme dépendance backend.
3. Recommandations : bloc « Pour toi » sur l'accueil d'un utilisateur connecté
   (GET /recommendations/my-recommendations?n=), repli silencieux si vide ou en erreur.
4. Événements comportementaux : envoi non bloquant de VIEW (fiche produit), ADD_TO_CART,
   REMOVE_FROM_CART, SEARCH_QUERY, SEARCH_RESULT_CLICK, WISHLIST_ADD, CLICK
   (POST /events/consume-event, rôle USER uniquement) via une route BFF qui regroupe ou
   échantillonne, sans jamais ralentir l'interface ni envoyer de données personnelles ; aucun
   envoi pour un visiteur. Préciser ce qui est collecté dans la spec (transparence).
````

---

## 4. Prompt `/speckit-specify` — 004-admin

````text
/speckit-specify Feature 004 « Espace d'administration » du front cybertech, même socle que
les features précédentes. Backend : docs/backend/api-map.md §13 (tous les endpoints exigent le
rôle ADMIN ; le rôle est déjà exposé dans la session Auth.js, champ roles).

Contraintes : zone /admin/** protégée deux fois (proxy.ts + layout serveur vérifiant le rôle
ADMIN, 403 « Tu n'as pas accès à cette page » sinon) ; jamais d'appel admin depuis le
navigateur hors BFF ; confirmations pour toute suppression ; tableaux paginés accessibles
(tri, filtres, navigation clavier) ; interface plus sobre que la boutique (effets réduits par
défaut dans cette zone, sans désactiver le thème).

User stories :
1. Utilisateurs : liste paginée, création, modification, changement de rôle USER/ADMIN,
   suppression, génération d'un utilisateur de test (register/auto/single).
2. Produits : liste paginée, création avec formulaire guidé par le JSON Schema de la catégorie
   (attributs typés), création avec images (multipart, ≤ 10 Mo, aperçu), modification,
   suppression ; après une écriture, invalider le cache catalogue du front
   (revalidateTag(PRODUCTS_CACHE_TAG)).
3. Commandes : liste filtrable par statut et par utilisateur, détail, suppression, création
   d'une commande de test (place/auto).
4. Remises : CRUD des campagnes (PERCENTAGE, FIXED_AMOUNT, BUY_ONE_GET_ONE_FREE, dates,
   montant minimum, plafond), 409 DISCOUNT_CAMPAIGN_ALREADY_EXISTS ; invalider le cache des
   remises actives.
5. Schémas de catégories : CRUD avec éditeur de JSON Schema validé avant envoi
   (INVALID_PRODUCT_CATEGORY_SCHEMA), aperçu des filtres générés côté catalogue.
6. Cartes bancaires et wishlists : consultation et suppression (données masquées uniquement).

Lister dans la spec les manques backend repérés pendant l'analyse (ex. recherche
d'utilisateurs, export) comme dépendances, sans les simuler.
````

---

## 5. Phase « Interface vivante et cohérente » (à la fin de chaque feature, puis 005-experience)

À ajouter telle quelle en dernière phase de chaque `tasks.md` (002, 003, 004), puis comme
feature complète `005-experience` qui repasse sur TOUTES les pages (lot 1 compris). Utiliser le
skill frontend-design et l'annexe « Aurora Glow » de specs/001-catalog-auth-cart/spec.md.
Toutes les valeurs (durées, amplitudes, couleurs, flous, échelles) passent par
`lib/theme/theme.config.ts` et `useEffectiveEffects()` / `useMotionTokens()` ; tout effet a une
version statique (effets « désactivés » ou `prefers-reduced-motion`) et un test par niveau,
comme `tests/unit/effects/effects-levels.test.tsx`.

````text
Tâches de la phase « Interface vivante et cohérente » :

- [ ] Audit visuel : captures de chaque page de la feature (vide, remplie, erreur, chargement,
      visiteur, connecté, admin le cas échéant), relues et commentées ; lister ce qui « fait
      vide » (grandes zones sans contenu, pages réduites à un formulaire, listes sans état vide
      illustré) et ce qui est incohérent (espacements, rayons, titres, boutons, largeurs).
- [ ] Remplir sans inventer : chaque page affiche des données réelles utiles autour de sa tâche
      principale (récapitulatif, statut, prochaines étapes, produits liés, derniers produits
      consultés, offre active, aide contextuelle) ; aucun chiffre ou avis fictif.
- [ ] Cohérence : mêmes en-têtes de page (fil d'Ariane, titre vivant LiveTitle, sous-titre),
      mêmes cartes en verre, mêmes boutons (CTA dégradé + MagneticButton pour l'action
      principale), mêmes états vides (StateIllustration + phrase qui invite à agir), mêmes
      squelettes de chargement (skeleton-shimmer), même largeur de contenu, mêmes tableaux.
- [ ] Une animation orchestrée par page, qui répond à l'utilisateur : apparition en cascade du
      bloc principal (RevealGroup), transitions entre étapes du tunnel de commande, frise de
      statut de commande qui se remplit, compteur doré qui rebondit, cœur de wishlist qui
      s'anime, toasts cohérents, transitions partagées (View Transitions) entre liste et
      détail ; pas d'animations décoratives en cascade sur chaque élément.
- [ ] Effets signature étendus là où ils ont du sens : TiltCard sur toutes les cartes produit
      (wishlist, recommandations, commandes), loupe sur les visuels produits, halos et grille de
      points visibles sur toutes les pages publiques, version allégée en zone admin.
- [ ] Micro-interactions de formulaire : validation qui apparaît en douceur, état de succès
      animé (case cochée, confirmation), boutons avec état de chargement, sons d'interface
      optionnels (useUiSound) sur les confirmations importantes.
- [ ] Tests : un test par niveau d'effet pour chaque nouvel effet, parcours axe sur chaque page
      (le helper attend la fin des fondus), long-tasks.spec.ts étendu aux nouvelles pages
      animées, Lighthouse sur un build de production (budgets du lot 1 : LCP ≤ 2,5 s,
      CLS ≤ 0,1, TBT ≤ 200 ms) consigné dans le quickstart de la feature.
- [ ] Point avec l'utilisateur, captures avant / après à l'appui.
````

### Prompt `/speckit-specify` — 005-experience

````text
/speckit-specify Feature 005 « Expérience » du front cybertech : après les features 001 à 004,
repasser sur TOUTES les pages (boutique, compte, commande, wishlist, avis, admin) pour qu'elles
forment un ensemble cohérent, rempli et vivant, dans la direction artistique « Aurora Glow »
(annexe de specs/001-catalog-auth-cart/spec.md). Les effets existants servent de référence :
fond à grille de points et halos aurora, cartes inclinables, titre vivant, apparition en
cascade, fondu enchaîné et loupe de la fiche produit, pastille « vole vers le panier ».
User stories : (1) audit visuel complet avec captures et liste des écarts ; (2) harmonisation
des gabarits de page, en-têtes, cartes, boutons, tableaux, états vides et de chargement ;
(3) une animation orchestrée et utile par page, plus les micro-interactions de formulaire et de
confirmation ; (4) contenus réels utiles là où une page « fait vide » ; (5) contrôle de
performance et d'accessibilité de l'ensemble (axe, tâches longues, Lighthouse, reduced-motion).
Aucune donnée fictive ; toute valeur visuelle passe par le thème ; tout effet a une version
statique.
````

## 6. Rappels utiles

- Les endpoints manquants côté backend sont tenus à jour dans `docs/backend/api-map.md` §F :
  avis publics et note moyenne, devis de commande, paiement côté client (Payment Element,
  3DS), suppression de compte, suivi de livraison, liste publique des catégories, tri et
  facettes du catalogue.
- `quickstart.md` du lot 1 liste les scénarios encore à faire à la main (stock réel à 0,
  20 min de navigation, passage complet au clavier).
