# Code Hotspots — Audit

> Confiance : high

> **Réconciliation (SHIA-572).** Audit profondément révisé — la version antérieure était fondée sur un `js/app.js` de 20 lignes sans tests. Le fichier actuel (`main` @ `acf9f61`) fait 90 lignes et s'accompagne de `js/app.test.js` (311 lignes). Corrections majeures : (a) l'ancien hotspot n°1 (appel `fetch` non gardé, lignes 6–7) est **résolu** — trois `try/catch` + `response.ok` couvrent les trois fonctions ; (b) la version antérieure mentionnait `t.availableSeats` à la ligne 13 — ce champ n'a jamais existé dans le code (`t.seatsLeft` a toujours été le nom correct) ; (c) deux nouveaux hotspots structurels identifiés. Les tests existants couvrent partiellement ces hotspots.

## Compréhension globale

`js/app.js` (90 lignes) est le seul fichier de code exécutable du dépôt. Il contient trois fonctions asynchrones et deux états module-level. Le hotspot par volume au sens classique n'existe pas (90 lignes restent lisibles), mais les points de concentration de risque sont désormais fonctionnels et structurels : la gestion d'état partagé entre fonctions, l'invariant du `finally`, et le pattern d'erreur destructeur du DOM.

## Résumé exécutif

Depuis SHIA-354 et SHIA-383, `js/app.js` a grandi de 20 à 90 lignes en ajoutant `reserve()`, `cancelReservation()`, et le verrou `pendingTransfers`. L'ancien hotspot principal — l'appel réseau sans garde — est résolu dans les trois fonctions. Deux nouveaux hotspots émergent : (1) le couplage entre l'état module-level (`reservations`, `pendingTransfers`) et les trois fonctions, dont la cohérence dépend d'un `finally` non interruptible et d'une absence de concurrence réelle — un senior vérifierait les invariants de `pendingTransfers` en premier ; (2) le pattern `list.textContent = ...` dans les `catch` qui remplace le DOM list par du texte brut, rendant toute récupération visuelle impossible sans un appel réussi à `loadTransfers()`. Le troisième appel à `document.getElementById("transfers-list")` (lignes 11, 47, 70) est une répétition indicative de la structure copie-collée, sans risque propre.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Hotspot 1 : état partagé `reservations` + `pendingTransfers` (lignes 6–8, lus/modifiés aux lignes 24, 45–46, 58, 63–64, 68–69, 79, 83–84).** Les deux collections module-level sont la colonne vertébrale de la logique applicative. Leur cohérence repose sur deux invariants implicites : (a) `pendingTransfers` ne contient un `transferId` que pendant la durée de l'opération réseau — garanti par `finally` (lignes 63–64, 83–84), non garanti si le processus est interrompu brutalement ; (b) `reservations` ne contient jamais un `transferId` dont `pendingTransfers` contient aussi la clé en état terminal — garanti par les gardes de ligne 45 et 68, mais non testé par les tests existants dans l'état de concurrence réelle. Ces invariants sont corrects dans le code actuel mais ne sont documentés nulle part. Un senior vérifierait ici en premier pour tout incident de production.

**`VÉRIFIÉ_CODE` — Hotspot 2 : pattern `list.textContent = \`...\`` dans les `catch` (lignes 40, 61, 82).** En cas d'erreur, chaque `catch` écrit directement sur `list.textContent` — ce qui (a) affiche bien un message d'erreur à l'utilisateur, mais (b) remplace l'intégralité du contenu DOM de `<ul id="transfers-list">` par une chaîne de texte brut. Il n'est pas possible de récupérer l'affichage de la liste sans un appel réussi à `loadTransfers()`. Cette approche est fonctionnelle mais fragile : si `reserve()` échoue, l'utilisateur se retrouve avec une page blanche (erreur texte en lieu et place de la liste) et aucun bouton pour réessayer. Un bug dans `loadTransfers()` elle-même (appelée après `reserve` ou `cancelReservation`) confirmerait l'état d'erreur.

**`VÉRIFIÉ_CODE` — Triple `document.getElementById("transfers-list")` (lignes 11, 47, 70).** Les trois fonctions résolvent indépendamment le même nœud DOM. C'est une répétition structure copie-collée plutôt qu'une fragilité propre (le nœud ne change pas), mais elle signale l'absence d'extraction d'un helper commun et fragilise la maintenance : si l'identifiant change, il faut le modifier à trois endroits. Aucun des trois appels ne teste la nullité du résultat.

**`VÉRIFIÉ_CODE` — Blocs `finally` : point critique mais correct (lignes 62–64, 83–85).** `pendingTransfers.delete(transferId)` dans `finally` garantit la libération du verrou même en cas d'exception dans le `catch`. C'est le comportement correct. Un senior vérifierait que rien dans le `catch` ne peut lever une exception avant l'exécution du `finally` (peu probable, `list.textContent = ...` est une affectation non-jetante).

**`VÉRIFIÉ_CODE` — `loadTransfers()` appelée dans `reserve()` et `cancelReservation()` (lignes 59, 80).** Après une opération réussie, `loadTransfers()` est appelée pour rafraîchir la liste. Ce rafraîchissement est `await`-é — si `loadTransfers()` échoue (erreur réseau), son propre `catch` (ligne 40) écrit sur `list.textContent`, écrasant le message de succès potentiel. Le rafraîchissement post-opération n'est pas lui-même gardé contre cet échec secondaire.

**`VÉRIFIÉ_CODE` — Lignes 2–3 : `window.API_BASE_URL` sans validation.** Si `window.API_BASE_URL` est une chaîne vide ou `null`, les appels `fetch` ciblent des URLs malformées (ex. `/transfers`). Ce cas est capturé par les `catch`, mais sans message distinctif. Risque faible mais non zéro.

## Forces

- **Trois `try/catch` + `response.ok`** : l'ancien hotspot principal (appel réseau non gardé) est résolu, dans les trois fonctions.
- **`finally` garantissant la libération du verrou** (lignes 63–64, 83–85) : pas de `pendingTransfers` fantôme en cas d'erreur.
- **Gardes en entrée de `reserve()` et `cancelReservation()`** (lignes 45, 68) : logique défensive correcte et lisible.
- **90 lignes au total** : malgré la croissance du fichier, la lisibilité reste bonne — aucun scroll nécessaire pour tout lire.

## Dettes techniques

- **Pattern d'erreur destructeur du DOM** (lignes 40, 61, 82) : `list.textContent = ...` dans les `catch` remplace la liste par du texte brut. Une zone d'erreur dédiée (séparée de la `<ul>`) serait moins abrupte et permettrait de conserver la liste affichée.
- **Triple `getElementById` sans factorisation ni garde de nullité** (lignes 11, 47, 70) : répétition identique à trois endroits, sans test de `null`.
- **Invariants de `pendingTransfers` non documentés** : les conditions de cohérence entre `reservations` et `pendingTransfers` ne sont pas commentées dans le code.

## Zones critiques

- **`js/app.js`, lignes 6–8, 45–46, 58, 63–64, 68–69, 79, 83–84 — cycle de vie de l'état partagé** : hotspot n°1. Un senior vérifierait ici les invariants de cohérence entre `reservations` et `pendingTransfers`, notamment en cas d'erreur et de concurrence.
- **`js/app.js`, lignes 40, 61, 82 — `catch` destructeurs du DOM** : hotspot n°2. Seul point où une erreur visible peut rendre la page non opérable sans reload complet ou re-déclenchement de `loadTransfers`.

## Risques

- **`HYPOTHÈSE` — État `pendingTransfers` potentiellement incohérent après interruption runtime.** Un crash du processus JS (exception dans un callback non attrapé, navigation forcée) entre `pendingTransfers.add` et le `finally` laisserait le transfert bloqué jusqu'au rechargement. Le code prouve le `finally` sur le chemin normal (`js/app.js`, lignes 62–64, 83–84) ; l'interruption runtime est hypothétique et non vérifiable depuis le code. Cas documentaire pour un pilote.
- **`VÉRIFIÉ_CODE` — `loadTransfers()` échouant après `reserve()` écrase la liste par un message d'erreur secondaire.** Si le rechargement de liste (`js/app.js`, ligne 59) échoue, `list.textContent` est écrasé par le message du `catch` secondaire, quelle que soit l'issue de l'appel de réservation (lignes 56–64).
- **`HYPOTHÈSE` — réservation aboutie côté API mais rendue invisible.** Si l'appel API de réservation a réussi mais que le rechargement échoue immédiatement après, l'utilisateur ne dispose d'aucune confirmation de l'opération : l'erreur secondaire est visuellement indiscernable d'un échec complet. La réussite de la réservation n'est pas observable depuis le code front seul.
- **`VÉRIFIÉ_CODE` — Champs `undefined` silencieux si l'API modifie un nom de champ.** Ligne 22 : un renommage de `seatsLeft` en `seats` côté API produirait `undefined places` dans le rendu, sans erreur catchée ni test cassé (les tests mockent avec la forme actuelle).

## Recommandations priorisées

1. **Extraire une zone d'erreur dédiée** (un `<p id="error-msg">` distinct de la `<ul>`) — les `catch` y écrivent l'erreur sans toucher la liste. Permet d'afficher l'erreur sans détruire le rendu existant. Fichiers : `index.html`, `js/app.js` (lignes 40, 61, 82).
2. **Factoriser le `document.getElementById("transfers-list")`** en une fonction helper ou en passant `list` en paramètre — supprime la répétition en trois points et centralise la garde de nullité. Fichier : `js/app.js` (lignes 11, 47, 70).
3. **Documenter les invariants de `pendingTransfers`** en commentaire au-dessus des lignes 8 — clarifier la règle « un `transferId` dans ce Set est une opération active, levée par `finally` ». Faible effort, forte valeur de maintenance.

## Questions ouvertes

- Le comportement de la page après une erreur dans `loadTransfers()` appelée depuis `reserve()` ou `cancelReservation()` est-il acceptable (message d'erreur secondaire, réservation possiblement réussie côté API) ? Ce cas n'est pas couvert par les tests.
- La duplication de la logique `getElementById` et `try/catch` entre les trois fonctions est-elle amenée à croître avec de futurs flux ? Si oui, une refactorisation vaut d'être anticipée.
