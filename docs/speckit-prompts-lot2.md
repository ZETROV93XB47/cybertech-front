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
Tu reprends le front cybertech (Next.js 16, App Router) après le lot 1
(specs/001-catalog-auth-cart/) et la feature 002 (specs/002-catalog-refresh/), livrés avec
Spec Kit (toutes les tâches cochées ; résultats et points restants dans leur quickstart.md §5). Objectif : couvrir tout le
périmètre fonctionnel exposé par le backend Spring, en plusieurs features Spec Kit successives.

Avant toute chose, lis (sans rien modifier) :
1. CLAUDE.md, puis .specify/memory/constitution.md (fait foi) ;
2. docs/backend/api-map.md (§2 à §13 et §F), docs/backend/analysis.md, docs/guest-cart.md ;
3. specs/001-catalog-auth-cart/ et specs/002-catalog-refresh/ : spec.md, plan.md, research.md,
   data-model.md, contracts/, tasks.md, quickstart.md (§3 et §5 : résultats et points restés
   manuels) ;
4. le code existant, pour réutiliser ses briques au lieu d'en créer de nouvelles :
   lib/api/client.ts (backendFetch, seul client HTTP serveur), lib/api/errors.ts (mapping des
   errorCode), lib/api/bff-response.ts, lib/api/bff-client.ts (bffGet/bffSend),
   lib/auth/guards.ts (getAccessTokenOrThrow, requireSession, readSessionToken),
   features/cart/hooks/useCart.ts (requêtes TanStack + mises à jour optimistes + rejeu après
   session expirée), features/auth (Server Actions, formulaire d'inscription accessible),
   lib/theme/theme.config.ts et components/effects (effets pilotés par useEffectiveEffects),
   tests/e2e/support (inscription de comptes de test, connexion Keycloak, axe).

Ensuite, rafraîchis la connaissance du backend, qui a évolué depuis le lot 1 (depuis la
feature 002 : facettes, devis de commande, options de livraison, détail du total des commandes,
remise conservée à la modification, retrait de place/auto ; api-map.md est à jour au
2026-10-13, vérifie seulement ce qui a changé depuis) :
- le repo backend est C:\Users\guill\Downloads\cybertech-dev-develop_cybertech, en LECTURE
  SEULE : relis les controllers, DTO et ErrorCode, et compare-les avec docs/backend/api-map.md ;
- avec le backend lancé sur http://localhost:8081, exécute `npm run gen:api` pour régénérer
  lib/api/schema.d.ts depuis /v3/api-docs ; si un errorCode a été ajouté, mets à jour
  lib/enums/error-code.ts et le mapping de lib/api/errors.ts (le test de type T020 le détecte) ;
- mets docs/backend/api-map.md à jour (endpoints, DTO, §E incohérences, §F manques) et
  résume-moi les écarts avant de lancer la première feature.

Découpage proposé, une feature Spec Kit par ligne, dans cet ordre :
- 002-catalog-refresh : TERMINÉE le 2026-10-13 (filtres, comparateur, navigation, gabarit
  commun, bannière, livraison et avis sur la fiche produit) ;
- 003-account-orders : profil, bouton « Passer commande » et réduction sur le panier, tunnel
  de commande, suivi et historique des commandes, carte bancaire enregistrée ;
- 004-engagement : wishlist, avis, recommandations personnalisées, événements comportementaux ;
- 005-admin : espace d'administration (utilisateurs, produits et images, commandes, remises,
  schémas de catégories, cartes bancaires, wishlists) ;
- 006-experience : harmonisation finale de toutes les pages, interface remplie et animée (§6).
Pour chaque feature : /speckit-specify (prompts ci-dessous, docs/speckit-prompts-lot2.md),
/speckit-clarify, /speckit-plan, /speckit-tasks, /speckit-analyze, puis /speckit-implement
UNE user story par conversation.

Chaque tasks.md DOIT se terminer par une phase « Interface vivante et cohérente » (voir §6 de
docs/speckit-prompts-lot2.md) : on ne livre pas une page fonctionnelle mais vide. Les effets de
la fiche produit (apparition en cascade RevealGroup, fondu enchaîné, loupe pilotée par le thème)
et du fond (grille de points, halos aurora) servent de référence de qualité. Après la feature
005, une feature 006-experience reprend toutes les pages (§6) pour l'harmonisation finale.

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
- serveur de vérification : `next dev -p 3123` avec NEXT_DIST_DIR=.next-verify et les variables
  d'environnement en ligne (playwright.capture.config.ts vise 3123) ; ensuite
  `git checkout -- tsconfig.json` (next dev y ajoute .next-verify) et supprimer .next-verify ;
- build de production à part : NEXT_DIST_DIR=.next-prod npx next build, puis next start sur
  un autre port (Lighthouse, backend injoignable) ;
- captures d'écran relues avant chaque point d'étape ; arrêt et point avec moi (en français) à
  la fin de chaque user story, commit en fin de story.

Ne commence pas à coder : fais d'abord le rafraîchissement du backend et le résumé des écarts.
````

---

## 2. Prompt `/speckit-specify` — 002-catalog-refresh

````text
/speckit-specify Feature 002 « Catalogue et navigation » du front cybertech, dans la continuité
du lot 1 (specs/001-catalog-auth-cart, même constitution, mêmes conventions : BFF, Zod, textes
au tutoiement dans features/*/messages.ts, thème unique, effets Aurora Glow, accessibilité AA).
Front seul : aucun nouvel endpoint backend n'est nécessaire. Backend : docs/backend/api-map.md
§3, §4, §D.10, §D.13, §F.

User stories (à prioriser) :
1. Filtres par attribut complets sur /products. Le backend les accepte déjà dans
   POST /product/search : `attributes` (Record<string, string[]>, égalité exacte sur
   attributes.<clé>.keyword) et `numericRanges` (Record<string, {min, max}>), décrits par le
   JSON Schema de la catégorie (GET /product-category-schemas/{categoryKey}). Le lot 1 n'en
   tire que les attributs numériques (plages : ram, memory, refreshRate) et les chaînes munies
   d'un `enum` ; or les schémas réels n'ont aucun `enum` : cpu, gpu, os, connectivity,
   displayType (COMPUTER) et resolution (MONITOR) ne sont donc pas filtrables aujourd'hui.
   - proposer pour chaque attribut texte une liste de valeurs à cocher, avec les valeurs
     réellement présentes dans le catalogue de la catégorie (aucune valeur inventée) ;
     source : POST /product/search/facets (demandé au backend, prompt 3 de
     docs/backend/backend-prompts-lot2.md : valeurs, compteurs disjonctifs, bornes min / max ;
     vérifier sa présence avec npm run gen:api) ; s'il n'est pas encore livré, repli côté BFF
     sur les valeurs extraites de POST /product/search pour la catégorie, mises en cache
     serveur avec le tag catalogue, bornées, sans compteurs ;
   - plages numériques avec les bornes du schéma (`minimum`) et les bornes observées ;
   - filtres actifs visibles en pastilles retirables une par une, « Tout effacer »,
     compteur de résultats, état dans l'URL (partage, retour arrière, fonctionnement sans
     JavaScript comme au lot 1), changement de catégorie qui retire les attributs de
     l'ancienne ;
   - libellés français des attributs et des valeurs connues dans features/catalog/messages.ts,
     repli lisible pour une clé inconnue ;
   - afficher le compteur de chaque valeur quand le backend le fournit, griser une valeur à 0 ;
   - rappel des contraintes : priceMin ≥ 100, pas de tri côté backend (à signaler, pas à
     simuler).
2. (Reportée le 2026-10-13, hors feature 002 : à reprendre plus tard.) Grille du catalogue à
   4 produits par ligne sur desktop (au lieu de 3), avec la colonne de
   filtres conservée : adapter la largeur de contenu, la taille des cartes et des images
   (next/image sizes), la taille de page (SEARCH_PAGE_SIZE = 24, multiple de 4, à garder
   cohérent) et les squelettes de chargement ; vérifier que les cartes restent lisibles (nom,
   prix, disponibilité, ajout au panier) et que le CLS reste ≤ 0,1.
3. Accueil et catalogue cohérents : même gabarit de page (largeur, marges, en-tête de page avec
   fil d'Ariane, LiveTitle et sous-titre), mêmes cartes produit (TiltCard, badge de
   disponibilité, bouton d'ajout), mêmes titres de section, même rythme vertical, même état
   vide et même squelette ; l'accueil met en avant des données réelles (meilleures ventes,
   catégories, offre active de GET /discounts/active, derniers produits consultés) avec des
   liens vers le catalogue préfiltré.
4. Barre de navigation cohérente : un seul composant d'en-tête pour toutes les pages (boutique,
   panier, inscription, et prêt pour /account, /checkout et /admin), liens principaux
   (Accueil, Catalogue, catégories COMPUTER et MONITOR), page courante signalée visuellement et
   par aria-current, recherche ⌘K, panier avec compteur, compte / connexion, préférences ;
   alignements, espacements, tailles d'icônes, états survol / focus / actif homogènes, tout
   en tokens du thème ; navigation clavier complète et lien d'évitement vers le contenu.
5. Comparateur de produits (2 à 3 produits d'une même catégorie), front seul :
   - chaque carte produit du catalogue porte une case à cocher « Comparer » (vraie case
     accessible, libellé incluant le nom du produit), et la fiche produit un bouton
     « Ajouter à la comparaison » ; la sélection dure le temps de l'onglet ;
   - la première case cochée fixe la catégorie de la comparaison : les cases des produits
     d'une autre catégorie sont désactivées avec une explication (infobulle et texte lu par
     les lecteurs d'écran) ; au 3e produit coché, les autres cases sont désactivées
     (« 3 produits maximum ») ; décocher libère la place ;
   - dès le 2e produit coché, une barre de comparaison apparaît (bas d'écran, animée,
     annoncée par aria-live) : vignettes des produits retenus, retrait d'un produit,
     « Tout effacer » et bouton « Comparer » ; avec un seul produit coché, elle invite à en
     choisir un autre ;
   - la sélection survit à la pagination, aux filtres et au retour depuis une fiche produit
     (stockage navigateur non sensible : identifiants seulement, revalidés par Zod,
     constitution IV) ; un produit devenu introuvable est retiré avec un message ;
   - « Comparer » ouvre un grand cadre (dialogue modal accessible : titre, piège de focus,
     Échap et bouton de fermeture, retour du focus sur le bouton) qui affiche les produits en
     colonnes alignées : en tête, image (next/image), nom, marque, prix, disponibilité en
     direct (GET /product/availability) et ajout au panier ; puis une ligne par
     caractéristique au format « nom d'attribut : valeur produit 1 | valeur produit 2 |
     valeur produit 3 » ;
   - les lignes suivent l'ordre et les libellés du JSON Schema de la catégorie (libellés
     français de features/catalog/messages.ts, mêmes valeurs que la fiche produit, unités
     comprises), une valeur absente s'affiche « — » ; option « Afficher seulement les
     différences » et mise en évidence discrète des valeurs qui diffèrent ;
   - tableau sémantique (en-têtes de colonne = produits, en-têtes de ligne = attributs),
     défilement horizontal interne si nécessaire, sans défilement de la page ;
   - données : ProductResponseDto (GET /product/get/{uuid}, via le cache catalogue du BFF)
     et le schéma de catégorie ; aucune donnée inventée ; aucun appel backend nouveau.

Terminer par la phase « Interface vivante et cohérente » (§6) appliquée à l'accueil, au
catalogue, à l'en-tête et au comparateur, avec captures avant / après.
````

---

## 3. Prompt `/speckit-specify` — 003-account-orders

````text
/speckit-specify Feature 003 « Mon compte et mes commandes » du front cybertech, dans la
continuité du lot 1 et de la feature 002 (specs/001-catalog-auth-cart,
specs/002-catalog-refresh : même constitution, mêmes conventions : BFF, Zod, textes au
tutoiement dans features/*/messages.ts, thème unique, effets Aurora Glow, accessibilité AA ;
réutiliser le gabarit commun PageShell / PageHeader / SectionHeading / EmptyState, la barre de
navigation MainNav et les entrées CSS .enter-rise / .enter-fade). Le backend fait foi
(docs/backend/api-map.md §2, §7, §7b, §8, §12, §D.17, §D.27, §D.28) ; ne jamais inventer un
endpoint : un besoin non couvert est listé comme « dépendance backend ».

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
   - montants avant commande : POST /management/order/quote (USER, api-map §7, §D.27) chiffre le
     panier serveur pour un type, un transporteur et une `discountKey` : sous-total, remise
     (`discountApplied` faux sous `minOrderAmount`, le backend retire alors la remise sans
     erreur : le dire clairement), frais de port, total, devise. Le récapitulatif et le bloc
     réduction affichent CES montants, jamais un calcul du front ; un nouveau devis à chaque
     changement de type, transporteur ou réduction (requête annulée si une autre part) ;
   - livraison : choix du type et du transporteur depuis GET /shipping/options (public, prix
     réels, api-map §7b), en réutilisant ce que la fiche produit utilise déjà
     (lib/api/endpoints/shipping.ts, features/catalog/delivery.ts : délais indicatifs du front,
     promesse express) ; pas de retrait en magasin (absent du backend, demandé dans
     docs/backend/backend-prompts-lot2.md §9) ;
   - POST /management/order/place (400 DISCOUNT_TYPE_NOT_ACTIVE si la campagne a expiré
     entre-temps), puis page de confirmation qui interroge GET /order/status/{uuid} (polling
     borné) jusqu'à PAID ou PAYMENT_FAILED : place ne renvoie jamais 402, un paiement refusé
     se lit dans le statut et se relance par POST /order/retry-payment/{uuid} (402, 409
     PAYMENT_ALREADY_COMPLETED, 422) ; gérer 409 CART_IS_EMPTY / NOT_ENOUGH_STOCK (retour au
     panier avec les lignes concernées), 403 USER_NOT_ACTIVE ; vider le cache du panier après
     la commande (le backend vide le panier serveur).
3. Mes commandes : liste paginée (GET /order/mine, filtre par statut, tri createdAt desc),
   détail (GET /order/get/{uuid}) avec la décomposition du total renvoyée par OrderResponseDto
   (sous-total, remise et sa clé, frais de port, type et transporteur ; ces champs valent null
   sur les commandes antérieures : n'afficher alors que le total), frise du cycle de vie (CREATED → AWAITING_PAYMENT →
   PAID → AWAITING_SHIPPING → SHIPPED → DELIVERED, plus CANCELED, REFUNDED, RETURNED,
   PAYMENT_FAILED), modification (POST /order/update, qui garde la remise d'origine de la
   commande) et annulation (POST /order/cancel) quand le statut le permet (409
   ORDER_ALREADY_SHIPPED, CANNOT_CANCEL_ORDER, ORDER_REFUND_FAILED).
4. Carte bancaire enregistrée (une par utilisateur) : voir la carte masquée (GET
   /bank-card/get, 404 = aucune carte), modifier le titulaire et l'expiration (PUT
   /bank-card/update, 400 BANK_CARD_EXPIRED), supprimer avec confirmation (DELETE
   /bank-card/delete). Décision du 2026-10-14 (constitution V v2.3.0) : **ajout de carte
   depuis le front via Stripe Elements** (SetupIntent, le numéro ne passe jamais par le front
   ni le backend), carte utilisée par le backend à chaque paiement, ce qui permet de choisir
   l'issue avec les cartes de test Stripe (docs/backend/backend-prompts-lot2.md §10) ; une
   commande exige une carte enregistrée (404 BANK_CARD_NOT_FOUND).

Pages privées sous /account/** protégées par proxy.ts et requireSession, réponses no-store,
rejeu d'action après session expirée comme pour le panier. États vides et d'erreur illustrés
(StateIllustration), apparition orchestrée (RevealGroup) sans multiplier les animations.
````

---

## 4. Prompt `/speckit-specify` — 004-engagement

````text
/speckit-specify Feature 004 « Wishlist, avis et recommandations » du front cybertech, même
socle que les features 001 à 003. Backend : docs/backend/api-map.md §9, §10, §11.

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
   Constats backend du 2026-10-13 (GorseSyncTasklet, GorseMapper) à intégrer :
   - les événements sont stockés dans MongoDB puis poussés vers Gorse par une tâche planifiée :
     les recommandations ne réagissent pas en direct, ne pas le promettre dans l'interface ;
   - Gorse n'accepte un retour qu'avec un utilisateur ET un produit : un événement sans
     productId (SEARCH_QUERY sans produit) est stocké mais n'alimente pas les recommandations ;
     privilégier SEARCH_RESULT_CLICK avec le produit cliqué ;
   - brancher aussi les surfaces de la feature 002 : clic sur une valeur de filtre (CLICK sans
     produit, donc sans effet Gorse : à n'envoyer que si utile), ajout à la comparaison et
     ouverture du cadre de comparaison (CLICK avec productId en attendant un type COMPARE ;
     prompt 7 optionnel de docs/backend/backend-prompts-lot2.md).
````

---

## 5. Prompt `/speckit-specify` — 005-admin

````text
/speckit-specify Feature 005 « Espace d'administration » du front cybertech, même socle que
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
3. Commandes : liste filtrable par statut et par utilisateur, détail, suppression (pas de
   création de commande de test : POST /admin/management/order/place/auto est écarté et
   devrait être retiré du backend).
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

## 6. Phase « Interface vivante et cohérente » (à la fin de chaque feature, puis 006-experience)

À ajouter telle quelle en dernière phase de chaque `tasks.md` (002 à 005), puis comme
feature complète `006-experience` qui repasse sur TOUTES les pages (lot 1 compris). Utiliser le
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

### Prompt `/speckit-specify` — 006-experience

````text
/speckit-specify Feature 006 « Expérience » du front cybertech : après les features 001 à 005,
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

## 7. Rappels utiles

- Les endpoints manquants côté backend sont tenus à jour dans `docs/backend/api-map.md` §F :
  avis publics et note moyenne (demandé, backend-prompts-lot2 §8), délais de livraison et
  retrait en magasin (§9), paiement côté client (Payment Element, 3DS), suppression de
  compte, suivi de livraison, liste publique des catégories, tri du catalogue. Livrés depuis :
  facettes, devis de commande, options de livraison, détail du total des commandes.
- `quickstart.md` du lot 1 liste les scénarios encore à faire à la main (stock réel à 0,
  20 min de navigation, passage complet au clavier).

---

## 8. Après la feature 005 (backend au 2026-11-16, commit `a73ff77`)

> Mis à jour le 2026-11-16 à partir de `progress.md` et `PLAN.md` du backend. Le découpage du
> §1 a changé en route : la feature 005 a été le **Web Push** (specs/005-web-push-notifications,
> terminée hors vérifications manuelles), l'administration n'est pas commencée. Prochaine
> feature : **006-loyalty** (§8.1). La reprise du Web Push (§8.2) est un correctif court de la
> feature 005, pas une nouvelle feature. Les features « admin » (§5) et « experience » (§6)
> prendront les numéros libres suivants (Spec Kit numérote d'après `specs/`).
> Ordre conseillé : §8.0, §8.2 (court), §8.1, §8.3, §8.4, puis admin et experience.

### 8.0 Rafraîchissement du backend (préalable commun à §8.1 à §8.4)

````text
Avant de spécifier quoi que ce soit, rafraîchis la connaissance du backend
(C:\Users\guill\Downloads\cybertech-dev-develop_cybertech, LECTURE SEULE) : il a beaucoup bougé
depuis la dernière version vérifiée dans docs/backend/api-map.md. Lis la section 1 (SITTREP) et
la section 2 de son progress.md (entrées du 2026-10-20 au 2026-11-16), son PLAN.md, puis
docs/stock-alert.md et docs/web-push.md.

1. Backend lancé sur http://localhost:8081 : `npm run gen:api`. Attendu dans lib/api/schema.d.ts :
   chemins /loyalty/me, /loyalty/me/history, /loyalty/tiers, /stock-alerts/**,
   /recommendations/unsubscribe/{token} ; champs deliveredAt, loyaltyTierKey,
   loyaltyPointsSpent (OrderResponseDto), loyaltyTierKey (OrderPlacingRequestDto,
   OrderQuoteRequestDto), loyaltyTierKey + loyaltyPointsCost (OrderQuoteResponseDto),
   maxUsesPerUser (DiscountContext), recommendationEmailEnabled (UserResponseDto).
2. lib/enums/error-code.ts : 9 errorCode du backend manquent, le test de type T020 casse tant
   qu'ils n'y sont pas. Les ajouter TOUS, avec un mapping dans lib/api/errors.ts :
   DISCOUNT_USAGE_LIMIT_REACHED (409), LOYALTY_REWARD_NOT_COMBINABLE (400),
   LOYALTY_TIER_NOT_FOUND (404), INSUFFICIENT_LOYALTY_POINTS (409),
   LOYALTY_REWARD_MIN_ORDER_NOT_REACHED (409), REVIEW_ALREADY_EXISTS (409),
   STOCK_ALERT_ALREADY_EXISTS (409), PRODUCT_ALREADY_IN_STOCK (409),
   RECOMMENDATION_UNSUBSCRIBE_TOKEN_NOT_FOUND (404). Ceux qui ne servent pas encore à une page
   reçoivent un code front générique, sans texte inventé.
3. Mets docs/backend/api-map.md à jour (nouveau commit vérifié, §Fidélité, §Alertes de stock,
   champs ajoutés, §E incohérences, §F manques), puis résume-moi les écarts avant de lancer
   /speckit-specify.
````

### 8.1 Prompt `/speckit-specify` — 006-loyalty

````text
/speckit-specify Feature 006 « Points de fidélité » du front cybertech, même socle que les
features 001 à 005 (constitution, CLAUDE.md : BFF obligatoire, Zod, zéro magic string, enums
string, TSDoc, textes au tutoiement dans features/*/messages.ts, thème unique, menus déroulants
au design « Catalogue », accessibilité AA ; réutiliser PageShell / PageHeader / SectionHeading /
EmptyState / StateIllustration / RevealGroup et la navigation du compte
features/account/account-sections.ts). Le backend fait foi (livré le 2026-11-16, commits
a6a7a8d et a73ff77 ; LoyaltyController, LoyaltyServiceImp, DTO
dto/response/loyalty/*, OrderQuoteResponseDto, OrderPlacingRequestDto) ; ne jamais inventer
un endpoint ni recalculer un montant ou un solde côté front.

Règles métier du backend (à reprendre dans la spec, sans les réimplémenter) :
- 1 point par euro payé sur les produits (après remise, hors frais de port, arrondi inférieur).
- Points « en attente » tant que la commande payée n'est pas livrée (PAID, AWAITING_SHIPPING,
  SHIPPED), « disponibles » à DELIVERED. Une commande passe SHIPPED → DELIVERED environ 1 h après
  l'expédition (job toutes les 10 min) : compter 1 h 40 à 1 h 50 après le paiement. Une
  commande annulée avant livraison fait simplement disparaître ses points en attente.
- Les points d'un achat expirent 12 mois après le crédit (lots, les plus anciens dépensés
  d'abord).
- 5 paliers actifs, triés par points (seedés, modifiables en base, donc lus, jamais codés en
  dur) : BRONZE 500 → -5 % ; SILVER 1 000 → -7 % ; GOLD 2 500 → bon de 25 € dès 100 € de
  produits ; PLATINUM 5 000 → -8 % + livraison offerte ; DIAMOND 10 000 → -10 % + livraison
  offerte. Utiliser un palier dépense exactement requiredPoints.
- Une récompense par commande, jamais cumulée avec une campagne de remise.

Endpoints (préfixe /api/v1/services) :
- GET /loyalty/me (connecté) → { availablePoints, pendingPoints,
  pendingOrders[{ orderUuid, orderStatus, points }], nextExpiringPoints, nextExpirationAt
  (LocalDateTime sans fuseau, null sans points disponibles), unlockedTierKeys[], tiers[] }.
  Un compte qui n'a jamais rien gagné reçoit 200 avec des zéros, pas un 404.
- GET /loyalty/me/history (connecté) → PagedModel de { uuid, type (EARN | REDEEM |
  REDEEM_CANCELED | EXPIRE), points (signé), occurredAt, expiresAt et remainingPoints (lots :
  EARN et REDEEM_CANCELED), orderUuid (null pour EXPIRE), tierKey (REDEEM / REDEEM_CANCELED) },
  20 par page, tri occurredAt desc.
- GET /loyalty/tiers (public) → [{ tierKey, label, requiredPoints, percentage, fixedAmount,
  minOrderAmount, maxDiscountAmount, freeShipping }]. `label` est un texte français du backend :
  les libellés affichés viennent de features/loyalty/messages.ts (par tierKey), `label` ne sert
  que de repli pour un palier inconnu du front.
- POST /management/order/quote et /management/order/place : nouveau champ facultatif
  loyaltyTierKey. Avec une récompense, discountKey DOIT valoir NO_DISCOUNT. Le devis renvoie
  alors discountKey = LOYALTY_<tierKey>, loyaltyTierKey, loyaltyPointsCost, discountAmount, et
  shippingCost = 0 pour un palier « livraison offerte ». Erreurs, identiques au devis et à la
  commande : 400 LOYALTY_REWARD_NOT_COMBINABLE, 404 LOYALTY_TIER_NOT_FOUND (palier désactivé
  entre-temps), 409 INSUFFICIENT_LOYALTY_POINTS (points dépensés ou expirés entre-temps), 409
  LOYALTY_REWARD_MIN_ORDER_NOT_REACHED (GOLD sous 100 € de produits). Les points sont retirés
  à la création de la commande, et rendus si elle est annulée (par toi ou par le batch d'une
  commande impayée), remboursée ou supprimée : ils reviennent comme un nouveau lot de 12 mois.
- OrderResponseDto : deliveredAt, loyaltyTierKey, loyaltyPointsSpent ; discountKey vaut
  LOYALTY_<tierKey> pour une commande payée avec une récompense (préfixe
  LOYALTY_REWARD_DISCOUNT_KEY_PREFIX du backend : le reprendre en constante front, et ne
  jamais afficher cette clé brute ni la chercher parmi les campagnes de GET /discounts/active).

User stories :

1. (P1) Page « Mes points » (/account/points, nouvelle entrée de la navigation du compte, icône
   lucide) :
   - en tête : points disponibles (grand chiffre doré en JetBrains Mono, compteur qui monte à
     l'affichage, version statique sans animation), points en attente, prochaine expiration
     (« 300 points expirent le 12 novembre 2027 », masqué sans points disponibles) ;
   - progression vers le palier suivant : barre qui se remplit, « Encore 1 250 points pour
     Or », paliers débloqués marqués (unlockedTierKeys) ; tous les paliers en cartes avec leur
     avantage décrit en clair depuis les champs (pourcentage, bon et son minimum, plafond,
     livraison offerte), jamais depuis une liste codée en dur ;
   - points en attente par commande : lien vers la commande (orderPath), statut
     (OrderStatusBadge existant), points, et l'explication « disponibles à la livraison » ;
   - historique paginé (pagination existante des commandes) : type en libellé humain (gagnés,
     utilisés, rendus, expirés), points signés colorés (gain / perte, jamais en rouge agressif),
     date, lien vers la commande quand orderUuid existe, palier utilisé, reste et expiration
     d'un lot ;
   - états : chargement (skeleton-shimmer), aucun point et aucun historique (StateIllustration
     + « Passe ta première commande pour gagner des points », lien catalogue), erreur backend
     avec réessai ; dates affichées en Europe/Paris ;
   - un rappel discret du solde ailleurs : menu du compte (« 1 250 pts ») et page de détail
     d'une commande livrée (« Cette commande t'a rapporté 249 points », depuis l'historique ou
     le calcul déjà fait par le backend, sans recalcul) — à ne garder que si la donnée est
     disponible sans appel supplémentaire par ligne.

2. (P1) Utiliser une récompense au checkout (tunnel /checkout existant, features/checkout :
   DiscountBlock, DiscountChooser, discount-selection.ts, useDiscountedQuote, usePlaceOrder,
   CheckoutSummary) :
   - un bloc « Utiliser mes points » à côté du bloc réduction, alimenté par GET /loyalty/me :
     les paliers débloqués se choisissent (liste au design « Catalogue », barre dorée sur le
     choix, option « Ne pas utiliser de points »), les autres sont visibles mais désactivés avec
     les points qui manquent ; solde affiché ;
   - exclusivité, côté interface ET requête : choisir une récompense désactive le champ et la
     liste de réduction (texte « Une récompense ne se cumule pas avec une réduction »), et
     inversement ; une réduction déjà appliquée est retirée en le disant ; la requête n'envoie
     jamais discountKey ≠ NO_DISCOUNT avec loyaltyTierKey (le 400 ne doit jamais arriver) ;
   - nouveau devis à chaque choix (requête annulée si une autre part, comme aujourd'hui) ; le
     récapitulatif affiche les montants du devis : remise « Récompense Or », frais de port
     barrés « offerts » quand shippingCost = 0 grâce au palier, et « −2 500 points » à côté du
     total ; le reste du solde après commande ;
   - erreurs du devis et de la commande traduites dans features/checkout/messages.ts :
     minimum non atteint (« Ajoute 12,40 € de produits pour utiliser ce bon », montant tiré de
     minOrderAmount et du sous-total du devis), points insuffisants (solde relu, choix retiré),
     palier indisponible (liste relue) ; aucune n'efface le panier ni l'adresse saisie ;
   - au passage, mapper DISCOUNT_USAGE_LIMIT_REACHED (409 au devis et à la commande : « Tu as
     déjà utilisé cette réduction ») dans le même bloc d'erreurs, et afficher maxUsesPerUser sur
     les cartes de /promotions quand il est renseigné (« 1 utilisation par client ») ;
   - le choix survit à un rechargement du tunnel comme le reste du brouillon
     (checkout-draft.ts), revalidé par Zod et contre le solde relu ;
   - visiteur : rien ne change, le bloc n'apparaît qu'une fois connecté (la fusion du panier
     invité est déjà en place).

3. (P2) La récompense sur mes commandes (features/orders) :
   - détail d'une commande : ligne de remise « Récompense Or (2 500 points) » au lieu de la clé
     LOYALTY_GOLD, livraison offerte, date de livraison réelle (deliveredAt) dans la frise
     OrderTimeline à la place de la date estimée une fois livrée ; liste des commandes :
     petite mention de la récompense ;
   - modification d'une commande payée avec une récompense : la récompense est conservée par
     le backend ; prévenir avant d'enregistrer que passer sous le minimum du palier fait perdre
     la remise sans rendre les points (remarque backend du 2026-11-16) ; le devis de la
     modification, s'il existe, fait foi ;
   - annulation : la boîte de confirmation précise que les points utilisés seront rendus,
     valables 12 mois.

Hors périmètre (à lister dans la spec) : administration des paliers (pas d'endpoint admin),
notification « commande livrée » (le backend n'en envoie pas), retrait de points après un
retour (pas de flux de retour), cumul récompense + campagne.

Vérification réelle (à décrire dans quickstart.md) : une commande payée apparaît en attente
dans « Mes points », puis disponible après le passage à DELIVERED (attendre le job, ou baisser
cybertech.shipping.delivery-delay dans le backend local, que je lance moi-même) ; un compte de
test avec assez de points pour GOLD (à créditer via des commandes livrées, ou en SQL sur la base
locale si je le valide) passe une commande avec la récompense : devis = total débité, points
retirés, historique REDEEM ; annulation → REDEEM_CANCELED et solde rendu.
Terminer par la phase « Interface vivante et cohérente » (§6) sur /account/points, le bloc
récompense du checkout et le détail de commande.
````

### 8.2 Prompt — Web Push : reprise de la feature 005

````text
Reprise courte de la feature 005 Web Push (specs/005-web-push-notifications), sans nouvelle
spec : ajoute à son spec.md une exigence, à contracts/bff-routes.md §6 le nouveau message, et à
tasks.md une phase « Suivi du 2026-11-16 », puis implémente-la. Même socle (constitution,
CLAUDE.md). Backend en lecture seule : docs/stock-alert.md, docs/web-push.md,
WebPushDeliveryServiceImp, PushNotificationProcessor.

Ce qui a changé côté backend depuis la feature 005 :
- Nouveau push « De nouveau disponible » envoyé par le job STOCK_ALERT_JOB à chaque navigateur
  abonné d'un utilisateur qui a demandé une alerte de retour en stock :
  { title: "De nouveau disponible", body: "<produit> est de nouveau en stock.",
    url: "/products/{productUuid}", productUuid } — SANS orderUuid.
  Aujourd'hui public/sw-core.js (parsePushMessage) exige un orderUuid : ce message est jeté en
  silence. Les push commande (« Paiement confirmé », « Commande expédiée ») sont inchangés.
- Les clés VAPID du backend local sont maintenant dans son fichier .env.local (gitignoré,
  WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY, modèle .env.local.example), plus en variables
  IntelliJ ni dans Vault (supprimé du projet).

Travail demandé :
1. public/sw-core.js : un message est valide avec SOIT un orderUuid, SOIT un productUuid (UUID
   tous les deux), title et url non vides, body chaîne. Tag : `order-{uuid}` pour une commande
   (inchangé), `product-{uuid}` pour un produit (nouvelle constante, reprise dans
   lib/constants/push.ts et vérifiée par tests/unit/push/sw-core.test.ts comme les autres) :
   deux alertes de produits différents ne se remplacent pas, deux alertes du même produit si.
   Un message avec les deux identifiants ou aucun est refusé. Le contrôle de l'URL de clic
   (safeNotificationPath) ne change pas ; vérifier que /products/{uuid} correspond bien à la
   route app/(shop)/products/[uuid].
2. Types JSDoc et TSDoc à jour (PushMessage devient une union commande | produit), sans `any`.
3. Tests Vitest : message produit valide, tag produit, les deux identifiants → refusé, aucun →
   refusé, productUuid non-UUID → refusé, message commande inchangé (non-régression).
4. README / quickstart de la feature 005 : clés VAPID dans le .env.local du backend ;
   nouvelle étape de vérification manuelle du push produit.
5. Hors périmètre de cette reprise (à noter, pas à faire) : le bouton « M'alerter du retour en
   stock » sur une fiche en rupture et la page « Mes alertes » (POST / DELETE
   /stock-alerts/{productUuid}, GET /stock-alerts/mine ; 409 PRODUCT_ALREADY_IN_STOCK et
   STOCK_ALERT_ALREADY_EXISTS). Sans ce bouton, aucun utilisateur ne peut encore recevoir le
   push produit : il sera vérifié de bout en bout avec cette future feature.

Vérifications manuelles restées ouvertes (quickstart 005 §3, §4.2, §4.4, §5.3), à me rappeler
en fin de session sans les cocher à ma place : réception réelle dans mon Chrome et clic qui
ouvre la commande ; interrupteur coupé → aucune notification après un paiement ; blocage dans
les paramètres du site ; déconnexion en moins de 3 s avec le backend coupé.

Fini quand typecheck, lint (0 warning) et test passent, que les exports sont documentés et que
tasks.md est coché.
````

### 8.3 Prompt `/speckit-specify` — alertes de retour en stock

> À lancer après §8.2 (le Service Worker doit déjà accepter le push produit).

````text
/speckit-specify Feature « Alertes de retour en stock » du front cybertech, même socle que les
features précédentes (constitution, CLAUDE.md, BFF, Zod, messages FR au tutoiement, thème
unique, menus au design « Catalogue », AA). Backend livré le 2026-11-07, lecture seule :
docs/stock-alert.md, StockAlertController, StockAlertResponseDto.

Contrat (préfixe /api/v1/services, connecté) :
- POST /stock-alerts/{productUuid} → 201 { uuid, product (ProductResponseDto), status,
  requestedAt } ; 404 PRODUCT_NOT_FOUND ; 409 PRODUCT_ALREADY_IN_STOCK (le produit est revenu
  entre-temps) ; 409 STOCK_ALERT_ALREADY_EXISTS (à traiter comme un succès : l'alerte existe).
- DELETE /stock-alerts/{productUuid} → 204, idempotent.
- GET /stock-alerts/mine → PagedModel des alertes EN ATTENTE (20 par page, requestedAt desc).
- « Disponible » = stock − réservé > 0 (même définition que GET /product/availability). Le job
  passe toutes les 10 min : email + Web Push « De nouveau disponible » (url /products/{uuid})
  puis l'alerte est close (une alerte = un envoi). Sans retour en stock, elle expire après
  90 jours. Tous les abonnés sont prévenus, même s'il ne revient qu'une unité.

User stories :
1. (P1) Bouton « M'alerter du retour en stock » sur la fiche d'un produit en rupture (à la
   place de l'ajout au panier désactivé, AvailabilityBadge / AddToCartButton existants) et sur
   la carte produit en rupture : visiteur → connexion puis rejeu de l'action (même mécanisme
   que le panier et la wishlist) ; état « Alerte activée · Annuler » ; 409
   PRODUCT_ALREADY_IN_STOCK → rafraîchir la disponibilité et proposer l'ajout au panier.
   L'état initial se lit depuis GET /stock-alerts/mine (une seule requête par page, mise en
   cache TanStack, pas un appel par carte).
2. (P1) Page « Mes alertes » (/account/alerts, entrée de la navigation du compte) : produits
   attendus (cartes produit existantes, date de la demande, « expire le … » = requestedAt +
   90 jours, constante documentée), retrait d'une alerte avec mise à jour optimiste,
   pagination, état vide illustré.
3. (P2) Lien avec les notifications : après l'activation d'une alerte, si le navigateur n'est
   pas abonné au Web Push et qu'il le supporte, proposer « Sois aussi prévenu sur ce
   navigateur » (activation existante de features/notifications, jamais de demande de
   permission sans clic). L'email part de toute façon.

Vérification réelle (quickstart) : produit mis à 0 par l'admin (backend local), alerte depuis
la fiche, stock remis, attendre le job : email dans Mailpit, push produit reçu, clic qui ouvre
la fiche, alerte disparue de « Mes alertes ». Terminer par la phase « Interface vivante et
cohérente » (§6).
````

### 8.4 Prompt `/speckit-specify` — recommandations et email de suggestions

````text
/speckit-specify Feature « Recommandations » du front cybertech (reprend la story 3 et la story
4 du §4 de docs/speckit-prompts-lot2.md, jamais livrées, mises à jour d'après le backend du
2026-10-22 et du 2026-11-07 : docs/recommendation-events.md, RecommendationController,
UserEventController, UserEventDto). Même socle que les features précédentes.

Ce qui a changé côté backend : il produit LUI-MÊME les signaux PURCHASE, ADD_TO_CART,
REMOVE_FROM_CART, WISHLIST_ADD, RATING_* et REVIEW_* ; le front ne doit plus les envoyer (400
avec fieldErrors[eventType]). Seuls les signaux du navigateur restent acceptés : VIEW, CLICK,
COMPARE, SEARCH_RESULT_CLICK, SCROLL_DEPTH_HIGH, HOVER, SEARCH_QUERY, IGNORE_RECOMMENDATION,
BOUNCE.

User stories :
1. (P1) Bloc « Pour toi » sur l'accueil d'un utilisateur connecté
   (GET /recommendations/my-recommendations?n=, liste de ProductResponseDto), cartes produit
   existantes ; repli silencieux sur le contenu actuel si la liste est vide ou en erreur. Ne
   pas promettre de recommandations « en direct » : Gorse apprend par lots.
2. (P1) Signaux du navigateur, via UNE route BFF qui groupe : VIEW à l'ouverture d'une fiche
   (RecordProductView existe déjà pour les produits consultés), COMPARE à l'ajout au
   comparateur, SEARCH_RESULT_CLICK au clic sur un résultat de recherche (⌘K et catalogue).
   Envoi par lots vers POST /events/consume-events (1 à 50 événements, 201 { accepted,
   ignored }), sendBeacon / visibilitychange pour ne rien perdre en quittant, jamais bloquant ;
   rôle USER seulement (rien pour un visiteur) ; productId obligatoire ; sessionId aléatoire
   par onglet, sans donnée personnelle ; 429 (120/min/utilisateur) → on abandonne le lot, sans
   réessayer en boucle. Écrire dans la spec ce qui est collecté (transparence).
3. (P1) Email quotidien de suggestions :
   - page publique /unsubscribe/recommendations?token=… (lien de chaque email, chemin fixé
     par cybertech.recommendation.digest.unsubscribe-path) : le POST ne part qu'après un clic
     sur « Me désinscrire » (un lien d'email ne doit pas désinscrire au simple chargement, les
     antivirus de messagerie ouvrent les liens) ; 204 → confirmation ; 404
     RECOMMENDATION_UNSUBSCRIBE_TOKEN_NOT_FOUND → « lien invalide ou déjà utilisé » ; 400 →
     même message ; lien vers le profil pour se réabonner ;
   - profil : case « Recevoir mes suggestions par email » (recommendationEmailEnabled de
     GET /user/me, PATCH /user/me), avec un texte qui dit ce que contient l'email (6 produits,
     au plus un par jour).

Vérification réelle : backend local avec RECOMMENDATION_DIGEST_JOB_ACTIVATED=true et un cron
rapproché (je le règle moi-même) ; email lu dans Mailpit, lien produit qui ouvre la bonne
fiche, lien de désinscription qui coche bien la case du profil ; événements visibles dans
MongoDB (userEventsDB.user_events, sessionId du navigateur). Terminer par la phase
« Interface vivante et cohérente » (§6).
````
