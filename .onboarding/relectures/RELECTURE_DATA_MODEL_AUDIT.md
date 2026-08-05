# Relecture — DATA_MODEL_AUDIT.md

## Verdict global

**Bon** — L'audit est exploitable sans réserve bloquante. La distinction entre `VÉRIFIÉ_CODE` (quatre champs lus dans le code) et `INCONNU` (forme réelle de la ressource côté API) est la bonne frontière, correctement tracée. La confiance `medium` est justifiée non par une lecture partielle mais par une borne épistémique réelle (le schéma API n'est pas dans ce dépôt).

## Problèmes bloquants

Aucun.

## Problèmes mineurs

Aucun.

## Points vérifiés et corrects

**1. Absence de modèle local — `VÉRIFIÉ_CODE` exact.**
Grep sur `class`, `schema`, `model`, `entity`, `localStorage`, `sessionStorage`, `indexedDB`, `cookie`, `store` : 0 résultat sur 20 lignes de JS + 12 lignes de HTML. Vérifiable exhaustivement. ✓

**2. Quatre champs lus — `VÉRIFIÉ_CODE` exact.**
`t.from`, `t.to`, `t.price`, `t.availableSeats` à `js/app.js:13`. Vérifié. ✓

**3. Forme complète de la ressource — `INCONNU` correctement appliqué.**
Les types exacts (`price` : entier ? décimal ? chaîne ?), les valeurs limites et les champs supplémentaires éventuels ne sont pas observables depuis ce dépôt. Le statut `INCONNU` est le bon : ce n'est pas une hypothèse (aucune supposition émise), c'est une limite d'observation. ✓

**4. Aucune validation côté client — prouvé.**
`js/app.js:13` : accès direct aux quatre champs sans garde. Risque `undefined` silencieux en cas d'évolution API correctement sourcé. ✓

**5. État vide non distingué d'une erreur — `VÉRIFIÉ_CODE` exact.**
Boucle `for...of` à zéro itération → `<ul>` vide, indiscernable d'une erreur. `js/app.js:11-15`, `index.html:9`. Vérifié. ✓

**6. Confiance `medium` — justification honnête.**
L'audit explique explicitement que la confiance est plafonnée par l'absence de schéma API observable, pas par une lecture partielle. C'est la bonne distinction. ✓

**7. Aucun secret recopié.** ✓

## Recommandations de correction

Aucune correction requise.
