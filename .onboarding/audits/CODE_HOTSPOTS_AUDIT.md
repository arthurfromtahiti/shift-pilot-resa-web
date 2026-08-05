# Code Hotspots — Audit

> Confiance : high

## Compréhension globale

Ce dépôt ne contient qu'un seul fichier de code exécutable : `js/app.js`, 20 lignes. Il n'existe pas de « zone chaude » au sens d'un fichier disproportionné dans un ensemble plus large — le fichier *est* l'ensemble. L'audit des points chauds porte donc sur la concentration de responsabilités dans ce fichier unique, sur les absences qui le rendent fragile, et sur son couplage à la seule API distante. `index.html` (12 lignes) est de la structure HTML pure, sans logique.

## Résumé exécutif

`js/app.js` est à la fois le point chaud et l'unique fichier de code. En 20 lignes, il concentre la résolution de configuration, le fetch réseau, la désérialisation JSON, la manipulation du DOM et le rendu de chaque transfert — sans séparation de couches, sans gestion d'erreur, sans garde de type. Pour un pilote de test, cette densité est acceptable. Elle deviendrait une dette immédiate si de la logique s'y ajoutait : chaque nouvelle fonctionnalité (filtre, tri, réservation) viendrait s'empiler dans la même fonction, dans le même espace global. Le fichier est court, mais sa structure actuelle n'est pas extensible sans refactoring préalable.

## Constats détaillés

**`VÉRIFIÉ_CODE` — `loadTransfers` : cinq responsabilités en une fonction.** La fonction `async loadTransfers()` (`js/app.js:5-16`) cumule : (1) construction de l'URL, (2) appel réseau, (3) désérialisation JSON, (4) vidage du DOM, (5) rendu de chaque item. Ce n'est pas problématique à 20 lignes, mais cela signifie qu'il est impossible de tester l'une de ces responsabilités sans exercer les autres — et que toute modification touche le même périmètre.

**`VÉRIFIÉ_CODE` — Absence de gestion d'erreur dans le seul chemin critique.** `loadTransfers` est la seule fonction métier du dépôt (`js/app.js:5`). Elle est appelée sans `try/catch` (`js/app.js:5-16`). Un rejet de promesse non intercepté (réseau, CORS, JSON invalide) lève une `UnhandledPromiseRejection` visible dans la console, mais invisible pour l'utilisateur. Ce chemin critique n'a aucun filet.

**`VÉRIFIÉ_CODE` — Espace global non protégé.** `loadTransfers` (`js/app.js:5`) et `API_BASE_URL` (`js/app.js:2`) sont déclarées dans la portée globale du script, ce qui les expose à toute collision avec d'autres scripts chargés dans la même page. Le déclencheur `DOMContentLoaded` (`js/app.js:18-20`) est protégé par `typeof document !== "undefined"`, mais la constante `API_BASE_URL` est évaluée inconditionnellement au chargement du fichier (`js/app.js:2-3`).

**`VÉRIFIÉ_CODE` — Point de couplage unique et non contractualisé.** L'unique appel sortant est `fetch(\`${API_BASE_URL}/transfers\`)` (`js/app.js:6`). Il n'y a ni constante nommée pour l'URL du endpoint, ni type défini pour la réponse, ni mock possible sans modifier le code. Si l'URL change côté API, la seule trace dans ce dépôt est la chaîne `"/transfers"` en ligne 6 — aucun registre de endpoints, aucune indirection.

**`VÉRIFIÉ_CODE` — Régénération complète du DOM à chaque appel.** `list.innerHTML = ""` (`js/app.js:10`) efface et reconstruit la liste entièrement à chaque appel de `loadTransfers`. Il n'existe pas de mécanisme de diff ou de mise à jour partielle — acceptable pour un chargement unique, mais problématique si des rechargements périodiques étaient introduits (flash de contenu, perte de position de scroll).

**`VÉRIFIÉ_CODE` — Chargement du script synchrone.** `<script src="js/app.js"></script>` (`index.html:10`) est positionné en bas du `<body>`, ce qui évite le blocage du rendu HTML initial — c'est le bon placement. L'absence d'attribut `async` ou `defer` n'est pas un problème ici : le script est petit et en bas de page.

## Forces

- **Taille maîtrisée** : 20 lignes sont lisibles en entier en moins d'une minute. Tout bug est localisable immédiatement.
- **Pas de code mort** : chaque ligne de `js/app.js` est exécutée sur le chemin nominal. Aucune branche, aucune variable non utilisée — vérifié sur l'intégralité du fichier.
- **Garde hors-navigateur** : `typeof window !== "undefined"` (`js/app.js:2`) et `typeof document !== "undefined"` (`js/app.js:18`) anticipent un contexte Node.js ou de test, ce qui est une précaution non triviale pour un script de cette taille.

## Dettes techniques

- **Cinq responsabilités dans `loadTransfers`** : sans séparation, les tests, l'évolution et la maintenance touchent toujours le même périmètre (`js/app.js:5-16`).
- **Aucune gestion d'erreur sur le chemin critique** : `loadTransfers` peut échouer silencieusement sur trois vecteurs distincts (réseau, HTTP 4xx/5xx, type non-tableau) sans qu'aucun d'eux soit intercepté (`js/app.js:6,7,11`).
- **URL du endpoint codée en littéral** : `"/transfers"` n'est pas extrait en constante nommée (`js/app.js:6`) — un refactoring vers `/transfer-list` ou `/api/transfers` nécessite de localiser ce littéral dans le code.

## Zones critiques

- **`js/app.js:5-16` — `loadTransfers` entière** : seul chemin d'exécution métier du dépôt, sans filet d'erreur, sans test. Un senior regarderait ici en premier, non parce que le code est complexe, mais parce que c'est le seul code qui compte et qu'il est nu face aux erreurs.
- **`js/app.js:6` — `fetch(...)` et `js/app.js:7` — `response.json()`** : deux `await` successifs sans garde, chacun pouvant rejeter la promesse pour des raisons différentes (réseau vs format). C'est le point d'entrée des données externes : tout ce que l'API renvoie passe ici sans filtre.

## Risques

- **Régression invisible sur changement de l'API** : si `/transfers` renvoie une nouvelle forme (objet enveloppé, tableau de tableaux), la `TypeError` du `for...of` n'est pas attrapée — la page reste vide sans diagnostic (`js/app.js:11`).
- **Scalabilité structurelle nulle** : ajouter une deuxième requête (ex. `/bookings`), un filtre ou un état de chargement nécessiterait de refactorer `loadTransfers` — la structure actuelle ne supporte pas l'extension sans réécriture.

## Recommandations priorisées

1. **Ajouter `try/catch` autour du bloc fetch/json/render** — Couvre les trois vecteurs d'erreur en une passe et permet d'afficher un message à l'utilisateur. Fichier : `js/app.js:5-16`. Priorité : haute.
2. **Extraire une constante pour l'endpoint** — `const TRANSFERS_ENDPOINT = "/transfers"` rend le point de couplage nommé et cherchable. Fichier : `js/app.js`. Priorité : basse (cosmétique sur 20 lignes, devient utile si de nouveaux endpoints s'ajoutent).
3. **Encapsuler dans un module ou IIFE** — Protège `loadTransfers` et `API_BASE_URL` de la portée globale. Nécessite d'ajuster `index.html` si `type="module"` est choisi. Priorité : basse pour un pilote, immédiate si le projet grandit.

## Questions ouvertes

- Y a-t-il d'autres scripts prévus pour ce front (gestion de réservation, filtres) ? Si oui, la structure monofichier est un frein immédiat.
- Des rechargements périodiques de la liste sont-ils envisagés ? Si oui, le `innerHTML = ""` crée un flash visuel à chaque appel qui nécessiterait une stratégie de diff DOM.
