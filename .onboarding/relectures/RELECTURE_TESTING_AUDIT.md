# Relecture — TESTING_AUDIT.md

> Mise à jour SHIA-572. La version précédente de cette relecture portait sur un dépôt sans tests (0 %). Elle est intégralement remplacée par la relecture de l'audit réconcilié.

## Verdict global

**Bon** — La formulation litigieuse sur `DOMContentLoaded` a été supprimée : l'existence de l'écouteur est `VÉRIFIÉ_CODE`, tandis que son fonctionnement navigateur est explicitement `INCONNU`. Les 13 tests du dépôt passent.

## Problèmes bloquants

Aucun dans la version courante de l'audit.

## Problèmes mineurs

- La phrase « la garde ... permet l'import ... sans DOM réel » est vérifiée par le test d'import Node, mais ne doit pas être confondue avec la validation du câblage navigateur `DOMContentLoaded`.

## Points vérifiés et corrects

- `npm test` exécuté dans ce checkout : 13 tests passés, 0 échec; les 13 appels `test(...)` sont localisés dans `js/app.test.js`.
- Les cas nominaux/HTTP/réseau et les verrous sont effectivement couverts par `js/app.test.js:45-310`.
- Les zones non couvertes (`window.API_BASE_URL`, concurrence réelle, erreur de rafraîchissement secondaire, liste vide) sont correctement signalées aux lignes 42-45.
- L'absence de CI est cohérente avec l'arborescence du dépôt consultée; aucun secret n'est recopié.

## Corrections appliquées (SHIA-572, passage 2)

- **Décompte** : « 12 cas de test » corrigé en « 13 cas de test » — confirmé par `npm test` (`tests 13 / pass 13`).
- **Recommandation `window.API_BASE_URL`** : la suggestion initiale (`global.window = { API_BASE_URL: ... }` dans le test) était non opérante car la constante est capturée à l'import statique. L'audit signale désormais la contrainte et propose l'import dynamique ou une refactorisation comme alternatives opérantes.

## Corrections appliquées (SHIA-572, passage 3)

- **Câblage `DOMContentLoaded`** : la formulation « validé manuellement (ou implicitement à l'exécution) » est retirée de deux endroits (résumé exécutif et constats détaillés) — elle constituait une affirmation non sourcée. Remplacée par : `VÉRIFIÉ_CODE` pour l'existence de la ligne, et `INCONNU` pour son fonctionnement effectif au chargement navigateur (aucune observation réelle disponible). La distinction est désormais explicite : la garde `typeof document !== "undefined"` est démontrée par les tests ; l'écouteur `DOMContentLoaded` lui-même n'est jamais déclenché dans les tests (no-op dans `makeDOM()`).

## Points vérifiés et corrects

**1. Runner de test et décompte — `VÉRIFIÉ_CODE` exact.**
`import { test } from 'node:test'` à `js/app.test.js:1`. Script `"test": "node --test"` dans `package.json`. 13 fonctions `test(...)` identifiées (lignes 45, 67, 80, 98, 115, 131, 152, 184, 200, 231, 249, 270, 290). `npm test` : 13 tests, 13 passés. ✓

**2. Stratégie de mock DOM — correctement décrite.**
`makeDOM()` simulant `getElementById`, `createElement`, `appendChild`, `innerHTML`, `textContent`. Injecté via `global.document`. Suffisant pour tester la logique sans jsdom. ✓

**3. Couverture de `loadTransfers()` — 6 cas listés avec lignes exactes.**
Nominal, erreur HTTP (500), erreur réseau, bouton Réserver si `seatsLeft > 0`, pas de bouton si `seatsLeft = 0`, bouton Annuler si réservation active. Citations lignes `js/app.test.js` vérifiées. ✓

**4. Couverture de `reserve()` — 4 cas.**
Nominal, erreur HTTP (409), double-clic (`pendingTransfers`), déjà réservé (`reservations`). ✓

**5. Couverture de `cancelReservation()` — 3 cas.**
Nominal, erreur HTTP (404), double-clic. ✓

**6. Zones aveugles correctement identifiées.**
`DOMContentLoaded` (ligne 89), `window.API_BASE_URL` (contrainte de capture à l'import correctement expliquée), concurrence réelle, erreur secondaire dans `loadTransfers()` post-`reserve()`, tableau vide. ✓

**7. Pas de CI — `VÉRIFIÉ_CODE` exact.**
Absence de `.github/`, `Dockerfile`, `Makefile` vérifiée. ✓

**8. Aucun secret recopié.** ✓

## Recommandations de correction

1. Conserver séparément le fait `VÉRIFIÉ_CODE` (l'écouteur existe) et le statut `INCONNU` (son fonctionnement au chargement n'a pas été exécuté).
