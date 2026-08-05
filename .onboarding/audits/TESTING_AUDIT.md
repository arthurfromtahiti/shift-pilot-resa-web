# Testing — Audit

> Confiance : high

## Compréhension globale

Il n'existe aucun test dans ce dépôt, à aucun niveau. Recherche de fichiers de test (`find . -name "*.test.*" -o -name "*.spec.*" -o -name "__tests__" -o -name "jest.config*" -o -name "vitest.config*" -o -name "cypress.config*"` sur l'ensemble du dépôt) : 0 résultat. Le dépôt ne contient que `README.md`, `index.html` et `js/app.js`. Il n'existe ni framework de test, ni CI/CD, ni script npm (pas de `package.json`). La confiance est `high` car il n'y a rien à trouver : l'absence est totale et vérifiable en un seul listing.

## Résumé exécutif

L'absence de tests est totale et cohérente avec le statut de pilote de test. Pour 20 lignes de JavaScript sans dépendance, il n'existe ni outil de test installé, ni configuration, ni fichier de spec, ni pipeline CI qui les exécuterait. La seule validation disponible est manuelle : charger `index.html` dans un navigateur avec une API distante active. Cela signifie que toute régression — une modification d'un champ API, un bug introduit dans `loadTransfers` — ne serait détectée que par un utilisateur humain en environnement réel. L'absence de tests est acceptable pour un pilote ponctuel ; elle devient un risque si le projet évolue.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Zéro fichier de test.** Listing complet du dépôt : 3 fichiers (`README.md`, `index.html`, `js/app.js`) + 1 répertoire (`js/`). Aucun répertoire `test/`, `__tests__/`, `spec/`, `cypress/`, `e2e/`. Aucun fichier `*.test.js`, `*.spec.js`, `*.test.html`. Aucun fichier de configuration de framework de test.

**`VÉRIFIÉ_CODE` — Aucun gestionnaire de paquets ni script de test.** Il n'existe pas de `package.json`, `package-lock.json`, `yarn.lock`, `bun.lock`, `Makefile` ni `Taskfile` dans le dépôt. Il est donc impossible d'exécuter une commande `npm test` ou équivalente — la notion même de test automatisé n'est pas bootstrappée.

**`VÉRIFIÉ_CODE` — Aucun pipeline CI/CD.** Aucun répertoire `.github/`, `.gitlab-ci.yml`, `Jenkinsfile` ou équivalent dans le dépôt. La seule trace d'outillage est le `git log` (un commit initial). Aucun workflow d'automatisation n'est versionné.

**`VÉRIFIÉ_CODE` — Zones non couvertes (l'intégralité du code).** La totalité des comportements de `js/app.js` est non testée : résolution de `API_BASE_URL` selon l'environnement, appel fetch, désérialisation JSON, rendu DOM, déclenchement sur `DOMContentLoaded`. Les gardes `typeof window` et `typeof document` (`js/app.js:2,18`) anticipent une exécution hors-navigateur — ce qui suggère que les tests unitaires *pourraient* être écrits sans environnement DOM complet — mais aucun ne l'a été.

**`HYPOTHÈSE` — Testabilité partielle sans framework.** La structure du code permet théoriquement d'écrire des tests unitaires minimalistes pour `loadTransfers` en mockant `fetch` globalement (pattern `global.fetch = jest.fn(...)`) et en fournissant un DOM minimal via `jsdom`. La garde `typeof document !== "undefined"` (`js/app.js:18`) permet d'importer le script en Node.js sans déclencher `loadTransfers` prématurément. Ces conditions ne rendent pas les tests gratuits, mais ne les interdisent pas non plus.

## Forces

- **Gardes `typeof window` et `typeof document`** : le script est partiellement testable hors-navigateur sans modification, ce qui est une décision de conception pertinente même si elle n'est pas exploitée aujourd'hui (`js/app.js:2,18`).

## Dettes techniques

- **Aucun test à aucun niveau** : unitaire (logique de `loadTransfers`), intégration (appel API mocké), e2e (navigateur). La couverture effective est 0 %.
- **Aucune infrastructure de test** : pas de `package.json`, pas de framework, pas de CI. Ajouter le premier test nécessite de d'abord bootstrapper l'outillage — coût d'entrée non nul.

## Zones critiques

- **`loadTransfers` (`js/app.js:5-16`)** : seule logique applicative, entièrement non testée. Les cinq comportements critiques identifiés dans `CODE_HOTSPOTS_AUDIT.md` (erreur réseau, HTTP 4xx/5xx, JSON invalide, champs manquants, rendu correct) ne sont vérifiés que manuellement, si tant est qu'ils le soient.
- **Mécanisme de configuration `API_BASE_URL` (`js/app.js:2-3`)** : la logique `||` de fallback et la garde `typeof window` ne sont pas couvertes par des tests — un refactoring accidentel casserait la configuration sans alerte.

## Risques

- **Régression silencieuse sur changement API** : si `shift-pilot-resa-api` modifie la structure de `/transfers`, aucun test ne signale la casse côté front. La seule détection est visuelle, en production ou en staging.
- **Pas de filet sur le seul chemin critique** : une modification de `loadTransfers` (ajout d'un filtre, gestion d'erreur) ne peut pas être validée par un test de non-régression — la confiance dans chaque changement dépend entièrement de la relecture humaine.

## Recommandations priorisées

1. **Bootstrapper un framework de test minimal** — Ajouter `package.json` avec `vitest` (ou `jest` + `jsdom`) et écrire au moins trois tests : (a) `loadTransfers` avec réponse API valide, (b) `loadTransfers` avec fetch rejeté, (c) résolution de `API_BASE_URL` selon l'environnement. Ce coût initial est faible et ouvre la porte à un filet automatisé. Fichiers : `package.json` (nouveau), `js/app.test.js` (nouveau). Priorité : haute si le projet évolue, faible pour un pilote figé.
2. **Ajouter un workflow CI minimal** — Un fichier `.github/workflows/test.yml` qui exécute `npm test` sur chaque push est suffisant pour sécuriser toute évolution ultérieure. Priorité : conditionnelle à la recommandation 1.
3. **Écrire un test e2e avec Playwright ou Cypress contre une API mockée** — Couvre le rendu DOM réel ; pertinent si le projet sort du statut de pilote. Priorité : basse en l'état.

## Questions ouvertes

- Des tests manuels sont-ils effectués sur cet outil, et si oui, par qui et selon quel protocole ? Il n'existe aucune trace de procédure de test dans le dépôt.
- Le projet a-t-il vocation à évoluer au-delà du pilote ? Si oui, l'absence d'infrastructure de test est le premier déficit à solder avant toute fonctionnalité supplémentaire.
