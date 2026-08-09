# Security & Robustness — Audit

> Confiance : high

> **Réconciliation (SHIA-572).** Audit confronté au code courant (`main` @ `acf9f61`). Modification majeure : la dette de robustesse principale de la version antérieure — **l'appel `fetch` sans `try/catch` ni `response.ok`** — est **résolue** dans les trois fonctions (`loadTransfers`, `reserve`, `cancelReservation`). Les deux premières recommandations prioritaires de la version antérieure sont donc implémentées. Nouveaux constats : (a) surface étendue avec `reserve()` (POST) et `cancelReservation()` (DELETE), toutes deux correctement gardées ; (b) verrou anti double-clic (`pendingTransfers` Set) réduit le risque d'état client incohérent ; (c) messages d'erreur utilisateur présents mais destructeurs du DOM list. La surface de sécurité reste très réduite.

## Compréhension globale

Le dépôt est un front statique de 90 lignes de code utile. La surface d'attaque reste minimale : pas d'entrée utilisateur libre, aucun cookie ni stockage local explicitement manipulé côté front (le contrôle serveur et les cookies ambiants sont `INCONNU`), pas de dépendance tierce de production. Depuis les corrections SHIA-354 et SHIA-383, les trois fonctions asynchrones ont chacune un `try/catch` et un test de `response.ok`, ce qui élimine la principale dette de robustesse identifiée dans la version antérieure. Les vecteurs réels restants sont la configuration de l'URL d'API et la gestion des états d'erreur.

## Résumé exécutif

`shift-pilot-resa-web` présente une surface de sécurité minime par construction : pas d'entrée utilisateur, aucun mécanisme d'authentification ni cookie explicitement manipulé côté front (`INCONNU` : contrôle serveur et cookies ambiants éventuels), pas de localStorage. Les trois fonctions d'appel réseau (`loadTransfers`, `reserve`, `cancelReservation`) ont désormais chacune un `try/catch` encadrant tout l'appel et un test `if (!response.ok)` avant désérialisation — la principale dette de robustesse antérieure est résolue. Le rendu DOM utilise `textContent` pour les données dynamiques, ce qui élimine tout vecteur XSS issu de l'API. Le `list.innerHTML = ""` (ligne 19) ne porte pas de données API. Aucun secret n'est présent dans le code. Le mécanisme `window.API_BASE_URL` reste un vecteur de configuration mineur. L'absence d'authentification et la dépendance sur la politique CORS de `shift-pilot-resa-api` sont des questions structurelles qui ne peuvent être évaluées depuis ce dépôt.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Gestion d'erreur présente dans les trois fonctions.** `loadTransfers()` (lignes 12–41), `reserve()` (lignes 48–64), et `cancelReservation()` (lignes 71–85) ont chacune un bloc `try { ... } catch (err) { list.textContent = \`...\` }`. Dans chaque `try`, `response.ok` est testé avant `response.json()` — si `!response.ok`, une `Error` est levée avec le code HTTP, capturée dans le `catch`. C'est le pattern minimal correct pour distinguer une réponse d'erreur d'une défaillance réseau.

**`VÉRIFIÉ_CODE` — Pas de XSS par les données API.** Le rendu de chaque transfert utilise `item.textContent = \`...\`` (`js/app.js`, ligne 22), pas `innerHTML`. Les données API (champs `from`, `to`, `price`, `seatsLeft`) sont traitées comme du texte brut — aucun risque XSS par injection de HTML ou de JavaScript depuis l'API distante.

**`VÉRIFIÉ_CODE` — `list.innerHTML = ""` sur un nœud DOM contrôlé.** La réinitialisation du conteneur (`js/app.js`, ligne 19, à l'intérieur du `try`) vide un nœud dont l'identifiant est fixe et dont le contenu est entièrement généré par le code. Pas de données API injectées dans `innerHTML`. Pas de risque XSS à ce niveau.

**`VÉRIFIÉ_CODE` — Message d'erreur utilisateur destructeur du DOM.** En cas d'erreur, le `catch` exécute `list.textContent = \`Impossible de charger...\`` (ligne 40, ou équivalent aux lignes 61, 82). Ce mécanisme affiche bien un message à l'utilisateur, mais il écrase le contenu DOM de `<ul id="transfers-list">`. Après une erreur dans `reserve()` ou `cancelReservation()`, la liste est remplacée par une chaîne d'erreur brute — jusqu'au prochain appel réussi à `loadTransfers()`. Ce n'est pas un problème de sécurité, mais un comportement UI abrupt à noter.

**`VÉRIFIÉ_CODE` — Verrou anti double-clic via `pendingTransfers` Set.** `reserve()` (ligne 45) et `cancelReservation()` (ligne 68) vérifient `pendingTransfers.has(transferId)` et retournent immédiatement si vrai. Le verrou est posé en entrée (`pendingTransfers.add`, lignes 46, 69) et levé dans `finally` (`pendingTransfers.delete`, lignes 63, 84). Ce mécanisme empêche deux appels API simultanés sur le même transfert — ce qui aurait pu créer un état `reservations` incohérent (double réservation ou double annulation). C'est une mesure de robustesse applicative correcte.

**`VÉRIFIÉ_CODE` — `getElementById` sans vérification de nullité — fragilité de maintenance.** Les lignes 11, 47 et 70 appellent `document.getElementById("transfers-list")` sans tester si la valeur est `null`. Si l'identifiant était absent ou renommé dans `index.html`, les erreurs se propagent comme suit : dans `loadTransfers`, `list.innerHTML` (ligne 19, à l'intérieur du `try`) lève une `TypeError` capturée, mais `list.textContent` dans le `catch` (ligne 40) lève à son tour une `TypeError` non capturée ; dans `reserve()` et `cancelReservation()`, c'est `list.textContent` dans le `catch` (lignes 61, 82) qui lève directement une `TypeError` non capturée (le `finally` s'exécute malgré tout). Dans l'état actuel, `index.html` (ligne 9) contient bien `<ul id="transfers-list">` — fragilité de maintenance, pas de sécurité.

**`VÉRIFIÉ_CODE` — Aucun secret en dur.** Aucune clé d'API, token, mot de passe dans `js/app.js`, `index.html`, `package.json`. La seule valeur configurable est l'URL de l'API, qui pointe vers `localhost:3100` par défaut — non sensible.

**Vecteur `window.API_BASE_URL` — lecture et scénario d'attaque séparés.** `VÉRIFIÉ_CODE` : la propriété `window.API_BASE_URL` est lue depuis `window` et utilisée pour construire l'URL de base des appels `fetch` (`js/app.js`, lignes 2–3). `HYPOTHÈSE` : si une page tierce pouvait injecter cette propriété avant le chargement du script (page hôte compromise, injection de contenu tiers), elle pourrait rediriger les appels `fetch` vers un serveur arbitraire. Ce vecteur est marginal pour un pilote ; à réévaluer si la page est embarquée dans un contexte moins contrôlé (iframe, widget).

**Authentification et CORS — observations locales et inconnues séparées.** `VÉRIFIÉ_CODE` : aucun en-tête `Authorization` ni cookie d'authentification n'est envoyé dans les requêtes (`js/app.js`, lignes 49–53, 72–75). `INCONNU` : si l'API implémente un mécanisme d'identification côté serveur (session, token opaque, autre), cela n'est pas évaluable depuis ce dépôt — affirmer que l'API est « anonyme » dépasserait ce que le code front démontre. `INCONNU` : la politique CORS est entièrement du côté serveur (`shift-pilot-resa-api`) — non évaluable depuis ce dépôt.

## Forces

- **`try/catch` + `response.ok` dans les trois fonctions** (`js/app.js`, lignes 12–41, 48–64, 71–85) : toute erreur réseau ou HTTP produit un message utilisateur visible **à condition que le nœud DOM `#transfers-list` soit accessible** (cf. constat `getElementById`). La dette de robustesse principale de la version antérieure est résolue.
- **Usage de `textContent` systématique pour les données dynamiques** (`js/app.js`, ligne 22) : élimine tout vecteur XSS issu de l'API.
- **Aucun secret en dur** dans le code versionné.
- **Verrou anti double-clic** (`pendingTransfers`, lignes 45–46, 68–69) : réduit le risque d'état client incohérent par opérations concurrentes.
- **Surface minimale** : pas d'entrée utilisateur libre, aucun cookie ni localStorage explicitement manipulé côté front — la quasi-totalité des vecteurs d'attaque courants est absente par construction (contrôle serveur et cookies ambiants : `INCONNU`).

## Dettes techniques

- **`getElementById` sans garde de nullité** (lignes 11, 47, 70) : fragilité à la maintenance si l'identifiant HTML change indépendamment du JS. Pas critique aujourd'hui — `index.html` est cohérent.
- **Message d'erreur qui remplace le DOM list** (lignes 40, 61, 82) : `list.textContent = ...` écrase la liste entière avec du texte brut, sans possibilité de récupération autre que de rappeler `loadTransfers()`. L'UX pourrait être améliorée par un élément d'erreur séparé, mais ce n'est pas une dette de sécurité.

## Zones critiques

- **`js/app.js`, lignes 62–64 et 83–85 — blocs `finally`** : le `pendingTransfers.delete(transferId)` dans chaque `finally` est la garantie que le verrou est levé même si le `catch` lève lui-même une exception (peu probable, mais possible si `list.textContent` échoue). C'est un invariant critique ; un senior vérifierait que rien dans le `catch` ne peut empêcher le `finally` de s'exécuter.
- **`js/app.js`, lignes 2–3 — configuration** : seul vecteur de redirection possible vers un serveur arbitraire si la page hôte est compromise.

## Risques

- **`HYPOTHÈSE` — CORS non évalué.** La politique CORS de `shift-pilot-resa-api` n'est pas visible depuis ce dépôt. Si l'origine de la page n'est pas autorisée, les appels `fetch` échouent — désormais avec un message d'erreur utilisateur (grâce au `catch`), mais sans distinguer un problème CORS d'un autre incident réseau.
- **`HYPOTHÈSE` — Vecteur `window.API_BASE_URL` en contexte d'intégration.** Marginal pour un pilote ; à réévaluer si la page est embarquée dans un contexte tiers.
- **Absence d'identifiant explicite côté client — fait observé et inconnu séparés.** `VÉRIFIÉ_CODE` : les appels POST et DELETE (`js/app.js`, lignes 49–53, 72–75) sont émis sans en-tête `Authorization` ni cookie d'authentification explicitement manipulé. `INCONNU` : si `shift-pilot-resa-api` implémente un contrôle d'accès côté serveur (session, token opaque, autre mécanisme), ce n'est pas évaluable depuis ce dépôt ; la responsabilité de l'identification ne peut être imputée au serveur comme fait établi.

## Recommandations priorisées

1. **Documenter la politique CORS attendue** dans `README.md` ou la documentation de `shift-pilot-resa-api` — surtout si un déploiement multi-origines est prévu. Priorité haute avant mise en production. Fichier : `README.md`.
2. **Ajouter une garde de nullité sur `getElementById`** — vérifier que `list` n'est pas `null` avant d'appeler `.innerHTML` ou `.textContent`. Faible effort, bonne pratique défensive. Fichier : `js/app.js`, lignes 11, 47, 70.
3. **Envisager un élément d'erreur dédié** plutôt que `list.textContent` pour afficher les erreurs — évite d'écraser la liste et permet une récupération visuelle sans appel API supplémentaire. Non critique pour un pilote.

## Questions ouvertes

- La politique CORS de `shift-pilot-resa-api` autorise-t-elle l'origine de `shift-pilot-resa-web` ?
- L'API est-elle délibérément publique (sans authentification) ou un mécanisme d'identification est-il prévu ? La réponse change la surface de sécurité côté front significativement.
- En cas d'exception dans le bloc `catch` lui-même (ex. `list` est `null` après une mutation DOM inattendue), le `finally` s'exécute-t-il ? Oui par spécification JS — mais ce cas n'est pas couvert par les tests.
