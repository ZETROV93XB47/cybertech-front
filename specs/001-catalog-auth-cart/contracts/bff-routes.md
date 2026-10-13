# Contrat : routes BFF exposées au navigateur

Seules interfaces HTTP que le navigateur appelle (hors pages et Auth.js). Toutes sont
same-origin, JSON, `Cache-Control: no-store` sauf mention. Schémas : `data-model.md`.
Erreurs : corps `{ error: { code: FrontErrorCode, message: string, fieldErrors?, retryAfterSeconds? } }`
avec le statut HTTP d'origine (voir `errors.md`).

| Méthode | Route | Auth | Entrée | Sortie 2xx | Endpoint(s) Spring |
|---|---|---|---|---|---|
| GET | `/api/search?q=` | public | `q` 1–100 car. | `200 { results: ProductCard[] }` (≤ 6) | `POST /product/search { keyword, size: 6 }` |
| GET | `/api/products?uuids=` | public | 1–8 UUID | `200 { products: ProductCard[] }` (inconnus omis) ; cacheable 60 s | `GET /product/get/{uuid}` ×N (cache données 60 s) |
| GET | `/api/availability?uuids=` | public | 1–50 UUID | `200 { items: ProductAvailability[] }` | `GET /product/availability?uuids=` (no-store) |
| POST | `/api/cart/preview` | public | `{ items: GuestLine[] }` (≤ 50) | `200 CartView` (`source: "guest"`) | `GET /product/get/{uuid}` + `GET /product/availability` |
| GET | `/api/cart` | USER | — | `200 CartView` (`source: "account"`) | `GET /cart/get` (+ fiches et dispo pour images/stock) |
| POST | `/api/cart` | USER | `{ productUuid, quantity }` | `201 CartView` | `POST /cart/add` |
| PATCH | `/api/cart/items/[productUuid]` | USER | `{ quantity }` (absolue 1–99) | `200 CartView` | `GET /cart/get` puis `PATCH /cart/update/{cartUuid}` (toutes les lignes, celle-ci remplacée) |
| DELETE | `/api/cart/items/[productUuid]` | USER | — | `200 CartView` | `PATCH /cart/remove/{productUuid}` |
| DELETE | `/api/cart` | USER | — | `200 CartView` (vide) | `DELETE /cart/clear` |
| POST | `/api/cart/merge` | USER | `{ items: GuestLine[] }` | `200 MergeReport` | `POST /cart/add` (toutes) ; si 409 `NOT_ENOUGH_STOCK` : `GET /product/availability` puis `POST /cart/add` ligne par ligne plafonnée |
| POST | `/api/test/expire-session` | E2E=1 seulement | — | `204` | aucun ; 404 hors E2E |

`ProductCard = { uuid, name, brand, category, price, imageUrl: string|null }`.
`GuestLine = { productUuid: uuid, quantity: int 1..99 }`.

## Server Actions

| Action | Entrée | Résultat | Endpoint Spring |
|---|---|---|---|
| `registerUser(formData)` | `RegisterInput` | `{ ok: true }` ou `{ ok: false, fieldErrors, formError, retryAfterSeconds? }` | `POST /user/register` (+ `X-Forwarded-For`) |
| `signOutEverywhere()` | — | redirection vers l'`end_session_endpoint` Keycloak | Keycloak OIDC |

## Règles communes

- Les routes USER renvoient `401 { error: { code: "unauthenticated" } }` sans session valide ;
  le client applique alors R14 (action en attente + redirection).
- Toute entrée est validée par Zod ; échec → `400 { error: { code: "invalid", fieldErrors } }`
  sans appel backend.
- Les routes panier rejouent une fois `CONCURRENT_MODIFICATION` et les 5xx avant de répondre.
- Méthodes non listées → 405.
