# Relecture — CODE_HOTSPOTS_AUDIT.md

> Mise à jour SHIA-572. La version précédente de cette relecture portait sur l'ancien `js/app.js` (20 lignes, fetch non gardé, `t.availableSeats`). Elle est intégralement remplacée par la relecture de l'audit réconcilié.

## Verdict global

**À corriger** — Les hotspots et la requalification du crash sont correctement sourcés. Le risque de rafraîchissement après réservation mélange encore le comportement front prouvé et la réussite effective côté API, qui n'est pas observable depuis ce dépôt.

## Corrections appliquées (SHIA-572, passage 2)

- **État `pendingTransfers` après interruption** : requalifié de `VÉRIFIÉ_CODE` à `HYPOTHÈSE`. Le code prouve le `finally` sur le chemin normal (`js/app.js:62–64, 83–84`) ; le crash runtime est un scénario hypothétique non vérifiable depuis le code.

## Points vérifiés et corrects

**1. Hotspot 1 : état partagé `reservations` + `pendingTransfers` — `VÉRIFIÉ_CODE` exact.**
Lignes 6–8 (déclarations), 24, 45–46, 58, 63–64, 68–69, 79, 83–84 (accès). Invariants décrits (finally, gardes d'entrée). Non documentés dans le code — dette correctement notée. ✓

**2. Hotspot 2 : pattern `list.textContent = ...` dans les `catch` — `VÉRIFIÉ_CODE` exact.**
Lignes 40, 61, 82. Effet de bord (liste remplacée par texte brut) correctement décrit. Condition de récupération (appel réussi à `loadTransfers()`) identifiée. ✓

**3. Triple `getElementById` sans factorisation — `VÉRIFIÉ_CODE` exact.**
Lignes 11, 47, 70. Répétition copie-collée, absence de garde de nullité. Classé fragilité de maintenance, non hotspot propre. ✓

**4. Blocs `finally` — `VÉRIFIÉ_CODE` exact pour le chemin normal.**
`pendingTransfers.delete(transferId)` dans `finally` aux lignes 62–64 et 83–85. Garantie JS normale : finally s'exécute toujours, y compris si le catch lève. ✓

**5. `loadTransfers()` après `reserve()` réussie — `VÉRIFIÉ_CODE` exact.**
Ligne 59 : `await loadTransfers()` — si échoue, son `catch` (ligne 40) écrit sur `list.textContent`, masquant la réservation réussie. Correctement décrit. ✓

**6. Risque d'interruption runtime correctement qualifié `HYPOTHÈSE`.**
Le code prouve seulement le chemin normal. Crash entre `pendingTransfers.add` et `finally` est documentaire, pas vérifiable. ✓

**7. Aucun secret recopié.** ✓

## Recommandations de correction

1. Scinder le risque de la ligne 50 en : `VÉRIFIÉ_CODE` pour l'appel `loadTransfers()` et l'écrasement de la liste (`js/app.js:59,40`), puis `HYPOTHÈSE` pour le fait que la réservation a effectivement été enregistrée côté API. Reprendre la formulation déjà correcte de `FUNCTIONAL_AUDIT.md` ligne 60.
