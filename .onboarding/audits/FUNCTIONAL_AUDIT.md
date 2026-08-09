# Functional — Audit

> Confiance : high

> **Réconciliation (SHIA-572).** Audit intégralement révisé. La version antérieure caractérisait la réservation comme une fonctionnalité « revendiquée mais absente » (grep `reserv → 0 résultat`). Le code courant (`main` @ `acf9f61`) implémente intégralement les fonctionnalités de réservation et d'annulation depuis SHIA-354 (SHIA-383 pour le verrou anti double-clic). Corrections majeures : (a) `reserve()` et `cancelReservation()` sont implémentées et testées ; (b) la gestion d'erreur est présente dans les trois fonctions ; (c) le `README.md` est désormais cohérent avec l'implémentation réelle. Zones persistantes non résolues : état de chargement, état vide, persistance inter-session.

## Compréhension globale

`shift-pilot-resa-web` réalise trois fonctionnalités **implémentées dans le front** : afficher les transferts disponibles, réserver une place sur un transfert, et annuler une réservation active. Ces fonctionnalités sont implémentées, testées en isolation (fonctions appelées directement sans navigateur réel ni API réelle), et cohérentes avec ce que le `README.md` décrit. Le périmètre fonctionnel est abouti pour un pilote — les lacunes restantes (état de chargement, liste vide, persistance inter-session) sont visibles par l'utilisateur final mais n'invalident pas le flux nominal.

## Résumé exécutif

Depuis SHIA-354, le dépôt implémente un flux utilisateur complet : au chargement, `loadTransfers()` affiche la liste des transferts avec bouton « Réserver » (si places disponibles) ou « Annuler » (si déjà réservé). Le clic sur « Réserver » déclenche `reserve()` — appel POST, stockage du `reservationId` dans une Map client, rafraîchissement de la liste. Le clic sur « Annuler » déclenche `cancelReservation()` — appel DELETE, suppression du `reservationId`, rafraîchissement. Un verrou anti double-clic (`pendingTransfers` Set, SHIA-383) empêche deux opérations simultanées sur le même transfert. Les erreurs réseau et HTTP sont affichées à l'utilisateur via `list.textContent`. Lacunes restantes : aucun indicateur de chargement pendant les appels réseau ; aucun message explicite pour une liste vide ; les réservations sont session-locales (perdues au rechargement).

## Constats détaillés

**`VÉRIFIÉ_CODE` — Fonctionnalité 1 : affichage du catalogue de transferts.** Au chargement de la page, `loadTransfers()` est déclenchée via `DOMContentLoaded` (`js/app.js`, ligne 89). Elle interroge `GET /transfers`, itère sur le tableau JSON reçu, et crée un `<li>` par transfert avec `from → to — price XPF (seatsLeft places)` (ligne 22). Le rendu est cohérent avec les données de l'API.

**`VÉRIFIÉ_CODE` — Fonctionnalité 2 : réservation d'une place.** Chaque `<li>` pour un transfert avec `seatsLeft > 0` sans réservation active affiche un bouton « Réserver » (lignes 30–34). Le clic déclenche `reserve(t.id)`. `reserve()` vérifie le verrou (ligne 45), pose `pendingTransfers.add` (ligne 46), émet `POST /transfers/{id}/reserve` avec `{ seats: 1 }` (lignes 49–53), stocke `data.reservationId` dans `reservations` (ligne 58), et appelle `loadTransfers()` pour rafraîchir la liste (ligne 59). En cas d'erreur, `list.textContent` affiche le message (ligne 61).

**`VÉRIFIÉ_CODE` — Fonctionnalité 3 : annulation d'une réservation.** Chaque `<li>` pour un transfert avec réservation active affiche un bouton « Annuler » (lignes 25–29). Le clic déclenche `cancelReservation(t.id, reservationId)`. `cancelReservation()` vérifie le verrou (ligne 68), pose `pendingTransfers.add` (ligne 69), émet `DELETE /transfers/{id}/reservations/{reservationId}` (lignes 72–75), supprime le `reservationId` de `reservations` (ligne 79), et appelle `loadTransfers()` (ligne 80). En cas d'erreur, `list.textContent` affiche le message (ligne 82).

**`VÉRIFIÉ_CODE` — Verrou anti double-clic.** `reserve()` vérifie `reservations.has(transferId) || pendingTransfers.has(transferId)` (ligne 45) et retourne immédiatement si vrai. `cancelReservation()` vérifie `pendingTransfers.has(transferId)` (ligne 68). Ce mécanisme empêche un double-clic de déclencher deux appels API — comportement validé par trois tests dans `js/app.test.js` (lignes 249–310).

**`VÉRIFIÉ_CODE` — Gestion d'erreur visible (à condition que le nœud DOM soit présent).** Toute erreur réseau ou HTTP dans les trois fonctions produit un message dans `list.textContent` (lignes 40, 61, 82) — à condition que `document.getElementById("transfers-list")` retourne un nœud non-null. Ce n'est plus une page silencieusement cassée dans le cas nominal. Limite : le message remplace le DOM list ; il n'est possible de retrouver la liste qu'après un appel réussi à `loadTransfers()`.

**`VÉRIFIÉ_CODE` — Aucun état de chargement visible.** Entre le déclenchement de `loadTransfers()` (et des deux autres fonctions) et le rendu des `<li>`, la page affiche la `<ul>` vide sans indicateur de chargement. Sur une connexion lente, le délai est perceptible sans feedback.

**`VÉRIFIÉ_CODE` — Aucun état vide explicite.** Si `GET /transfers` retourne un tableau vide, la boucle s'exécute zéro fois et la `<ul>` reste vide sans message. L'utilisateur ne peut distinguer « aucun transfert disponible » de « la page n'a pas fini de charger ».

**`VÉRIFIÉ_CODE` — Réservations session-locales.** `reservations` (Map) et `pendingTransfers` (Set) sont en mémoire, réinitialisés vides à chaque chargement de page. Si l'utilisateur recharge la page, ses réservations disparaissent de l'état client — même si l'API les maintient côté serveur. L'affichage post-rechargement dépend de ce que `GET /transfers` renvoie (par exemple via `seatsLeft` mis à jour). Aucun endpoint « mes réservations » n'est consommé au chargement pour réconcilier.

**`VÉRIFIÉ_CODE` — `README.md` cohérent avec l'implémentation.** Le `README.md` décrit le dépôt comme une *« interface de réservation de transferts inter-îles »* — ce qui est désormais vrai. L'écart antérieur entre ambition déclarée et implémentation réelle est comblé.

**`VÉRIFIÉ_CODE` — Pas de pagination, filtre, tri, ou vue détail.** Tous les transferts retournés par l'API sont rendus dans une seule liste plate. Acceptable pour un catalogue restreint.

## Forces

- **Flux utilisateur complet** : affichage → réservation → annulation, sans dépendance cachée.
- **Gestion d'erreur visible à l'utilisateur** dans les trois fonctions : `try/catch` + message affiché.
- **Verrou anti double-clic** (`pendingTransfers`) : prévient un double-clic de créer deux réservations.
- **Rafraîchissement automatique** après réservation et annulation : la liste reflète immédiatement l'état mis à jour (bouton Annuler ↔ Réserver).
- **Cohérence `README.md`** : ambition déclarée et implémentation réelle sont désormais alignées.

## Dettes techniques

- **Absence d'indicateur de chargement.** Trois appels réseau (`loadTransfers`, `reserve`, `cancelReservation`) laissent la liste vide ou figée sans feedback pendant la durée de l'appel. Localisation : `js/app.js`, entre les gardes et le rendu.
- **Absence de message pour la liste vide.** `GET /transfers` retournant `[]` et une erreur réseau produisent deux résultats visuellement identiques (liste vide). Localisation : `js/app.js`, après la boucle (lignes 20–38).
- **Réservations non persistées inter-session.** La `Map reservations` est en mémoire, réinitialisée au rechargement. Si un utilisateur recharge la page, l'interface ne montre plus ses réservations actives (même si elles existent côté API). Documenter cette limite dans `README.md`.

## Zones critiques

- **`js/app.js`, lignes 24–35 (rendu des boutons)** : logique qui détermine l'action disponible par transfert. Un senior vérifierait ici : priorité entre Annuler et Réserver (Annuler prime si `reservationId` présent, indépendamment de `seatsLeft`), et conséquence si `t.id` est absent.
- **`js/app.js`, lignes 44–65 (`reserve`)** : chemin le plus critique — la réussite d'une réservation engage côté API. Un bug ici (stockage incorrect de `reservationId`) rendrait l'annulation impossible.

## Risques

- **`HYPOTHÈSE` — Réconciliation session partielle après rechargement.** Au rechargement de page, les boutons affichés dépendent uniquement de `seatsLeft` (API) et non de `reservations` (Map client, réinitialisée vide). Si le `seatsLeft` renvoyé par l'API ne reflète pas les réservations de l'utilisateur courant, l'UI est incohérente (bouton Réserver affiché pour une place déjà prise). Conditionnel au contrat API — non observable depuis ce dépôt.
- **`HYPOTHÈSE` — Conflit de réservation simultanée.** Deux utilisateurs différents réservant la dernière place en même temps : le front de chacun croit avoir réussi localement, mais l'API n'en servira qu'un. Pas de détection de conflit côté front — responsabilité de l'API.
- **`VÉRIFIÉ_CODE` (côté front) / `HYPOTHÈSE` (côté API) — Perte de contexte après erreur dans `loadTransfers()` post-`reserve()`.** Si `loadTransfers()` échoue après un `reserve()` dont le POST a retourné `response.ok`, `list.textContent` affiche un message d'erreur secondaire et l'utilisateur peut ignorer que sa réservation a réussi côté front (`reservations` mis à jour, ligne 58). Que la réservation ait effectivement eu lieu côté API est conditionnel au contrat API.

## Recommandations priorisées

1. **Ajouter un indicateur de chargement** — texte « Chargement… » ou état désactivé du conteneur pendant les appels réseau. Améliore l'expérience utilisateur sur connexion lente. Fichier : `js/app.js`, `index.html`.
2. **Ajouter un message pour la liste vide** — distinguer « aucun transfert disponible » de l'état vide initial. Fichier : `js/app.js`, après la boucle (lignes 20–38).
3. **Documenter la limite de persistance session** dans `README.md` — les réservations sont locales à la session navigateur. Faible effort, importante pour les utilisateurs et les développeurs aval. Fichier : `README.md`.

## Questions ouvertes

- L'API met-elle à jour `seatsLeft` après une réservation pour permettre la réconciliation après rechargement ? Si oui, le bouton Réserver est correctement masqué ; si non, un rechargement peut ré-afficher le bouton Réserver pour une place déjà prise.
- Un endpoint « mes réservations » est-il prévu côté `shift-pilot-resa-api` pour réconcilier l'état client au chargement ?
- La limite de session-local pour `reservations` est-elle assumée (pilote) ou à corriger avant mise en production ?
