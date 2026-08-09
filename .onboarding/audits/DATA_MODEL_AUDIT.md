# Data Model — Audit

> Confiance : medium

> **Réconciliation (SHIA-572).** Audit confronté au code courant (`main` @ `acf9f61`). Modifications depuis la version antérieure : (a) `pendingTransfers` Set (SHIA-383) ajouté comme état module-level exporté, complétant la `Map reservations` déjà documentée ; (b) toutes les références de lignes recalées sur le fichier à 90 lignes ; (c) le constat sur `t.seatsLeft` comme condition d'affichage du bouton Réserver confirmé à la ligne 30 (inchangé). La confiance reste `medium` : les types réels de `id`, `reservationId` et `price` ne sont pas observables depuis ce dépôt. Les questions ouvertes sur `id` et `reservationId` restent entières.

## Compréhension globale

Ce dépôt ne possède aucun modèle de données persistant : pas d'entité locale, pas de base de données, pas de `localStorage`, pas de cookie. Le modèle de données est entièrement en mémoire et se compose de deux objets module-level — `reservations` (Map) et `pendingTransfers` (Set) — ainsi que de la ressource distante `transfer` consommée depuis l'API. La confiance est `medium` non par lecture partielle, mais parce que la forme complète et les types réels de la ressource `transfer` ne sont observables que depuis `shift-pilot-resa-api`.

## Résumé exécutif

`shift-pilot-resa-web` maintient deux états applicatifs en mémoire, session-locaux, exportés depuis `js/app.js` :

- **`reservations` Map** (`transferId → reservationId`) : réservations actives de l'utilisateur pendant la session. Remplie par `reserve()` (ligne 58), vidée par `cancelReservation()` (ligne 79), lue par `loadTransfers()` pour l'affichage des boutons (ligne 24).
- **`pendingTransfers` Set** (`transferId`) : transferts avec une opération réseau en cours. Posé en entrée de `reserve()` (ligne 46) et `cancelReservation()` (ligne 69), levé dans `finally` (lignes 63, 84). Empêche les opérations concurrentes sur le même transfert.

La ressource distante `transfer` est consommée avec cinq champs connus (`id`, `from`, `to`, `price`, `seatsLeft`). Aucun stockage persistant, aucune migration, aucun ORM.

## Constats détaillés

**`VÉRIFIÉ_CODE` — État 1 : `export const reservations = new Map()`** (`js/app.js`, ligne 6). Clé : `transferId` (valeur du champ `id` retourné par `GET /transfers`). Valeur : `reservationId` (valeur du champ `reservationId` retourné par `POST /transfers/{id}/reserve`, ligne 58). Cycle de vie : mémoire volatile, réinitialisée vide à chaque chargement de page. Lectures : `reservations.get(t.id)` (ligne 24, détermine si le bouton Annuler ou Réserver est affiché), `reservations.has(transferId)` (ligne 45, garde anti double-réservation). Aucune persistance au-delà de la session navigateur.

**`VÉRIFIÉ_CODE` — État 2 : `export const pendingTransfers = new Set()`** (`js/app.js`, ligne 8). Contenu : `transferId` des opérations en cours. Posé par `pendingTransfers.add(transferId)` (lignes 46, 69) avant chaque appel réseau. Levé par `pendingTransfers.delete(transferId)` (lignes 63, 84) dans les blocs `finally`. Cycle de vie : volatile, réinitialisé vide au chargement. Invariant critique : un `transferId` ne devrait jamais rester dans `pendingTransfers` au-delà de la durée de l'opération — garanti par `finally`, mais non observable en dehors des tests.

**`VÉRIFIÉ_CODE` — Ressource distante `transfer` : cinq champs lus.** `js/app.js` accède à cinq champs :
- `t.id` : clé de `reservations` Map (ligne 24) et identifiant dans les URLs des endpoints POST/DELETE. **Impact si `id` absent (conditionnel — voir section Risques)** : `undefined` deviendrait clé Map et les URLs REST seraient malformées (`/transfers/undefined/...`) ; cet impact dépend d'une réponse API malformée, non observable depuis ce dépôt.
- `t.from`, `t.to` : affichage du texte du transfert (ligne 22).
- `t.price` : affichage du prix (ligne 22).
- `t.seatsLeft` : affichage (ligne 22) et condition d'affichage du bouton Réserver (`t.seatsLeft > 0`, ligne 30).

Ces cinq champs sont les seuls utilisés ; l'API peut en renvoyer davantage. Le type de `id` (entier ? UUID chaîne ?), de `price` (entier XPF ? décimal ?), et la sémantique de `seatsLeft` (peut-il être négatif ?) sont `INCONNU` depuis ce dépôt.

**`VÉRIFIÉ_CODE` — `reservationId` retourné par POST.** La réponse de `POST /transfers/{id}/reserve` est désérialisée en `data` (`js/app.js`, ligne 57) et `data.reservationId` est stocké dans `reservations` (ligne 58). Ce même `reservationId` est passé à `cancelReservation()` (ligne 28) et utilisé dans l'URL DELETE (ligne 73). Les fixtures de `js/app.test.js` emploient une chaîne `'uuid-1'` — suggère une chaîne/UUID — mais ce sont des valeurs de test, pas une preuve du contrat réel. Type et durée de vie exacts : `INCONNU`.

**`VÉRIFIÉ_CODE` — Aucune validation des données entrantes.** Aucune garde sur la présence ou le type des cinq champs de `transfer` avant accès. Un `id` absent produit une clé `undefined` dans `reservations` (`js/app.js`, ligne 24) — toutes les réservations collidant sur la même clé. Un `seatsLeft` absent produit `undefined places` dans l'affichage (ligne 22). Aucun `Array.isArray` avant l'itération sur `transfers` (ligne 20) — si l'API renvoie un objet ou `null`, la boucle `for...of` lève une `TypeError` attrapée par le `catch`.

**`VÉRIFIÉ_CODE` — Aucune gestion de l'état vide.** Un tableau vide renvoyé par l'API fait tourner la boucle zéro fois — la `<ul>` reste vide sans message explicite (distinct d'une erreur, qui affiche un message via le `catch`). Depuis SHIA-348 (non évalué depuis ce dépôt), la distinction erreur / liste vide reste asymétrique : erreur → message visible, liste vide → silence.

## Forces

- **État applicatif minimal et session-local** : `reservations` et `pendingTransfers` sont en mémoire, pas de risque de corruption persistante, aucune migration de données.
- **`INCERTITUDE` — présence de données personnelles non vérifiable.** Le registre contient des IDs de transfert (`transfer.id`) et de réservation (`reservationId`), mais la sémantique de ces identifiants est inconnue depuis ce dépôt seul. S'ils permettent d'identifier indirectement un utilisateur ou un passager (via l'API ou un autre service), ils constitueraient des données personnelles au sens RGPD. À confirmer avec le registre de traitements côté API (`shift-pilot-resa-api`).
- **Export des deux états** (`reservations`, `pendingTransfers`) : testables directement depuis `js/app.test.js` sans mock, ce qui rend les invariants vérifiables.
- **`finally` garantissant la libération de `pendingTransfers`** (lignes 63, 84) : pas de verrou permanent en cas d'erreur réseau ou d'exception dans `reserve`/`cancelReservation`.

## Dettes techniques

- **Contrat implicite et non formalisé avec l'API.** Les cinq champs attendus (`id`, `from`, `to`, `price`, `seatsLeft`) ne sont documentés nulle part dans ce dépôt — ni `README.md`, ni JSDoc, ni JSON Schema. Si l'API évolue (renommage, suppression), le front casse silencieusement. `id` est le champ le plus critique : son absence ou sa mutation casse la logique de réservation. Localisation : `js/app.js`, lignes 22, 24, 30.
- **Pas de validation du type de `id` et de `reservationId`.** Aucune garde sur leur présence avant utilisation comme clé Map ou segment d'URL. Localisation : `js/app.js`, lignes 24, 58, 73.
- **Aucun mécanisme de synchronisation multi-utilisateur.** Si deux utilisateurs réservent la dernière place simultanément, le front de chacun croit avoir réussi (état `reservations` cohérent localement) jusqu'au prochain rechargement. Responsabilité de l'API, mais à documenter.
- **Aucune gestion de l'état vide** (liste de transferts vide). Silence total — pas de message « aucun transfert disponible ». Localisation : `js/app.js`, lignes 20–38.

## Zones critiques

- **`js/app.js`, lignes 22, 24, 30 — accès directs aux champs sans validation** : c'est le seul endroit où le contrat avec l'API est exprimé, de façon implicite. Le champ `id` (ligne 24) est le plus critique : clé `Map` et identifiant dans les URLs POST/DELETE.
- **`js/app.js`, lignes 46, 63–64, 69, 83–84 — cycle de vie de `pendingTransfers`** : tout dysfonctionnement du bloc `finally` (impossible en JS normal, mais possible si le runtime est interrompu) laisserait un `transferId` bloqué dans `pendingTransfers` jusqu'au rechargement de page.

## Risques

- **`VÉRIFIÉ_CODE` — Rendu `undefined` silencieux si l'API modifie un champ.** Un renommage de `seatsLeft` en `seats` côté API produirait `undefined places` dans chaque `<li>`, sans erreur. Ce risque a frappé précédemment (bug SHIAAAAAAAAAAAAAAAAAAAAAAAA-311 : `seatsLeft` / `availableSeats`) et a été corrigé. Localisation : `js/app.js`, ligne 22.
- **`VÉRIFIÉ_CODE` — Mécanisme de collision si `id` est absent.** Si un objet `transfer` sans champ `id` était reçu, `undefined` deviendrait clé Map (`js/app.js`, ligne 24) : toutes les réservations partageraient la même entrée, et les URLs REST construites seraient malformées (`/transfers/undefined/...`). L'état `reservations` serait ambigu ; l'impact réel côté API (annulation ou non) reste incertain.
- **`HYPOTHÈSE` — Scénario : l'API retourne un objet `transfer` sans champ `id`.** Non observé depuis ce dépôt. Si ce scénario survenait, le mécanisme ci-dessus s'appliquerait. Sans preuve que l'API puisse omettre `id`, ce risque ne justifie pas un calibrage `HAUT` — gravité effective conditionnelle à ce scénario. Localisation : `js/app.js`, lignes 24, 58.
- **`HYPOTHÈSE` — Conflit de réservation simultanée.** Deux navigateurs réservant la dernière place en même temps : le front de chacun peut croire avoir réussi localement. Ni l'atomicité de l'opération côté serveur ni la réponse d'erreur éventuelle ne sont observables depuis ce dépôt (`js/app.js`, lignes 45–46, 68–69). Aucune détection de conflit côté front — responsabilité de l'API.
- **`INCONNU` — Forme réelle et contraintes de la ressource `transfer`.** Types, valeurs limites et exhaustivité des champs de `transfer` non observables depuis ce dépôt.

## Recommandations priorisées

1. **Documenter le contrat attendu avec l'API** dans `README.md` ou en JSDoc de `loadTransfers` : les cinq champs (`id`, `from`, `to`, `price`, `seatsLeft`), leurs types présumés et leur caractère obligatoire. Faible effort, forte valeur de maintenabilité. Fichiers : `README.md`, `js/app.js`.
2. **Ajouter une garde sur `id` et `reservationId`** — vérifier que `t.id` est défini avant de l'utiliser comme clé Map et comme segment d'URL ; vérifier que `data.reservationId` est défini avant `reservations.set`. Localisation : `js/app.js`, lignes 24, 58.
3. **Valider que la réponse `GET /transfers` est un tableau** avant itération (`Array.isArray(transfers)`) — le `catch` attrape la `TypeError`, mais distinguer explicitement un format inattendu d'une erreur réseau améliore le diagnostic. Localisation : `js/app.js`, ligne 20.
4. **Ajouter un message explicite pour la liste vide** — distinguer « aucun transfert disponible » de « erreur de chargement ». Fichier : `js/app.js`, après la boucle (lignes 20–38).

## Questions ouvertes

- **Quel est le type réel de `id` (entier ? UUID chaîne ?)** — critique car utilisé comme clé Map et identifiant dans les URLs POST/DELETE. Non observable depuis ce dépôt.
- **Quel est le type réel de `reservationId` retourné par POST `/transfers/:id/reserve` ?** — doit être réutilisable tel quel dans DELETE `/transfers/:id/reservations/:reservationId`. Non observable depuis ce dépôt.
- Quels sont les types réels de `price` et `seatsLeft` (peut-il être négatif) ?
- L'API renvoie-t-elle d'autres champs que ce front n'utilise pas ?
