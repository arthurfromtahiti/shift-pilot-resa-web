# Relecture — WORKFLOW_INTEGRATION_API.md

## Verdict global
**Bon** — Le document est aligné sur les trois méthodes, le parsing GET/POST, l'absence de parsing DELETE et la distinction entre en-têtes explicites et cookies implicites. La correction 311→310 est confirmée dans le workflow.

## Problèmes bloquants
Aucun.

## Problèmes mineurs
Aucun.

## Points vérifiés et corrects
- Fallback et surcharge truthy de l’URL (`js/app.js:2-3`) exacts.
- GET et POST parsèrent le JSON ; DELETE ne lit pas le corps (`js/app.js:17,57,72-80`).
- `response.ok` et les trois catches sont présents (`js/app.js:14-16,39-40,54-56,60-61,76-82`).
- L’absence d’Authorization explicite est distinguée de l’état inconnu des cookies (`WORKFLOW_INTEGRATION_API.md:49`).
- Le fallback est limité à une valeur de configuration et les finalités de routes au comportement attendu côté client (`WORKFLOW_INTEGRATION_API.md:47,61-64`).
- `js/app.js` contient 90 lignes et les preuves le reflètent (`js/app.js:1-90`).
- `npm test` passe : 13 tests, 0 échec.

## Recommandations de correction
Conserver les preuves de volumétrie recalées à 310 lignes.
