# CLAUDE.md — cybertech-front

Front Next.js de cybertech. Lire d'abord `.specify/memory/constitution.md` (fait foi), puis
`docs/backend/api-map.md`, `docs/backend/analysis.md`, `docs/guest-cart.md` et la feature en cours
dans `specs/`. Le backend (`C:\Users\guill\Downloads\cybertech-dev-develop_cybertech`) est en
**lecture seule**.

Langue : documentation, commentaires et messages UI en **français** (tutoiement dans l'UI),
identifiants en anglais.

## Règles de code (non négociables — constitution, principe XII)

Le niveau attendu est celui du backend Java (voir `CartServiceImp.java`,
`CyberTechAppConstants.java`) : chaque constante, chaque méthode publique documentée, logs
structurés et masqués.

1. **Zéro magic number / magic string.** Toute valeur → constante nommée
   `SCREAMING_SNAKE_CASE` documentée, dans `lib/constants/<domaine>.ts` ou en tête de module.
   Unité dans le nom (`_MS`, `_SECONDS`). Séparateurs `8_000`.
2. **Enums string pour tout ensemble fermé** (`enum CartSource { GUEST = "guest", ACCOUNT = "account" }`).
   Pas d'enum numérique, pas de `const enum`. Zod dérivé de l'enum (`z.enum(CartSource)`).
   `switch` exhaustifs terminés par `assertNever`.
3. **Code droit** : une responsabilité par fonction, retours anticipés, ≤ 3 niveaux
   d'imbrication, ≤ 40 lignes par fonction (hors JSX), pas de ternaire imbriqué, `readonly` et
   `const` par défaut, types de retour explicites sur les exports, aucun `any`.
4. **TSDoc complet** sur chaque export et en tête de chaque module : quoi, **pourquoi**,
   `@param`, `@returns`, `@throws`, `@see` (spec, contrat, fichier backend).
5. **Logs** : serveur via `lib/logger.ts` uniquement (logger enfant par module) ; chaque appel
   backend loggué (méthode, route, statut, durée, `X-Request-Id`, `errorCode`) ; jamais de token,
   mot de passe, cookie, email complet ; `maskUuid` / `maskEmail`. Client : pas de `console.*`.
6. Une tâche est finie quand `npm run typecheck`, `npm run lint` (0 warning), `npm run test`
   passent et que les exports ajoutés sont documentés.

## Exemple du style attendu

```ts
/**
 * Constantes du panier.
 *
 * Valeurs alignées sur le backend et sur `docs/guest-cart.md` ; ne jamais les dupliquer en dur.
 */

/**
 * Nombre maximal de lignes d'un panier invité.
 *
 * Garde-fou côté navigateur : le backend accepte plus, mais la prévisualisation appelle
 * `GET /product/availability`, plafonné à 50 UUID par requête.
 *
 * @see docs/guest-cart.md §2
 */
export const GUEST_CART_MAX_LINES = 50;

/** Origine des données d'un panier affiché. */
export enum CartSource {
  /** Panier du visiteur, conservé dans le navigateur jusqu'à la fusion. */
  GUEST = "guest",
  /** Panier du compte, dont le backend est la source de vérité. */
  ACCOUNT = "account",
}

const log = logger.child({ module: "cart.merge" });

/**
 * Fusionne le panier invité dans le panier du compte, une seule fois, à la connexion.
 *
 * Tente d'abord un `POST /cart/add` groupé (additif côté backend). En cas de
 * `NOT_ENOUGH_STOCK`, rejoue ligne par ligne avec des quantités plafonnées au stock disponible
 * pour isoler les lignes problématiques plutôt que de tout rejeter.
 *
 * @param lines - Lignes invitées déjà validées par Zod.
 * @param accessToken - Token Keycloak de l'utilisateur, jamais loggué.
 * @returns Le rapport de fusion (lignes fusionnées, plafonnées, abandonnées, en échec).
 * @throws {ApiError} Si le backend est indisponible après le rejeu unique.
 * @see docs/guest-cart.md §4
 * @see CartServiceImp#addItemsToCart (backend)
 */
export async function mergeGuestCart(
  lines: readonly GuestCartLine[],
  accessToken: string,
): Promise<MergeReport> {
  // …
  log.info({ merged: report.merged.length, capped: report.capped.length }, "Guest cart merged");
  return report;
}
```

## Commandes

`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run test` · `npm run test:e2e` ·
`npm run gen:api` (types depuis l'OpenAPI du backend).
