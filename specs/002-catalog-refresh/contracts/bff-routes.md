# Contrat : routes BFF et appels backend de la feature 002

Complète `specs/001-catalog-auth-cart/contracts/bff-routes.md` (format, règles communes et
corps d'erreur inchangés). Schémas : [`../data-model.md`](../data-model.md).

## 1. Nouvelle route exposée au navigateur

| Méthode | Route | Auth | Entrée | Sortie 2xx | Endpoint(s) Spring |
|---|---|---|---|---|---|
| GET | `/api/compare?uuids=` | public | 1 à `COMPARE_MAX_PRODUCTS` (3) UUID, séparés par des virgules ou répétés, sans doublon | `200 ComparisonView` ; `Cache-Control: private, max-age=60` | `GET /product/get/{uuid}` ×N (cache données 60 s, tag `products`) + `GET /product-category-schemas/{key}` (cache 3 600 s) |

Erreurs :

| Cas | Statut | Corps |
|---|---|---|
| `uuids` absent, vide, invalide, > 3 ou en double | 400 | `{ error: { code: "invalid", fieldErrors: { uuids } } }`, sans appel backend |
| Aucun produit trouvé | 200 | `ComparisonView` avec `products: []`, `rows: []`, tous les UUID dans `missing` |
| Backend injoignable ou 5xx | 503 | `{ error: { code: "unavailable", message } }` (mapping existant de `lib/api/errors.ts`) |
| Schéma de catégorie introuvable | 200 | lignes construites sans libellés du schéma (repli `humanizeKey`), loggé en `warn` |

Logs (`lib/logger.ts`, module `compare.view`) : nombre demandé, trouvés, manquants, catégorie ;
UUID masqués (`maskUuid`).

## 2. Routes existantes réutilisées

| Route | Usage dans la feature |
|---|---|
| `GET /api/products?uuids=` | vignettes de la barre de comparaison (cartes, 1 à 3 UUID) |
| `GET /api/availability?uuids=` | disponibilité en direct dans le cadre de comparaison (via le batcher existant) |
| `POST /api/cart` / panier invité | bouton d'ajout au panier du cadre (composant `AddToCartButton` existant) |

## 3. Appels serveur (Server Components), sans route BFF

| Appel | Endpoint Spring | Cache | Repli |
|---|---|---|---|
| `getFacets(filters)` | `POST /product/search/facets`, corps = `toProductSearchRequest(filters)` sans `page` ni `size` | 60 s, tag `products` | 404 ou erreur → `getFallbackFacets(category)` |
| `getFallbackFacets(category)` | `POST /product/search { category, page: 0, size: 1000 }` | 300 s, tag `products` | erreur → `FacetData` `UNAVAILABLE` |
| `getCategoryCounts()` (accueil) | `getFacets({ category })` par catégorie (`totalHits`) | idem | `null` → tuile sans compteur |

Règles :
- appels publics, sans `Authorization` (aucune donnée utilisateur dans un fetch en cache) ;
- `X-API-VERSION: 1.0`, timeout et logs par `lib/api/client.ts` (inchangé) ;
- la réponse des facettes est validée par `ProductFacetsResponseSchema` ; non conforme → `error`
  loggé, repli comme pour une erreur ;
- un 404 de l'endpoint de facettes est loggé une seule fois en `warn` par processus (« facets
  endpoint missing, using fallback ») pour ne pas inonder les logs.

## 4. Adresse du catalogue (inchangée, rappel)

Paramètres existants de `lib/enums/search-param.ts` : `q`, `category`, `brand` (répété), `min`,
`max`, `page`, `a.<clé>` (répété, valeurs texte), `r.<clé>.min` / `r.<clé>.max`. Les nouvelles
valeurs texte utilisent `a.<clé>` comme les `enum` du lot 1 : aucune nouvelle forme d'adresse,
les liens du lot 1 restent valides. La sélection de comparaison n'apparaît jamais dans
l'adresse.
