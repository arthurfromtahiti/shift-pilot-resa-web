# Relecture — DATA_MODEL_AUDIT.md

> Mise à jour SHIA-572. La version précédente de cette relecture portait sur l'ancien `js/app.js` (20 lignes, `t.availableSeats`, sans `reserve()` ni `cancelReservation()`). Elle est intégralement remplacée par la relecture de l'audit réconcilié.

## Verdict global

**À corriger** — La séparation `VÉRIFIÉ_CODE` / `HYPOTHÈSE` sur `id` absent est désormais correcte et les tests du dépôt passent. Il reste toutefois une affirmation non prouvée sur l'absence de données personnelles : la nature des IDs n'est pas observable depuis ce workspace.

## Problèmes bloquants

- **Absence de données personnelles — audit ligne 43.** Le code montre seulement que la `Map` contient des IDs (`js/app.js:6,24,58`) ; il ne montre ni leur sémantique métier ni l'absence de données personnelles dans les systèmes associés. Requalifier en constat limité au contenu local observé (« aucun autre champ n'est stocké ici ») ou en `INCONNU` pour la qualification personnelle.

## Problèmes mineurs

- Le résumé ligne 27 reprend déjà cette conséquence comme « critique » sans rappeler qu'elle dépend d'une réponse API malformée ; harmoniser cette formulation avec le statut révisé.

## Points vérifiés et corrects

- `reservations` et `pendingTransfers` sont effectivement déclarés et manipulés comme décrit (`js/app.js:6-8,24,45-46,58,63-64,68-69,79,83-84`).
- Les cinq accès aux champs `transfer` et l'absence de garde structurelle sont confirmés par `js/app.js:20-30`.
- Le conflit multi-utilisateur reste correctement marqué `HYPOTHÈSE`, car l'atomicité et les réponses de l'API ne sont pas visibles ici (`js/app.js:45-46,68-69`).
- La forme réelle de la ressource est correctement marquée `INCONNU`; aucun secret n'est recopié.

## Corrections appliquées (SHIA-572, passage 2)

- **Conflit de réservation simultanée** : requalifié de `HAUT` à `HYPOTHÈSE`. Le front ne peut vérifier ni l'atomicité ni la réponse de l'API côté serveur (`js/app.js:45–46, 68–69`) ; la responsabilité est celle de l'API.
- **Collision de clé Map si `id` absent** : conservé en `HAUT` mais conditionalisé explicitement à une réponse API malformée — non observable depuis ce dépôt.

## Corrections appliquées (SHIA-572, passage 3)

- **Mécanisme code vs scénario API** : le risque de collision est maintenant scindé en deux entrées distinctes dans la section Risques : (a) `VÉRIFIÉ_CODE` — mécanisme code (clé `undefined`, URL malformée, état ambigu) ; (b) `HYPOTHÈSE` — scénario API (l'API retourne un objet sans `id`) avec gravité explicitement conditionnelle et sans calibrage `HAUT`. La formulation « annuler l'une annule les URL de toutes » est remplacée par l'impact prouvable côté front : clé `undefined`, URL malformée, état local ambigu.
- **Ligne 27 (Constats détaillés)** : la mention « Critique » est remplacée par « Impact si `id` absent (conditionnel — voir section Risques) » avec note explicite de dépendance à une réponse API malformée non observable.

## Points vérifiés et corrects

**1. Absence de modèle persistant — `VÉRIFIÉ_CODE` exact.**
Aucun `localStorage`, `sessionStorage`, `indexedDB`, `cookie`, `class`, `schema`. Vérifiable exhaustivement sur 90 lignes de JS + 12 lignes de HTML. ✓

**2. État 1 : `reservations` Map — `VÉRIFIÉ_CODE` exact.**
`export const reservations = new Map()` à `js/app.js:6`. Cycle de vie (remplie ligne 58, vidée ligne 79, lue lignes 24 et 45) correctement décrit. ✓

**3. État 2 : `pendingTransfers` Set — `VÉRIFIÉ_CODE` exact.**
`export const pendingTransfers = new Set()` à `js/app.js:8`. Ajout lignes 46 et 69, suppression dans `finally` lignes 63 et 84. ✓

**4. Cinq champs lus de la ressource distante — `VÉRIFIÉ_CODE` exact.**
`t.id` (ligne 24), `t.from`, `t.to`, `t.price` (ligne 22), `t.seatsLeft` (lignes 22 et 30). Aucune validation de présence ou de type. ✓

**5. `reservationId` retourné par POST — `VÉRIFIÉ_CODE` exact.**
`data.reservationId` (ligne 58) stocké dans `reservations`, réutilisé dans DELETE (ligne 73). Type réel : `INCONNU`. ✓

**6. Aucune gestion de l'état vide — `VÉRIFIÉ_CODE` exact.**
Boucle à zéro itération → `<ul>` vide sans message. `js/app.js:20–38`. ✓

**7. Risques correctement calibrés.**
- Collision `id` absent : `HAUT` conditionnel à réponse API malformée. ✓
- Conflit simultané : `HYPOTHÈSE` — responsabilité de l'API. ✓
- Forme réelle de `transfer` : `INCONNU`. ✓

**8. Aucun secret recopié.** ✓

## Recommandations de correction

1. Conserver la séparation actuelle entre mécanisme code (`VÉRIFIÉ_CODE`) et occurrence d'une réponse sans `id` (`HYPOTHÈSE`).
2. Remplacer « aucune donnée personnelle » par une formulation limitée à l'état local, ou marquer la qualification métier `INCONNU`.
