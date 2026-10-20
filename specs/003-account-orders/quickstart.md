# Quickstart — 003 Mon compte et mes commandes

Guide de validation de la feature. L'environnement est le même qu'au lot 1 et à la 002
(`specs/001-catalog-auth-cart/quickstart.md` §1 et §2) : les services du backend tournent via son
docker-compose, le backend Spring est lancé depuis IntelliJ sur `http://localhost:8081` et le
front tourne sur `http://localhost:3000`. Décisions techniques : [research.md](./research.md).
Routes BFF : [contracts/](./contracts/). Modèle : [data-model.md](./data-model.md).

## 1. Préparation

1. **Backend à jour** (`develop_back`, vérifié au commit `84dc038` le 2026-10-14). Vérifier que
   le devis et les options de livraison répondent :
   - `curl -s -H 'X-API-VERSION: 1.0' http://localhost:8081/api/v1/services/shipping/options`
     → 4 options (DHL / FEDEX × STANDARD / EXPRESS), avec les prix.
   - `curl -s -H 'X-API-VERSION: 1.0' http://localhost:8081/api/v1/services/discounts/active`
     → `NO_DISCOUNT` et au moins `BLACK_FRIDAY` (20 %). Une campagne inactive se réactive par
     l'administration du backend (feature 005) ou directement en base. Pour tester le
     minimum de commande, il faut une campagne active avec un `minOrderAmount` renseigné.
2. **Types** : `npm run gen:api`. `lib/api/schema.d.ts` doit contenir `OrderQuoteRequestDto`,
   `OrderQuoteResponseDto`, `ShippingOptionResponseDto` et la décomposition du total de
   `OrderResponseDto`. Le test de type (T020) compare les schémas Zod au contrat généré.
3. **Comptes de test** : à créer via `/register` ou `POST /user/register`, jamais dans la
   console Keycloak (un compte créé là n'a pas de profil backend : 404 `USER_NOT_FOUND`).
   Noms et emails uniques. Les inscriptions sont limitées à 5 par minute et par IP.
   - compte A : profil avec adresse complète (rue, code postal, ville, pays) ;
   - compte B : sans adresse, pour vérifier le préremplissage vide ;
   - compte C : avec une carte enregistrée (US5).
4. **Carte enregistrée** : **une commande exige une carte** (404 `BANK_CARD_NOT_FOUND` sinon).
   Les comptes e2e qui commandent sont inscrits avec la carte `1111111111111111`
   (`registerUser(context, { withBankCard: true })`). Depuis le backend `ae1d263`, le numéro
   décide de l'issue : que des 1 → payée, tout autre numéro (`4242…`, `0000…`) → refusée. La
   carte s'ajoute sur « Ma carte » dans le formulaire du site (constitution V v3.0.0).

5. **Connexion** : elle ne fonctionne que sur le port 3000, seule redirect URI du client
   Keycloak `cybertech-front-client`. Si un `next dev` tourne déjà, le réutiliser, sinon en
   lancer un.
6. **Serveur de vérification** (captures, Playwright hors connexion) : `next dev -p 3123` avec
   `NEXT_DIST_DIR=.next-verify` et les variables d'environnement en ligne
   (`playwright.capture.config.ts` vise 3123). Ensuite, lancer `git checkout -- tsconfig.json`
   (`next dev` y ajoute `.next-verify`) et supprimer `.next-verify`.
7. **Processus** : n'arrêter que le PID qui écoute sur le port qu'on a ouvert soi-même, jamais
   tous les `node.exe` ni un serveur qu'on n'a pas démarré.

## 2. Contrôles automatiques

Commandes à lancer :
- `npm run typecheck` ;
- `npm run lint` (0 erreur, 0 warning) ;
- `npm run test` ;
- puis les parcours Playwright de la feature, un par un : `npm run test:e2e -- <spec> --workers=1`.

Laisser une minute de pause entre deux specs qui créent des comptes.

Parcours attendus :
- `checkout.spec.ts` (US1, devis, confirmation) ;
- `discount.spec.ts` (US2) ;
- `orders.spec.ts` (US3 : liste, détail, modification, annulation) ;
- `profile.spec.ts` (US4) ;
- `bank-card.spec.ts` (US5) ;
- `a11y.spec.ts` et `long-tasks.spec.ts`, étendus aux nouvelles pages.

## 3. Scénarios manuels

### US1 — Passer commande

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| 1 | Visiteur avec un panier invité de 2 produits, « Passer commande » | Page de connexion ; après connexion : panier fusionné, arrivée sur `/checkout` | US1-1, FR-005 |
| 2 | Compte A, `/checkout` | Une seule page : étape Adresse ouverte, préremplie (rue, code postal, ville, pays) ; récapitulatif fixe à droite | US1-2, FR-006, FR-007 |
| 3 | Modifier la ville dans le tunnel, puis ouvrir `/account/profile` | La ville du profil n'a pas changé | FR-007 |
| 4 | Étape Livraison : 4 options DHL / FedEx × Standard / Express | Prix du backend, délai marqué « estimatif » (ou délai du backend s'il est livré), promesse express ; « Retrait en magasin » grisé, « Bientôt disponible », non sélectionnable au clavier ni à la souris | US1-3, FR-008, clarification Q2 |
| 5 | Basculer vite entre Standard et Express plusieurs fois | Montants signalés « en cours de mise à jour », puis seuls ceux du dernier choix restent affichés (onglet Réseau : requêtes obsolètes annulées) | US1-4, FR-011 |
| 6 | Étape Paiement | Mastercard, Visa, Apple Pay, Google Pay ; carte enregistrée affichée masquée ; sans carte, « Ajouter une carte » et validation bloquée ; mention « paiement de test » ; aucun champ de numéro de carte dans le tunnel | FR-009 |
| 7 | Replier puis rouvrir l'étape Adresse | Les choix de livraison et de paiement sont conservés | FR-006 |
| 8 | « Valider la commande » (double clic) | Une seule commande créée ; compteur du panier à 0 ; arrivée sur `/checkout/confirmation/{uuid}` | US1-5, FR-012, FR-013 |
| 9 | Confirmation | « Paiement en cours » puis « Payée » sans action ; total identique à celui du récapitulatif | US1-5, SC-002, SC-005 |
| 10 | Retour arrière du navigateur depuis la confirmation | Pas de tunnel prêt à recommander : confirmation ou panier vide | Edge Cases, R10 |
| 11 | Paiement refusé (si l'environnement permet de le provoquer, sinon couvert par MSW en unitaire) | Message clair et « Relancer le paiement » ; une relance réussie fait passer la commande à « Payée » | US1-6, FR-014 |
| 12 | Dans un 2ᵉ onglet, réduire le stock d'un produit (admin) ou vider le panier, puis valider | Retour au panier avec les lignes signalées (quantité disponible) ou un message « panier vide » | US1-7, US1-8, FR-015 |
| 13 | Expirer la session (`/api/test/expire-session`, `E2E=true`), puis valider | Reconnexion puis retour sur `/checkout` avec la livraison et le paiement choisis ; nouvelle validation explicite ; pas de commande en double | US1-9, R9 |
| 14 | Compte B (sans adresse) | Champs d'adresse vides et obligatoires ; impossible de continuer sans eux | FR-007, Edge Cases |

### US2 — Appliquer une réduction

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| 15 | Panier connecté, ouvrir « Appliquer une réduction » | Campagnes actives avec leur avantage (« −20 % »…), leur minimum, leur plafond et leur date de fin s'ils existent ; pas de « aucune remise » | US2-1, FR-017 |
| 16 | Choisir BLACK_FRIDAY sur un panier d'environ 500 € | Sur le panier : sous-total et remise seulement, puis « Livraison et total calculés à l'étape suivante » ; ni frais de port ni total | US2-2, FR-016, clarification Q3 |
| 17 | Entrer dans le tunnel | Réduction déjà appliquée ; remise, port et total dans le récapitulatif | US2-5 |
| 18 | Campagne avec un minimum non atteint | Remise à 0 et « Il te manque X € pour profiter de … » ; réduction gardée ; commande possible | US2-3, FR-019, SC-004 |
| 19 | Ajouter des produits jusqu'à dépasser le minimum | La remise s'applique au devis suivant, sans nouvelle action | FR-019 |
| 20 | Saisir `INCONNUE`, puis une clé inactive | Refus clair ; la réduction précédente reste appliquée | US2-4, FR-018 |
| 21 | Désactiver la campagne (backend) entre le devis et la validation | Commande non créée, message « réduction plus valable », récapitulatif rechiffré sans elle, nouvelle validation demandée | US2-6, FR-020 |
| 22 | Aucune campagne active hors `NO_DISCOUNT` | Seule la saisie d'une clé est proposée, sans liste vide | US2-7 |
| 23 | Visiteur sur le panier | Le bloc réduction invite à se connecter | FR-021 |
| 24 | Passer une commande avec BLACK_FRIDAY, ouvrir son détail | Même remise et même clé que dans le récapitulatif | Test indépendant US2 |

### US3 — Suivre et gérer mes commandes

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| 25 | Compte avec plus de 10 commandes, `/account/orders` | Les plus récentes d'abord : date, statut, nombre d'articles, total ; pagination | US3-1, FR-022 |
| 26 | Filtrer sur « Payée » et « Expédiée » | Seules ces commandes ; `?status=…` dans l'adresse ; rechargement identique, fonctionne sans JavaScript | US3-2, FR-022 |
| 27 | Détail d'une commande récente | Produits, quantités, prix unitaires, adresse, sous-total, remise et clé, frais de port, type et transporteur, total | US3-3, FR-023 |
| 28 | Détail d'une commande antérieure à la décomposition | Seul le total, sans valeur vide ni « 0,00 € » trompeur | US3-4, FR-023, SC-006 |
| 29 | Frise du détail | Étape courante signalée (visuellement et `aria-current`) ; une commande annulée ou refusée affiche son issue à part | FR-024 |
| 30 | Commande non expédiée → « Modifier » : changer une quantité, enregistrer | Nouveau total ; mention « ta réduction d'origine est conservée » ; complément ou remboursement expliqué | US3-5, FR-025 |
| 31 | En modification : rechercher un produit, l'ajouter, enregistrer | Ligne ajoutée (ou quantité augmentée si le produit était déjà présent), nouveau total | US3-9, clarification Q4 |
| 32 | Ajouter un produit au-delà du stock | Ligne signalée, autres changements conservés | US3-9, R14 |
| 33 | Commande réduite à une seule ligne | Retrait impossible, explication et lien vers l'annulation | US3-10, FR-025 |
| 34 | Moyen de paiement en modification | Champ requis, sans valeur préremplie (le backend ne renvoie pas le moyen d'origine) | R14 |
| 35 | Modifier une commande expédiée (2ᵉ onglet ou délai de grâce dépassé) | Refus expliqué, statut rafraîchi | US3-6, FR-026 |
| 36 | Annuler une commande annulable | Confirmation demandée, puis statut « Annulée » | US3-7, FR-026 |
| 37 | Commande au paiement refusé | « Relancer le paiement » dans le détail | US3-8, FR-014 |
| 38 | Compte sans commande | État vide illustré avec un lien vers le catalogue | US3-11 |
| 39 | Ouvrir l'adresse du détail d'une commande d'un autre compte | « Commande introuvable », sans révéler qu'elle existe | Edge Cases |

### US4 — Mon profil

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| 40 | Compte A, `/account/profile` | Prénom, nom, email, nom d'utilisateur, adresse ; formulaire prérempli avec l'adresse découpée | US4-1, FR-028, FR-030 |
| 41 | Prénom d'une lettre | Erreur accessible sur le champ, rien n'est envoyé | US4-2, FR-028 |
| 42 | Changer la ville, enregistrer, recharger | Confirmation, nouvelle ville affichée, puis préremplie dans le tunnel | US4-3, test indépendant US4 |
| 43 | Téléphone | Champ vide avec une mention : un numéro saisi remplacera l'ancien | US4-5 |
| 44 | « Changer de mot de passe » | Console de compte Keycloak dans le même onglet ; retour possible | US4-4, FR-029 |
| 45 | Email et mot de passe | Non modifiables ; aucune suppression de compte proposée | FR-029 |
| 46 | Adresse au format inattendu (rue avec virgule, champ `null`) | Les champs incertains sont laissés vides, rien n'est deviné | FR-030, R16 |

### US5 — Ma carte enregistrée

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| 47 | Compte C, `/account/card` | Numéro masqué (4 derniers chiffres), titulaire, expiration, réseau ; jamais le numéro complet (vérifier aussi le HTML et les réponses du BFF) | US5-1, FR-031, SC-008 |
| 48 | Expiration passée | Erreur claire sur le champ | US5-2, FR-031 |
| 49 | Modifier titulaire et expiration, recharger | Valeurs à jour | Test indépendant US5 |
| 50 | Supprimer (confirmation) | État « aucune carte » | US5-3 |
| 51 | Compte sans carte | État illustré : une carte est nécessaire pour commander, « Ajouter une carte » | US5-4, FR-032 |
| 51 bis | Ajouter 1111 1111 1111 1111 dans « Ajouter une carte » | Carte masquée affichée ; dans l'onglet Réseau, aucune requête vers le site ne contient le numéro ni le cryptogramme | US5-5, SC-008 |
| 51 ter | Carte 4242 4242 4242 4242, commander | Confirmation « Paiement refusé » ; remplacer par 1111… puis « Relancer le paiement » → « Payée » | US5-7, FR-014 |
| 51 quater | Numéro de 12 chiffres ou expiration passée | Message de refus, carte précédente conservée | US5-6 |

### US6 — Ma wishlist

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| 60 | Connecté, cliquer le cœur de deux produits du catalogue | Cœurs pleins immédiatement, ajout annoncé | US6-1, FR-035, SC-010 |
| 61 | Ouvrir « Ma wishlist » (menu du compte) | Les deux produits, le dernier ajouté en premier, avec prix, disponibilité et date d'ajout | US6, FR-037 |
| 62 | Retirer un produit depuis la page, puis depuis le cœur d'une carte | Produit retiré, cœur vide | US6-2 |
| 63 | « Ajouter au panier » depuis la wishlist | Badge du panier incrémenté ; le produit reste dans la wishlist | FR-037 |
| 64 | Visiteur clique un cœur | Connexion puis retour : produit dans la wishlist sans nouveau clic | US6-5, FR-038 |
| 65 | Backend arrêté, clic sur un cœur | Le cœur revient à son état et un message l'explique | US6-3 |
| 66 | Wishlist vide | État vide illustré, lien vers le catalogue | US6-6 |

### Accès, navigation et interface

| # | Scénario | Résultat attendu | Spec |
|---|---|---|---|
| 52 | Visiteur sur `/account/orders`, `/checkout`, `/account/card` | Connexion, puis retour sur la page demandée | FR-001, Edge Cases |
| 53 | En-tête connecté | Accès à « Mon compte » : Commandes, Profil, Carte ; même barre que les autres pages | FR-003 |
| 54 | Page panier | Gabarit commun (`PageShell`, `PageHeader`) comme l'accueil et le catalogue | FR-004, R19 |
| 55 | Réponses des pages privées (DevTools) | `Cache-Control` sans cache partagé (`no-store` / `private`) | FR-002 |
| 56 | Effets « désactivés », puis `prefers-reduced-motion` | Étapes, montants et frise sans mouvement (fondus simples ou statique) | FR-033 |
| 57 | Lecteur d'écran : changement de livraison, erreur, statut de paiement | Mise à jour annoncée (`aria-live`) | FR-034 |

### Cas limites à vérifier à la main

- Backend arrêté pendant le tunnel : aucun montant inventé, validation impossible,
  « Réessayer » ; relancer le backend puis réessayer.
- Panier modifié dans un autre onglet pendant le tunnel : le devis suivant en tient compte avant
  la validation. Panier vidé ailleurs avant le devis : retour au panier avec un message.
- Paiement encore en cours au bout d'environ une minute : message et lien vers le détail de la
  commande.
- Remise à montant fixe supérieure au sous-total : le total ne descend pas sous les frais de
  port.
- Compte désactivé (`USER_NOT_ACTIVE`) : message dédié qui invite à contacter le support.
- Trop de requêtes (devis : 60 par minute, validation : 30 par minute) : message d'attente
  avec le délai `Retry-After`.
- Produit retiré du catalogue dans une ancienne commande : ligne affichée sans lien vers la
  fiche.

## 4. Performances et accessibilité

- **axe** : 0 violation `serious` ou `critical` sur le panier (avec le bloc réduction), chaque
  étape du tunnel, la confirmation, `/account/orders` (filtré), le détail, la modification, le
  profil et la carte (avec et sans carte).
- **Clavier seul** : tout le parcours de commande, du panier jusqu'à la confirmation, est
  faisable sans souris (SC-007) ; focus visible, retour du focus après les dialogues
  d'annulation et de suppression.
- **Lighthouse desktop** sur un build de production (`NEXT_DIST_DIR=.next-prod npx next build`,
  puis `next start` sur un autre port, par exemple 3124) : `/cart`, `/checkout`,
  `/account/orders`. Seuils : LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms (SC-009). La connexion ne
  marchant que sur le port 3000, mesurer les pages privées sur le port 3000 ou noter la
  limite.
- `long-tasks.spec.ts` : aucune tâche de plus de 50 ms due aux effets sur le tunnel et la
  frise.

## 5. Résultats

À compléter à la fin de chaque user story : date, environnement (commit backend, port),
contrôles automatiques, captures avant et après relues, scénarios OK / KO / non testables,
correctifs et points restants.

### US1 — Passer commande

Vérifié le 2026-10-14 (phases 1 et 2, puis T015–T033) : backend `84dc038` sur 8081, front de
l'utilisateur sur 3000.

- Contrôles : `typecheck` OK, `lint` 0 warning, `test` 663 tests verts (71 fichiers) avant les
  derniers correctifs, 192 tests `tests/unit/api` + `tests/unit/checkout` verts après.
- E2E `checkout.spec.ts` (`--workers=1`, chromium) : 3 OK, 1 sauté (session expirée : le front
  de l'utilisateur tourne sans `E2E=true`).
  - Visiteur → connexion → panier vide → retour au panier : OK.
  - Panier invité → « Passer commande » → connexion → tunnel avec le panier fusionné : OK après
    correctif (le tunnel attend la fusion, `CheckoutAwaitingCart`).
  - Commande de 2 produits en Express FedEx + Visa : nouveau devis en moins d'une seconde
    (SC-003), 6 interactions (SC-001), « Paiement accepté », total de la confirmation égal au
    total du récapitulatif (3 623,00 €, SC-002), badge du panier vide, retour arrière sans
    tunnel prêt à recommander, axe sans violation bloquante.
- **Découverte backend** : `POST /order/place` exige une carte enregistrée sur le compte
  (`OrderManagementServiceImp#validateUserBeforeProcessingPayment`, 404
  `BANK_CARD_NOT_FOUND`). Les comptes de test des parcours de commande sont donc inscrits avec
  une carte de test (`registerUser(context, { withBankCard: true })`), et le front affiche un
  message dédié (`FrontErrorCode.NO_SAVED_CARD`) au lieu de « profil introuvable ». Décision
  produit en attente (voir le point avec l'utilisateur).
- Captures relues : `screenshots/before/` (panier) et `screenshots/us1/` (panier connecté,
  étapes du tunnel, tunnel prêt, confirmation payée).
- Lighthouse desktop (build de production `.next-prod`, port 3124) : accueil 99 (LCP 905 ms,
  CLS 0,002, TBT 7 ms), catalogue 98 (LCP 1 088 ms, TBT 0), fiche produit 99 (LCP 826 ms),
  panier 99 (LCP 877 ms). Le tunnel et la confirmation sont privés : non mesurés.
- Non testables ici : paiement refusé et relance (paiement simulé toujours accepté ; couverts
  par les tests unitaires), session expirée (front sans `E2E=true`).

### US2 — Appliquer une réduction

Vérifié le 2026-10-14 (T034–T040 et T083) : backend `20f5666` sur 8081, front de
l'utilisateur sur 3000. Campagnes actives en local : `NO_DISCOUNT` et `BLACK_FRIDAY` (−20 %,
sans minimum ni plafond).

- Contrôles : `typecheck` OK, `lint` 0 warning, `test` 728 tests verts (78 fichiers).
- E2E (`--workers=1`, chromium) : `discount.spec.ts` 1 OK, 1 sauté après ses vérifications
  (clé `NOPE` refusée vérifiée ; partie « minimum non atteint » non testable : aucune campagne
  active n'a de minimum) ; `checkout.spec.ts` 3 OK, 1 sauté (session expirée, front sans
  `E2E=true`).
- **Découverte backend** : `ae1d263` abandonne l'enregistrement Stripe (§10) ; la carte est
  saisie et chiffrée par le backend et **seul un numéro composé de 1 paie** (4242… est refusé).
  Les comptes e2e utilisent désormais `1111111111111111` (`tests/e2e/support/account.ts`).
- Captures relues : `screenshots/us2/` (bloc ouvert, réduction appliquée, clé refusée, étape
  paiement avec et sans carte, tunnel prêt avec remise).
- Lighthouse desktop (build `.next-prod`, port 3124) : accueil 99 (LCP 1 043 ms, CLS 0,002,
  TBT 0), catalogue 99 (LCP 831 ms, TBT 11 ms), fiche produit 99 (LCP 919 ms), panier 99
  (LCP 831 ms) : budgets tenus.

| # | Résultat | Commentaire |
|---|---|---|
| 15 | OK | BLACK_FRIDAY « −20 % », sans `NO_DISCOUNT` |
| 16 | OK | Panier : sous-total, « Remise BLACK_FRIDAY − 399,80 € », « Livraison et total calculés à l'étape suivante » |
| 17 | OK | Réduction déjà appliquée dans le tunnel, total 1 614,20 € |
| 18–19 | non testable | aucune campagne active avec minimum ; couvert par les tests unitaires |
| 20 | OK | `NOPE` refusée, réduction précédente gardée |
| 21 | non testé à la main | couvert par les tests unitaires (FR-020) |
| 22 | couvert par les tests unitaires | une campagne est active en local |
| 23 | couvert par les tests unitaires | invitation à se connecter |
| 24 | OK (confirmation) | même remise et même total sur la confirmation ; détail de commande en US3 |
| T083 | OK | sans carte : « Ajouter une carte », « Valider la commande » désactivé (lien vers `/account/card`, page de US5 pas encore livrée) |

### US3 — Suivre et gérer mes commandes

Vérifié le 2026-10-20 (T041–T054, T098) : backend `f582c3a` sur 8081 (images sur
`localhost:9000`), `next dev` de vérification sur 3000 avec `E2E=true` et
`IMAGES_REMOTE_HOST=localhost:9000`.

- Contrôles : `typecheck` OK, `lint` 0 warning, `test` vert (83 fichiers).
- E2E (`--workers=1`, chromium, une minute entre les specs qui inscrivent des comptes) :
  `orders.spec.ts` 2 OK, `auth.spec.ts` 6 OK (menu avatar), `checkout.spec.ts` 4 OK (session
  expirée enfin exécutée), `discount.spec.ts` 1 OK + 1 sauté (aucune campagne à minimum),
  `wishlist.spec.ts` 2 OK, `cart.spec.ts` 7 OK, `catalog.spec.ts` 8 OK (palette Ctrl+K et
  « Rupture » passent).
- Correctifs pendant la vérification :
  - après une reconnexion forcée, les choix restaurés restaient dans des étapes « À venir » :
    les étapes restaurées sont maintenant repliées comme faites (`checkout-state.ts`) ;
  - le test de session expirée attendait un formulaire Keycloak, alors que la session SSO de
    Keycloak survit à celle du site (reconnexion silencieuse) ;
  - deux commandes passées à quelques secondes d'écart avaient le même numéro (début d'un
    UUID v7 = horodatage) : le numéro reprend la fin de l'UUID ;
  - liens dans le texte de la modification de commande soulignés (axe `link-in-text-block`) ;
  - sélecteurs e2e ambigus (« Indisponible » sur la fiche, produit en double pendant la
    navigation).
- Captures relues : `screenshots/us3/` (liste vide et remplie, filtre, détail, frise,
  modification, dialogue d'annulation, commande annulée, commande introuvable, menu avatar).
- Lighthouse desktop (build `.next-prod`, port 3124) : accueil 98 (LCP 1 196 ms, CLS 0,002,
  TBT 0), catalogue 97 (LCP 1 211 ms), fiche produit 99 (LCP 952 ms), panier 99 (LCP 907 ms).
  « Mes commandes » et le détail sont privés : non mesurés.

| # | Résultat | Commentaire |
|---|---|---|
| 25 | OK | plus récente d'abord ; pagination couverte par les tests unitaires (comptes e2e à 2 commandes) |
| 26 | OK | `?status=PAID` gardé au rechargement, formulaire GET |
| 27 | OK | sous-total, livraison, total, adresse, transporteur |
| 28 | couvert par les tests unitaires | pas de commande ancienne sur un compte neuf |
| 29 | OK | étape courante marquée ; « Commande annulée » à part |
| 30–31 | OK | quantité baissée, produit ajouté par recherche, ancien et nouveau total |
| 32 | partiel | le backend ne dit pas quelle ligne manque de stock : toutes les lignes ajoutées ou augmentées sont signalées (`backend-prompts-lot2.md` §11) |
| 33 | OK | retrait de la dernière ligne impossible, lien vers l'annulation |
| 34 | OK | moyen de paiement requis, non prérempli |
| 35 | couvert par les tests unitaires | 409 `order-locked` |
| 36 | OK | confirmation puis « Annulée », remboursement affiché |
| 37 | couvert par les tests unitaires | une carte `0000…` permettrait de le tester à la main |
| 38 | OK | état vide illustré |
| 39 | OK | « Commande introuvable » |

### US4 — Mon profil

À remplir.

| # | Résultat | Commentaire |
|---|---|---|
| 40–46 | à remplir | |

### US5 — Ma carte enregistrée

À remplir.

| # | Résultat | Commentaire |
|---|---|---|
| 47–51 | à remplir | |

### US6 — Ma wishlist

Vérifié le 2026-10-14 (T089–T097) : backend `20f5666` sur 8081, front de l'utilisateur sur
3000.

- E2E `wishlist.spec.ts` : 2 OK après correctif (le lien de l'image de chaque ligne n'avait pas
  de nom accessible : rendu décoratif, le nom du produit porte le lien).
- Captures relues : `screenshots/us6/` (cœurs du catalogue, fiche produit, wishlist remplie et
  vide).
- Écarts à R22 : `PUT` / `DELETE` répondent `200 { productUuid, isInWishlist }` (le client BFF
  lit toujours un JSON) ; disponibilité lue dans le navigateur par le badge de stock existant.

| # | Résultat | Commentaire |
|---|---|---|
| 60 | OK | cœur plein immédiatement |
| 61 | OK | dernier ajouté en premier, prix, stock, date d'ajout |
| 62 | OK | retrait depuis la page |
| 63 | OK | badge « Panier, 1 article », produit gardé dans la wishlist |
| 64 | OK | visiteur → connexion → produit ajouté au retour |
| 65 | couvert par les tests unitaires | retour arrière du cœur et message |
| 66 | OK | état vide illustré |

### Phase « Interface vivante et cohérente »

À remplir (scénarios 52 à 57, axe, Lighthouse, longues tâches).
