# Relecture — WORKFLOW_RESERVER_TRANSFERT.md

## Verdict global
**Bon** — Le déroulement de `reserve()` est fidèle au code et le document sépare l'état de la Map locale du contrat serveur inconnu. La correction 311→310 est confirmée dans le workflow.

## Problèmes bloquants
Aucun.

## Problèmes mineurs
Aucun.

## Points vérifiés et corrects
- Clic, gardes, verrou, POST, parsing, stockage, GET, catch et finally sont exacts (`js/app.js:33,44-64`).
- Les tests pré-remplis ne sont pas présentés comme une concurrence réelle (`js/app.test.js:249-288`).
- Le risque de rafraîchissement décrit correctement que `loadTransfers()` capture son propre GET (`js/app.js:39-41`) et que la Map a déjà été modifiée (`js/app.js:58-59`).
- Le risque `reservationId` absent reste limité à ce que le code prouve (`undefined` stocké puis URL construite) et marque le statut API `INCONNU` (`WORKFLOW_RESERVER_TRANSFERT.md:57`).
- `npm test` passe : 13 tests, 0 échec.

## Recommandations de correction
Conserver les preuves de volumétrie recalées à 310 lignes.
