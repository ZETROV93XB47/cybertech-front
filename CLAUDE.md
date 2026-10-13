# CLAUDE.md — cybertech-front

Front Next.js de cybertech. Lire d'abord `.specify/memory/constitution.md` (fait foi), puis
`docs/backend/api-map.md`, `docs/backend/analysis.md`, `docs/guest-cart.md` et la feature en cours
dans `specs/`. Le backend (`C:\Users\guill\Downloads\cybertech-dev-develop_cybertech`) est en
**lecture seule**.

Langues :
- **Code en anglais** : identifiants, commentaires, TSDoc, messages de log, erreurs internes,
  commits.
- **Interface en français** (tutoiement) : tout texte visible par l'utilisateur, centralisé dans
  `features/*/messages.ts`, jamais en dur dans un composant.
- Documentation projet (`docs/`, `specs/`, `README.md`) en français.

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
   d'imbrication, ≤ 40 lignes par fonction (80 pour un composant `.tsx`), pas de ternaire imbriqué, `readonly` et
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
 * Cart constants.
 *
 * Values are aligned with the backend and with `docs/guest-cart.md`; never hard-code them
 * elsewhere.
 */

/**
 * Maximum number of lines in a guest cart.
 *
 * Browser-side guard: the backend accepts more, but the guest-cart preview calls
 * `GET /product/availability`, which is capped at 50 UUIDs per request.
 *
 * @see docs/guest-cart.md §2
 */
export const GUEST_CART_MAX_LINES = 50;

/** Where the data of a displayed cart comes from. */
export enum CartSource {
  /** Visitor cart, kept in the browser until it is merged at sign-in. */
  GUEST = "guest",
  /** Account cart; the backend is the source of truth. */
  ACCOUNT = "account",
}

const log = logger.child({ module: "cart.merge" });

/**
 * Merges the guest cart into the account cart, exactly once, right after sign-in.
 *
 * First tries a single batched `POST /cart/add` (additive on the backend side). On
 * `NOT_ENOUGH_STOCK`, replays line by line with quantities capped to the available stock, so
 * that one problematic line does not reject the whole merge.
 *
 * @param lines - Guest lines, already validated by Zod.
 * @param accessToken - The user's Keycloak access token; never logged.
 * @returns The merge report (merged, capped, dropped and failed lines).
 * @throws {ApiError} When the backend is still unavailable after the single retry.
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

// features/cart/messages.ts — the only place where user-facing text lives (French, tutoiement)
export const CART_MESSAGES = {
  mergeSuccess: (count: number): string => `${count} article(s) ajouté(s) à ton panier.`,
  insufficientStock: (available: number): string => `Il n'en reste que ${available}.`,
} as const;
```

## Environnement

Exécution locale uniquement (constitution X) : services du backend via son `docker-compose`,
backend Spring lancé depuis IntelliJ (`http://localhost:8081`), front avec `npm run dev`
(`http://localhost:3000`). Cible desktop uniquement. Pas de Dockerfile, pas de CI.

## Commandes

`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run test` · `npm run test:e2e` ·
`npm run gen:api` (types depuis l'OpenAPI du backend).
