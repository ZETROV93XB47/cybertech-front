# Prompts pour le Claude du backend — besoins du lot 2 du front

> À coller dans une conversation Claude Code ouverte à la racine du repo backend
> `cybertech-dev-develop_cybertech` (branche `develop_back`). Rédigés le 2026-10-13 à partir de
> la relecture du commit `a833e58` (voir `docs/backend/api-map.md` §5, §7, §E 23-28, §F).
> Ordre conseillé : 0 (contexte), puis 1 → 2 → 3 → 4 → 5 ; les prompts 6 et 7 sont optionnels.
> Le prompt 3 (facettes du catalogue) est indépendant des autres : il débloque la feature
> front 002-catalog-refresh et peut passer en premier.
> Le prompt 2 dépend du prompt 1 (instantané de la remise). Une conversation par prompt
> numéroté, un commit par prompt.

---

## 0. Contexte commun (à coller en premier dans chaque conversation)

````text
Contexte : le front Next.js de cybertech (repo séparé, qui ne lit ton code qu'en lecture seule)
attaque les filtres du catalogue, le tunnel de commande et l'historique des commandes. Il a
besoin que l'API expose les facettes du catalogue, le détail du prix d'une commande et les
frais de port, et il a relevé un défaut sur la modification de commande. Le front n'a aucune
autre source que ton API et ton OpenAPI.

Règles :
- lis d'abord CLAUDE.md et progress.md, puis respecte les conventions du repo (constantes dans
  CyberTechAppConstants, exceptions mappées dans ErrorManagementController avec un ErrorCode,
  logs métier comme dans CartServiceImp, Javadoc sur les méthodes publiques, code en anglais) ;
- n'invente aucun nouvel ErrorCode sans le justifier ; ne renomme ni ne supprime aucun champ
  existant d'un DTO de réponse (le front valide les réponses avec Zod : ajouter est sans risque,
  renommer casse) ;
- tests : unitaires sur le service, test de controller (slice) et, si un IT existe déjà pour le
  parcours, étends-le ; `./mvnw test` vert avant de conclure ;
- à la fin : régénère docs/openapi/openapi.yaml depuis springdoc, resynchronise la collection
  Postman docs/postman/Cybertech-API.postman_collection.json, ajoute une ligne dans
  progress.md, puis un commit Conventional Commits (en anglais) ;
- termine par un résumé en français : contrat final (chemins, champs, codes HTTP), fichiers
  touchés, tests ajoutés, et tout écart avec ce qui t'était demandé.
````

---

## 1. Détail du prix dans `OrderResponseDto`

````text
Objectif : qu'une commande renvoyée par l'API dise de quoi son total est fait.

Constat :
- OrderResponseDto (dto/response/order/OrderResponseDto.java) n'expose que totalAmount et
  refundedAmount. OrderCreationTransactionalDelegateImp calcule pourtant un
  PriceCalculationResultDto complet (baseAmount, discountAmount, shippingCost, finalAmount,
  currencyCode, discountKey) puis n'en garde que finalAmount dans OrderEntity.
- OrderEntity connaît déjà discountKey (colonne discountType), shippingType et
  shippingProvider, mais pas le sous-total, le montant de remise ni les frais de port.

Travail demandé :
1. Persister sur OrderEntity, au moment de la création, le détail du calcul : sous-total des
   lignes, montant de la remise, frais de port (mêmes Money/devise que totalAmount), ainsi
   qu'un instantané des conditions de la remise appliquée : calculationType, percentage,
   fixedAmount, minOrderAmount, maxDiscountAmount (un @Embeddable dédié est bienvenu). Cet
   instantané sert au prompt suivant (modification de commande) : la commande garde les
   conditions sous lesquelles elle a été passée, même si la campagne est ensuite désactivée,
   modifiée ou expirée.
   Colonnes nullables : en dev, ddl-auto=update les crée ; les commandes existantes restent
   lisibles avec ces champs à null. En prod (ddl-auto=validate), signale dans ton résumé les
   colonnes à ajouter.
2. Ajouter à OrderResponseDto, sans toucher aux champs existants :
   - currency (code ISO, "EUR") ;
   - subtotalAmount (somme des lignes avant remise) ;
   - discountKey (NO_DISCOUNT si aucune), discountCalculationType, discountAmount ;
   - shippingType, shippingProvider, shippingCost ;
   - createdAt (LocalDateTime de orderDate, l'actuel orderDate n'étant qu'une LocalDate).
   Invariant à tester : totalAmount = max(0, subtotalAmount − discountAmount) + shippingCost.
   Pour une commande antérieure au changement, les nouveaux champs peuvent être null :
   documente-le dans la Javadoc et le schéma OpenAPI (nullable).
3. Mettre à jour OrderMapper (mappers/entity/OrderMapper.java), en profitant pour traiter les
   TODO « mapper correctement ce champ » de OrderResponseDto si c'est sans risque.
4. Les endpoints concernés renvoient ces champs : POST /management/order/place,
   GET /get/{uuid}, GET /mine, POST /update, POST /cancel, POST /retry-payment/{uuid}, et
   GET /admin/management/order/get/all.

Tests : une commande sans remise, une avec PERCENTAGE plafonnée par maxDiscountAmount, une
avec FIXED_AMOUNT, une BUY_ONE_GET_ONE_FREE, une sous minOrderAmount (remise 0, discountKey
conservé), en STANDARD et EXPRESS ; vérifier les nouveaux champs et l'invariant.
````

---

## 2. Défaut : modifier une commande lui fait perdre sa remise

````text
Signalement de défaut (relevé par le front en relisant le code, à confirmer par un test qui
échoue AVANT le correctif).

Constat : OrderManagementServiceImp#updateOrder (vers la ligne 300) recalcule le total avec
`.discountKey(NO_DISCOUNT_KEY)`, quelle que soit la remise utilisée à la création de la
commande (OrderEntity.discountKey). Conséquence : un client qui a commandé avec BLACK_FRIDAY
(-20 %) puis change seulement son adresse ou son transporteur voit son total remonter au plein
tarif ; la différence est calculée contre le montant déjà payé et un complément de paiement
lui est réclamé (ou un 402 PAYMENT_FAILED s'il est refusé). Le commentaire « no re-discount on
updates » montre que c'était voulu pour éviter de ré-appliquer une campagne, mais le résultat
est une remise perdue.

Comportement attendu :
- une commande modifiée garde la remise sous laquelle elle a été passée, en réutilisant
  l'instantané des conditions persisté par le prompt précédent (et NON la campagne actuelle :
  elle peut avoir été désactivée, modifiée ou avoir expiré, ce qui ne doit ni faire échouer
  la modification ni changer les conditions accordées) ;
- la remise est recalculée sur les nouvelles lignes avec ces conditions (pourcentage,
  plafond, BOGO par ligne, montant fixe borné au sous-total) ; si le nouveau sous-total passe
  sous minOrderAmount, la remise tombe à 0, exactement comme à la création ; documente ce
  choix dans la Javadoc ;
- les frais de port suivent le nouveau shippingType / shippingProvider ;
- le détail du prix persisté (sous-total, remise, port, total) est mis à jour ;
- commandes créées avant le prompt 1 (pas d'instantané) : se rabattre sur la campagne
  actuelle si elle est toujours active, sinon sur NO_DISCOUNT, en le loggant en warn ;
- le calcul vit dans OrderPriceCalculationService (une méthode qui accepte des conditions de
  remise explicites), pas dupliqué dans updateOrder.

Tests : commande BLACK_FRIDAY puis modification d'adresse seule → total inchangé, aucun
complément ni remboursement ; campagne désactivée entre la commande et la modification →
remise conservée ; quantité réduite sous minOrderAmount → remise à 0 et remboursement
partiel cohérent ; passage STANDARD → EXPRESS → +10 € exactement.
````

---

## 3. Facettes du catalogue (valeurs de filtres et compteurs)

````text
Objectif : que le front puisse proposer des filtres par attribut avec les valeurs réellement
présentes et leur nombre de produits, sans parcourir tout le catalogue.

Constat :
- POST /api/v1/services/product/search (ProductSearchServiceImp#search) filtre déjà par
  catégorie, marques, prix, `attributes` (terms sur attributes.<clé>.keyword) et
  `numericRanges` (range sur attributes.<clé>), mais ne renvoie que la page de produits ;
- les JSON Schema de catégorie (ProductCategorySchemaInitializer) ne déclarent aucun `enum` :
  cpu, gpu, os, connectivity, displayType (COMPUTER) et resolution (MONITOR) sont des chaînes
  libres, le front n'a donc aucun moyen de connaître leurs valeurs possibles ;
- détails relevés au passage : `attributes` et `numericRanges` sont ignorés en silence quand
  `category` est absente ; la classe dto/response/search/ProductSearchResponseDto est vide.

Travail demandé :
1. Nouvel endpoint PUBLIC POST /api/v1/services/product/search/facets (à ajouter aux URL
   publiques de SecurityConfig), body = le même ProductSearchRequestDto que /search (page et
   size ignorés). On garde /search inchangé : sa réponse PagedModel est déjà consommée par le
   front et ne doit pas changer de forme.
2. Réponse (réutilise ou remplace la classe vide ProductSearchResponseDto, ou crée
   ProductFacetsResponseDto) :
   {
     "totalHits": 42,
     "brands":   [ { "value": "LENOVO", "count": 12 }, ... ],
     "price":    { "min": 349.0, "max": 3299.0 },
     "attributes": {
       "cpu": [ { "value": "Intel Core i7-13700H", "count": 5 }, ... ],
       "os":  [ ... ]
     },
     "numericAttributes": {
       "ram": { "min": 8, "max": 64 }
     }
   }
   - `attributes` et `numericAttributes` seulement si `category` est fournie ; les clés
     viennent du JSON Schema de la catégorie (type string → agrégation terms sur
     attributes.<clé>.keyword, type integer / number → agrégation min / max sur
     attributes.<clé>), jamais d'une liste codée en dur ;
   - comptage « disjonctif », le comportement attendu d'un catalogue : les compteurs d'une
     facette sont calculés avec tous les filtres actifs SAUF le sien (cocher LENOVO ne doit
     pas faire disparaître les autres marques), via des agrégations filtrées ou un
     post_filter ; le mot-clé, la catégorie et les autres facettes restent appliqués ;
   - valeurs triées par compteur décroissant puis alphabétique, plafonnées par une constante
     (ex. FACET_MAX_VALUES = 50) dans CyberTechAppConstants ; valeurs vides ignorées ;
   - une seule requête Elasticsearch (size 0 + agrégations), pas une par facette.
3. Vérifie le mapping Elasticsearch de ProductDocument : chaque attribut texte doit avoir un
   sous-champ .keyword et chaque attribut numérique un type numérique ; corrige le mapping si
   ce n'est pas le cas (et indique dans ton résumé s'il faut réindexer).
4. Erreurs : 400 INVALID_REQUEST (validation, comme /search), UNKNOWN_PRODUCT_CATEGORY (même statut que
   GET /product-category-schemas/{categoryKey}) si la
   catégorie n'a pas de schéma. Pas de cache applicatif obligatoire, mais un en-tête
   Cache-Control public court est bienvenu (données publiques, aucune donnée personnelle).

Tests : catalogue de test avec plusieurs marques et CPU ; facettes sans filtre ; avec une
marque cochée (les autres marques restent listées avec leurs compteurs, les compteurs de cpu
se restreignent à cette marque) ; avec un mot-clé ; sans catégorie (pas de section
attributes) ; catégorie inconnue → UNKNOWN_PRODUCT_CATEGORY ; une valeur au-delà du plafond n'apparaît pas.
````

---

## 4. Endpoint des frais de port

````text
Objectif : que le front affiche les frais de port avant la commande sans dupliquer les tarifs.

Constat : les frais de port sont codés dans DHLShippingProviderService et
FedexShippingProviderService (STANDARD = 15, EXPRESS = 25 pour les deux) et choisis via
ShippingProviderStrategyFactory ; aucun endpoint ne les expose. Le front devrait sinon recopier
ces valeurs en dur.

Travail demandé :
- GET /api/v1/services/shipping/options, PUBLIC (à ajouter aux URL publiques de
  SecurityConfig), paramètre optionnel `provider` (ShippingProvider) pour filtrer un
  transporteur ; 400 METHOD_ARGUMENT_TYPE_MISMATCH si la valeur est inconnue ;
- réponse : liste de ShippingOptionResponseDto { provider, type, cost, currency }, une entrée
  par couple (transporteur, type) disponible, triée par transporteur puis par coût ;
- les coûts viennent de ShippingProviderService#calculateShippingCost via la factory (aucune
  valeur recopiée), arrondis à 2 décimales comme dans OrderPriceCalculationServiceImp ;
- nouveau controller + interface ApiSpec dans le style des autres (ex.
  DiscountController / ProductCategorySchemaController), constante de chemin dans
  CyberTechAppConstants ;
- en-tête Cache-Control public court (les tarifs changent rarement, aucune donnée
  personnelle) ;
- un test garantit que le coût renvoyé pour chaque couple est exactement celui appliqué par
  OrderPriceCalculationService à la commande.
````

---

## 5. Retrait de `POST /admin/management/order/place/auto`

````text
Décision du propriétaire du projet : l'endpoint admin POST
/api/v1/services/admin/management/order/place/auto (OrderManagementAdminController#placeOrder2,
qui passe une commande générée par DataGenerator#orderGenerator) n'est pas utilisé et doit
être retiré.

À faire :
- supprimer la méthode du controller et de OrderManagementAdminControllerApiSpec, et son test
  dans OrderManagementAdminControllerTest ;
- supprimer DataGenerator#orderGenerator s'il n'a plus d'appelant (vérifie les tests et les
  autres générateurs) ;
- vérifier que RateLimitFilter (préfixe ORDER_PLACE_PATH_PREFIX) n'a pas de cas spécifique à
  /place/auto ;
- retirer l'entrée de la collection Postman et régénérer openapi.yaml ;
- au passage, noter dans le résumé que cet endpoint déclarait consumes = application/json sans
  body (inutile de le corriger puisqu'il disparaît).
````

---

## 6. (Optionnel) Devis de commande `POST /order/quote`

````text
Optionnel, à faire après les prompts 1, 2 et 4 si le temps le permet : il supprimerait tout calcul
« estimé » côté front.

Constat : PriceCalculationRequestDto / PriceCalculationResultDto et
OrderPriceCalculationService existent mais aucun controller ne les expose ; le front doit
aujourd'hui recalculer remise et port pour afficher un total avant la commande.

Travail demandé :
- POST /api/v1/services/management/order/quote, USER ou ADMIN, body
  { shippingType, shippingProvider, discountKey (défaut NO_DISCOUNT) } : les lignes viennent
  du panier serveur de l'appelant (JWT), jamais du body, avec les prix actuels des produits ;
- réponse : { subtotalAmount, discountKey, discountCalculationType, discountAmount,
  discountApplied (false si minOrderAmount non atteint), minOrderAmount, shippingCost,
  totalAmount, currency } ;
- erreurs : 409 CART_IS_EMPTY, 400 DISCOUNT_TYPE_NOT_ACTIVE ; aucun effet de bord (ni
  réservation de stock, ni commande, ni paiement) ;
- même rate limit que les lectures de panier ; un test garantit que le devis est égal au total
  de la commande passée juste après avec les mêmes paramètres.
````

---

## 7. (Optionnel) Type d'événement `COMPARE` pour les recommandations

````text
Optionnel, utile quand le front branchera les événements comportementaux (sa feature
004-engagement).

Constat : le front a un comparateur de 2 à 3 produits d'une même catégorie. Ajouter un produit
à la comparaison est un signal d'intérêt fort, mais UserEventType (entities/enums/UserEventType.java)
n'a pas de valeur pour lui ; le front enverrait CLICK, qui se confond avec tous les autres clics
dans Gorse.

Travail demandé :
- ajouter COMPARE à UserEventType (une valeur, sans renommer les autres) ; il arrive par
  POST /api/v1/events/consume-event avec le productId du produit ajouté à la comparaison ;
- vérifier que GorseMapper le transmet comme feedbackType "COMPARE" et que la configuration
  Gorse (docker-compose, config.toml s'il existe) le compte comme retour positif, au même
  rang que WISHLIST_ADD ; sinon l'ajouter et l'expliquer dans le résumé ;
- tests : désérialisation de l'événement, mapping Gorse, IT d'ingestion si elle existe.
````

---

## 8. Avis publics d'un produit et note moyenne

````text
Objectif : afficher sur la fiche produit du front une section « Avis clients » (note moyenne,
répartition des notes, liste des avis), comme LDLC.

Constat : ReviewCrudController n'expose que get/{reviewUuid}, create, update, delete et
reviewable, tous réservés au rôle USER ; aucun endpoint ne liste les avis d'un produit ni ne
calcule sa note moyenne. ReviewResponseDto n'a ni date ni nom d'auteur.

Travail demandé :
- GET /api/v1/services/review/product/{productUuid}, PUBLIC (SecurityConfig), paginé
  (page, size défaut 10, tri createdAt desc), seulement les avis acceptés par la modération ;
- réponse : { averageRating (number | null, 1 décimale), reviewCount, distribution
  { "1": n, ..., "5": n }, reviews: PagedModel<PublicReviewDto> } ;
- PublicReviewDto : uuid, rating (1..5), comment (nullable), authorFirstName (prénom seul,
  jamais l'e-mail ni le nom complet), createdAt (date ISO) ;
- 404 PRODUCT_NOT_FOUND pour un produit inconnu ;
- Cache-Control public court ; tests d'intégration (moyenne, répartition, pagination, avis
  refusé par la modération exclu, aucune donnée personnelle au-delà du prénom).
````

---

## 9. Délais de livraison et retrait en magasin

````text
Objectif : que la fiche produit et le tunnel de commande annoncent des délais tenus par le
backend (« Commande avant 15 h, livré demain ») et, si le magasin le permet, un retrait en
magasin.

Constat : ShippingType ne connaît que STANDARD et EXPRESS, ShippingOptionResponseDto ne donne
que le prix ; aucun délai, aucune heure limite, aucun retrait en magasin. Le front affiche
aujourd'hui des délais indicatifs codés de son côté (standard 3 à 5 jours ouvrés, express
livré le lendemain pour une commande avant 15 h du lundi au jeudi), signalés comme indicatifs.

Travail demandé :
- ajouter à ShippingOptionResponseDto : minDeliveryBusinessDays, maxDeliveryBusinessDays,
  cutoffTime (heure locale, nullable) et timeZone ;
- optionnel : ShippingType PICKUP (retrait en magasin, coût 0, adresse du magasin), pris en
  compte par OrderPlacingRequestDto / OrderQuoteRequestDto (adresse de livraison facultative
  pour ce type) et par le calcul du prix ;
- tests : valeurs renvoyées identiques à celles appliquées à la commande.
````

---

## 10. Carte de l'utilisateur enregistrée chez Stripe et utilisée à chaque paiement

> **Abandonné le 2026-10-14** par le propriétaire (commit backend `ae1d263` : la carte saisie est
> de nouveau chiffrée par le backend, un numéro composé de 1 paie). Ne pas envoyer ; le front
> suit la constitution v3.0.0 (formulaire « Ajouter une carte » du site).

> Ajouté le 2026-10-14 (feature front 003). Décision : option A, Stripe Elements côté front. Le
> numéro de carte ne transite jamais par le front ni par le backend.

````text
Objectif : que chaque paiement (POST /management/order/place, POST /order/retry-payment/{uuid},
complément de POST /order/update) débite la carte que l'utilisateur a enregistrée, afin que les
cartes de test Stripe décident de l'issue (4242 4242 4242 4242 accepté ; 4000 0000 0000 0341
enregistrée puis refusée à chaque paiement ; 4000 0000 0000 9995 fonds insuffisants ;
4000 0025 0000 3155 authentification exigée, donc refusée puisque les redirections sont
interdites). Le front saisit la carte dans Stripe Elements (iframe Stripe) : le numéro complet
n'arrive jamais au front ni au backend.

Constat (commit 84dc038) :
- StripePaymentAttemptProcessor confirme le PaymentIntent avec stripe.payment-method
  (pm_card_visa) fixé dans application.properties : la carte de l'utilisateur n'est jamais
  utilisée ;
- OrderManagementServiceImp#validateUserBeforeProcessingPayment exige pourtant une BankCardEntity
  (404 BANK_CARD_NOT_FOUND sinon), stockée avec le numéro chiffré en AES ; aucun client Stripe
  (Customer) n'est créé.

Travail demandé :
1. Client Stripe par utilisateur : créer le Customer Stripe à la première demande (email et
   nom, métadonnée userUuid), conserver son id (ex. UserEntity.stripeCustomerId, migration).
2. Préparation de l'enregistrement : POST /api/v1/services/bank-card/setup-intent (USER/ADMIN)
   crée un SetupIntent (customer, usage off_session, payment_method_types card) et renvoie
   { clientSecret, publishableKey } ; la clé publiable vient de la configuration
   (stripe.publishable-key=pk_test_…).
3. Enregistrement : POST /api/v1/services/bank-card/add accepte désormais
   { setupIntentId } (le SetupIntent doit appartenir au Customer de l'appelant et être
   succeeded) ; le backend lit le PaymentMethod chez Stripe (brand, last4, exp_month,
   exp_year, nom du titulaire), l'attache comme moyen par défaut du Customer et enregistre
   stripePaymentMethodId, cardType, lastFourDigits, expiryDate (MM/YYYY), cardHolderName.
   Une seule carte par utilisateur : une nouvelle carte remplace l'ancienne (détachée chez
   Stripe). L'ancien corps avec cardNumber est retiré (ou rejeté en 400) : plus aucun numéro
   complet ne doit être accepté ni stocké ; supprimer encryptedNumber (migration) une fois les
   données existantes migrées ou purgées.
4. GET /bank-card/get inchangé dans sa forme (maskedNumber = « **** **** **** » + last4) ;
   PUT /bank-card/update met à jour titulaire et expiration chez Stripe aussi
   (PaymentMethod.update billing_details.name, card.exp_month/exp_year) ; DELETE détache le
   PaymentMethod chez Stripe.
5. Paiement : StripePaymentAttemptProcessor crée le PaymentIntent avec customer et
   payment_method de la carte de l'utilisateur, confirm=true, off_session=true ;
   stripe.payment-method ne sert plus que de repli explicite pour les tests (profil test) ou
   disparaît. Un refus (CardException, statut requires_payment_method ou requires_action) donne
   PAYMENT_FAILED sur la commande comme aujourd'hui (place ne renvoie toujours pas 402), avec
   le code de refus Stripe (decline_code) loggé, jamais le numéro.
6. Sans carte enregistrée : garder 404 BANK_CARD_NOT_FOUND à place et à retry-payment
   (le front propose alors « Ajouter une carte »), et l'ajouter au DTO d'erreur documenté dans
   l'OpenAPI de place/quote ; le devis (quote) ne l'exige pas.
7. Inscription : bankCardCreationRequestDto (numéro en clair) retiré de UserCreateRequestDto,
   ou ignoré avec un warn ; la carte s'ajoute après l'inscription par le flux ci-dessus.
8. Webhook : vérifier que payment_intent.succeeded / payment_failed retrouvent toujours la
   commande (métadonnée orderUuid) avec le nouveau PaymentIntent.

Tests :
- unitaires du processeur (customer + payment_method transmis, off_session, refus mappé) ;
- IT du flux carte avec Stripe mocké (WireMock ou stripe-mock) : setup-intent, add (SetupIntent
  d'un autre Customer refusé en 403), update, delete, remplacement de carte ;
- IT de commande : carte 4242 → PAID, PaymentMethod de refus → PAYMENT_FAILED puis
  retry-payment avec une nouvelle carte → PAID ;
- aucun log ni DTO ne contient de numéro complet ni de CVC.

Mets à jour progress.md et l'OpenAPI (le front régénère ses types avec npm run gen:api).
````

---

## 11. Détail structuré de `NOT_ENOUGH_STOCK`

````text
Objectif : que le front signale précisément la ligne en rupture (« Il n'en reste que 1 ») au
panier, au tunnel de commande et à la modification d'une commande, sans lire le texte libre
du message d'erreur.

Constat : NOT_ENOUGH_STOCK (409) ne porte l'information que dans ErrorResponseDto.message, en
texte libre, et sous deux formes différentes :
- StockServiceImp#lockAndReserveProduct (place, update, retry) :
  « Not enough stock for product <uuid>: requested=3, available=1 » ;
- CartStockValidator#validateStockAvailability (panier) :
  « Not enough stock for product <nom>. Available: 2 » (le nom, pas l'UUID ; pas la quantité
  demandée).
Or ErrorResponseDto documente que message « est lisible par un humain et peut changer » et que
seul errorCode est un discriminant stable : le front ne peut donc pas savoir quelle ligne est
en cause. Aujourd'hui, en modification de commande, il signale toutes les lignes ajoutées ou
augmentées ; au panier, il n'affiche qu'un message général.

Travail demandé :
1. NotEnoughStockException porte des données structurées : productUuid (UUID), requested
   (int), available (int, jamais négatif : max(0, stock - reservedStock)). Tous les lancers
   (StockServiceImp, CartStockValidator et les autres s'il y en a) les fournissent ; le
   message texte peut rester pour les logs.
2. ErrorResponseDto gagne un champ optionnel details, absent (JsonInclude NON_NULL) pour les
   autres erreurs. Pour NOT_ENOUGH_STOCK :
     "details": { "items": [ { "productUuid": "…", "requested": 3, "available": 1 } ] }
   Une liste, pour pouvoir signaler plusieurs lignes en une réponse : si la vérification
   s'arrête aujourd'hui à la première ligne en défaut, la liste en contient une seule, c'est
   acceptable ; si elle peut tout vérifier avant de lever (place, update), lister toutes les
   lignes en défaut est préférable.
3. ErrorManagementController#handleNotEnoughStockException remplit details ; le statut 409 et
   errorCode NOT_ENOUGH_STOCK ne changent pas (rétrocompatible pour le front actuel).
4. Aucune donnée personnelle dans details (UUID produit et quantités seulement).
5. OpenAPI : schéma ErrorResponseDto avec details documenté (StockShortageDto : productUuid,
   requested, available) et exemple sur POST /cart/add, PUT /cart/update (si présent),
   POST /management/order/place, /update et /retry-payment.

Tests :
- unitaires : chaque lanceur fournit productUuid, requested et available corrects (available à
  0 quand le stock réservé dépasse le stock) ;
- IT : panier (ajout au-delà du stock), place (stock épuisé entre l'ajout au panier et la
  commande), update (quantité augmentée au-delà du stock) → 409, errorCode NOT_ENOUGH_STOCK,
  details.items[0] attendu ; une autre erreur (ex. 404 PRODUCT_NOT_FOUND) n'a pas de details.

Mets à jour progress.md et l'OpenAPI (le front régénère ses types avec npm run gen:api).
````

---

## 12. Suppression de la carte sans effet et ajout d'une deuxième carte en 500

````text
Objectif : que « Supprimer ma carte » et « Remplacer ma carte » du front fonctionnent.

Constat (front, e2e du 2026-10-20, backend f582c3a) :
1. DELETE /bank-card/delete répond 204 mais la carte reste : GET /bank-card/get la renvoie
   toujours. BankCardManagementServiceImp#deleteBankCard appelle
   bankCardRepository.delete(bankCard) alors que UserEntity garde sa référence
   (@OneToOne(mappedBy = "userEntity", cascade = CascadeType.ALL, orphanRemoval = true)) :
   au flush, la cascade depuis l'utilisateur géré annule la suppression (cas classique JPA :
   entité supprimée encore référencée par un parent en cascade PERSIST/MERGE).
2. POST /bank-card/add avec une carte déjà enregistrée lève IllegalStateException, qui finit
   dans le gestionnaire générique RuntimeException : 500 au lieu d'un 409 fonctionnel.

Travail demandé :
- deleteBankCard : détacher la carte de l'utilisateur (user.setBankCardEntity(null), laisser
  orphanRemoval supprimer la ligne, ou supprimer puis dissocier dans la même transaction) ;
  vérifier qu'après 204, GET /bank-card/get répond 404 BANK_CARD_NOT_FOUND.
- addBankCard avec une carte existante : exception fonctionnelle dédiée (ex.
  BankCardAlreadyExistsException) → 409, errorCode BANK_CARD_ALREADY_EXISTS (ajouter à
  ErrorCode et à l'OpenAPI).
- Optionnel : PUT /bank-card/replace (même corps que /add) qui supprime et ajoute dans une seule
  transaction, pour qu'un échec ne laisse jamais le compte sans carte ; le front l'utilisera à
  la place de « delete puis add ».

Tests :
- IT : add → delete → get = 404 → add d'une nouvelle carte = 201 ; add sur une carte existante
  = 409 BANK_CARD_ALREADY_EXISTS ; (si replace) replace = 200 et ancienne carte absente, replace
  avec un numéro invalide = 400 et ancienne carte conservée.
- Aucun numéro complet dans les logs ni les DTO.

Mets à jour progress.md et l'OpenAPI (le front régénère ses types avec npm run gen:api).
````

---

## 13. Liste de mes avis

````text
Objectif : que le client puisse retrouver, modifier et supprimer ses avis depuis « Mes avis »
(feature 004 du front), et pas seulement juste après leur publication.

Constat : ReviewManagementController expose get/{uuid}, create, update/{uuid}, delete/{uuid},
product/{productUuid} (public) et reviewable, mais aucune liste des avis de l'appelant.

Travail demandé :
- GET /review/mine (USER) paginé (page, size 10 par défaut, sort createdAt,desc) :
  PagedModel<MyReviewDto> avec uuid, productUuid, productName, orderUuid, rating, comment,
  createdAt, updatedAt ; uniquement les avis de l'appelant (keycloakId du JWT).
- OpenAPI et tests d'intégration (seulement mes avis, pagination, tri, 401 sans jeton).

Mets à jour progress.md et l'OpenAPI.
````

---

## 14. Statut périmé juste après « Relancer le paiement »

````text
Objectif : que GET /management/order/status/{uuid} reflète la relance dès qu'elle a répondu.

Constat (front, e2e bank-card-add.spec.ts du 2026-10-21, backend bddcafd) :
- commande refusée (carte 4242…, PAYMENT_FAILED), carte remplacée par 1111…, puis
  POST /management/order/retry-payment/{uuid} → 200 avec status AWAITING_PAYMENT ;
- 2 s plus tard, GET /management/order/status/{uuid} renvoie PAYMENT_FAILED ;
- le webhook payment_intent.succeeded arrive ~0,5 s après et la commande finit PAID en base.
Le statut relu entre la relance et le webhook est donc celui de la tentative précédente (ou
un événement d'échec tardif l'a réécrit). Un client qui sonde le statut conclut à un refus.

Travail demandé :
- vérifier que retryPayment persiste AWAITING_PAYMENT dans sa transaction (et pas seulement
  dans le DTO renvoyé) ;
- vérifier qu'un événement PAYMENT_FAILED (webhook ou OrderUpdatedEvent) d'une tentative
  antérieure ne peut pas écraser le statut d'une tentative plus récente (comparer l'identifiant
  de tentative / PaymentIntent avant d'appliquer la transition) ;
- IT : refus → relance réussie → le statut lu juste après la relance n'est jamais
  PAYMENT_FAILED.

En attendant, le front tient un PAYMENT_FAILED lu dans les 10 s qui suivent une relance pour
périmé (RETRY_STALE_FAILURE_GRACE_MS) et continue de sonder.

Livré par le backend f48acbf (2026-10-21) ; le délai de grâce du front reste en place, sans
effet quand le statut est juste.
````

---

## 15. Catégorie sur les lignes de panier et de commande, avis pendant la préparation

````text
Objectif : que le front affiche la catégorie de chaque produit du panier et des commandes, et
qu'un client puisse noter un produit dès que sa commande est payée, y compris pendant sa
préparation (feature 004 du front : catégories, avis).

Constat 1 — catégorie absente des lignes (backend 8cc5ded) :
- CartItemResponseDto et OrderItemResponseDto n'ont que productUuid, productName, quantity,
  unitPrice, lineItemTotalPrice : aucune catégorie. Le front ne peut pas afficher « Smartphones »
  ou « Montres connectées » sur une ligne de panier ou de commande sans relire chaque produit
  (un GET /product/get par ligne, à chaque affichage).
- WishlistResponseDto est déjà bon : il embarque le ProductResponseDto complet (category
  comprise).

Travail demandé :
- Ajouter `category` (String, clé de ProductCategorySchemaEntity : COMPUTER, DESKTOP, MONITOR,
  SMARTPHONE, SMARTWATCH…) à CartItemResponseDto et à OrderItemResponseDto, lue depuis le
  produit de la ligne (sans requête supplémentaire : le produit est déjà chargé par les
  mappers / JOIN FETCH existants ; vérifier l'absence de N+1 avec les tests existants).
- Pour une commande, la catégorie est celle du produit au moment de la lecture (le produit
  n'est pas figé dans la ligne) ; un produit supprimé depuis donne `category: null`.
- OpenAPI : documenter le champ (nullable pour les lignes de commande).
- Tests : mappers (catégorie présente), IT panier et commande (GET /cart/get,
  GET /management/order/get/{uuid}, GET /management/order/mine) avec la catégorie attendue.

Constat 2 — commande payée non notable pendant sa préparation :
- ReviewManagementServiceImp.REVIEWABLE_ORDER_STATUSES = PAID, SHIPPED, DELIVERED.
- Le batch ShipAllPaidOrdersTasklet / ShipOrderTransactionalDelegate passe chaque commande
  PAID en AWAITING_SHIPPING. Entre ce passage et l'expédition, GET /review/reviewable ne
  renvoie plus ses produits et POST /review/create répond 409 ORDER_NOT_REVIEWABLE : un client
  qui vient de payer voit son produit disparaître de « À noter » puis réapparaître une fois la
  commande expédiée.

Travail demandé :
- Ajouter OrderStatus.AWAITING_SHIPPING à REVIEWABLE_ORDER_STATUSES (une commande payée reste
  notable tant qu'elle n'est ni annulée, ni remboursée, ni retournée).
- Vérifier que findReviewableOrdersWithItemsByKeycloakIdAndStatusIn et la vérification de
  create utilisent bien la même constante.
- Tests : reviewable et create sur une commande AWAITING_SHIPPING (200 / 201) ; toujours 409
  ORDER_NOT_REVIEWABLE sur AWAITING_PAYMENT, PAYMENT_FAILED, CANCELED, REFUNDED, RETURNED.

Livré par le backend abe674d (2026-10-21). Le statut d'une commande non notable reste 409
(contrat existant) ; le front s'aiguille sur errorCode.

Mets à jour progress.md et l'OpenAPI (le front régénère ses types avec npm run gen:api).
````

## 16. Tri des résultats du catalogue

````text
Objectif : que le front propose « Trier par » au-dessus des résultats du catalogue
(pertinence, nom A → Z, prix croissant, prix décroissant, mieux notés), appliqué à tout le
résultat de la recherche et pas seulement à la page affichée.

Constat (backend abe674d) :
- ProductSearchRequestDto (POST /product/search) n'a aucun champ de tri ;
  ProductSearchServiceImp construit PageRequest.of(page, size) sans Sort : l'ordre est celui du
  score Elasticsearch.
- ProductDocument.name est un champ Text (analyzer french) : on ne peut pas trier dessus tel
  quel.
- ProductDocument.averageRating et reviewCount existent mais sont commentés : aucune note
  n'est indexée, le tri « mieux notés » est impossible.

Travail demandé :
- Ajouter un enum ProductSearchSort { RELEVANCE, NAME_ASC, PRICE_ASC, PRICE_DESC, RATING_DESC }
  et un champ optionnel `sort` à ProductSearchRequestDto (absent = RELEVANCE, valeur inconnue →
  400 de validation habituel).
- Index : sous-champ keyword de `name` avec un normalizer lowercase + asciifolding (« Écran »
  trié avec les E) ; réactiver averageRating (Double, null sans avis) et reviewCount (Integer, 0
  sans avis), alimentés à la réindexation et mis à jour à chaque création / modification /
  suppression d'avis publié (même transaction ou événement après commit).
- Traduction du tri :
  - RELEVANCE : _score desc puis uuid (tie-break stable) ;
  - NAME_ASC : name.keyword asc ;
  - PRICE_ASC / PRICE_DESC : price ;
  - RATING_DESC : averageRating desc (produits sans avis en dernier, missing _last), puis
    reviewCount desc ;
  - toujours un tie-break final sur uuid pour une pagination stable.
- Le tri ne change pas les facettes (POST /product/search/facets) ni le filtre.
- OpenAPI : documenter `sort` et ses valeurs (le front régénère ses types avec
  npm run gen:api).
- Tests : un test par valeur de tri sur un petit jeu indexé (ordre attendu, pagination stable
  entre deux pages), produit sans avis en dernier pour RATING_DESC, `sort` absent = ordre actuel.

Côté front (feature 004) : le sélecteur « Trier par » est prêt et sera activé dès cette
livraison.

Mets à jour progress.md et l'OpenAPI.
````

Livré par le backend 14252d5 (2026-10-21) : `sort` absent = RELEVANCE, valeur inconnue → 400
MALFORMED_JSON. Côté front, le sélecteur est affiché et les types régénérés (`npm run gen:api`).

## 17. Modération des commentaires injoignable : mauvais chemin, hôte local, code d'erreur

````text
Objectif : que les commentaires d'avis soient vraiment modérés, en local comme en déploiement,
et que le front distingue « commentaire refusé » de « modération indisponible » (feature 004 du
front, US5 : avis).

Constat 1 — mauvais chemin (backend 14252d5) :
- L'app Flask (src/main/java/com/novatech/cybertech/api/external/moderation/app.py) n'expose que
  POST /api/v1/moderation/analyze.
- Le backend appelle http://moderation-api:5000/analyze : application.properties:50,
  application-prod.properties:123 (et son commentaire l.121 « with the /analyze endpoint »),
  k8s/helm/charts/cybertech-app-chart/values.yaml:120. Le commentaire de
  moderation-api-chart/values.yaml l.6-7 décrit pourtant le bon chemin.
- Résultat : 404 sur chaque appel, même dans Docker ou Kubernetes ; CommentModerationClient passe
  par moderationUnavailable et refuse tout commentaire (fail-closed). Seules les notes sans
  commentaire sont publiées.
- Vérifié le 2026-10-21 en appelant le conteneur directement : POST /analyze → 404 ;
  POST /api/v1/moderation/analyze avec « Très bon produit, livré vite. » → isHateful false ;
  avec un texte insultant → isHateful true (score 0,99).

Constat 2 — hôte injoignable en local :
- En développement, le backend tourne depuis IntelliJ sur la machine (localhost:8081), hors du
  réseau Docker ecommerce-net : le nom moderation-api ne s'y résout pas. Le docker-compose publie
  pourtant le port 5000 (moderation-api: ports "5000:5000"). Les logs du conteneur ne montrent
  aucun appel du backend.

Constat 3 — même code pour un refus et une panne :
- moderationUnavailable lève CommentPostNotAllowedException (403 COMMENT_POST_NOT_ALLOWED), le
  même code qu'un commentaire jugé haineux. Le front ne peut pas savoir s'il doit dire
  « reformule ton commentaire » ou « réessaie dans un instant » : il affiche aujourd'hui
  « reformule-le » alors que le texte n'est pas en cause.

Travail demandé :
1. Chemin : moderation.api.url=http://moderation-api:5000/api/v1/moderation/analyze dans
   application.properties, application-prod.properties (commentaire l.121 corrigé) et
   cybertech-app-chart/values.yaml (moderationApi.url).
2. Lancement local : permettre de pointer sur le port publié sans modifier le fichier commun,
   par exemple moderation.api.url=${MODERATION_API_URL:http://moderation-api:5000/api/v1/moderation/analyze}
   et une ligne dans le README / progress.md « depuis IntelliJ :
   MODERATION_API_URL=http://localhost:5000/api/v1/moderation/analyze ». (Ou un profil local, au
   choix, tant que le lancement IntelliJ documenté fonctionne sans retouche.)
3. Code distinct pour la panne : nouvelle exception ModerationUnavailableException →
   503 MODERATION_UNAVAILABLE (errorCodeType TECHNICAL), levée par moderationUnavailable ;
   COMMENT_POST_NOT_ALLOWED (403) reste réservé à un commentaire jugé haineux. Un statut non 2xx
   du service (404, 400, 5xx) compte comme indisponibilité, pas comme refus. Fail-closed
   conservé : aucun commentaire non modéré n'est publié.
4. Ajouter MODERATION_UNAVAILABLE à l'énumération des codes d'erreur publiée dans l'OpenAPI.
5. Tests :
   - client : URL configurée appelée avec le bon chemin ; 404 / 5xx / délai → 503
     MODERATION_UNAVAILABLE après les tentatives Resilience4j ; isHateful true → 403
     COMMENT_POST_NOT_ALLOWED ; isHateful false → avis publié ;
   - IT create et update d'avis avec un service de modération simulé (WireMock ou MockRestServiceServer)
     pour les trois cas ; une note seule ne déclenche aucun appel (comportement 8cc5ded inchangé).

Côté front (feature 004) : FrontErrorCode MODERATION_UNAVAILABLE ajouté au mapping (lib/api/errors.ts)
avec un message « La vérification des commentaires est indisponible pour le moment : réessaie
dans un instant, ta note et ton texte sont gardés », sans inviter à reformuler.

Mets à jour progress.md et l'OpenAPI (le front régénère ses types avec npm run gen:api).
````

---

## 18. Événements de recommandation produits par le backend

````text
Objectif : que Gorse apprenne enfin quelque chose. Les actions métier d'un utilisateur connecté
(achat, panier, wishlist, avis) doivent devenir des UserEvent écrits par le backend lui-même, au
moment où l'action est validée ; POST /api/v1/events/consume-event ne sert plus qu'aux signaux
que seul le navigateur voit, et refuse les autres.

Constat (backend b5811c5, vérifié le 2026-10-22 sur la stack locale) :
- Gorse tourne et lit bien docker/gorse/config.toml (positive_feedback_types chargés). Le batch
  GorseSyncTasklet synchronise items et users (dashboard : 9 308 items, 261 users), mais
  NumTotalPosFeedback = 0 et GET /api/feedback est vide.
- MongoDB userEventsDB ne contient aucune collection : aucun UserEvent n'a jamais été écrit.
- La seule source d'UserEvent est UserEventController#collectEvent (consume-event). Aucun service
  métier n'en produit : CartServiceImp, WishlistServiceImp, ReviewManagementServiceImp et la
  confirmation de paiement n'appellent jamais UserEventService. Le front n'appelle pas encore
  consume-event.
- consume-event accepte n'importe quel UserEventType envoyé par le client : un utilisateur
  connecté peut poster des PURCHASE en boucle sur un produit et fausser les recommandations de
  tout le monde. Le userId est bien pris du JWT, mais le type et le produit restent libres.

Travail demandé :

1. Production des événements métier, côté backend, pour l'utilisateur authentifié
   (userId = keycloakId, comme GorseMapper#toUserDto) :
   - PURCHASE : un par produit de la commande, au passage effectif à PAID. Point d'accroche
     conseillé : l'OrderPaymentConfirmedEvent publié par
     OrderPaymentConfirmationTransactionalDelegateImp#handlePaymentSuccessWithinTransaction (il
     n'est publié que sur une vraie transition, pas sur un webhook en double). Jamais à
     POST /order/place : un paiement refusé ne doit rien compter. Après une modification de
     commande payée par complément (AWAITING_PAYMENT → PAID de nouveau), ne pas dupliquer les
     PURCHASE des produits déjà comptés pour cette commande : idempotence sur
     (orderUuid, productUuid), par exemple orderUuid dans metadata et une vérification avant
     écriture, ou un index unique.
   - ADD_TO_CART / REMOVE_FROM_CART : CartServiceImp. Attention, le front modifie les quantités
     par PATCH /cart/update (remplacement complet des lignes) et fusionne le panier invité par
     un POST /cart/add groupé à la connexion. Les événements doivent donc venir de la
     différence avant / après : produit nouveau ou quantité augmentée → ADD_TO_CART ; produit
     disparu → REMOVE_FROM_CART ; quantité baissée sans disparaître → rien. removeItemFromCart
     → REMOVE_FROM_CART ; decreaseQuantity jusqu'à zéro → REMOVE_FROM_CART.
     clearCart appelé par placeOrder (OrderManagementServiceImp:610) ne doit produire aucun
     REMOVE_FROM_CART ; DELETE /cart/clear à l'initiative de l'utilisateur, si, un par ligne.
     Un ajout refusé (NOT_ENOUGH_STOCK, produit inconnu) ne produit rien.
   - WISHLIST_ADD : WishlistServiceImp#addProductToMyWishlist, seulement si le produit n'y
     était pas (PRODUCT_ALREADY_IN_WISHLIST → rien).
   - Avis (ReviewManagementServiceImp#create et #update) : note ≥ 4 → RATING_POSITIVE, note ≤ 2
     → RATING_NEGATIVE, 3 → rien ; avec un commentaire publié, REVIEW_POSITIVE /
     REVIEW_NEGATIVE selon la même règle, à la place du RATING_*. Un refus de modération (403)
     ou une modération indisponible (503) ne produit rien. Les seuils vont dans
     CyberTechAppConstants.
   - Écriture découplée de l'action : publier un événement applicatif dans la transaction
     métier, puis écrire le UserEvent dans MongoDB depuis un @Async @TransactionalEventListener
     (AFTER_COMMIT), comme NotificationListener. Une panne de MongoDB ne doit jamais faire
     échouer ni ralentir un ajout au panier, un avis ou une confirmation de paiement : log WARN
     structuré (type, productUuid, userId masqué) et on continue. metadata : category, brand,
     price, et orderUuid quand il existe ; sessionId : un identifiant technique (par exemple
     "server"), puisque le champ est requis.

2. consume-event limité aux signaux du navigateur :
   - types acceptés : VIEW, CLICK, COMPARE, SEARCH_RESULT_CLICK, SCROLL_DEPTH_HIGH, HOVER,
     SEARCH_QUERY, IGNORE_RECOMMENDATION, BOUNCE. Tout type produit par le backend (PURCHASE,
     ADD_TO_CART, REMOVE_FROM_CART, WISHLIST_ADD, RATING_*, REVIEW_*) → 400 INVALID_REQUEST
     avec un fieldErrors sur eventType, sans rien écrire. Garder la liste dans une constante
     (un Set<UserEventType> ou un attribut de l'enum), pas dans un switch du controller.
   - productId inconnu → 404 PRODUCT_NOT_FOUND, plutôt qu'un événement orphelin dans Gorse.
   - Vérifier que l'endpoint est soumis à la limite de débit existante (sinon l'ajouter, avec
     Retry-After) : le front enverra au plus quelques événements par page.
   - (Optionnel) POST /api/v1/events/consume-events : la même chose par lot (≤ 50 événements,
     constante nommée), pour que le front groupe ses envois ; 201 avec le nombre d'événements
     acceptés.

3. Gorse :
   - Vérifier que config.toml reste cohérent : PURCHASE, ADD_TO_CART, WISHLIST_ADD, COMPARE,
     RATING_POSITIVE, REVIEW_POSITIVE positifs ; VIEW, CLICK, SEARCH_RESULT_CLICK en lecture.
     Gorse v0.5 n'a pas de retour négatif : REMOVE_FROM_CART, RATING_NEGATIVE et
     REVIEW_NEGATIVE restent stockés dans MongoDB mais ignorés par Gorse ; l'écrire dans le
     commentaire du fichier pour que ce ne soit pas pris pour un oubli.
   - Le batch ne relit que les 20 dernières minutes (lookback-minutes) : un backend arrêté plus
     longtemps perd les événements écrits juste avant. Documenter ce choix dans progress.md, ou
     passer à un repère persistant (dernier timestamp synchronisé) si c'est simple.
   - (À décider, à signaler dans le résumé) une commande annulée ou remboursée garde son
     PURCHASE dans Gorse ; le retirer demanderait DELETE /api/feedback/PURCHASE/{user}/{item}.

4. Tests :
   - unitaires : différence avant / après de PATCH /cart/update (ajout, hausse, baisse,
     disparition) ; clearCart après placeOrder sans événement ; PURCHASE seulement sur la
     transition vers PAID et sans doublon après un complément ; seuils de note ; refus de
     modération sans événement ; types refusés par consume-event ;
   - IT : parcours connecté (ajout au panier, wishlist, commande payée par le webhook simulé,
     avis 5 étoiles) → les UserEvent attendus sont dans MongoDB (Testcontainers ou le Mongo de
     test déjà utilisé) ; puis GorseSyncTasklet, avec un faux Gorse (MockRestServiceServer),
     reçoit ces retours en PUT /api/feedback avec le bon FeedbackType, UserId = keycloakId et
     ItemId = uuid du produit ;
   - un MongoDB injoignable ne fait échouer ni l'ajout au panier ni la confirmation de paiement.

5. Vérification manuelle sur la stack locale, à reporter dans le résumé : après un parcours réel
   (ajout au panier, commande payée, avis), db.user_events.countDocuments() dans userEventsDB ;
   puis, après un passage du batch, GET http://localhost:8088/api/dashboard/stats
   (NumTotalPosFeedback > 0) et GET /api/v1/services/recommendations/my-recommendations pour cet
   utilisateur (personnalisé ou, à défaut, la cascade derniers → best-sellers).

Côté front, ensuite (feature à venir) : VIEW sur une fiche produit, COMPARE à l'ajout au
comparateur et SEARCH_RESULT_CLICK, envoyés seulement pour un utilisateur connecté qui a accepté
les recommandations personnalisées, par une route BFF qui groupe les envois et n'interrompt
jamais la navigation. Rien à faire côté front pour le panier, la wishlist, les commandes ni les
avis.

Mets à jour progress.md, la documentation des événements si elle existe, l'OpenAPI (types
acceptés par consume-event, 400 et 404, endpoint par lot s'il est fait) et la collection
Postman.
````
