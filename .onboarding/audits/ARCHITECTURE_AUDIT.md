# Architecture — Audit

> Confiance : high

> **Réconciliation (SHIA-572).** Audit confronté au code courant (`main` @ `acf9f61`). Modifications depuis la version antérieure : (a) `js/app.js` a grandi de 20 à 90 lignes avec l'ajout de `reserve()` et `cancelReservation()` (SHIA-354) et du verrou anti double-clic (SHIA-383) ; (b) un `package.json` minimal a été ajouté (`type: module`, script `test: node --test`) ; (c) `js/app.test.js` existe maintenant — la garde `typeof document` (ligne 88) est désormais justifiée par les tests, pas simplement préventive. L'appréciation architecturale d'ensemble reste valide : architecture plate, un seul fichier, aucun bundler, aucune séparation de couche. Les zones marquées obsolètes ou « inachevées » dans la version antérieure sont mises à jour.

## Compréhension globale

`shift-pilot-resa-web` est un front statique sans build ni dépendance (hormis un `package.json` minimal pour la commande de test). L'architecture est délibérément plate : un fichier HTML (`index.html`, 12 lignes), un module JS (`js/app.js`, 90 lignes), et une suite de tests (`js/app.test.js`, 311 lignes). Le projet est un **pilote de test**, et sa structure reflète ce contexte : fonctionnel, lisible, sans abstraction superflue.

## Résumé exécutif

Le dépôt repose sur deux fichiers utiles : `index.html` charge `js/app.js` comme module ES. `js/app.js` expose trois fonctions asynchrones — `loadTransfers()`, `reserve(transferId)`, `cancelReservation(transferId, reservationId)` — et deux états module-level : `reservations` (Map) et `pendingTransfers` (Set). Depuis SHIA-354 et SHIA-383, la couche applicative a plus que quadruplé en taille sans évolution de structure : tout vit dans un seul fichier sans séparation configuration / transport / état / rendu. La configuration de l'URL d'API reste via `window.API_BASE_URL` avec fallback `localhost:3100` (lignes 2–3). Ce design fonctionne pour le périmètre actuel ; toute extension (routing, module de profil, filtres) exigera un refactoring architectural minimal qui n'a pas été préparé. Le `package.json` introduit une surface de dépendance technique (type module, script test) cohérente avec la suite `node:test` existante.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Un fichier, trois fonctions, deux états partagés.** `js/app.js` (90 lignes) contient en une seule portée de module : la configuration (`API_BASE_URL`, lignes 2–3), deux exports d'état (`reservations` Map, ligne 6 ; `pendingTransfers` Set, ligne 8), et trois fonctions asynchrones exportées (`loadTransfers` lignes 10–42, `reserve` lignes 44–65, `cancelReservation` lignes 67–86). Il n'y a ni module `api.js`, ni module `state.js`, ni module `render.js`. La cohésion fonctionnelle est assurée par la petitesse du périmètre, pas par une séparation de responsabilités. L'état (`reservations`, `pendingTransfers`) est partagé implicitement entre les trois fonctions — un couplage invisible mais réel.

**`VÉRIFIÉ_CODE` — Configuration par injection globale.** L'URL de l'API est résolue via `window.API_BASE_URL` (`js/app.js`, lignes 2–3). Ce mécanisme est fonctionnel et léger, mais suppose que la page hôte a injecté cette variable avant le chargement du script. Le `README.md` (8 lignes) ne documente pas ce mécanisme d'injection. `HYPOTHÈSE` : le mécanisme d'injection existe côté serveur ou via un script non versionné ; à confirmer avant mise en production.

**`VÉRIFIÉ_CODE` — Garde `typeof document` justifiée par les tests.** La garde de la ligne 88 (`if (typeof document !== "undefined")`) permet d'importer `js/app.js` depuis `js/app.test.js` sans déclencher l'écouteur `DOMContentLoaded`. Cette garde, présentée dans la version antérieure de l'audit comme potentiellement inutile, est maintenant validée par un usage réel — la suite de tests l'exploite.

**`VÉRIFIÉ_CODE` — `package.json` minimal.** Un `package.json` (`{ "type": "module", "scripts": { "test": "node --test" } }`) existe à la racine. Il n'introduit aucune dépendance de production mais établit le type ES module et la commande de test. C'est une dépendance d'outillage légère, cohérente avec le principe « aucune dépendance » du `README.md` (qui vise les dépendances de production front, pas l'outillage de test).

**`VÉRIFIÉ_CODE` — Absence totale de routing.** Une seule page, un seul template, pas de navigation. Cohérent avec le périmètre actuel. Tout ajout d'un flux multi-page (détail d'un transfert, profil utilisateur) nécessiterait d'introduire un mécanisme de routing inexistant aujourd'hui.

## Forces

- **Zéro dépendance de production** (`README.md` : *« aucune dépendance, aucun build »*) : aucune surface d'attaque sur la chaîne d'approvisionnement, déploiement trivial.
- **Code lisible en entier en moins de deux minutes** : 90 lignes dans `js/app.js`, sans abstraction superflue.
- **Fallback de configuration explicite** (`js/app.js`, lignes 2–3) : comportement en développement local défini sans fichier `.env`.
- **Module ES natif** : `js/app.js` exporte ses fonctions et états, ce qui rend le fichier testable sans adaptation (`js/app.test.js` importe directement).

## Dettes techniques

- **Un seul fichier pour configuration, état, transport et rendu.** `js/app.js` mêle `API_BASE_URL`, `reservations`, `pendingTransfers`, les trois appels `fetch` et la génération DOM. Pour 90 lignes, c'est encore lisible ; au-delà, la séparation deviendra nécessaire. Localisation : `js/app.js` (intégralité).
- **Mécanisme d'injection de `window.API_BASE_URL` non versionné.** Le contrat entre la page hôte et le script n'est documenté ni dans `README.md` ni dans le code. Si le mécanisme d'injection n'est pas versionné, la mise en production dépend d'un savoir tacite. Localisation : `js/app.js` lignes 2–3, `README.md`.
- **État module-level partagé entre trois fonctions.** `reservations` et `pendingTransfers` sont accessibles depuis `loadTransfers`, `reserve` et `cancelReservation` sans encapsulation. Dans les tests, cet état doit être nettoyé manuellement entre cas (`reservations.clear()`, `pendingTransfers.clear()`). En production, une interruption runtime brutale (navigation forcée, crash de contexte JS) entre `pendingTransfers.add` et le `finally` bloquerait le transfert jusqu'au rechargement — `HYPOTHÈSE` : le `finally` s'exécute toujours en JS normal (`js/app.js`, lignes 62–64, 83–84), le scénario de crash est hypothétique.

## Zones critiques

- **`js/app.js`, ligne 6–8 — état module-level** : les deux exports d'état (`reservations`, `pendingTransfers`) sont le cœur invisible de la logique. Un senior regarderait ici pour évaluer les invariants : qui peut modifier ces collections, dans quel ordre, et comment les incohérences sont détectées.
- **`js/app.js`, lignes 2–3 — configuration** : point de fragilité silencieux si `window.API_BASE_URL` n'est pas injectée en production.

## Risques

- **`HYPOTHÈSE` — `window.API_BASE_URL` non injectée en production pointe vers `localhost:3100`.** Si le mécanisme d'injection échoue ou est absent, l'application tente des appels réseau vers `localhost:3100` depuis le navigateur de l'utilisateur. `VÉRIFIÉ_CODE` : le fallback vers `http://localhost:3100` est défini à `js/app.js` lignes 2–3 ; en cas d'échec réseau ou de réponse HTTP non-ok, le `catch` (ligne 40) affiche `list.textContent = "Impossible de charger les transferts : ..."` — l'erreur est visible, pas silencieuse ni muette. `HYPOTHÈSE` : l'absence d'injection en production et l'occurrence réelle du scénario (appels vers localhost depuis un navigateur utilisateur) ne sont pas évaluables depuis ce dépôt. Preuve de la fragilité documentaire : `js/app.js` lignes 2–3 et 39–40 ; absence de documentation dans `README.md`.
- **`VÉRIFIÉ_CODE` — Aucune voie d'évolution structurée.** L'architecture actuelle n'a pas préparé de fondation pour de nouvelles fonctionnalités. Un ajout (routing, détail de transfert, persistance locale) sera simultanément un chantier fonctionnel et un chantier architectural non préparé.

## Recommandations priorisées

1. **Documenter le mécanisme d'injection de `window.API_BASE_URL`** dans `README.md` — comment cette variable est positionnée en environnement non local. Faible effort, critique pour toute mise en production. Fichiers : `README.md`, `js/app.js` lignes 2–3.
2. **Si le périmètre est appelé à grandir**, extraire au minimum un module `api.js` (transport + gestion d'erreur) et un module `state.js` (exports `reservations`, `pendingTransfers`) avant d'ajouter une deuxième page ou un troisième flux. Pas urgent si le périmètre reste stable. Fichier : `js/app.js`.

## Questions ouvertes

- Le mécanisme d'injection de `window.API_BASE_URL` en production est-il versionné quelque part (script serveur, CDN, CI) ? Sans cette information, le comportement en production ne peut pas être évalué.
- Ce dépôt est-il destiné à rester un pilote de test ou à devenir l'application web de production ? La réponse conditionne entièrement la pertinence de toute recommandation d'évolution architecturale.
