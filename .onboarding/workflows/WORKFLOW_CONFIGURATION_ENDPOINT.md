# WORKFLOW_CONFIGURATION_ENDPOINT — Résolution de l'URL de l'API selon l'environnement

## Classification
- **Type** : `technical_flow`
- **Sous-type** : configuration d'environnement par injection de variable globale
- **Visibilité** : `technical`
- **Acteur principal** : environnement de déploiement (la page hôte ou le serveur qui injecte `window.API_BASE_URL`)
- **Acteurs** : page `index.html` (hôte), script `js/app.js` (consommateur), environnement de déploiement (fournisseur optionnel)
- **Criticité** : Haute — sans URL correcte, aucun appel API ne peut aboutir ; `WORKFLOW_AFFICHER_TRANSFERTS` est entièrement dépendant de ce flux
- **Confiance** : high
- **Justification** : Le mécanisme est intégralement lisible en 2 lignes (`js/app.js:2-3`). Il n'y a aucune logique cachée, aucune dépendance non visible. La confiance est `high` car tout le comportement de configuration est dans ces lignes, et aucun fichier de configuration externe n'existe dans ce dépôt.

## Objectif

Permettre à l'application de pointer sur la bonne instance de `shift-pilot-resa-api` selon l'environnement (développement local, staging, production) sans modifier le code source. Le mécanisme repose sur une variable globale `window.API_BASE_URL` injectée par la page hôte ou l'infrastructure ; en son absence, un fallback local (`http://localhost:3100`) est utilisé.

## Acteurs

- **Environnement de déploiement** : peut définir `window.API_BASE_URL` avant le chargement de `js/app.js` (ex. via une balise `<script>` dans `index.html` ou une variable injectée côté serveur)
- **Script `js/app.js`** : lit `window.API_BASE_URL` à son initialisation et expose `API_BASE_URL` comme constante de module
- **`WORKFLOW_AFFICHER_TRANSFERTS`** : seul consommateur de `API_BASE_URL` dans le code actuel

## Points d'entrée

- Exécution de `js/app.js` par le navigateur (chargement synchrone via `<script src="js/app.js">` dans `index.html:10`)
- Évaluation de la déclaration `const API_BASE_URL` au niveau module (code exécuté immédiatement, avant tout appel à `loadTransfers()`)

## Étapes principales

1. **Vérification de l'environnement** : `typeof window !== "undefined"` protège contre une exécution hors navigateur (Node.js, tests, environnements SSR) (`js/app.js:2`).
2. **Lecture de la surcharge** : si `window` est défini et `window.API_BASE_URL` est une valeur truthy, cette valeur est assignée à `API_BASE_URL` (`js/app.js:2-3`).
3. **Fallback local** : si `window.API_BASE_URL` est absent, `undefined`, `null` ou une chaîne vide (valeur falsy), `"http://localhost:3100"` est utilisé (`js/app.js:3`).
4. **Exposition** : `API_BASE_URL` est disponible comme constante de module pour toute la durée de vie de la page, consommée par `loadTransfers()` (`js/app.js:6`).

## Règles métier

- **Priorité à l'injection externe** : `window.API_BASE_URL` a toujours la priorité sur le fallback (`js/app.js:2-3` : opérateur `||`).
- **Fallback immuable** : `"http://localhost:3100"` est codé en dur dans le source (`js/app.js:3`) — le changer nécessite une modification du fichier.
- **Évaluation unique** : `API_BASE_URL` est une `const` évaluée une seule fois au chargement du script ; une modification de `window.API_BASE_URL` après ce point n'a aucun effet sans rechargement de la page.
- **Aucune validation de l'URL** : la valeur de `window.API_BASE_URL` (ou du fallback) est utilisée telle quelle, sans vérification de format ni de joignabilité.

## Données

- **`window.API_BASE_URL`** : chaîne optionnelle fournie par l'environnement hôte ; valeur attendue : URL de base sans slash final (ex. `"https://api.production.example.com"`). Format non contrôlé dans le code (`js/app.js:2-3`).
- **`API_BASE_URL`** (constante locale) : valeur résolue, utilisée pour construire `\`${API_BASE_URL}/transfers\`` (`js/app.js:6`). Sa valeur courante est `INCONNU` à l'exécution dans ce workspace (dépend de l'environnement de déploiement).

## Intégrations

Aucune intégration externe propre à ce flux. Ce workflow est lui-même un prérequis à l'intégration de `WORKFLOW_AFFICHER_TRANSFERTS` avec `shift-pilot-resa-api`.

## Risques

- **`window.API_BASE_URL` non injectée en production** : si l'environnement de production ne définit pas cette variable, le client appellera `http://localhost:3100` — une adresse locale injoignable → `WORKFLOW_AFFICHER_TRANSFERTS` échoue silencieusement (voir risques de ce workflow). Aucun guard ni log n'avertit de ce cas (`js/app.js:2-3`).
- **Valeur falsy acceptée comme fallback** : une chaîne vide `""` ou `null` pour `window.API_BASE_URL` déclenche le fallback local sans avertissement (`js/app.js:2-3` : opérateur `||`). Si l'injection renvoie intentionnellement une chaîne vide (bug de config), le comportement silencieux rend le diagnostic difficile.
- **Absence de validation d'URL** : une URL malformée dans `window.API_BASE_URL` sera transmise telle quelle à `fetch()`, qui échouera avec une erreur réseau non interceptée.
- **Détournement de l'endpoint API si `window.API_BASE_URL` est contrôlable par un tiers** : si cette variable peut être définie par un tiers (ex. via un paramètre URL ou un contenu utilisateur injecté dans la page hôte sans assainissement), les appels `fetch` seront redirigés vers un serveur malveillant. Ce risque dépend de la façon dont la page hôte définit la variable — hors périmètre de ce dépôt.

## Questions ouvertes

- **Comment `window.API_BASE_URL` est-elle définie en production ?** Aucune configuration de déploiement, de variable d'environnement serveur, ni de balise `<script>` de surcharge n'existe dans ce dépôt. Le mécanisme de production est entièrement `INCONNU` ici.
- **Existe-t-il plusieurs environnements (staging, preprod) ?** La variable le permettrait, mais rien ne le confirme dans ce workspace.

## Preuves

- `js/app.js` — intégralement lu (20 lignes), en particulier lignes 2-3 et 6
- `index.html` — intégralement lu (12 lignes) ; aucune balise `<script>` de surcharge de `window.API_BASE_URL` présente
