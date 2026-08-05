# Security & Robustness — Audit

> Confiance : high

## Compréhension globale

Le dépôt est un front statique de 32 lignes de code utile (HTML + JS). La surface d'attaque est très réduite : aucune entrée utilisateur, aucune authentification, aucun cookie, aucun stockage local, aucune dépendance tierce. La quasi-totalité des risques de sécurité classiques (injection SQL, authentification cassée, gestion de session, CSRF) ne s'appliquent pas dans ce périmètre. Les seuls vecteurs réels sont la robustesse de l'appel réseau, la chaîne de rendu DOM, et la configuration de l'URL d'API.

## Résumé exécutif

`shift-pilot-resa-web` présente une surface de sécurité minime par construction : pas d'entrée utilisateur, pas d'authentification, pas de cookie, pas de stockage local. Le seul vecteur actif est l'appel `fetch` non gardé vers `shift-pilot-resa-api` (`js/app.js`, lignes 6–7) : aucune vérification de `response.ok`, aucun `try/catch`, aucune validation du type de réponse. En cas d'erreur réseau ou de réponse non-tableau, le script lève une exception non interceptée qui laisse la page dans un état silencieusement cassé (liste vide, aucun message). Le rendu DOM utilise `textContent` (non `innerHTML`), ce qui élimine tout risque XSS issu des données API. La configuration d'URL via `window.API_BASE_URL` est un vecteur mineur si la page hôte est compromise — marginalement pertinent pour un pilote. Aucun secret n'est présent dans le code (`grep` sur `key|token|secret|password|apikey` — 0 résultat).

## Constats détaillés

**`VÉRIFIÉ_CODE` — Pas de XSS par les données API.** Le rendu de chaque transfert utilise `item.textContent = \`...\`` (`js/app.js`, ligne 13), pas `innerHTML`. Même si l'API distante renvoyait des données contenant du HTML ou du JavaScript, le navigateur les traiterait comme du texte brut, sans exécution. C'est le comportement sûr et il est explicitement choisi (pas d'usage de `innerHTML` pour les données dynamiques dans ce fichier).

**`VÉRIFIÉ_CODE` — `list.innerHTML = ""` sur un nœud DOM fixe.** La réinitialisation du conteneur (`js/app.js`, ligne 10) vide un nœud dont l'identifiant est codé en dur (`"transfers-list"`) et dont le contenu est contrôlé par le code lui-même — pas de données API injectées dans `innerHTML`. Pas de risque XSS à ce niveau.

**`VÉRIFIÉ_CODE` — Appel réseau sans gestion d'erreur.** `fetch(\`${API_BASE_URL}/transfers\`)` (`js/app.js`, ligne 6) est appelé sans `try/catch`. `response.json()` (ligne 7) est appelé sans vérification préalable de `response.ok`. Conséquences : (1) si l'API renvoie un code 4xx ou 5xx, `response.json()` peut réussir (si le corps est du JSON valide) ou rejeter — dans les deux cas, la boucle `for...of` sur un résultat non-tableau (objet d'erreur, `null`) lève une `TypeError` non capturée ; (2) si le réseau est indisponible, la `Promise` rejette, l'exception remonte non capturée, et la page reste avec sa liste vide et aucun message d'erreur visible. Impact robustesse : élevé en production — l'utilisateur ne sait pas si la liste est vide parce qu'il n'y a pas de transferts ou parce que l'API est en panne.

**`VÉRIFIÉ_CODE` — `getElementById` sans vérification de nullité.** Si `<ul id="transfers-list">` était absent ou renommé, `list` serait `null` et `list.innerHTML = ""` (ligne 10) lèverait une `TypeError` immédiate. Dans l'état actuel, le HTML correspond (`index.html`, ligne 9) — c'est un risque de fragilité à la maintenance, pas un risque de sécurité.

**`VÉRIFIÉ_CODE` — Aucun secret en dur.** Recherche explicite sur `key`, `token`, `secret`, `password`, `apikey`, `Authorization` dans `js/app.js` et `index.html` : 0 résultat. La seule valeur configurable est l'URL de l'API, qui pointe vers `localhost:3100` par défaut — non sensible.

**`VÉRIFIÉ_CODE` — Vecteur `window.API_BASE_URL`.** L'URL de base est lue depuis `window.API_BASE_URL` (`js/app.js`, ligne 2). Si une page tierce pouvait injecter cette propriété avant le chargement du script (scénario : page hôte compromise, injection de contenu tiers), elle pourrait rediriger les appels `fetch` vers un serveur arbitraire. Ce vecteur est réel mais marginal dans un contexte pilote ; il deviendrait pertinent si la page était embarquée dans un contexte moins contrôlé (iframe, widget). Statut : `HYPOTHÈSE` — aucun contexte d'intégration connu depuis ce dépôt.

**`VÉRIFIÉ_CODE` — Pas d'authentification, pas de CORS côté client.** Aucun en-tête `Authorization`, aucune gestion de cookie d'authentification dans `js/app.js`. L'API est consommée en lecture anonyme. La politique CORS est entièrement du côté serveur (`shift-pilot-resa-api`) — non visible ni évaluable depuis ce dépôt. `HYPOTHÈSE` : si l'API n'autorise pas l'origine de la page web, les appels `fetch` échouent silencieusement (erreur de réseau non distinguable côté client).

## Forces

- **Usage de `textContent` systématique pour les données dynamiques** (`js/app.js`, ligne 13) : élimine tout vecteur XSS issu de l'API, sans configuration supplémentaire.
- **Aucun secret, aucune clé d'API, aucun token en dur** dans le code versionné.
- **Surface minimale** : pas de formulaire, pas d'entrée utilisateur, pas de cookie, pas de localStorage — la quasi-totalité des vecteurs d'attaque courants est absente par construction.

## Dettes techniques

- **Appel `fetch` sans `try/catch` ni vérification de `response.ok`** (`js/app.js`, lignes 6–7) : toute erreur réseau ou HTTP produit une exception non gérée, aucun retour visible pour l'utilisateur. Ce n'est pas une dette de sécurité, mais une dette de robustesse significative pour une interface en production.
- **Manque de validation du type de la réponse JSON** (ligne 7) : la réponse est itérée directement sans vérifier que c'est bien un tableau, ce qui rend le code fragile à tout changement du format de l'API.

## Zones critiques

- **`js/app.js`, lignes 6–7 — chemin de l'appel réseau** : c'est le seul point de contact avec l'extérieur et il est totalement non gardé. Un senior vérifierait ici en priorité : gestion des erreurs HTTP, gestion des erreurs réseau, validation du format de la réponse.

## Risques

- **`VÉRIFIÉ_CODE` — Page silencieusement cassée en cas d'erreur API.** Sans `try/catch` autour du `fetch` (`js/app.js`, ligne 6) ni vérification de `response.ok` (ligne 7), tout incident réseau ou 5xx laisse la page dans un état indéterminé, sans message à l'utilisateur. C'est le risque de robustesse le plus concret de ce dépôt.
- **`HYPOTHÈSE` — CORS non évalué.** La politique CORS de `shift-pilot-resa-api` n'est pas visible depuis ce dépôt. Si l'origine de la page n'est pas autorisée, les appels `fetch` échouent — et l'absence de gestion d'erreur rend ce cas indiscernable d'une liste vide.

## Recommandations priorisées

1. **Ajouter un `try/catch` autour de l'appel `fetch` et vérifier `response.ok`** avant d'appeler `.json()` — afficher un message d'erreur à l'utilisateur en cas d'échec. Priorité haute pour toute mise en production. Fichier : `js/app.js`, lignes 6–7.
2. **Valider que la réponse JSON est bien un tableau** avant d'itérer (`Array.isArray(transfers)`). Fichier : `js/app.js`, ligne 7–11.
3. **Documenter la politique CORS attendue** dans `README.md` ou dans la documentation de `shift-pilot-resa-api` — à faire avant toute mise en production dans un environnement multi-origines.

## Questions ouvertes

- La politique CORS de `shift-pilot-resa-api` autorise-t-elle l'origine de `shift-pilot-resa-web` ? Ce n'est pas évaluable depuis ce dépôt.
- L'API est-elle publique (sans authentification) ou prévoit-on un mécanisme d'authentification (token, session) à terme ? La réponse change la surface de sécurité du front significativement.
