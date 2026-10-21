# Research — Feature 004 : catalogue élargi, promotions et avis

Décisions prises le 2026-10-21, backend `bddcafd` sur 8081 (lecture seule). Chaque décision
cite ce qui a été vérifié sur le backend en marche ou dans son code.

## R1 — Cinq catégories, une seule table de référence

- **Constat** : `CategoryKey` ne connaît que `COMPUTER` et `MONITOR` ; chaque usage
  (`MainNav`, `nav-section.ts`, `CategoryTiles`, `ProductImage`, `getCategoryCounts`,
  `getCategoryPhotos`, `CATEGORY_LABELS`) énumère les deux clés à la main. Le backend sert les
  cinq schémas actifs (`GET /product-category-schemas/{key}` : `COMPUTER` « Computers »,
  `DESKTOP` « Desktop computers », `MONITOR`, `SMARTPHONE`, `SMARTWATCH`) et les produits
  (576, 262, 410, 616, 315 au 2026-10-21, `totalHits` des facettes). Aucun endpoint public ne
  liste les catégories (seul l'admin a `get/all`). Les 43 marques du backend sont déjà toutes
  dans `Brand` (APPLE, SAMSUNG, WITHINGS… comprises).
- **Decision** : `CategoryKey` passe à cinq valeurs ; l'ordre d'affichage est une constante
  `CATEGORY_ORDER` (`lib/constants/categories.ts`) ; libellés dans `CATEGORY_LABELS`
  (`features/catalog/messages.ts`), icônes dans `features/catalog/category-icons.ts`
  (`Record<CategoryKey, LucideIcon>` : Laptop, PcCase, Monitor, Smartphone, Watch) avec
  `GENERIC_CATEGORY_ICON` (Package) pour une clé inconnue. Toutes les fonctions qui listaient
  les deux clés itèrent sur `CATEGORY_ORDER` (`Promise.all`) et renvoient un
  `Record<CategoryKey, …>` : le compilateur signale tout oubli.
- **Rationale** : une table typée par l'enum rend l'ajout d'une sixième catégorie mécanique et
  vérifiée (`Record` exhaustif, `switch` + `assertNever`). La traduction reste côté front : le
  `label` du backend est en anglais.
- **Alternatives** : lire les catégories depuis l'endpoint admin (exige un jeton admin, écarté) ;
  dériver les catégories des facettes globales (pas de libellé, ordre instable, écarté).

## R2 — Comptes et photos des cinq catégories

- **Decision** : `getCategoryCounts()` et `getCategoryPhotos()` lancent un appel par catégorie
  en parallèle, avec le cache serveur existant (facettes 300 s, recherche de photos 300 s) ;
  un échec d'une catégorie donne `null` (compte masqué) sans casser les autres.
- **Rationale** : cinq appels mis en cache restent négligeables ; pas d'endpoint agrégé côté
  backend.

## R3 — Menu « Catalogue » : Radix NavigationMenu

- **Decision** : `NavigationMenu` de `radix-ui` (déjà en dépendance) pour « Catalogue » :
  ouverture au survol et au clic, Tab / Entrée, Échap qui rend le focus au déclencheur,
  `aria-expanded` et `aria-controls` gérés. Contenu : « Tout le catalogue » puis les cinq
  catégories (icône, nom, nombre de produits passé par le layout serveur quand il est connu).
  La catégorie courante porte `aria-current="page"`. « Promotions » est un lien simple à côté.
  Animation d'ouverture via `useSurfaceMotion()` ; statique aux effets réduits.
- **NavSection** : `COMPUTER` et `MONITOR` disparaissent ; ajout de `PROMOTIONS`.
  `resolveNavSection` renvoie `CATALOG` pour le catalogue et les fiches produit ; la catégorie
  courante (URL ou `NavSectionMarker` de la fiche) est lue à part par le menu
  (`resolveNavCategory`).
- **Alternatives** : `DropdownMenu` (rôle `menu`, pas d'ouverture au survol, navigation par
  flèches inadaptée à des liens) ; menu maison (réécrit ce que Radix fait déjà, écarté).

## R4 — Carrousel d'accueil sans dépendance

- **Decision** : composant maison `HomeCarousel` (îlot client) piloté par un hook pur
  `useCarousel(count, options)` (index, suivant, précédent, aller à, lecture/pause), suivant le
  motif WAI-ARIA « Carousel » : `section` `aria-roledescription="carrousel"` nommée,
  diapositives `role="group"` `aria-roledescription="diapositive"` nommées « 2 sur 7 »,
  bouton « Mettre en pause / Lancer le défilement » en premier dans l'ordre de tabulation,
  précédent / suivant, pastilles (`button` avec `aria-current`), région `aria-live="off"` en
  lecture automatique et `"polite"` quand l'utilisateur change de diapositive (FR-022).
- Défilement : `CAROUSEL_AUTOPLAY_INTERVAL_MS = 6_000` (`lib/theme/theme.config.ts`, avec les
  autres durées, principe XIII) ; pause au survol, au focus (focusin/focusout), onglet caché
  (`visibilitychange`) ; aucune lecture automatique ni transition quand
  `useEffectiveEffects()` n'est pas au niveau plein ou que `prefers-reduced-motion` est actif
  (FR-010) ; un fondu croisé via `useMotionTokens()` sinon. Une seule diapositive : ni
  défilement, ni pastilles.
- Les diapositives sont construites côté serveur (`buildHomeSlides`) et passées en props :
  seule la logique de rotation est cliente.
- **Rationale** : Embla / Swiper ajouteraient une dépendance pour une seule bande de 5 à 9
  diapositives sans glisser-déposer (cible desktop) ; le motif ARIA est court à écrire et à
  tester.

## R5 — Photos libres de droits dans le site

- **Decision** : 5 photos de catégorie, 4 de campagne (BLACK_FRIDAY, WINTER_SALES,
  SPRING_SALES, BUY_ONE_GET_ONE_FREE, clés codées dans `DiscountTypeResolver` du backend) et 1
  générique « promotion », prises sur Unsplash ou Pexels (licences d'usage libre), sans logo
  lisible, recadrées en 16:9, largeur 1 920 px, JPEG ≤ 300 Ko, dans
  `public/images/categories/` et `public/images/promotions/` ; import statique (`next/image`
  connaît dimensions et flou de chargement). Crédits (auteur, lien, licence) ajoutés à
  `docs/credits.md`. Table `CATEGORY_IMAGES: Record<CategoryKey, StaticImageData>` et
  `CAMPAIGN_IMAGES: Readonly<Record<CampaignImageKey, StaticImageData>>` (enum des clés
  connues) + `GENERIC_CAMPAIGN_IMAGE`.
- **Rationale** : aucune origine tierce à ajouter à la CSP ni à `remotePatterns` ; LCP
  maîtrisé ; FR-011.
- **Alternatives** : hotlink Unsplash (CSP, disponibilité, écarté) ; photos produits du
  backend (déjà dans les tuiles, peu adaptées à une bannière plein cadre).

## R6 — Ordre des diapositives

- **Decision** : `buildHomeSlides(categories, campaigns)` alterne catégorie, campagne,
  catégorie… tant que les deux listes ont des éléments, puis ajoute le reste (FR-007) ;
  campagnes = `getActiveDiscounts()` filtrées par `isDisplayableDiscount` (sans
  `NO_DISCOUNT`). Destination : `buildSearchUrl({ category })` ou `promotionRoute(key)`.
  Fonction pure, testée (0, 1, 4 campagnes).

## R7 — Promotions : pages publiques sur les données existantes

- **Decision** : `/promotions` et `/promotions/[key]` sont des Server Components publics qui
  lisent `getActiveDiscounts()` (cache existant) ; la clé de l'URL est validée par
  `DiscountKeySchema` ; inconnue ou absente des campagnes actives → état « campagne introuvable
  ou terminée » (statut 404 via `notFound()` avec une page `not-found.tsx` dédiée au segment).
  Avantage formaté par `formatCampaignBenefit` (`−20 %`, `−10 €`, « 1 acheté = 1 offert »),
  conditions par `campaignConditions` (minimum, plafond, fin ou « sans date de fin »).
- « Appliquer à mon panier » : îlot client qui réutilise `writeDiscountKey(sessionStorage)`
  du bloc réduction (003, `ct_discount_v1`) puis annonce le résultat (`aria-live`) ; visiteur :
  la clé est gardée et un lien « Me connecter » renvoie vers `/cart` après connexion
  (`loginPath(CART_PATH)`), le bloc réduction relit la clé. Aucun montant calculé (FR-014).
  Une campagne expirée entre-temps est refusée par le devis, comme en 003.
- **Alternatives** : pré-appliquer via un appel au devis (exige un panier et un compte, hors
  sujet sur une page vitrine).

## R8 — Avis : endpoints, routes et cache

- **Backend vérifié** :
  - `GET /review/product/{uuid}` (public) → `ProductReviewsResponseDto` : `averageRating`
    (null sans avis), `reviewCount`, `distribution` (clés « 1 » à « 5 » toujours présentes),
    `reviews` = `PagedModel<PublicReviewDto>` (`uuid`, `rating`, `comment`,
    `authorFirstName`, `createdAt`), 10 par page, `?page=` accepté (vérifié).
  - `GET /review/reviewable` (USER) → `ReviewableProductDto[]` (`productUuid`, `orderUuid`,
    `productName`, `orderDate`) : commandes `PAID`, `SHIPPED`, `DELIVERED` (pas
    `AWAITING_SHIPPING`), un élément par ligne de commande, **tous retirés dès que le produit a
    un avis du client**.
  - `GET /review/mine` (USER) → `PagedModel<MyReviewDto>` (`uuid`, `productUuid`,
    `productName`, `orderUuid`, `rating`, `comment`, `createdAt`, `updatedAt`), `page`, `size`,
    `sort`.
  - `POST /review/create` (`orderUuid`, `productUuid`, `rating` 1–5, `comment` ≤ 1 000) → 201 ;
    `PATCH /review/update/{uuid}` (`reviewUuid`, `rating`?, `comment`?) ; `DELETE
    /review/delete/{uuid}` → 204.
  - Erreurs : `COMMENT_POST_NOT_ALLOWED` (modération, échec fermé), `ORDER_NOT_REVIEWABLE`,
    `ORDER_DOESNT_BELONGS_TO_USER`, `USER_NOT_AUTHOR_OF_REVIEW`, `REVIEW_NOT_FOUND`,
    `PRODUCT_NOT_FOUND`.
- **Decision** :
  - Fiche produit : la première page est lue côté serveur (`getProductReviews(uuid, 0)`,
    `revalidate` 60 s, tag `product-reviews:{uuid}`) et remplace `NO_REVIEWS` ; « Voir plus
    d'avis » charge la suite par la route BFF publique `GET /api/products/{uuid}/reviews?page=`.
  - « Mes avis » (`/account/reviews`, privé) : deux lectures parallèles en Server Component
    (`getReviewableProducts`, `getMyReviews(page)`, `no-store`).
  - Publier, modifier, supprimer : Server Actions (`createReview`, `updateReview`,
    `deleteReview`, même motif que profil et carte en 003) qui revalident
    `/account/reviews`, le détail de la commande et le tag de la fiche (SC-004).
  - Codes front : `COMMENT_POST_NOT_ALLOWED` → nouveau `FrontErrorCode.REVIEW_REJECTED`
    (message bienveillant, saisie gardée, FR-017) ; `ORDER_NOT_REVIEWABLE` → nouveau
    `REVIEW_NOT_ALLOWED` ; `USER_NOT_AUTHOR_OF_REVIEW` → `FORBIDDEN` (aujourd'hui `UNKNOWN`).
- **Rationale** : lectures en RSC, écritures en Server Actions : pas de jeton côté client,
  revalidation ciblée ; seule la pagination publique a besoin d'une route.

## R9 — Risques backend à vérifier pendant la US5

- **Note seule** : la modération est appelée même sans commentaire (`moderate(null)`) et
  échoue fermée ; une note sans commentaire pourrait être refusée. À vérifier au premier test
  réel ; si c'est le cas : message dédié (« ajoute quelques mots ») et prompt backend §15
  (ne pas modérer un commentaire vide). Le front n'envoie jamais un commentaire fait
  d'espaces (`trim()` puis omis).
- **Doublon** : `POST /review/create` n'interdit pas un deuxième avis du même produit ; seul
  `reviewable` le cache. Deux onglets peuvent donc publier deux fois. Le front n'offre que les
  éléments de `reviewable` et rafraîchit la liste après chaque publication ; un prompt backend
  §15 demandera `409 REVIEW_ALREADY_EXISTS`.

## R10 — Navigation du compte

- **Decision** : « Mes avis » ajouté à `AccountNav` et au menu avatar (`AccountMenu`), entre
  « Mes commandes » et « Ma wishlist » ; le détail d'une commande affiche « Donner mon avis »
  pour chaque ligne présente dans `reviewable` pour cette commande (FR-019), lien vers
  `/account/reviews?product={uuid}&order={uuid}` qui ouvre le formulaire de ce produit.

## R11 — Performance

- **Decision** : seule la première diapositive est `priority` (LCP), les autres `loading=lazy`
  avec `sizes` adapté ; le carrousel remplace la bannière `HomeHero` (même zone, pas
  d'image en plus au-dessus de la ligne de flottaison) ; Lighthouse accueil, `/promotions` et
  une fiche produit avec avis (SC-006).
