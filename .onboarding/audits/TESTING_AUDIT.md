# Testing — Audit

> Confiance : high

> **Réconciliation (SHIA-572).** Audit intégralement révisé. La version antérieure décrivait un dépôt sans aucun test (0 %). Le code courant (`main` @ `acf9f61`) inclut `js/app.test.js` (311 lignes, `node:test` natif Node.js) et un `package.json` minimal avec script `"test": "node --test"`. Les recommandations 1 et 2 de la version antérieure sont **implémentées**. Cet audit documente la couverture effective, ses zones aveugles, et les questions restantes.

## Compréhension globale

Le dépôt dispose désormais d'une suite de tests réelle (`js/app.test.js`, 311 lignes) utilisant `node:test` (runner intégré à Node.js v18+, aucune dépendance externe). Les trois fonctions exportées (`loadTransfers`, `reserve`, `cancelReservation`) et les deux états exportés (`reservations`, `pendingTransfers`) sont couverts dans leurs chemins nominaux et d'erreur principaux. La garde `typeof document !== "undefined"` (`js/app.js`, ligne 88) est désormais justifiée par les tests hors-navigateur. Des zones aveugles persistent : le câblage `DOMContentLoaded`, la configuration `window.API_BASE_URL`, et les opérations réellement concurrentes.

## Résumé exécutif

`js/app.test.js` contient 13 cas de test couvrant : l'affichage nominal de la liste, les chemins d'erreur réseau et HTTP de `loadTransfers`, l'affichage conditionnel des boutons (Réserver / Annuler, `seatsLeft = 0`), les chemins nominaux et d'erreur de `reserve()` et `cancelReservation()`, et les trois scénarios de verrou anti double-clic (`pendingTransfers`). La couverture des chemins heureux et d'erreur des trois fonctions est substantielle. Les zones non testées sont : (a) l'écouteur `DOMContentLoaded` (ligne 89 de `js/app.js`) — son fonctionnement au chargement d'une page réelle est `INCONNU`, aucune observation navigateur ni test manuel documenté n'est disponible ; (b) la configuration `window.API_BASE_URL` — requiert un contexte navigateur non simulé par les tests ; (c) les opérations vraiment concurrentes sur des transferts différents ; (d) le comportement de la page après une erreur secondaire dans `loadTransfers()` appelée depuis `reserve()` ou `cancelReservation()`.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Runner de test : `node:test` (Node.js v18+), aucune dépendance externe.** `js/app.test.js`, ligne 1 : `import { test } from 'node:test'`. `package.json` : `"test": "node --test"`. Compatible avec le principe « aucune dépendance » du projet — `node:test` est un module natif. Les tests sont exécutables avec `npm test` ou `node --test js/app.test.js` depuis un environnement Node.js v18+.

**`VÉRIFIÉ_CODE` — Stratégie de mock DOM.** Les tests créent un objet `makeDOM()` qui simule `document.getElementById()`, `document.createElement()`, et les accesseurs `innerHTML` / `textContent` / `appendChild` sur un faux `<ul>`. Ce mock est injecté via `global.document = doc` avant chaque test. Il est suffisant pour tester la logique de rendu et les effets de bord sur `reservations` / `pendingTransfers`, sans jsdom ni navigateur.

**`VÉRIFIÉ_CODE` — Couverture de `loadTransfers()`.**
- Cas nominal : tableau d'un transfert, affichage vérifié (texte contient l'origine, pas de `undefined`, contient `10 places`) — `js/app.test.js`, lignes 45–65.
- Erreur HTTP (non-2xx) : `fetch` retourne `ok: false, status: 500`, message d'erreur vérifié (contient `'500'`) — lignes 67–78.
- Erreur réseau : `fetch` lève une `TypeError`, message d'erreur vérifié (contient `'Failed to fetch'`) — lignes 80–94.
- Bouton Réserver affiché si `seatsLeft > 0` — lignes 98–113.
- Bouton Réserver absent si `seatsLeft = 0` — lignes 115–129.
- Bouton Annuler affiché si réservation active dans `reservations` — lignes 131–148.

**`VÉRIFIÉ_CODE` — Couverture de `reserve()`.**
- Cas nominal : POST émis vers `/transfers/1/reserve`, `reservationId` stocké dans `reservations`, `loadTransfers()` appelée, bouton Annuler présent — lignes 152–182.
- Erreur HTTP (409) : message d'erreur affiché, `reservationId` non stocké — lignes 184–196.
- Double-clic (transfert déjà dans `pendingTransfers`) : `fetch` non appelé — lignes 249–268.
- Transfert déjà réservé (dans `reservations`) : `fetch` non appelé, `reservationId` existant préservé — lignes 270–288.

**`VÉRIFIÉ_CODE` — Couverture de `cancelReservation()`.**
- Cas nominal : DELETE émis vers `/transfers/1/reservations/uuid-1`, `reservationId` supprimé de `reservations`, `loadTransfers()` appelée, bouton Réserver réapparu — lignes 200–229.
- Erreur HTTP (404) : message d'erreur affiché, `reservationId` conservé dans `reservations` — lignes 231–244.
- Double-clic (transfert déjà dans `pendingTransfers`) : `fetch` non appelé, `reservationId` préservé — lignes 290–310.

**`VÉRIFIÉ_CODE` — Zones non couvertes.**
- L'écouteur `DOMContentLoaded` (`js/app.js`, ligne 89) : `VÉRIFIÉ_CODE` — la ligne existe et la garde `if (typeof document !== "undefined")` est bien contournée par les tests (Node.js sans DOM). Cependant, `makeDOM().doc.addEventListener` est un no-op dans les tests (`js/app.test.js`, ligne 35) : l'écouteur n'est jamais déclenché. Son fonctionnement effectif au chargement d'une page réelle est `INCONNU` — aucune observation navigateur ni test manuel documenté n'est disponible.
- La résolution de `window.API_BASE_URL` (lignes 2–3) : la constante `API_BASE_URL` est capturée à l'import du module (avant tout test), donc positionner `global.window.API_BASE_URL` dans un test est sans effet — le fallback `localhost:3100` est utilisé dans tous les tests.
- La concurrence réelle entre deux `reserve()` sur des transferts différents (légale par le verrou) n'est pas testée.
- Le comportement de la page si `loadTransfers()` échoue après un `reserve()` ou `cancelReservation()` réussi (erreur secondaire) : non couvert.
- L'itération sur un tableau vide renvoyé par l'API : la `<ul>` reste vide sans message — ce cas silencieux n'est pas exercé par les tests.

**`VÉRIFIÉ_CODE` — Pas de CI.** Pas de dossier `.github/`, pas de `Dockerfile`, pas de `Makefile`. Les tests ne sont exécutés que localement (commande `npm test`). Toute régression n'est détectée qu'en développement, pas automatiquement à chaque push.

## Forces

- **Suite de tests réelle couvrant les chemins heureux et d'erreur des trois fonctions.** Avant SHIA-354/383, aucun test n'existait ; la couverture est désormais substantielle sur les flux principaux.
- **Runner natif Node.js, aucune dépendance.** Cohérent avec le principe du projet et simple à maintenir.
- **États exportés (`reservations`, `pendingTransfers`)** : testables directement, sans instrumentation supplémentaire.
- **Garde `typeof document !== "undefined"`** : permet l'import de `js/app.js` sans DOM réel — la stratégie de test hors-navigateur fonctionne.

## Dettes techniques

- **Pas de CI.** Toute régression n'est détectée que localement. Priorité faible pour un pilote, haute pour un code en production.
- **Zone aveugle : état vide et `window.API_BASE_URL`.** Deux comportements observables non testés : tableau vide → liste silencieuse ; `window.API_BASE_URL` → URL de base surchargée.
- **Pas de test d'intégration ni end-to-end.** Le mock DOM simule les interactions navigateur mais ne détecte pas les régressions HTML (ex. si `index.html` perd `<ul id="transfers-list">`).

## Zones critiques

- **`js/app.test.js`, lignes 200–229 (test `cancelReservation` nominal)** : le test vérifie correctement l'URL DELETE, la suppression de `reservationId`, et le rafraîchissement — c'est le test le plus complet en termes d'interactions enchaînées. Un regression sur ce chemin serait détectée.
- **Zones non couvertes** : la concurrence réelle et les erreurs secondaires dans `loadTransfers()` après `reserve()`/`cancelReservation()` sont les angles morts les plus susceptibles de produire un bug observable en production.

## Risques

- **`VÉRIFIÉ_CODE` — Régression sur le câblage DOMContentLoaded invisible aux tests.** Si la ligne 89 de `js/app.js` est retirée accidentellement, les tests passent toujours (ils appellent `loadTransfers()` directement), mais la page ne charge plus les transferts dans le navigateur.
- **`VÉRIFIÉ_CODE` — Régression HTML non détectée.** Si `index.html` perd `<ul id="transfers-list">`, les tests continuent de passer (ils mockent `getElementById`), mais la page est cassée en production.

## Recommandations priorisées

1. **Ajouter un test pour le tableau vide** — vérifier que la liste est bien vide (et optionnellement qu'un message « aucun transfert » est affiché). Faible effort. Fichier : `js/app.test.js`.
2. **Tester la configuration `window.API_BASE_URL` — nécessite un import dynamique ou une refactorisation.** La constante `API_BASE_URL` est capturée à l'initialisation du module (`js/app.js`, lignes 2–3), avant l'import statique de `js/app.test.js:3`. Positionner `global.window.API_BASE_URL` dans le corps d'un test est donc sans effet : le module est déjà chargé. Alternative opérante : utiliser `await import('./app.js')` à l'intérieur du test (import dynamique), après avoir positionné `global.window`, pour forcer une ré-évaluation du module — ou refactoriser `js/app.js` pour exposer l'URL via une fonction getter. Fichiers : `js/app.test.js`, `js/app.js`.
3. **Ajouter une CI minimale** (GitHub Actions ou équivalent : `node --test`) — seulement si ce dépôt est destiné à évoluer au-delà du pilote. Fichier : `.github/workflows/test.yml` à créer.

## Questions ouvertes

- Des tests manuels sont-ils documentés ou systématisés en dehors de ce dépôt (wiki, procédure d'équipe) ?
- Le câblage `DOMContentLoaded` (ligne 89) est-il volontairement exclu des tests ou simplement oublié ?
- Un test end-to-end navigateur (Playwright, Cypress) est-il envisagé, ou le mock DOM est-il suffisant pour ce pilote ?
