# WORKFLOW_AFFICHER_TRANSFERTS — Afficher la liste des transferts inter-îles

## Classification
- **Type** : `user_journey`
- **Sous-type** : affichage de catalogue (consultation, lecture seule)
- **Visibilité** : `external_user`
- **Acteur principal** : utilisateur final (navigateur web)
- **Acteurs** : utilisateur final, navigateur, API distante `shift-pilot-resa-api`
- **Criticité** : Haute — c'est la seule fonction visible dans ce workspace ; sans elle, la page est vide et le dépôt n'a aucune raison d'être
- **Confiance** : medium
- **Justification** : Le code côté front est intégralement lu et vérifié (`js/app.js`, `index.html`) — 20 lignes, aucun trou. La confiance est plafonnée à `medium` car la forme réelle de la réponse de l'API (`shift-pilot-resa-api`) est `INCONNU` : on sait ce que le code *lit* (`t.from`, `t.to`, `t.price`, `t.availableSeats`), pas ce que l'API renvoie réellement ni si ces champs sont toujours présents.

## Objectif

Permettre à un utilisateur de consulter, depuis son navigateur, la liste des transferts inter-îles disponibles : trajet (origine → destination), prix en XPF et nombre de places disponibles. C'est un parcours de consultation pure — aucune action (réservation, filtre, tri) n'est disponible dans ce workspace en l'état. Le résultat dépend entièrement de ce que l'API distante renvoie au moment du chargement.

## Acteurs

- **Utilisateur final** : ouvre la page dans un navigateur ; ne saisit rien, n'interagit pas
- **Navigateur** : charge `index.html`, exécute `js/app.js`, émet la requête HTTP
- **`shift-pilot-resa-api`** : répond à `GET /transfers` avec la liste des transferts (contenu exact `INCONNU` dans ce workspace)

## Points d'entrée

- Chargement de `index.html` dans le navigateur (URL non spécifiée dans ce dépôt)
- Événement `DOMContentLoaded` → appel de `loadTransfers()` (`js/app.js:18-20`)

## Étapes principales

1. **Chargement de la page** : le navigateur parse `index.html` et affiche un titre `<h1>Transferts</h1>` et une liste vide `<ul id="transfers-list">` (`index.html:8-9`). La liste reste vide jusqu'à la fin du fetch.
2. **Déclenchement** : l'événement `DOMContentLoaded` déclenche `loadTransfers()` (`js/app.js:18-19`).
3. **Résolution de l'endpoint** : `API_BASE_URL` est évaluée — `window.API_BASE_URL` si défini, sinon `"http://localhost:3100"` (`js/app.js:2-3`). Ce comportement est détaillé dans `WORKFLOW_CONFIGURATION_ENDPOINT.md`.
4. **Appel réseau** : `fetch(\`${API_BASE_URL}/transfers\`)` — requête `GET` sans en-tête d'authentification ni timeout (`js/app.js:6`).
5. **Désérialisation** : `await response.json()` — la réponse brute est interprétée comme du JSON sans vérification du statut HTTP ni du type de la valeur désérialisée (`js/app.js:7`).
6. **Vidage de la liste** : `list.innerHTML = ""` efface tout contenu éventuel avant de remplir (`js/app.js:10`).
7. **Rendu des transferts** : pour chaque élément `t` du tableau `transfers`, un `<li>` est créé avec le texte `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)` et ajouté à `<ul id="transfers-list">` (`js/app.js:11-15`).

## Règles métier

- **Prix en XPF** : l'unité monétaire « XPF » est codée en dur dans le gabarit d'affichage (`js/app.js:13` : `` `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)` ``). Aucune conversion ni configuration d'unité n'existe.
- **Format fixe** : l'affichage est `origine → destination — prix XPF (N places)` — non paramétrable dans le code actuel.
- **Regénération complète** : la liste est entièrement vidée puis reconstruite à chaque appel (`list.innerHTML = ""` avant la boucle, `js/app.js:10`). Pas de mise à jour partielle ni de diff DOM.
- **Aucune interaction utilisateur** : aucun filtre, tri, pagination ni sélection n'est implémenté (`js/app.js` ne contient aucun `addEventListener` sur une action utilisateur au-delà de `DOMContentLoaded`).
- **Chargement unique** : `loadTransfers()` est appelée une seule fois à l'ouverture de la page ; pas de rechargement automatique ni de bouton « actualiser ».

## Données

- **`transfers`** (tableau) : reçu de l'API, désérialisé depuis JSON (`js/app.js:7`). Forme locale supposée : tableau d'objets ; contenu réel de l'API `INCONNU`.
- **`t.from`** : origine du transfert, affichée telle quelle (type `INCONNU` — probablement une chaîne de nom d'île) (`js/app.js:13`).
- **`t.to`** : destination du transfert, affichée telle quelle (`js/app.js:13`).
- **`t.price`** : prix en XPF, affiché tel quel sans formatage numérique (`js/app.js:13`).
- **`t.availableSeats`** : nombre de places disponibles, affiché tel quel (`js/app.js:13`).
- **`list`** : référence DOM à `<ul id="transfers-list">` (`index.html:9`, `js/app.js:9`).

Aucune donnée locale persistée (pas de `localStorage`, pas de cookie, pas de cache).

## Intégrations

- **`shift-pilot-resa-api`** — appel sortant : `GET ${API_BASE_URL}/transfers` (`js/app.js:6`). Sens : lecture seule. Aucune authentification, aucun en-tête personnalisé. Format de réponse attendu : JSON tableau (`js/app.js:7,11`). Contenu exact renvoyé par l'API : `INCONNU` dans ce workspace (aucun schéma ni mock ici).

## Risques

- **API injoignable** : `fetch()` est appelé dans une fonction `async` sans `try/catch` (`js/app.js:5-7`). Si l'API ne répond pas ou si la requête échoue (réseau, CORS, DNS), la promesse rejetée n'est pas interceptée → exception non gérée dans la console, page affiche la liste vide sans message d'erreur pour l'utilisateur.
- **Réponse non-tableau** : `response.json()` est suivi directement d'un `for...of transfers` sans vérification (`js/app.js:7,11`). Si l'API renvoie un objet, `null`, ou une erreur JSON, `for...of` lève une `TypeError` non interceptée → même symptôme que ci-dessus.
- **Statut HTTP non vérifié** : `response.ok` n'est jamais contrôlé (`js/app.js:6-7`). Une réponse `4xx`/`5xx` avec un corps JSON serait parsée et tentée d'affichage comme si elle était valide.
- **Champs manquants dans la réponse** : si l'API renvoie des transferts sans `from`, `to`, `price` ou `availableSeats`, les valeurs seraient `undefined` dans le texte affiché — liste visible mais illisible (ex : `undefined → undefined — undefined XPF (undefined places)`). Aucune validation de schéma.
- **Aucun état de chargement** : entre le `DOMContentLoaded` et la fin du `fetch`, la liste est vide et silencieuse — pas de spinner, pas de message « chargement… » (`js/app.js:5-16`).

## Questions ouvertes

- **Forme réelle de la ressource `transfer`** : quels champs l'API renvoie-t-elle exactement ? Y a-t-il un identifiant, des horaires, une compagnie ? La réponse est dans `shift-pilot-resa-api`, hors périmètre de ce workspace.
- **Disponibilité de la réservation** : `README.md` parle d'une *« interface de réservation »* ; aucun code de réservation n'existe ici. Est-ce une fonctionnalité prévue mais non encore implémentée, ou résidant uniquement dans `shift-pilot-resa-api` ?
- **URL de production de `index.html`** : comment cette page est-elle servie en production ? Aucune configuration de serveur, de déploiement ni de reverse-proxy dans ce dépôt.
- **Rafraîchissement des données** : la liste n'est chargée qu'une fois. Est-ce suffisant pour le cas d'usage cible (les disponibilités peuvent changer) ?

## Preuves

- `js/app.js` — intégralement lu (20 lignes)
- `index.html` — intégralement lu (12 lignes)
