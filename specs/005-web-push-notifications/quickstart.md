# Quickstart : valider les notifications Web Push

## Prérequis

- Services du backend lancés (`docker-compose` du backend), backend Spring dans IntelliJ sur
  `http://localhost:8081` avec `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` et
  `WEB_PUSH_SUBJECT` renseignés (clés générées par `npx web-push generate-vapid-keys`, fait le
  2026-10-22). Une paire invalide est signalée au démarrage du backend et désactive seulement le
  push.
- Front : `npm run dev` sur `http://localhost:3000` (les navigateurs traitent `localhost` comme
  sécurisé : pas besoin de HTTPS ; toute autre adresse en HTTP rend les notifications
  indisponibles).
- Stripe CLI connectée et `stripe listen` relayé vers le webhook du backend (voir le README du
  backend) pour confirmer les paiements de test.
- Chrome de bureau, notifications autorisées pour Chrome dans le système d'exploitation
  (Windows : Paramètres › Système › Notifications).

## 1. Clé publique

`curl -s http://localhost:3000/api/notifications/push/public-key` → `{"publicKey":"B…"}`.
Un `503` avec `code: "unavailable"` signifie que le backend n'a pas chargé les clés.

## 2. Activation depuis la confirmation

1. Se connecter, ajouter un produit, passer commande (carte de test `1111…`).
2. Sur la page de confirmation : l'encart « Sois prévenu quand ta commande est expédiée » est
   visible, **aucune** demande de Chrome n'est apparue au chargement.
3. Cliquer « Activer les notifications », accepter : l'encart passe à « Notifications
   activées ». DevTools › Application › Service workers : `/sw.js` actif, portée `/` ;
   Local Storage : `ct_push_v1` contient un `subscriptionUuid`.
4. Logs du front : une ligne « Push subscription saved » avec l'hôte du service de push
   seulement (pas d'adresse complète).

## 3. Réception et clic

1. Payer une commande de test (déclencher le webhook avec la Stripe CLI, ou repasser une
   commande payée) ; fermer l'onglet du site.
2. La notification « Paiement confirmé » s'affiche en moins de 30 s.
3. Cliquer dessus : Chrome ouvre `/account/orders/{uuid}` de la commande.
4. Lancer l'expédition (batch backend d'expédition) : la notification « expédiée » remplace
   celle de la même commande.
5. DevTools › Application › Service workers › « Push » avec un texte non JSON : rien ne
   s'affiche (Chrome peut finir par montrer sa notification générique, research R10).

## 4. Profil

1. `/account/profile` : l'interrupteur « Notifications du navigateur » est activé.
2. Le couper : `ct_push_v1` disparaît ; payer une commande : aucune notification.
3. Le réactiver : l'abonnement revient sans nouvelle demande de Chrome.
4. Paramètres du site (cadenas) › Notifications › Bloquer, recharger : état « refusées » avec
   la marche à suivre, interrupteur désactivé.

## 5. Déconnexion

1. Réactiver, puis « Se déconnecter » : `ct_push_v1` est effacé ; les logs montrent la
   suppression de l'abonnement avant la déconnexion.
2. Payer une commande du même compte depuis un autre navigateur : aucune notification ici.
3. Couper le backend, se connecter puis se déconnecter avec les notifications activées : la
   déconnexion aboutit en moins de 3 s.

## 6. Tests automatisés

```bash
npm run typecheck && npm run lint && npm run test
npx playwright test tests/e2e/push-notifications.spec.ts
```

Résultats attendus : tout passe ; l'e2e utilise une fausse souscription et intercepte le BFF
(research R15) : la réception réelle n'est couverte que par les étapes 2 à 5 ci-dessus.
