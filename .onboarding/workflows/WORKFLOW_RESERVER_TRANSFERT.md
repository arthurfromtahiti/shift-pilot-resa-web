# WORKFLOW_RESERVER_TRANSFERT — Réservation d'une place sur un transfert inter-île

> **Nouveau (SHIA-570).** Workflow absent de la version précédente — `reserve()` était décrit comme étape implicite de `WORKFLOW_AFFICHAGE_TRANSFERTS.md` sans fichier propre. Ce document le documente en tant que workflow distinct conformément à la règle « une unité = un fichier ». Le mécanisme anti double-clic (`pendingTransfers`) est issu du correctif SHIA-383 ; lu et confirmé dans `js/app.js` et `js/app.test.js`.

## Classification
- **Type** : `user_journey`
- **Sous-type** : action utilisateur asynchrone avec garde de concurrence et rafraîchissement automatique
- **Visibilité** : `external_user`
- **Acteur principal** : utilisateur final (navigateur, clic sur bouton « Réserver »)
- **Acteurs** : navigateur (utilisateur), API distante `shift-pilot-resa-api`
- **Criticité** : Haute — fonctionnalité de réservation principale, cœur du domaine `consultation-transferts`
- **Confiance** : high (fil client uniquement)
- **Justification** : `reserve()` est entièrement contenue dans `js/app.js` (lignes 44–65), 22 lignes sans branchement hors lecture. La suite de tests couvre le cas nominal, l'erreur API et deux gardes anti-doublon vérifiées par pré-remplissage de `pendingTransfers` et `reservations` (`js/app.test.js`, lignes 152–288) — les tests ne déclenchent pas d'appels concurrents réels. Tous les fichiers ont été ouverts en entier. La confiance `high` est limitée au comportement client observable ; le contrat de l'API distante (`shift-pilot-resa-api`) n'est pas accessible depuis ce dépôt et reste `INCONNU`.

## Objectif
Permettre à un utilisateur de réserver une place sur un transfert inter-île. Un clic sur « Réserver » envoie une requête `POST` à l'API, stocke l'identifiant de réservation reçu dans la Map client, puis rafraîchit la liste pour afficher le bouton « Annuler » à la place du bouton « Réserver ». Un verrou empêche tout double-clic ou appel concurrent sur le même transfert.

## Acteurs
- **Utilisateur final** : clique sur le bouton « Réserver » rendu par `loadTransfers()` pour un transfert donné
- **API distante `shift-pilot-resa-api`** : reçoit `POST /transfers/{id}/reserve` ; le client attend un objet JSON contenant `reservationId` et stocke sa valeur — le contrat exact de l'API distante n'est pas observable depuis ce dépôt

## Points d'entrée
- Clic sur le bouton « Réserver » — écouteur `click` → `reserve(t.id)` (`js/app.js`, ligne 33 : `btn.addEventListener("click", () => reserve(t.id))`)
- Appel direct possible depuis des tests ou du code externe (fonction exportée : `export async function reserve`, ligne 44)

## Étapes principales
1. **Garde anti double-clic / déjà réservé** : `if (reservations.has(transferId) || pendingTransfers.has(transferId)) return;` (`js/app.js`, ligne 45) — retour immédiat sans effet si (a) une entrée existe déjà dans la Map client pour ce transfert (présence dans `reservations`), ou (b) une opération (réservation ou annulation) est déjà en cours sur ce transfert. Ces deux cas sont vérifiés atomiquement avant tout appel réseau.
2. **Pose du verrou** : `pendingTransfers.add(transferId)` (`js/app.js`, ligne 46) — le `transferId` est ajouté au Set `pendingTransfers` immédiatement après la garde, avant le `fetch`. Tout appel concurrent à `reserve()` ou `cancelReservation()` sur ce même `transferId` sera bloqué par la garde (étape 1) tant que le verrou est actif.
3. **Appel HTTP POST vers l'API** : `fetch(\`${API_BASE_URL}/transfers/${transferId}/reserve\`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seats: 1 }) })` (`js/app.js`, lignes 49–53) — le corps est toujours `{ seats: 1 }`, fixé en dur (pas de saisie de quantité par l'utilisateur).
4. **Vérification du statut HTTP** : `if (!response.ok) { throw new Error(\`Erreur réservation : ${response.status}\`) }` (`js/app.js`, lignes 54–56) — tout statut non-2xx lève une erreur qui atterrit dans le catch.
5. **Désérialisation de la réponse** : `const data = await response.json()` (`js/app.js`, ligne 57) — la réponse est traitée comme du JSON ; le champ `data.reservationId` est extrait à l'étape suivante.
6. **Stockage du `reservationId`** : `reservations.set(transferId, data.reservationId)` (`js/app.js`, ligne 58) — le `reservationId` reçu est stocké dans la Map client sous la clé `transferId`. Il sera réutilisé comme argument de `cancelReservation()`.
7. **Rafraîchissement de la liste** : `await loadTransfers()` (`js/app.js`, ligne 59) — la liste est rechargée depuis l'API ; `loadTransfers()` lit la Map `reservations` (désormais à jour) et affiche le bouton « Annuler » pour ce transfert.
8. **Gestion des erreurs** : bloc `catch (err)` (`js/app.js`, lignes 60–62) — en cas d'échec (réseau ou HTTP non-2xx), `list.textContent` est remplacé par `"Impossible de réserver : ${err.message}"`. La Map `reservations` n'est **pas** mutée en cas d'erreur.
9. **Libération du verrou** : bloc `finally` (`js/app.js`, lignes 62–64) — `pendingTransfers.delete(transferId)` est exécuté **dans tous les cas** (succès ou échec), garantissant que le verrou n'est jamais laissé actif après la fin de la fonction.

## Règles métier
- **Idempotence côté client** : si `reservations.has(transferId)` est vrai, `reserve()` retourne immédiatement sans appel réseau (`js/app.js`, ligne 45) — l'utilisateur ne peut pas créer deux réservations pour le même transfert dans la même session cliente.
- **Anti double-clic** : si `pendingTransfers.has(transferId)` est vrai, `reserve()` retourne immédiatement (`js/app.js`, ligne 45) — un clic répété pendant l'attente de la réponse API ne génère pas de second appel.
- **Une place réservée par appel** : le corps est `{ seats: 1 }` fixé en dur (`js/app.js`, ligne 52) — il n'est pas possible de réserver plusieurs places en un seul appel depuis l'interface.
- **Le verrou est libéré en `finally`** : `pendingTransfers.delete(transferId)` est dans le bloc `finally` (`js/app.js`, ligne 63) — le verrou est toujours retiré, même si `loadTransfers()` échoue après la réservation.
- **Pas de mutation de `reservations` en cas d'erreur** : si `response.ok` est faux ou si le JSON échoue, `reservations.set()` n'est pas atteint (`js/app.js`, lignes 54–58) — la Map locale n'est pas modifiée. La cohérence avec l'état côté serveur ne peut pas être garantie : une erreur réseau peut survenir après traitement côté serveur mais avant réception de la réponse.

## Données
- **`transferId`** (paramètre, identifiant du transfert) : valeur issue de `t.id` lors du rendu ; sert de clé dans `reservations` et dans l'URL du `POST`. Son type (`number` ou `string`) est `INCONNU` côté API ; les tests emploient `1` (entier).
- **`reservationId`** (valeur de retour API, champ `data.reservationId`) : stocké dans `reservations.set(transferId, data.reservationId)` (`js/app.js`, ligne 58) ; réutilisé comme argument de `cancelReservation()`. Les fixtures de test emploient `'uuid-1'` (chaîne type UUID) — `HYPOTHÈSE` sur le contrat réel, non observable depuis ce dépôt.
- **Corps de la requête** : `{ seats: 1 }` — fixé en dur (`js/app.js`, ligne 52).
- **Réponse attendue** : objet JSON contenant au moins `reservationId` ; les fixtures de test ajoutent `transferId` et `seatsLeft` (`js/app.test.js`, ligne 163 : `{ reservationId: 'uuid-1', transferId: 1, seatsLeft: 9 }`). La forme réelle de l'API est `INCONNU`.
- **`pendingTransfers`** (Set, module-scoped) : partagé avec `cancelReservation()` ; contient les `transferId` dont une opération est en cours (`js/app.js`, ligne 8).
- **`reservations`** (Map, module-scoped) : partagée avec `loadTransfers()` et `cancelReservation()` (`js/app.js`, ligne 6).

## Intégrations
- **`shift-pilot-resa-api`** (API distante) :
  - `POST /transfers/{transferId}/reserve` (`js/app.js`, lignes 49–53) — corps : `{ seats: 1 }`, Content-Type : `application/json` ; réponse attendue : JSON avec `reservationId`

## Risques
- **`reservationId` absent de la réponse API** : si `data.reservationId` est `undefined`, `reservations.set(transferId, undefined)` stocke une valeur invalide (`js/app.js`, ligne 58). Un appel ultérieur à `cancelReservation(transferId, undefined)` enverrait `DELETE /transfers/{id}/reservations/undefined` avec une URL invalide ; le statut renvoyé par l'API distante est `INCONNU` depuis ce dépôt.
- **Échec du rafraîchissement après réservation réussie** : si le GET déclenché par `await loadTransfers()` (ligne 59) échoue, `loadTransfers()` capture elle-même son erreur (`js/app.js`, lignes 39–41) et affiche son propre message dans `list` — l'exception n'est **pas** propagée à `reserve()`. L'entrée dans `reservations` est déjà posée (ligne 58) ; l'interface affiche le message d'erreur du GET plutôt que la liste mise à jour.
- **Affichage des erreurs invasif** : le catch remplace **tout** le contenu du conteneur `list` par le message d'erreur (ligne 61) — la liste des transferts disparaît sur toute erreur, même une erreur de réservation sur un seul transfert.
- **Pas de retry** : aucun mécanisme de ré-essai. Un échec réseau transitoire lors du POST perd la réservation sans avertissement structuré ; l'utilisateur doit réessayer manuellement.

## Questions ouvertes
- **Forme réelle de la réponse `POST /transfers/{id}/reserve`** : quels champs l'API renvoie-t-elle exactement ? Les fixtures de test suggèrent `{ reservationId, transferId, seatsLeft }` — mais ce sont des valeurs de test, pas le contrat réel.
- **Type de `reservationId`** : chaîne, UUID, entier ? Les tests utilisent `'uuid-1'` (chaîne) ; non observable depuis ce dépôt.
- **Durée de vie du `reservationId`** : est-il valide uniquement pendant la session, ou persistant côté serveur ? Si persistant, la réconciliation au rechargement de page reste manquante (voir `WORKFLOW_AFFICHAGE_TRANSFERTS.md`, Questions ouvertes).
- **Comportement de l'API si `seatsLeft = 0`** : le bouton « Réserver » n'est pas affiché côté client si `seatsLeft = 0` (`js/app.js`, ligne 30), mais l'API peut-elle quand même recevoir un POST (appel direct) ? Pas de vérification dans `reserve()`.

## Preuves
- `js/app.js` — ouvert en entier (90 lignes) :
  - `export const reservations = new Map()` (ligne 6)
  - `export const pendingTransfers = new Set()` (ligne 8)
  - `export async function reserve(transferId)` (lignes 44–65) : garde (ligne 45), `pendingTransfers.add` (ligne 46), `fetch POST` (lignes 49–53), `response.ok` (lignes 54–56), `response.json()` (ligne 57), `reservations.set` (ligne 58), `loadTransfers()` (ligne 59), catch (lignes 60–62), `finally pendingTransfers.delete` (lignes 62–64)
  - bouton Réserver créé dans `loadTransfers()` avec listener → `reserve(t.id)` (ligne 33)
- `js/app.test.js` — ouvert en entier (310 lignes) :
  - test nominal reserve POST + stockage reservationId (lignes 152–182)
  - test erreur non-2xx (lignes 184–196)
  - test anti double-clic : `pendingTransfers.add(1)` avant appel (lignes 249–268)
  - test anti double-clic : `reservations.set(1, 'uuid-existant')` avant appel (lignes 270–288)
