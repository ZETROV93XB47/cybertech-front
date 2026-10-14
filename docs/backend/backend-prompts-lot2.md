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
