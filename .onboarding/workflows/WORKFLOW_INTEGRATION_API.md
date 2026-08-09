# WORKFLOW_INTEGRATION_API — Couche d'intégration à l'API de réservation (shift-pilot-resa-api)

> **Nouveau (SHIA-570).** Workflow absent de la version précédente. Ce document couvre le domaine `integration-api` identifié dans `CARTE_DES_DOMAINES.md` : résolution de l'URL de base selon l'environnement, mécanique commune des appels `fetch`, désérialisation JSON, et propagation des erreurs HTTP et réseau vers l'interface.

## Classification
- **Type** : `technical_flow`
- **Sous-type** : couche d'intégration HTTP cliente, configuration par surcharge de variable globale
- **Visibilité** : `technical`
- **Acteur principal** : module JavaScript `js/app.js` (déclenché par les workflows `user_journey` qui y font appel)
- **Acteurs** : module `js/app.js`, API distante `shift-pilot-resa-api`, environnement hôte (navigateur ou Node.js pour les tests)
- **Criticité** : Haute — point de couplage unique entre le dépôt `shift-pilot-resa-web` et `shift-pilot-resa-api` ; son indisponibilité bloque tous les workflows utilisateur
- **Confiance** : high
- **Justification** : La couche d'intégration est entièrement contenue dans `js/app.js` (lignes 2–3 pour la configuration, et les blocs `fetch` des trois fonctions exportées). `js/app.test.js` mocke `global.fetch` dans chaque test et vérifie les URLs et méthodes attendues. Tous les fichiers ont été ouverts en entier.

## Objectif
Fournir une couche mince pour l'ensemble des appels HTTP vers `shift-pilot-resa-api` : résoudre l'URL de base une fois au chargement du module, exécuter les requêtes `fetch` avec les méthodes et corps attendus, désérialiser les réponses JSON pour le GET et le POST (le corps du DELETE n'est pas consommé), et capturer les erreurs (HTTP non-2xx ou réseau) pour les afficher dans l'interface utilisateur.

## Acteurs
- **Module `js/app.js`** : seul fichier JavaScript du dépôt ; contient les trois fonctions d'appel (`loadTransfers`, `reserve`, `cancelReservation`) et la constante `API_BASE_URL`
- **`shift-pilot-resa-api`** : API distante consommée ; son URL de base est configurable via `window.API_BASE_URL`
- **Environnement hôte** : navigateur en production (expose `window`), Node.js en test (expose `global.fetch`)

## Points d'entrée
- Chargement du module `js/app.js` dans le navigateur ou dans l'environnement de test — la constante `API_BASE_URL` est résolue une fois, immédiatement, à l'évaluation du module (`js/app.js`, lignes 2–3)
- Les trois fonctions exportées (`loadTransfers`, `reserve`, `cancelReservation`) sont les points d'appel effectifs aux endpoints de l'API

## Étapes principales

### A. Résolution de l'URL de base (une seule fois, au chargement du module)
1. Évaluation de `const API_BASE_URL = (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` (`js/app.js`, lignes 2–3) :
   - La garde `typeof window !== "undefined"` permet l'évaluation hors navigateur (ex. Node.js pour les tests) sans `ReferenceError`
   - Si `window` est défini et que `window.API_BASE_URL` est une valeur truthy, elle est utilisée (mécanisme de surcharge pour les environnements de déploiement)
   - Sinon, le fallback `"http://localhost:3100"` est utilisé (valeur codée en dur, développement local)
2. `API_BASE_URL` est une constante de module — sa valeur ne change pas pendant la durée de vie de la page

### B. Appel HTTP et traitement de la réponse (GET et POST désérialisent ; DELETE ne lit pas le corps)
3. **GET /transfers** (`loadTransfers`, `js/app.js`, ligne 13) : `fetch(\`${API_BASE_URL}/transfers\`)` — sans en-tête ni corps ; `await response.json()` lu après vérification `response.ok` (ligne 17)
4. **POST /transfers/{id}/reserve** (`reserve`, `js/app.js`, lignes 49–53) : `fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seats: 1 }) })` — corps JSON fixé en dur ; `await response.json()` lu après vérification `response.ok` (ligne 57)
5. **DELETE /transfers/{id}/reservations/{reservationId}** (`cancelReservation`, `js/app.js`, lignes 72–74) : `fetch(url, { method: "DELETE" })` — aucun corps ni en-tête supplémentaire ; **aucun `await response.json()`** : le corps de la réponse n'est pas lu (lignes 76–80)
6. Vérification de `response.ok` dans chaque fonction — si faux, lève une `Error` avec le code HTTP dans le message

### C. Propagation d'erreur vers l'interface
7. Chaque fonction encadre son appel `fetch` d'un `try/catch` (`loadTransfers` lignes 12–41, `reserve` lignes 48–62, `cancelReservation` lignes 71–83)
8. En cas d'erreur capturée (réseau ou HTTP non-2xx) : `list.textContent = "Impossible de … : ${err.message}"` — le conteneur `<ul id="transfers-list">` est converti en zone de message d'erreur, effaçant tout son contenu précédent

## Règles métier
- **Fallback local** : si `window.API_BASE_URL` n'est pas défini, l'URL de base est la valeur codée en dur `"http://localhost:3100"` (`js/app.js`, ligne 3). Le code prouve uniquement cette valeur de configuration ; la disponibilité effective de l'API distante et le fonctionnement complet du dépôt en développement ne sont pas observables depuis ce fichier.
- **Surcharge par `window.API_BASE_URL`** : une valeur truthy sur `window.API_BASE_URL` prend la priorité sur le fallback (`js/app.js`, ligne 2–3). Le mécanisme d'injection de cette valeur en production est `INCONNU` depuis ce dépôt.
- **Pas d'en-têtes d'authentification configurés explicitement** : aucun en-tête `Authorization` ni en-tête d'authentification custom n'est passé dans les appels `fetch` (`VÉRIFIÉ_CODE` : lignes 13, 49–53, 72–74 — seul `Content-Type: application/json` est envoyé, et uniquement sur le POST). Les cookies gérés automatiquement par le navigateur (session, CSRF, etc.) ne sont pas observables depuis ce code ; leur présence ou absence reste `INCONNU` depuis ce dépôt.
- **Vérification `response.ok` systématique** : chaque appel `fetch` est suivi d'un `if (!response.ok) throw` avant tout accès au corps — les statuts non-2xx ne sont jamais silencieusement ignorés (`js/app.js`, lignes 14–16, 54–56, 76–78).
- **Mécanisme de capture uniforme** : erreurs réseau (`TypeError : Failed to fetch`) et erreurs HTTP suivent le même chemin `catch` dans chaque fonction et produisent un message affiché dans `list.textContent` (`js/app.js`, lignes 40, 61, 82). Le préfixe du message diffère : `"Impossible de charger les transferts : …"` (GET), `"Impossible de réserver : …"` (POST), `"Impossible d'annuler : …"` (DELETE) — le mécanisme est commun, pas le libellé.

## Données
- **`API_BASE_URL`** (chaîne, constante de module) : valeur résolue une fois au chargement (`js/app.js`, lignes 2–3). Préfixe toutes les URLs des appels `fetch`.
- **`window.API_BASE_URL`** (chaîne ou `undefined`, fournie par l'environnement hôte) : mécanisme de configuration de l'URL de base pour les environnements non-local. Sa définition et son injection sont `INCONNU` depuis ce dépôt.
- **`response.ok`** (booléen, propriété de `Response`) : `true` si le statut HTTP est dans la plage 200–299.
- **`err.message`** (chaîne) : message d'erreur affiché dans le conteneur `list` — inclut le code HTTP (ex. `"Erreur serveur : 500"`) ou la cause réseau (ex. `"Failed to fetch"`).

## Intégrations
- **`shift-pilot-resa-api`** (API distante) :
  - `GET /transfers` — route consommée ; finalité attendue côté client : liste des transferts disponibles
  - `POST /transfers/{id}/reserve` — route consommée ; finalité attendue côté client : réservation d'une place
  - `DELETE /transfers/{id}/reservations/{reservationId}` — route consommée ; finalité attendue côté client : annulation d'une réservation
  - Les URLs et méthodes sont prouvées dans `js/app.js` (lignes 13, 49–53, 72–74) ; les finalités métier et le contrat de réponse sont ceux observés côté client — le contrat serveur de `shift-pilot-resa-api` est `INCONNU` depuis ce dépôt (API dans un dépôt séparé, `README.md`)
  - Découverte via `README.md` (*« Consomme `shift-pilot-resa-api` (même projet, dépôt séparé) »*) et le commentaire de tête de `js/app.js` (ligne 1)

## Risques
- **Mécanisme d'injection de `window.API_BASE_URL` en production non documenté** : si `window.API_BASE_URL` n'est pas injecté correctement en production, tous les appels partent vers `"http://localhost:3100"` — fonctionnel en développement, non fonctionnel en production. Aucun log ni erreur n'avertit l'utilisateur de cette misconfiguration.
- **Pas de timeout sur les `fetch`** : aucun `AbortController` ni `signal` de timeout dans aucun des appels (`VÉRIFIÉ_CODE` : lignes 13, 49, 72). Une requête qui ne répond jamais bloquerait la fonction indéfiniment.
- **Pas de retry** : aucun mécanisme de ré-essai sur erreur réseau transitoire. Un échec réseau unique produit immédiatement un message d'erreur dans l'UI.
- **Pas de gestion du CORS** : aucune configuration CORS visible dans ce dépôt. La politique CORS est entièrement du ressort de `shift-pilot-resa-api` ; une misconfiguration CORS côté API serait une `TypeError` côté client, indiscernable d'une erreur réseau ordinaire (`INCONNU`).

## Questions ouvertes
- **Mécanisme d'injection de `window.API_BASE_URL` en production** : `<script>` injecté par le serveur, variable portée par un CDN, ou autre ? Aucun fichier de build, de configuration ni de déploiement dans ce dépôt.
- **Authentification côté API** : comment l'API identifie-t-elle l'appelant ? IP, session serveur, cookie ? Aucun mécanisme visible côté client (`INCONNU`).
- **Politique CORS de `shift-pilot-resa-api`** : l'API autorise-t-elle les origines des environnements de déploiement attendus ? Non observable depuis ce dépôt.

## Preuves
- `js/app.js` — ouvert en entier (90 lignes) :
  - `const API_BASE_URL = (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` (lignes 2–3)
  - `fetch(\`${API_BASE_URL}/transfers\`)` avec `response.ok` et `response.json()` (lignes 13–17)
  - `fetch(\`${API_BASE_URL}/transfers/${transferId}/reserve\`, { method: "POST", ... })` avec `response.ok` et `response.json()` (lignes 49–57)
  - `fetch(\`${API_BASE_URL}/transfers/${transferId}/reservations/${reservationId}\`, { method: "DELETE" })` avec `response.ok` (lignes 72–78)
  - blocs `catch` uniformes dans les trois fonctions (lignes 40, 61, 82)
- `js/app.test.js` — ouvert en entier (310 lignes) :
  - `global.fetch` mocké dans chaque test ; vérification des URLs et méthodes (`url.includes('/transfers/1/reserve')`, `opts?.method === 'POST'` — lignes 161–162 ; `url.includes('/transfers/1/reservations/uuid-1')`, `opts?.method === 'DELETE'` — lignes 210–211)
  - test erreur réseau injoignable (TypeError thrown) → message d'erreur UI (lignes 80–94)
- `README.md` — ouvert en entier : *« Consomme `shift-pilot-resa-api` (même projet, dépôt séparé) »*
