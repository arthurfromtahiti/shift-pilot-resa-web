# Architecture — Audit

> Confiance : high

## Compréhension globale

`shift-pilot-resa-web` est un front statique minimaliste : une page HTML (`index.html`, 12 lignes) et un script JavaScript (`js/app.js`, 20 lignes) sans dépendance, sans build, sans framework. Son unique responsabilité est d'appeler `GET ${API_BASE_URL}/transfers` sur `shift-pilot-resa-api` (dépôt séparé) et d'afficher le résultat. Il s'agit d'un pilote de test, pas d'une application mature (`git log` : un seul commit `init: pilote de test SHIFT/Paperclip`).

## Résumé exécutif

L'architecture est intentionnellement plate. Le choix HTML + JS natif sans build est cohérent avec le statut de pilote : zéro dépendance, démarrage immédiat. Les deux fichiers ont des responsabilités distinctes (structure vs comportement), et le mécanisme de configuration par `window.API_BASE_URL` est un pattern valide pour séparer l'URL d'API selon l'environnement. La dette n'est pas dans les choix techniques mais dans leur caractère embryonnaire : aucun système de modules, aucun gestionnaire d'état, aucune configuration de déploiement, aucun mécanisme d'évolutivité. La totalité de la logique applicative tient en 20 lignes dans un espace global. Cela est acceptable pour un pilote ponctuel ; cela deviendrait un frein immédiat si la fonctionnalité devait grandir.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Structure à deux couches plates.** `index.html` assure la structure HTML (`index.html:1-12`) et charge `js/app.js` en script synchrone sans attribut `async` ni `defer` (`index.html:10`). Le JavaScript est un script de module global : `loadTransfers` est déclarée comme `async function` au niveau du fichier sans encapsulation (`js/app.js:5`). Il n'existe ni classe, ni module ES, ni namespace — tout tient dans la portée globale du script. Ce choix est fonctionnel à 20 lignes mais n'est pas extensible : toute fonction ajoutée s'expose à l'espace global du navigateur.

**`VÉRIFIÉ_CODE` — Configuration par variable globale.** L'URL de l'API est résolue par `const API_BASE_URL = (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` (`js/app.js:2-3`). Ce pattern permet d'injecter l'URL via la page hôte avant le chargement du script, ce qui est un mécanisme portable et sans dépendance. La garde `typeof window !== "undefined"` (`js/app.js:2`) anticipe une exécution hors-navigateur (Node.js, tests unitaires), ce qui est une précaution technique pertinente dans un script qui n'est pas un module ES. La `const` n'est évaluée qu'une fois au chargement : tout changement post-chargement de `window.API_BASE_URL` n'a aucun effet.

**`HYPOTHÈSE` — Aucune configuration de déploiement.** Aucun fichier de configuration serveur, de Docker, de CI/CD, de Nginx, de reverse-proxy ni de variable d'environnement d'infrastructure n'existe dans ce dépôt. `HYPOTHÈSE` : la page est servée par un serveur statique externe (non versionné dans ce workspace), et `window.API_BASE_URL` est injectée par un mécanisme de déploiement opérationnel inconnu dans ce dépôt. Ce mécanisme est entièrement opaque depuis le code seul (`README.md`, `index.html`, `js/app.js` — exhaustivité vérifiée).

**`VÉRIFIÉ_CODE` — Couplage fort à l'API distante.** L'intégralité de la valeur applicative dépend d'un seul appel sortant (`js/app.js:6` : `fetch(\`${API_BASE_URL}/transfers\`)`) dont la réponse n'est pas contractualisée ici — pas de schéma, pas de mock, pas de type défini. Si `shift-pilot-resa-api` change la forme ou le nom des champs, le front casse silencieusement (valeurs `undefined` affichées).

## Forces

- **Aucune dépendance** : zéro surface d'attaque liée aux packages, zéro coût de mise à jour, zéro build cassé — adapté à un pilote de test (`README.md` : *« HTML + JS natif, aucune dépendance, aucun build »*).
- **Séparation structure / comportement** : `index.html` ne contient aucune logique ; `js/app.js` ne contient aucun HTML littéral — le couplage est minimal et explicite.
- **Garde environnementale** : `typeof window !== "undefined"` (`js/app.js:2`) et `typeof document !== "undefined"` (`js/app.js:18`) rendent le script partiellement testable hors navigateur sans modification.

## Dettes techniques

- **Espace global non encapsulé** : `loadTransfers` et `API_BASE_URL` sont dans la portée globale du script (`js/app.js:2,5`). Toute extension (deuxième fonction, deuxième constante) aggrave le risque de collision de noms.
- **Fallback localhost en dur** : `"http://localhost:3100"` est codé en dur dans le source (`js/app.js:3`). Changer l'adresse par défaut requiert une modification du fichier versionné.
- **Aucune séparation de couches entre données et affichage** : la récupération des données et la manipulation du DOM sont dans la même fonction `loadTransfers` (`js/app.js:5-16`), sans possibilité de tester l'une sans l'autre.

## Zones critiques

- **`js/app.js` (20 lignes, totalité de la logique)** — Tout le comportement applicatif est dans ce seul fichier sans découpage. Une régression ici impacte la totalité des fonctionnalités du dépôt.
- **Mécanisme de configuration par `window.API_BASE_URL`** — Opaque à qui déploie ce dépôt sans documentation : aucun README sur le mécanisme de production, aucun commentaire sur les valeurs attendues.

## Risques

- **Aucun contrat API explicite** : si `shift-pilot-resa-api` modifie la forme de `transfer`, le front n'en saura rien avant qu'un utilisateur observe des valeurs `undefined` à l'écran — aucun schéma ni test ne protège contre ce glissement.
- **Pas de configuration de déploiement dans le dépôt** : si `window.API_BASE_URL` n'est pas injectée en production, le client appelle `http://localhost:3100` (adresse locale inaccessible) et la page reste silencieusement vide — voir `SECURITY_ROBUSTNESS_AUDIT.md` pour les détails.

## Recommandations priorisées

1. **Documenter le mécanisme de déploiement** — Ajouter dans `README.md` (ou un fichier dédié) comment `window.API_BASE_URL` doit être injectée en production et en staging, et quelle valeur attendue. Priorité immédiate : sans cette documentation, chaque déploiement est une boîte noire. Fichier : `README.md`.
2. **Encapsuler le script dans un IIFE ou un module ES** — Remplacer `function loadTransfers()` par `(async function() {...})()` ou ajouter `type="module"` à la balise `<script>` pour isoler la portée. Fichiers : `js/app.js`, `index.html`.
3. **Définir un contrat minimal de l'API** — Un commentaire JSDoc ou un README décrivant les champs attendus de `transfer` suffirait à protéger contre les regressions silencieuses. Fichier : `js/app.js`.

## Questions ouvertes

- Comment `window.API_BASE_URL` est-elle définie en production ? Y a-t-il un mécanisme de templating côté serveur, une balise `<script>` injectée, ou un autre moyen ?
- Ce dépôt est-il destiné à rester un pilote ou à évoluer vers une application complète ? La réponse conditionne si la dette d'encapsulation est à solder ou à accepter.
- Existe-t-il un environnement de staging entre local et production ?
