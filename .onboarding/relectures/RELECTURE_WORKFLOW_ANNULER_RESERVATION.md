# Relecture — WORKFLOW_ANNULER_RESERVATION.md

## Verdict global
**Bon** — Le fil d'exécution est fidèle au code et distingue correctement la réservation connue côté client de l'état serveur. La correction 311→310 est confirmée dans le workflow.

## Problèmes bloquants
Aucun.

## Problèmes mineurs
Aucun.

## Points vérifiés et corrects
- Le bouton, la garde, le verrou, le DELETE, `response.ok`, la suppression de Map, le rafraîchissement et le `finally` correspondent à `js/app.js:24-34,67-85`.
- Le corps DELETE n’est pas lu (`js/app.js:72-80`).
- Le risque de GET non propagé est exact : `loadTransfers()` capture l’erreur (`js/app.js:39-41`) et la Map a déjà été modifiée (`js/app.js:79-80`).
- Les formulations « réservation connue côté client » et l'hypothèse conditionnelle sur un `reservationId` invalide ne prétendent pas connaître le statut serveur (`WORKFLOW_ANNULER_RESERVATION.md:1,20,54-61`).
- `npm test` passe : 13 tests, 0 échec.

## Recommandations de correction
Conserver les preuves de volumétrie recalées à 310 lignes.
