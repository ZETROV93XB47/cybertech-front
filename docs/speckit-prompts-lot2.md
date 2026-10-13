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
- 002-account-orders : profil, commande (checkout), suivi et historique des commandes, carte
  bancaire enregistrée ;
- 003-engagement : wishlist, avis, recommandations personnalisées, événements comportementaux ;
- 004-admin : espace d'administration (utilisateurs, produits et images, commandes, remises,
  schémas de catégories, cartes bancaires, wishlists).
Pour chaque feature : /speckit-specify (prompts ci-dessous, docs/speckit-prompts-lot2.md),
/speckit-clarify, /speckit-plan, /speckit-tasks, /speckit-analyze, puis /speckit-implement
UNE user story par conversation.

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
2. Commande (checkout) depuis le panier du compte : choix du moyen de paiement (MASTERCARD,
   VISA, APPLE_PAY, GOOGLE_PAY), du type et du transporteur de livraison (STANDARD/EXPRESS,
   DHL/FEDEX), adresse, POST /management/order/place ; le paiement est déclenché côté serveur
   (Stripe, moyen de paiement configuré) : la page de confirmation interroge
   GET /order/status/{uuid} (polling borné) jusqu'à PAID ou PAYMENT_FAILED. Gérer 402
   PAYMENT_FAILED (POST /order/retry-payment/{uuid}), 409 CART_IS_EMPTY / NOT_ENOUGH_STOCK,
   403 USER_NOT_ACTIVE. Le récapitulatif de prix avant commande (remise, frais de port) n'a pas
   d'endpoint (§F, PriceCalculationRequestDto sans controller) : montrer le total panier et la
   remise active comme « estimés ».
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

## 5. Rappels utiles

- Les endpoints manquants côté backend sont tenus à jour dans `docs/backend/api-map.md` §F :
  avis publics et note moyenne, devis de commande, paiement côté client (Payment Element,
  3DS), suppression de compte, suivi de livraison, liste publique des catégories, tri et
  facettes du catalogue.
- `quickstart.md` du lot 1 liste les scénarios encore à faire à la main (stock réel à 0,
  20 min de navigation, passage complet au clavier).
