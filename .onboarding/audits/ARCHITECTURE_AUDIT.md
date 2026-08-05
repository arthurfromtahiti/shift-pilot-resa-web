# Architecture — Audit

> Confiance : high

## Compréhension globale

`shift-pilot-resa-web` est un front statique minimal : deux fichiers utiles (`index.html`, `js/app.js`) et aucune dépendance. L'architecture est délibérément plate — une fonction, un endpoint consommé, un rendu DOM. Il n'y a pas de couches à proprement parler, et c'est cohérent avec la déclaration `README.md` (*« HTML + JS natif, aucune dépendance, aucun build »*). Le projet est un **pilote de test**, pas une application destinée à évoluer dans son état courant.

## Résumé exécutif

Le dépôt est le plus simple possible : une page HTML statique (`index.html`, 12 lignes) charge un script JS natif (`js/app.js`, 20 lignes) qui interroge une API distante et peuple un `<ul>`. Il n'y a ni build, ni bundler, ni framework, ni dépendance, ni module, ni configuration externe. L'URL de l'API est résolue via `window.API_BASE_URL` avec fallback `localhost:3100` (`js/app.js`, lignes 2–3). Ce design convient parfaitement à un pilote de test ; il deviendrait problématique dès qu'une deuxième fonctionnalité (filtre, réservation, authentification) devrait s'y greffer — l'absence de structure d'accueil rendrait le premier ajout structurant, pas progressif. Aucune dette d'architecture n'est urgente en l'état ; les risques sont tous conditionnels à une évolution du périmètre.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Pas de couche, pas de module, pas de séparation.** `js/app.js` (20 lignes) contient en une seule portée la configuration (`API_BASE_URL`, lignes 2–3), la logique de récupération (`fetch`, ligne 6), la désérialisation (`response.json()`, ligne 7), et le rendu DOM (boucle `for...of`, lignes 11–15). Pour 20 lignes et une fonctionnalité, c'est parfaitement lisible. En revanche, ajouter une deuxième fonctionnalité (tri, filtre, page de détail) sans refactoring préalable conduirait à un seul fichier qui mêle configuration, appels réseau et manipulation DOM — la frontière naturelle pour extraire un module de transport ou un module de rendu est inexistante pour l'instant.

**`VÉRIFIÉ_CODE` — Configuration par injection globale.** L'URL de l'API est résolue via `window.API_BASE_URL` (`js/app.js`, ligne 2). Ce mécanisme est fonctionnel et léger, mais il suppose que la page hôte a injecté cette variable avant le chargement du script — aucun fichier de configuration, de build ni de script d'injection n'est visible dans ce dépôt. Le fallback `"http://localhost:3100"` est utilisé en l'absence d'injection (ligne 3), ce qui est approprié pour le développement local mais inutilisable en production si le mécanisme d'injection n'existe pas. `HYPOTHÈSE` : le mécanisme d'injection existe côté serveur ou via un script non versionné ; à confirmer.

**`VÉRIFIÉ_CODE` — Compatibilité hors navigateur assumée.** Deux gardes (`typeof window !== "undefined"`, ligne 2 ; `typeof document !== "undefined"`, ligne 18) suggèrent une conscience de l'environnement Node.js. Ce n'est pas une architecture SSR — c'est probablement une précaution pour des tests hors navigateur. La conséquence est un code légèrement plus lisible pour des raisons non documentées.

**`VÉRIFIÉ_CODE` — Absence totale de routing.** Une seule page, un seul template, pas de navigation. Cohérent avec le périmètre actuel (catalogue de transferts en lecture seule). Tout ajout d'un flux utilisateur (détail d'un transfert, formulaire de réservation) nécessiterait d'introduire un mécanisme de routing inexistant aujourd'hui.

## Forces

- **Zéro dépendance** (`README.md` : *« aucune dépendance, aucun build »*) : aucune surface d'attaque sur la chaîne d'approvisionnement, aucun bundler à maintenir, déploiement trivial.
- **Code exhaustivement lisible** : 20 lignes dans `js/app.js`, aucune abstraction superflue. Un développeur qui ouvre le fichier comprend l'intégralité de ce que fait l'application en moins d'une minute.
- **Fallback de configuration explicite** (`js/app.js`, ligne 3) : le comportement en développement local est défini sans fichier `.env` ni outillage.

## Dettes techniques

- **Pas de structure d'accueil pour une deuxième fonctionnalité.** `js/app.js` mêle configuration, transport et rendu. Ajouter un filtre, une page de détail ou un formulaire sans introduire au moins une séparation `api.js` / `render.js` produirait rapidement du code non maintenable. Localisation : `js/app.js` (20 lignes, tout mélangé).
- **Mécanisme d'injection de `window.API_BASE_URL` non versionné.** Le contrat entre la page hôte et le script JS n'est documenté ni dans le code, ni dans le `README.md` (`README.md`, 8 lignes — aucune mention). Si le mécanisme d'injection n'est pas versionné quelque part, la mise en production dépend d'un savoir tacite.

## Zones critiques

- **`js/app.js` — point d'entrée unique et sans garde.** Toute la logique du dépôt est dans une seule fonction de 20 lignes. C'est gérable aujourd'hui ; c'est le premier fichier à refactorer avant tout ajout. Un senior regarderait ici en priorité pour évaluer la facilité d'évolution.

## Risques

- **`HYPOTHÈSE` — Le mécanisme d'injection de `window.API_BASE_URL` en production est un point de fragilité non documenté.** Si ce mécanisme est mal configuré, l'application pointe silencieusement vers `localhost:3100` depuis un navigateur de production — aucune erreur visible tant que ce port n'est pas occupé. Impact : catalogue vide en production, sans message d'erreur. Preuve de la fragilité : `js/app.js`, lignes 2–3 ; absence de fichier de configuration dans le dépôt.
- **`VÉRIFIÉ_CODE` — Aucune voie d'évolution structurée.** L'architecture actuelle ne pose aucune fondation pour une deuxième fonctionnalité. Ce n'est pas un risque immédiat (le périmètre est stable), mais tout ajout sera un choix architectural non préparé.

## Recommandations priorisées

1. **Documenter le mécanisme d'injection de `window.API_BASE_URL`** — ajouter dans `README.md` comment cette variable est positionnée en environnement non local (serveur, CDN, script de build). Priorité haute si une mise en production est prévue. Fichier : `README.md`, `js/app.js` lignes 2–3.
2. **Si le périmètre est appelé à grandir**, extraire au minimum un module `api.js` (transport) avant d'ajouter la deuxième fonctionnalité — pas maintenant si le périmètre reste stable. Fichier : `js/app.js`.

## Questions ouvertes

- Le mécanisme d'injection de `window.API_BASE_URL` en environnement de production est-il versionné quelque part (script serveur, CDN, CI) ? Sans cette information, le comportement en production ne peut pas être évalué.
- Ce dépôt est-il destiné à rester un pilote de test ou à devenir l'application web de production ? La réponse conditionne entièrement la pertinence de toute recommandation d'évolution architecturale.
