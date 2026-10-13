# cybertech-front

Front **Next.js** (App Router, TypeScript) de **cybertech**, plateforme e-commerce pédagogique de matériel informatique (ordinateurs, écrans, smartphones, claviers).

## Backend

- Repo backend (local) : `C:\Users\guill\Downloads\cybertech-dev-develop_cybertech` — branche `develop_back`.
- Spring Boot 4.0.4 / Java 26, MySQL, Redis, MongoDB, Elasticsearch, Keycloak (OAuth2 / OIDC), Stripe, AWS S3 (LocalStack), microservice Python de modération.
- API REST sous `/api/v1/services/...`, port `8081` en local, Swagger UI sur `http://localhost:8081/swagger-ui.html`.

Le backend n'est **jamais modifié** depuis ce repo : il est lu en lecture seule.

## État du repo

Le front n'est **pas encore codé**. Ce repo contient pour l'instant :

| Chemin | Contenu |
|---|---|
| `docs/initial-prompt.md` | Prompt de mission initial (trace). |
| `docs/backend/api-map.md` | Cartographie des endpoints, DTO champ par champ, incohérences, endpoints manquants. |
| `docs/backend/analysis.md` | Architecture, modèle de domaine, flux auth, cycle de vie du panier, contraintes front, risques. |
| `docs/guest-cart.md` | Conception du panier invité (`localStorage` + fusion à la connexion) et de sa synchronisation avec le panier serveur. |
| `docs/speckit-prompts.md` | Prompts prêts à coller pour `/speckit-constitution`, `/speckit-specify`, `/speckit-plan` + questions ouvertes. |
| `.specify/`, `.claude/` | Spec Kit (intégration Claude Code). |

## Démarrage (ordre des commandes Spec Kit)

1. `/speckit-constitution` (prompt 4.1 de `docs/speckit-prompts.md`)
2. `/speckit-specify` (prompt 4.2)
3. `/speckit-plan` (prompt 4.3)
4. `/speckit-tasks`
5. `/speckit-implement`
