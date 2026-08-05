# Testing — Audit

> Confiance : high

## Compréhension globale

Le dépôt ne contient aucun test, aucun runner de tests, aucune configuration de test. La couverture est zéro par construction. L'unique signal de conscience de la testabilité est la présence de deux gardes `typeof window/document` dans `js/app.js`, qui rendraient le code utilisable hors navigateur (Node.js, jsdom) — mais aucun test ne les exploite. Le contexte « pilote de test » du dépôt (au sens du projet SHIFT/Paperclip, pas au sens de l'outillage de test logiciel) explique cette situation sans la justifier si le code doit évoluer.

## Résumé exécutif

Aucun fichier de test, aucun framework de test (Jest, Vitest, Mocha, Playwright…), aucune configuration CI dans ce dépôt. La recherche explicite sur `spec`, `test`, `.test.`, `__tests__`, `jest`, `vitest`, `mocha`, `playwright`, `.github/workflows`, `Makefile` a retourné 0 résultat. La couverture est donc 0 % — mais le périmètre fonctionnel couvert est lui-même minimal (une fonction de 12 lignes, un seul flux). Les gardes `typeof window/document` (`js/app.js`, lignes 2 et 18) suggèrent qu'un test Node.js sans navigateur était envisagé ou anticipé ; ce signal reste sans suite dans l'état actuel. Pour un pilote, c'est acceptable ; pour un code en production, c'est un risque significatif car l'unique fonctionnalité (chargement et rendu des transferts) n'est jamais vérifiée autrement que manuellement.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Aucun fichier de test.** Recherche récursive sur `*.test.js`, `*.spec.js`, `__tests__/`, `test/`, `spec/` dans l'ensemble du dépôt : 0 résultat. Il n'existe aucun test unitaire, aucun test d'intégration, aucun test end-to-end.

**`VÉRIFIÉ_CODE` — Aucun framework de test configuré.** Recherche sur `jest`, `vitest`, `mocha`, `jasmine`, `playwright`, `cypress` dans les noms de fichiers et le contenu du dépôt : 0 résultat. Pas de `package.json`, pas de `node_modules`, pas de `Makefile` — aucune infrastructure de test ne peut être invoquée.

**`VÉRIFIÉ_CODE` — Aucune CI visible.** Pas de dossier `.github/`, pas de `Makefile`, pas de `Dockerfile`, pas de script de CI dans le dépôt. L'exécution de tests est donc entièrement manuelle — à condition qu'ils existent.

**`VÉRIFIÉ_CODE` — Signal de testabilité hors navigateur non exploité.** `js/app.js` porte deux gardes : `typeof window !== "undefined"` (ligne 2) et `typeof document !== "undefined"` (ligne 18). Ces gardes permettent d'importer `app.js` dans un environnement Node.js sans que le code ne lève d'erreur immédiate. Elles ont probablement été écrites pour permettre des tests unitaires sans navigateur (avec jsdom ou en mockant `fetch`), mais aucun test n'en tire parti.

**`HYPOTHÈSE` — La validation est entièrement manuelle.** En l'absence de tout test automatisé, la seule validation possible est l'ouverture de la page dans un navigateur avec l'API disponible. Cette hypothèse est cohérente avec le contexte de pilote ; elle ne peut pas être confirmée (aucun document de procédure de test manuel dans le dépôt).

## Forces

- **Les gardes `typeof window/document`** (`js/app.js`, lignes 2 et 18) : un bon signal d'intention — le code est architecturalement testable hors navigateur, sans jsdom, si l'on mocke `fetch` et `document`. La barrière à l'entrée pour écrire un premier test unitaire est faible.
- **Périmètre minimal** : une seule fonction (`loadTransfers`, 12 lignes), un seul flux. Écrire un test couvrant la fonctionnalité principale demanderait peu d'effort.

## Dettes techniques

- **Couverture zéro sur l'unique fonctionnalité du dépôt.** `loadTransfers` — la seule fonction métier — n'est couverte par aucun test. Ses chemins de défaillance (erreur réseau, réponse non-tableau, champ absent) ne sont jamais exercés automatiquement. Localisation : `js/app.js`, lignes 5–16.
- **Aucune infrastructure de test.** Introduire un test nécessite d'abord de choisir un runner, de l'installer (même sans `package.json` — ce qui implique d'en créer un), et de définir une stratégie de mock pour `fetch` et `document`. Ce n'est pas un obstacle majeur, mais c'est un effort non nul.

## Zones critiques

- **`js/app.js`, lignes 6–7 — chemins d'erreur non testés** : l'absence de test sur les cas d'erreur (`fetch` échoue, `response.ok === false`, réponse non-tableau) est la zone la plus risquée. Ces chemins sont les plus susceptibles d'être rencontrés en production (API down, CORS bloquant) et les plus difficiles à valider manuellement de façon reproductible.

## Risques

- **`VÉRIFIÉ_CODE` — Toute régression est invisible jusqu'en production.** Sans test automatisé, un renommage de champ dans l'API, une modification du HTML, ou un refactoring du JS ne déclenchent aucune alerte. Le seul filet de sécurité est la vérification manuelle, qui est non reproductible et non scalable.

## Recommandations priorisées

1. **Écrire un test unitaire pour `loadTransfers`** en Node.js avec un mock de `fetch` — tester au moins : (a) le cas nominal (liste rendue correctement), (b) l'erreur réseau (`fetch` rejette), (c) la réponse non-tableau. Les gardes `typeof window/document` rendent cela possible sans jsdom. Fichier : `js/app.js` (la fonction à tester), à créer dans `js/app.test.js` ou similaire.
2. **Choisir un runner léger** (Node.js natif `node:test` depuis v18+, ou Vitest) compatible avec du JS natif sans transpilation — cohérent avec le choix « aucune dépendance » du dépôt, ou introduisant explicitement les premières dépendances de développement.
3. **Ajouter une étape CI minimale** (GitHub Actions ou équivalent) exécutant les tests à chaque push — seulement si ce dépôt est destiné à évoluer au-delà du pilote.

## Questions ouvertes

- Des tests manuels sont-ils documentés ou systématisés quelque part en dehors de ce dépôt (wiki, procédure d'équipe) ?
- Le contexte « pilote de test » exclut-il explicitement les tests automatisés, ou sont-ils prévus pour une prochaine itération ?
- L'environnement Node.js avec `fetch` mockable est-il le bon contexte de test envisagé, ou préfère-t-on un test navigateur complet (Playwright, Cypress) ?
