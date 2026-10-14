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
   /bank-card/delete). Décision validée : **pas d'ajout de carte depuis le front** (POST
   /bank-card/add exigerait de saisir le PAN, interdit par la constitution V v2.2.0 ; le
   paiement est de toute façon simulé côté serveur) ; l'expliquer simplement dans l'état
   « aucune carte ».

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
