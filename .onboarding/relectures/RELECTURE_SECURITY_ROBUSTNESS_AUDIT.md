# Relecture — SECURITY_ROBUSTNESS_AUDIT.md

## Verdict global

**Bon** — L’audit respecte désormais la frontière entre ce qui est vérifié dans le front et ce qui reste inconnu côté serveur/runtime. Les constats clés sont sourcés dans le code, les risques sont contextualisés et aucun secret n’est recopié.

## Problèmes bloquants

Aucun.

## Problèmes mineurs

Aucun défaut résiduel nécessitant une correction. La confiance `high` est acceptable pour les constats de code local, car les limites serveur et les cookies ambiants sont explicitement signalées comme `INCONNU` (`SECURITY_ROBUSTNESS_AUDIT.md:3,33,57,65-69`).

## Points vérifiés et corrects

- Les trois fonctions testent `response.ok` dans un `try/catch` avant `response.json()` (`SECURITY_ROBUSTNESS_AUDIT.md:17`, `js/app.js:10-17,44-60,67-80`).
- Le rendu des données distantes utilise `textContent`; l’usage de `innerHTML` ne sert qu’à vider le conteneur contrôlé (`SECURITY_ROBUSTNESS_AUDIT.md:19-21`, `js/app.js:19-22`).
- Le verrou `pendingTransfers` est posé puis libéré dans `finally` (`SECURITY_ROBUSTNESS_AUDIT.md:25,50`, `js/app.js:44-46,62-64,67-69,83-85`).
- La fragilité `getElementById` et l’écrasement de la liste dans les `catch` sont correctement décrits comme robustesse/UX, pas comme vulnérabilités avérées (`SECURITY_ROBUSTNESS_AUDIT.md:23,27,45-46`, `index.html:9`).
- L’audit sépare bien la lecture locale de `window.API_BASE_URL` (`VÉRIFIÉ_CODE`) du scénario d’injection dans un contexte compromis (`HYPOTHÈSE`) (`SECURITY_ROBUSTNESS_AUDIT.md:31`, `js/app.js:2-3`).
- L’absence d’en-tête `Authorization` et de cookie explicitement manipulé est limitée au code front; l’authentification serveur, CORS et les cookies ambiants restent `INCONNU` (`SECURITY_ROBUSTNESS_AUDIT.md:13,33,41,55-57`, `js/app.js:49-53,72-75`).
- Les recommandations sont reliées à des fichiers précis (`SECURITY_ROBUSTNESS_AUDIT.md:61-63`) et aucun secret n’est exposé (`SECURITY_ROBUSTNESS_AUDIT.md:29`).
- Vérification d’exécution indépendante: `npm test` passe avec 13 tests réussis.

## Recommandations de correction

Aucune correction bloquante à demander. Conserver, lors d’une prochaine réconciliation, la formulation bornée au front et le statut `INCONNU` pour toute conclusion sur le serveur ou les cookies ambiants.
