# WORKFLOW_ANNULER_RESERVATION — Annulation d'une réservation connue côté client sur un transfert inter-île

> **Nouveau (SHIA-570).** Workflow absent de la version précédente — `cancelReservation()` était décrit comme étape implicite de `WORKFLOW_AFFICHAGE_TRANSFERTS.md` sans fichier propre. Ce document le documente en tant que workflow distinct conformément à la règle « une unité = un fichier ». Le mécanisme anti double-clic (`pendingTransfers`) est issu du correctif SHIA-383 ; lu et confirmé dans `js/app.js` et `js/app.test.js`.

## Classification
- **Type** : `user_journey`
- **Sous-type** : action utilisateur asynchrone avec garde de concurrence et rafraîchissement automatique
- **Visibilité** : `external_user`
- **Acteur principal** : utilisateur final (navigateur, clic sur bouton « Annuler »)
- **Acteurs** : navigateur (utilisateur), API distante `shift-pilot-resa-api`
- **Criticité** : Haute — fonctionnalité de gestion des réservations, complémentaire à `WORKFLOW_RESERVER_TRANSFERT.md`
- **Confiance** : high
- **Justification** : `cancelReservation()` est entièrement contenue dans `js/app.js` (lignes 67–86), 20 lignes sans branchement hors lecture. La suite de tests couvre le cas nominal, l'erreur API et le scénario de double-clic (`js/app.test.js`, lignes 200–310). Tous les fichiers ont été ouverts en entier.

## Objectif
Permettre à un utilisateur d'annuler une réservation connue côté client (entrée présente dans la Map locale `reservations`) sur un transfert inter-île. Un clic sur « Annuler » envoie une requête `DELETE` à l'API, supprime l'entrée correspondante dans la Map client, puis rafraîchit la liste pour afficher le bouton « Réserver » (si des places sont à nouveau disponibles). Un verrou empêche tout double-clic ou appel concurrent sur le même transfert.

## Acteurs
- **Utilisateur final** : clique sur le bouton « Annuler » rendu par `loadTransfers()` pour un transfert dont une réservation est connue côté client (entrée présente dans la Map locale `reservations`)
- **API distante `shift-pilot-resa-api`** : reçoit `DELETE /transfers/{id}/reservations/{reservationId}` ; le client considère tout statut 2xx comme un succès — le contrat exact de l'API distante n'est pas observable depuis ce dépôt

## Points d'entrée
- Clic sur le bouton « Annuler » — écouteur `click` → `cancelReservation(t.id, reservationId)` (`js/app.js`, ligne 28 : `btn.addEventListener("click", () => cancelReservation(t.id, reservationId))`)
- Appel direct possible depuis des tests ou du code externe (fonction exportée : `export async function cancelReservation`, ligne 67)

## Étapes principales
1. **Garde anti double-clic** : `if (pendingTransfers.has(transferId)) return;` (`js/app.js`, ligne 68) — retour immédiat sans effet si une opération (réservation ou annulation) est déjà en cours sur ce transfert. Différence avec `reserve()` : la garde ici ne vérifie **pas** `reservations.has()` — l'utilisateur ne peut cliquer « Annuler » que si une réservation est connue côté client ; le bouton n'est rendu que lorsque `reservations.get(t.id)` retourne une valeur truthy dans `loadTransfers()`.
2. **Pose du verrou** : `pendingTransfers.add(transferId)` (`js/app.js`, ligne 69) — le `transferId` est ajouté au Set `pendingTransfers` immédiatement après la garde.
3. **Appel HTTP DELETE vers l'API** : `fetch(\`${API_BASE_URL}/transfers/${transferId}/reservations/${reservationId}\`, { method: "DELETE" })` (`js/app.js`, lignes 72–74) — aucun corps de requête, la méthode seule suffit.
4. **Vérification du statut HTTP** : `if (!response.ok) { throw new Error(\`Erreur annulation : ${response.status}\`) }` (`js/app.js`, lignes 76–78) — tout statut non-2xx lève une erreur qui atterrit dans le catch.
5. **Suppression de l'état client** : `reservations.delete(transferId)` (`js/app.js`, ligne 79) — la réservation est retirée de la Map client. Cette mutation n'intervient qu'après réception d'un statut HTTP 2xx (étape 4).
6. **Rafraîchissement de la liste** : `await loadTransfers()` (`js/app.js`, ligne 80) — la liste est rechargée ; `loadTransfers()` lit la Map `reservations` (désormais sans cette entrée) et affiche le bouton « Réserver » si `seatsLeft > 0`.
7. **Gestion des erreurs** : bloc `catch (err)` (`js/app.js`, lignes 81–83) — en cas d'échec, `list.textContent` est remplacé par `"Impossible d'annuler : ${err.message}"`. La Map `reservations` n'est **pas** mutée en cas d'erreur (la suppression, étape 5, n'est pas atteinte).
8. **Libération du verrou** : bloc `finally` (`js/app.js`, lignes 83–85) — `pendingTransfers.delete(transferId)` est exécuté **dans tous les cas** (succès ou échec), garantissant que le verrou n'est jamais laissé actif.

## Règles métier
- **Anti double-clic** : si `pendingTransfers.has(transferId)` est vrai, `cancelReservation()` retourne immédiatement sans appel réseau (`js/app.js`, ligne 68) — un clic répété pendant l'attente de la réponse API ne génère pas de second DELETE.
- **La Map n'est mutée qu'après succès API** : `reservations.delete(transferId)` n'est atteint qu'après la vérification `response.ok` (ligne 76) — si l'API renvoie une erreur, la réservation reste dans la Map. Le code ne supprime pas l'entrée avant d'avoir reçu une réponse 2xx ; aucun contrat sur l'état côté serveur n'est vérifié dans ce dépôt.
- **Le verrou est libéré en `finally`** : `pendingTransfers.delete(transferId)` est dans le bloc `finally` (`js/app.js`, ligne 84) — toujours retiré même si `loadTransfers()` échoue après l'annulation.
- **Aucun corps de requête** : le DELETE est envoyé sans corps (`js/app.js`, lignes 72–74), contrairement au POST de réservation.
- **Accès conditionné par l'état de rendu** : le bouton « Annuler » n'est rendu par `loadTransfers()` que si `reservations.get(t.id)` retourne une valeur (`js/app.js`, lignes 24–29) — dans le flux normal, `cancelReservation()` ne peut être appelé que si une réservation est connue côté client (entrée présente dans `reservations`).

## Données
- **`transferId`** (paramètre, identifiant du transfert) : valeur issue de `t.id` lors du rendu ; sert de clé dans `reservations` et dans l'URL du DELETE.
- **`reservationId`** (paramètre, identifiant de la réservation) : valeur issue de `reservations.get(t.id)` lors du rendu (`js/app.js`, ligne 24) ; transmis à l'URL `DELETE /transfers/{transferId}/reservations/{reservationId}`. Stocké initialement par `reserve()` via `data.reservationId`.
- **`pendingTransfers`** (Set, module-scoped) : partagé avec `reserve()` (`js/app.js`, ligne 8).
- **`reservations`** (Map, module-scoped) : partagée avec `loadTransfers()` et `reserve()` (`js/app.js`, ligne 6).

## Intégrations
- **`shift-pilot-resa-api`** (API distante) :
  - `DELETE /transfers/{transferId}/reservations/{reservationId}` (`js/app.js`, lignes 72–74) — aucun corps envoyé ; le corps de la réponse n'est pas lu (`cancelReservation` ne contient aucun `await response.json()`) ; le code accepte tout statut 2xx sans désérialisation. La fixture de test fournit `{ seatsLeft: 10 }` mais cette valeur n'est pas consommée (`js/app.js`, lignes 76–80).

## Risques
- **Désynchronisation état client / état API** : en cas d'erreur HTTP (statut exact `INCONNU` depuis ce dépôt — le code teste uniquement `response.ok`), `reservations.delete(transferId)` n'est **pas** appelé (`js/app.js`, ligne 79 atteint seulement après `response.ok`). La Map client conserve une entrée pour une réservation que l'API a peut-être déjà supprimée. Le bouton « Annuler » s'affichera à nouveau ; tout clic ultérieur recevra une nouvelle erreur HTTP dont le statut dépend du contrat de l'API distante (`INCONNU`).
- **Échec du rafraîchissement après annulation réussie** : si le GET déclenché par `await loadTransfers()` (ligne 80) échoue, `loadTransfers()` capture elle-même l'erreur et affiche son propre message dans `list` (`js/app.js`, lignes 39–40) — l'exception n'est **pas** propagée à `cancelReservation()`. L'entrée est déjà supprimée de la Map (ligne 79), mais la liste affiche le message d'erreur du GET plutôt que la liste à jour.
- **Affichage des erreurs invasif** : le catch remplace tout le contenu du conteneur `list` par le message d'erreur (ligne 82) — la liste complète disparaît sur toute erreur.
- **Pas de retry** : aucun mécanisme de ré-essai. Un échec réseau transitoire laisse la réservation intacte sans guidage pour l'utilisateur.

## Questions ouvertes
- **Forme réelle de la réponse DELETE** : l'API renvoie-t-elle un corps JSON ? Le code ne le lit pas (pas de `await response.json()` après le DELETE réussi) ; les fixtures de test suggèrent `{ seatsLeft: 10 }` mais cette valeur n'est pas consommée.
- **Comportement de l'API si `reservationId` est invalide** : renvoie-t-elle 404 ? 400 ? Un code différent changerait le message d'erreur affiché à l'utilisateur.
- **Réconciliation après rechargement** : si l'annulation réussit mais que la page est rechargée avant le rafraîchissement, la Map client repart à zéro. L'API maintient-elle l'état d'annulation de façon à ce que la liste rechargée ne montre plus le bouton « Annuler » ?

## Preuves
- `js/app.js` — ouvert en entier (90 lignes) :
  - `export const reservations = new Map()` (ligne 6)
  - `export const pendingTransfers = new Set()` (ligne 8)
  - `export async function cancelReservation(transferId, reservationId)` (lignes 67–86) : garde (ligne 68), `pendingTransfers.add` (ligne 69), `fetch DELETE` (lignes 72–74), `response.ok` (lignes 76–78), `reservations.delete` (ligne 79), `loadTransfers()` (ligne 80), catch (lignes 81–83), `finally pendingTransfers.delete` (lignes 83–85)
  - bouton Annuler créé dans `loadTransfers()` avec listener → `cancelReservation(t.id, reservationId)` (ligne 28)
- `js/app.test.js` — ouvert en entier (310 lignes) :
  - test nominal cancelReservation DELETE + suppression reservationId (lignes 200–229)
  - test erreur 404 + vérification que reservationId est préservé (lignes 231–244)
  - test anti double-clic : `pendingTransfers.add(1)` avant appel (lignes 290–310)
