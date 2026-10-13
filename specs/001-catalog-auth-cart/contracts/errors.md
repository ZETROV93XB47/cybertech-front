# Contrat : erreurs backend → codes front → messages

Le BFF parse `ErrorResponseDto` et aiguille **uniquement** sur `errorCode`. Il expose au navigateur
un `FrontErrorCode` stable. Messages centralisés dans `features/*/messages.ts`, au tutoiement.

| `errorCode` backend (statut) | `FrontErrorCode` | Comportement | Message type |
|---|---|---|---|
| `INVALID_REQUEST`, `MALFORMED_JSON`, `METHOD_ARGUMENT_TYPE_MISMATCH` (400) | `invalid` | `fieldErrors` projetés sur les champs ; sinon message de formulaire | « Certains champs sont à corriger. » |
| `AUTHENTICATION_REQUIRED` (401) | `unauthenticated` | refresh + rejeu unique ; sinon redirection connexion (R14) | « Ta session a expiré, reconnecte-toi. » |
| `ACCESS_DENIED` (403) | `forbidden` | page interdite | « Tu n'as pas accès à cette page. » |
| `PRODUCT_NOT_FOUND`, `RESOURCE_NOT_FOUND` (404) | `not-found` | fiche → `notFound()` ; panier → ligne `unavailable` | « Ce produit n'existe plus. » |
| `USER_NOT_FOUND`, `CART_NOT_FOUND`, `CART_ITEM_NOT_FOUND` (404) | `not-found` | panier relu depuis le serveur | « Ton panier a changé, on l'a mis à jour. » |
| `NOT_ENOUGH_STOCK` (409) | `insufficient-stock` | relire `GET /product/availability` ; joindre `availableStock` | « Il n'en reste que {n}. » / « Ce produit est en rupture. » |
| `CONCURRENT_MODIFICATION` (409) | `conflict` | rejeu automatique unique, puis message | « Ton panier a été modifié ailleurs, réessaie. » |
| `CART_IS_EMPTY`, `CANNOT_REMOVE_ITEM_FROM_EMPTY_CART` (409) | `empty-cart` | afficher l'état panier vide | « Ton panier est vide. » |
| `USER_ALREADY_EXISTS` (409) | `already-exists` | erreur sur le champ email | « Un compte existe déjà avec cet email. » |
| `TOO_MANY_REQUESTS` (429) | `rate-limited` | `retryAfterSeconds` depuis `Retry-After` | « Doucement ! Réessaie dans {n} s. » |
| 5xx, réponse non JSON, timeout 8 s, réseau | `unavailable` | écritures panier : 1 rejeu ; catalogue : écran « Réessayer » | « On n'arrive pas à joindre la boutique. Réessaie dans un instant. » |
| tout autre `errorCode` | `unknown` | log serveur avec `X-Request-Id` | « Quelque chose s'est mal passé. Réessaie. » |

Les logs serveur incluent `X-Request-Id`, `errorCode`, la route BFF ; jamais de token ni de
données de formulaire (mot de passe).
