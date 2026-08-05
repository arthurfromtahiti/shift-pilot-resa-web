# Data Model — Audit

> Confiance : medium

## Compréhension globale

`shift-pilot-resa-web` ne possède aucun modèle de données local : pas de base de données, pas d'ORM, pas de schéma, pas de migration, pas de `localStorage`, pas de cookie. C'est un front statique qui consomme en lecture seule une ressource distante (`/transfers`) exposée par `shift-pilot-resa-api`. La confiance est plafonnée à `medium` non par une lecture partielle, mais parce que la forme réelle de la ressource `transfer` renvoyée par l'API est `INCONNU` dans ce workspace : seuls les champs que le code *lit* sont observables ici.

## Résumé exécutif

Il n'y a pas de modèle de données à proprement parler dans ce dépôt. L'audit porte donc sur deux périmètres étroits : (1) les champs effectivement consommés depuis l'API, tels que le code les révèle, et (2) l'absence totale de contrat, de validation et de persistance locale. La ressource `transfer` est un objet plat à quatre champs connus (`from`, `to`, `price`, `availableSeats`) — tous affichés sans formatage ni validation. Aucune relation, aucune contrainte, aucune logique de transformation n'existe côté front. La fragilité principale est l'absence de contrat : si l'API change sans avertissement, le front l'ignorera jusqu'à ce qu'un utilisateur constate des valeurs `undefined` à l'écran.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Aucune entité locale.** Recherche de tout pattern de persistance (`localStorage`, `sessionStorage`, `IndexedDB`, `document.cookie`, `fetch` en POST/PUT/DELETE) sur `js/app.js` et `index.html` : 0 résultat. Le front n'écrit jamais de donnée — ni localement, ni vers l'API. Tout est lecture.

**`VÉRIFIÉ_CODE` — Ressource `transfer` consommée en quatre champs.** La boucle de rendu (`js/app.js:11-15`) lit exactement quatre propriétés de chaque élément du tableau : `t.from`, `t.to`, `t.price`, `t.availableSeats`. Ces noms sont les seules preuves du schéma API disponibles dans ce workspace. Leur type exact (chaîne, nombre, entier ?) est `INCONNU` : le code les affiche via template littéral sans conversion ni formatage (`js/app.js:13`). Côté inférence raisonnable : `from` et `to` sont probablement des chaînes de noms d'îles, `price` un nombre (XPF), `availableSeats` un entier — mais aucune preuve dans ce dépôt.

**`VÉRIFIÉ_CODE` — Aucune validation de schéma.** Avant la boucle, aucun contrôle ne vérifie que `transfers` est un tableau (`Array.isArray`), ni que chaque élément possède les champs attendus (`js/app.js:7,11`). Si l'API renvoie un objet, un tableau vide, `null`, ou un objet sans `from`/`to`/`price`/`availableSeats`, le comportement est dégradé silencieusement : `TypeError` non interceptée ou affichage `undefined → undefined — undefined XPF (undefined places)`.

**`VÉRIFIÉ_CODE` — Aucun formatage des données.** `price` est affiché tel quel, sans `toLocaleString()` ni séparateur de milliers adapté au XPF (`js/app.js:13`). `availableSeats` est affiché tel quel, sans traitement du singulier/pluriel ni d'une valeur `0` (qui s'afficherait comme `0 places` sans signal particulier que le transfert est complet). Ce ne sont pas des erreurs fonctionnelles, mais des indices d'un développement embryonnaire.

**`HYPOTHÈSE` — Forme complète de `transfer` inconnue.** L'API pourrait renvoyer des champs supplémentaires (`id`, `departureTime`, `carrier`, `currency`…) que le code ignore. La forme réelle relève de la cartographie de `shift-pilot-resa-api` — hors périmètre de ce workspace. Un identifiant (`id`) serait nécessaire pour toute future fonctionnalité de sélection ou de réservation.

## Forces

- **Périmètre zéro-persistance maîtrisé** : aucune donnée n'est stockée localement, aucun risque de fuite ou d'incohérence côté client. Pour un front de consultation pure, c'est la bonne posture.
- **Lecture seule** : le front ne modifie jamais l'état de l'API (aucun POST/PUT/DELETE dans tout le code — vérifié). Toute corruption de données serait nécessairement côté `shift-pilot-resa-api`.

## Dettes techniques

- **Contrat API implicite** : la forme attendue de `transfer` n'est documentée nulle part dans ce dépôt. Elle est entièrement déduite des quatre accès `t.from`, `t.to`, `t.price`, `t.availableSeats` (`js/app.js:13`). Un commentaire JSDoc ou un README suffirait à la rendre explicite.
- **Absence de validation de type à la frontière** : `for (const t of transfers)` sans `Array.isArray(transfers)` ni contrôle de champs est fragile face à n'importe quelle variation de l'API (`js/app.js:7,11`).

## Zones critiques

- **`js/app.js:7-15` — frontière API/DOM** : c'est le seul point où des données externes entrent dans l'interface. Sans garde ni schéma, toute variation de l'API est directement visible (ou invisible) par l'utilisateur.

## Risques

- **Glissement silencieux de l'API** : si `shift-pilot-resa-api` renomme `from` en `origin`, ou supprime `availableSeats`, le front continue de fonctionner techniquement mais affiche `undefined` dans les champs concernés. Aucune alerte, aucun test ne signale le problème.
- **Valeur `price` non entière ou localisée** : si l'API renvoie `price` comme `"1500"` (chaîne) ou `1500.00` (flottant), l'affichage sera `1500.00 XPF` ou `"1500" XPF` — non testé, forme exacte `INCONNU`.

## Recommandations priorisées

1. **Documenter le contrat `transfer`** — Ajouter dans `js/app.js` un commentaire indiquant les champs attendus, leur type et leur unité. Alternative : ajouter une section dans `README.md`. Fichier : `js/app.js`. Priorité : haute (bloque toute évolution en l'absence de contrat).
2. **Ajouter une validation à la frontière** — `if (!Array.isArray(transfers)) return;` avant la boucle, et idéalement un contrôle de présence des champs clés par transfert. Fichier : `js/app.js`. Priorité : haute (protège contre les régressions silencieuses).
3. **Formater `price` avec `toLocaleString('fr-PF')`** — Le XPF est une monnaie sans décimales, et son formatage correct améliore la lisibilité. Fichier : `js/app.js`. Priorité : basse (cosmétique, à faire si le projet évolue vers la production).

## Questions ouvertes

- Quels champs l'API `shift-pilot-resa-api` renvoie-t-elle réellement dans un transfert ? Y a-t-il un identifiant, des horaires, une compagnie ? La réponse conditionne toute future fonctionnalité (sélection, réservation, filtre).
- `price` est-il entier (XPF n'a pas de décimales) ou peut-il être un flottant ? La réponse conditionne le formatage.
- La ressource `/transfers` renvoie-t-elle toujours un tableau, ou peut-elle renvoyer une pagination, un objet enveloppé (`{ data: [...] }`) ou une erreur JSON ?
