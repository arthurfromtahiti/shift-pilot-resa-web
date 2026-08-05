# Security & Robustness — Audit

> Confiance : high

## Compréhension globale

Le dépôt est un front statique de 20 lignes JavaScript sans backend propre, sans authentification, sans persistance locale. Sa surface d'attaque est réduite mais non nulle : elle se situe principalement au niveau de la configuration de l'endpoint API (`window.API_BASE_URL`), de l'absence de gestion d'erreur sur le fetch, et de l'absence de politique de sécurité content (CSP). La bonne nouvelle : l'usage de `textContent` plutôt que `innerHTML` pour le rendu protège explicitement contre le XSS à partir des données API.

## Résumé exécutif

Pour un pilote de 20 lignes, le niveau de sécurité est cohérent — sans être robuste. Le vecteur XSS principal (rendu de données API dans le DOM) est écarté par l'usage de `textContent` (`js/app.js:13`). En revanche, l'absence totale de gestion d'erreur sur le fetch crée une expérience utilisateur dégradée silencieuse en cas d'API injoignable, et le fallback `http://` en clair (`js/app.js:3`) ouvre la porte à une interception réseau en développement. Le risque le plus sérieux est structurel : `window.API_BASE_URL` peut être surchargée par n'importe quel script tiers chargé avant `js/app.js` si la page est embarquée dans un contexte hôte non maîtrisé. Aucun secret n'est présent dans le dépôt.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Protection XSS présente.** Le rendu de chaque transfert utilise `item.textContent = \`...\`` (`js/app.js:13`), pas `innerHTML`. Cela signifie que si l'API renvoie une chaîne contenant `<script>alert(1)</script>` dans un champ `from`, `to`, `price` ou `availableSeats`, le navigateur l'affichera comme texte brut et ne l'exécutera pas. C'est le comportement correct et attendu ; son usage ici est explicitement sécurisé.

**`VÉRIFIÉ_CODE` — Aucune authentification ni en-tête personnalisé.** L'appel `fetch(\`${API_BASE_URL}/transfers\`)` (`js/app.js:6`) ne contient aucun en-tête `Authorization`, `Cookie` ni `X-API-Key`. La requête est publique et non authentifiée. La question de savoir si l'API requiert une authentification est `INCONNU` dans ce workspace (hors périmètre, voir `shift-pilot-resa-api`). Si l'API est ouverte, c'est intentionnel ; si elle requiert une authentification, ce front n'est pas fonctionnel en production.

**`VÉRIFIÉ_CODE` — Absence totale de gestion d'erreur.** `loadTransfers` est une fonction `async` sans `try/catch` (`js/app.js:5-16`). En cas de rejet de la promesse (réseau, DNS, CORS, timeout), l'exception est non interceptée et la page reste silencieusement vide sans message utilisateur. De même, `response.ok` n'est jamais contrôlé (`js/app.js:6-7`) : une réponse HTTP `500` avec un corps JSON valide passerait le parse et serait tentée d'affichage. Enfin, `for (const t of transfers)` (`js/app.js:11`) suppose que `transfers` est itérable — si l'API renvoie un objet, `null` ou une chaîne, une `TypeError` non interceptée est levée.

**`VÉRIFIÉ_CODE` — Fallback en HTTP clair.** Le fallback `"http://localhost:3100"` (`js/app.js:3`) utilise HTTP (non TLS). En développement, c'est attendu. Si ce fallback était atteint en production (variable non injectée), les données transiteraient en clair et seraient interceptables par n'importe quel observateur réseau. Ce risque est conditionnel : il dépend du mécanisme d'injection de `window.API_BASE_URL` en production (`INCONNU` depuis ce dépôt).

**`VÉRIFIÉ_CODE` — Absence de Content Security Policy.** `index.html` ne contient aucune balise `<meta http-equiv="Content-Security-Policy" ...>` (`index.html:1-12`, intégralement lu). La protection contre l'injection de scripts dépend entièrement des en-têtes HTTP du serveur de fichiers statiques, qui ne sont pas configurés dans ce dépôt. `HYPOTHÈSE` : aucune CSP n'est en place en production, sauf si elle est posée par le serveur hôte.

**`VÉRIFIÉ_CODE` — Exposition de `window.API_BASE_URL` sans validation.** La variable est lue directement depuis l'objet global `window` sans aucune vérification de format ni d'origine (`js/app.js:2-3`). En l'état isolé (`index.html` sans script externe), la surface est nulle.

**`HYPOTHÈSE` — Risque de détournement par un script tiers.** Si `js/app.js` est chargé dans une page hôte où un script tiers peut définir ou écraser `window.API_BASE_URL` (paramètre URL lu en JS, contenu utilisateur injecté dans le DOM), les appels `fetch` seraient redirigés vers un serveur arbitraire. Ce risque dépend entièrement du contexte d'hébergement, opaque dans ce dépôt.

**`VÉRIFIÉ_CODE` — Aucun secret dans le dépôt.** Recherche `grep -niE "password|secret|token|api.?key|bearer" README.md index.html js/app.js` → 0 résultat. Le dépôt ne contient aucune valeur sensible en clair.

## Forces

- **`textContent` pour le rendu** : protection XSS par construction, sans bibliothèque de sanitisation (`js/app.js:13`).
- **Aucun secret dans le code** : aucune clé, token ou mot de passe en dur vérifiés sur l'ensemble des 3 fichiers.
- **Pas de `eval`, pas de `Function()`, `innerHTML` limité à la réinitialisation** : `list.innerHTML = ""` (`js/app.js:10`) est la seule occurrence — usage sûr (chaîne vide constante, aucun contenu externe). Le rendu de données API passe exclusivement par `textContent` (`js/app.js:13`), éliminant tout vecteur XSS à partir des données reçues.

## Dettes techniques

- **Absence de gestion d'erreur réseau** : une API injoignable laisse l'utilisateur face à une page vide sans explication (`js/app.js:5-7`). Un `try/catch` minimal avec affichage d'un message d'erreur est la correction minimale.
- **`response.ok` non contrôlé** : une réponse 4xx/5xx JSON est parsée et traitée comme valide (`js/app.js:6-7`).
- **Type de la réponse non vérifié avant `for...of`** : `Array.isArray(transfers)` manque avant la boucle (`js/app.js:11`).

## Zones critiques

- **`loadTransfers` (`js/app.js:5-16`)** : concentre les trois absences de garde (try/catch, response.ok, isArray). Une seule régression côté API peut provoquer une exception non interceptée et bloquer silencieusement l'affichage.
- **`window.API_BASE_URL` (`js/app.js:2-3`)** : point d'injection de configuration ; son exposition à des sources tierces dépend entièrement du contexte hôte non documenté.

## Risques

- **API injoignable → page vide silencieuse** : aucune indication à l'utilisateur ; diagnostiquable uniquement via la console développeur. Impact utilisateur : maximal (l'application n'a aucune autre fonctionnalité).
- **Interception réseau si fallback localhost atteint en production** : les données de transferts transiteraient en HTTP clair — risque conditionnel, dépend du déploiement.
- **Injection dans `window.API_BASE_URL` par un script tiers** : redirige les appels API vers un serveur malveillant — risque conditionnel, dépend du contexte hôte.

## Recommandations priorisées

1. **Ajouter `try/catch` + `response.ok` + `Array.isArray` dans `loadTransfers`** — Protège contre les trois scénarios d'erreur les plus courants et affiche un message utilisateur. Fichier : `js/app.js`. Priorité : haute (impact direct sur l'expérience en cas de défaillance API).
2. **Configurer une CSP via les en-têtes du serveur hôte** — La page n'ayant aucune ressource externe, une politique `default-src 'self'` suffit ; elle doit être posée côté serveur, pas dans ce dépôt. Priorité : moyenne.
3. **Documenter le mécanisme d'injection de `window.API_BASE_URL` en production** — Permet de valider que l'URL de prod est bien en HTTPS et que la variable ne peut pas être surchargée par un contenu tiers. Fichier : `README.md`. Priorité : moyenne.

## Questions ouvertes

- L'API `shift-pilot-resa-api` requiert-elle une authentification ? Si oui, comment ce front doit-il transmettre un jeton ?
- Le serveur hôte qui sert `index.html` pose-t-il des en-têtes CSP ou CORS ? Ces en-têtes sont `INCONNU` depuis ce dépôt.
- La page est-elle accessible publiquement ou dans un réseau interne restreint ? Le niveau de risque des vecteurs identifiés varie selon ce contexte.
