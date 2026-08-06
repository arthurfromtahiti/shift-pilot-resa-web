# Data Model — Audit

> Confiance : medium

## Compréhension globale

Ce dépôt ne possède aucun modèle de données local : pas d'entité, pas de schéma, pas de base de données, pas de stockage côté client (pas de `localStorage`, pas d'`IndexedDB`, pas de cookie). L'unique « donnée » manipulée est la ressource distante `transfer`, consommée depuis l'API `shift-pilot-resa-api` et jamais persistée localement. La confiance est `medium` non par lecture partielle, mais parce que la forme réelle de cette ressource distante n'a pas pu être observée — seuls les champs effectivement lus dans le code sont connus.

## Résumé exécutif

`shift-pilot-resa-web` n'a pas de modèle de données au sens propre : c'est un front sans état propre. La ressource `transfer` (tableau JSON retourné par `GET /transfers`) est consommée, rendue, et immédiatement oubliée — rien n'est stocké côté client. Les quatre champs effectivement lus par `js/app.js` sont `from`, `to`, `price`, `availableSeats` (`js/app.js`, ligne 13). Leur type attendu, leur caractère obligatoire, et l'exhaustivité de la liste sont `INCONNU` — ils ne peuvent être établis que depuis le dépôt `shift-pilot-resa-api` ou par un appel en lecture à l'API. Aucune migration, aucune contrainte, aucun ORM. L'audit de modèle de données de ce workspace se réduit à documenter ce que le code *attend* de l'API.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Aucun modèle local.** Recherche de mots-clés `class`, `schema`, `model`, `entity`, `localStorage`, `sessionStorage`, `indexedDB`, `cookie`, `store` dans `js/app.js` et `index.html` : 0 résultat. Le dépôt ne contient aucune définition de structure de données propre, aucune couche de persistance, aucun état applicatif maintenu entre les pages (il n'y a qu'une page).

**`VÉRIFIÉ_CODE` — La ressource `transfer` : quatre champs lus, forme complète inconnue.** `js/app.js` ligne 13 accède à `t.from`, `t.to`, `t.price`, `t.seatsLeft`. Ces quatre champs sont les seuls utilisés par le code ; l'API peut en renvoyer davantage (identifiant, horaires, compagnie, statut) sans que ce front en tire parti. Le type de `price` (nombre entier XPF ? décimal ? chaîne ?) et la sémantique de `seatsLeft` (0 = complet ? valeur négative possible ?) ne sont pas observables depuis ce dépôt. Statut : `VÉRIFIÉ_CODE` pour l'usage des quatre champs ; `INCONNU` pour la forme complète et les types exacts. **Note** : depuis correctif SHIAAAAAAAAAAAAAAAAAAAAAAAA-311 (commit b6910ec), le champ `seatsLeft` correspond à ce que l'API produit réellement.

**`VÉRIFIÉ_CODE` — Aucune validation côté client.** Aucune garde sur la présence ou le type des quatre champs avant affichage (`js/app.js`, ligne 13). Un champ absent produit `undefined` dans le rendu ; un champ de type inattendu (objet à la place d'un nombre) s'affiche tel quel (`[object Object]`). Il n'y a pas de schéma, pas de coerce, pas de valeur par défaut. Le front dépend implicitement d'un contrat non formalisé avec l'API.

**`VÉRIFIÉ_CODE` — Pas de gestion des données manquantes ni de l'état vide.** Si l'API renvoie un tableau vide, la boucle `for...of` s'exécute zéro fois — la `<ul>` reste vide sans message explicatif à l'utilisateur (`js/app.js`, lignes 11–15, `index.html`, ligne 9).

## Forces

- **Périmètre réduit à l'essentiel** : sans persistance locale, sans gestion d'état complexe, le risque d'incohérence de données est inexistant côté front. Aucune synchronisation à gérer, aucune migration.
- **Aucune donnée personnelle dans ce dépôt** : la ressource consommée ne contient que des données de catalogue (liaisons, prix, disponibilités) — aucune PII visible, aucun stockage de profil utilisateur.

## Dettes techniques

- **Contrat implicite et non formalisé avec l'API.** Les quatre champs attendus (`from`, `to`, `price`, `seatsLeft`) ne sont documentés nulle part dans ce dépôt — ni dans `README.md`, ni dans un fichier de types (TypeScript, JSDoc, JSON Schema). Si l'API évolue (renommage d'un champ, changement de type), le front casse silencieusement. Localisation : `js/app.js`, ligne 13. **Note** : le champ `seatsLeft` est maintenant en accord avec l'API (harmonisé suite SHIAAAAAAAAAAAAAAAAAAAAAAAA-311).
- **Aucune gestion de l'état vide.** Un tableau vide renvoyé par l'API et une erreur réseau silencieuse produisent le même résultat visible : une `<ul>` vide. Aucun moyen de distinguer les deux depuis l'interface. Localisation : `js/app.js`, lignes 9–15 ; `index.html`, ligne 9.

## Zones critiques

- **`js/app.js`, ligne 13 — accès direct aux champs sans validation** : c'est le seul endroit où le contrat avec l'API est exprimé, de façon implicite. Un senior regarderait ici pour évaluer la fragilité aux évolutions de l'API. **Audit noté le 2026-08-06** : contrat actuellement correct (`seatsLeft` lu = `seatsLeft` fourni par API).

## Risques

- **`VÉRIFIÉ_CODE` — Rendu `undefined` silencieux si l'API modifie un nom de champ.** Un renommage de `seatsLeft` en `seats` dans l'API produirait `undefined places` dans chaque `<li>`, sans erreur, sans warning — le bug serait difficile à détecter en test fonctionnel superficiel. **Note** : ce risque a frappé précédemment (bug SHIAAAAAAAAAAAAAAAAAAAAAAAA-311 : API exposait `seatsLeft`, front lisait `availableSeats`) et a été corrigé commit b6910ec.
- **`INCONNU` — Forme réelle et contraintes de la ressource `transfer`.** Les types, les valeurs limites et les éventuels champs obligatoires de `transfer` ne sont connus que depuis `shift-pilot-resa-api`. Si ce dépôt évolue (tri, filtre, affichage conditionnel), le développeur devra supposer ou consulter l'autre dépôt.

## Recommandations priorisées

1. **Documenter le contrat attendu avec l'API** dans `README.md` ou dans un commentaire JSDoc de `loadTransfers` : les quatre champs (`from`, `to`, `price`, `seatsLeft`), leurs types et leur caractère obligatoire. Faible effort, forte valeur de maintenabilité. Fichier : `README.md`, `js/app.js`.
2. **Ajouter un message explicite pour la liste vide** — distinguer « aucun transfert disponible » de « erreur de chargement ». Fichier : `js/app.js`, section de rendu (lignes 9–15).

## Questions ouvertes

- Quels sont les types réels de `price` (nombre entier, décimal, chaîne formatée ?) et `seatsLeft` (entier, peut-il être négatif ?) — non observables depuis ce dépôt, à établir depuis `shift-pilot-resa-api`.
- L'API renvoie-t-elle d'autres champs (identifiant du transfert, horaires, opérateur, statut de disponibilité) que ce front n'utilise pas ? Si oui, y a-t-il des fonctionnalités à venir qui les exploiteront ?
- La ressource `transfer` peut-elle être vide (aucun transfert disponible) ou l'API garantit-elle toujours au moins une entrée ?
