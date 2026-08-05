# WORKFLOW_AFFICHAGE_TRANSFERTS — Affichage des transferts inter-îles au chargement de la page

## Classification
- **Type** : `user_journey`
- **Sous-type** : lecture / affichage de catalogue
- **Visibilité** : `external_user`
- **Acteur principal** : utilisateur final (navigateur)
- **Acteurs** : navigateur (utilisateur), API distante `shift-pilot-resa-api`
- **Criticité** : Haute — c'est l'**unique fonctionnalité** de ce workspace ; sans elle, la page est vide et sans intérêt
- **Confiance** : high
- **Justification** : Les 3 fichiers versionnés du dépôt (`index.html`, `js/app.js`, `README.md`) ont été ouverts en entier. Le flux est entièrement contenu dans `js/app.js` (20 lignes) et `index.html` (12 lignes) — aucune partie du code n'est inaccessible, aucun branchement non lu. La confiance `high` reflète l'exhaustivité de la lecture sur un périmètre très petit.

## Objectif
Permettre à un utilisateur d'accéder, dès l'ouverture de la page, à la liste des transferts inter-îles disponibles — avec l'origine, la destination, le prix en XPF et le nombre de places restantes. Aucune interaction n'est requise : l'affichage est automatique au chargement. C'est la seule fonctionnalité réalisée dans ce workspace ; toute la logique métier (disponibilité, tarification) vit dans `shift-pilot-resa-api`.

## Acteurs
- **Utilisateur final** : ouvre la page dans un navigateur ; aucune saisie ni clic requis
- **API distante `shift-pilot-resa-api`** : fournit les données de transferts via `GET /transfers`

## Points d'entrée
- Chargement de `index.html` dans le navigateur (`<script src="js/app.js">`, `index.html` ligne 10)
- Événement `DOMContentLoaded` → déclenche `loadTransfers()` (`js/app.js`, ligne 19), conditionnel à la garde `if (typeof document !== "undefined")` (ligne 18)

## Étapes principales
1. **Résolution de l'URL de base** : au chargement du script, `API_BASE_URL` est résolu : `(typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` (`js/app.js`, lignes 2–3) — la garde `typeof window` assure la compatibilité hors navigateur avant d'accéder à la propriété. Aucune validation de l'URL n'est effectuée.
2. **Attente du DOM prêt** : sous la garde `if (typeof document !== "undefined")` (`js/app.js`, ligne 18), `document.addEventListener("DOMContentLoaded", loadTransfers)` (ligne 19) — `loadTransfers` ne s'exécute qu'une fois le DOM entièrement parsé par le navigateur.
3. **Appel HTTP GET vers l'API** : `fetch(\`${API_BASE_URL}/transfers\`)` (`js/app.js`, ligne 6) — requête GET vers `/transfers`, sans en-tête d'authentification ni paramètre.
4. **Désérialisation JSON** : `await response.json()` (`js/app.js`, ligne 7) — la réponse est traitée comme du JSON sans vérification de `response.ok`.
5. **Vidage du conteneur** : `list.innerHTML = ""` (`js/app.js`, ligne 10) — la liste `<ul>` est réinitialisée avant le rendu, évitant les doublons si la fonction est rappelée.
6. **Rendu de chaque transfert** : boucle `for (const t of transfers)` (`js/app.js`, lignes 11–15) — pour chaque objet `t`, création d'un `<li>` avec le texte `` `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)` `` et insertion dans `<ul id="transfers-list">`.

## Règles métier
- **Affichage automatique et sans interaction** : `loadTransfers` est liée à `DOMContentLoaded` (`js/app.js`, ligne 19) — pas de bouton, pas de formulaire, pas d'action utilisateur requise.
- **L'unité monétaire est XPF** : codée en dur dans le template de `item.textContent` (`js/app.js`, ligne 13) — non configurable, non localisable.
- **Quatre champs requis par l'affichage** : `from`, `to`, `price`, `availableSeats` — tous lus directement sur l'objet `t` sans validation ni valeur par défaut (`js/app.js`, ligne 13). Un champ absent produit `undefined` affiché tel quel.
- **Réinitialisation avant rendu** : `list.innerHTML = ""` (`js/app.js`, ligne 10) garantit qu'un second appel à `loadTransfers` n'accumule pas les éléments.

## Données
- **`transfers`** (tableau, ressource distante) : champs **consommés** : `from` (origine), `to` (destination), `price` (prix), `availableSeats` (places disponibles) — `VÉRIFIÉ_CODE` pour l'usage de ces champs dans `js/app.js`. La forme complète renvoyée par l'API (présence d'un identifiant, champs additionnels, types exacts) est `INCONNU` : aucun schéma d'API dans ce dépôt.
- **`API_BASE_URL`** (chaîne) : URL de base résolue au chargement du script — `(typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` (`js/app.js`, lignes 2–3). Mécanisme d'injection en environnement non-local non visible dans ce dépôt.
- **`transfers-list`** (élément DOM) : conteneur `<ul id="transfers-list">` (`index.html`, ligne 9) — cible de rendu unique.

## Intégrations
- **`shift-pilot-resa-api`** (API distante, lecture seule) : `GET /transfers` → tableau de transferts. Découverte via `README.md` (*« Consomme `shift-pilot-resa-api` (même projet, dépôt séparé) »*) et le commentaire de tête de `js/app.js` (ligne 1).

## Risques
- **API injoignable ou erreur HTTP non gérée** : `fetch(...)` sans `try/catch` ni vérification de `response.ok` (`js/app.js`, lignes 6–7). En cas d'erreur réseau ou de réponse 4xx/5xx, `response.json()` peut rejeter ou produire une structure non itérable, et la boucle `for...of` lève une `TypeError` non capturée. Impact : page blanche sans message d'erreur utilisateur.
- **Réponse non-tableau** : si l'API renvoie un objet, `null` ou une structure non itérable à la place d'un tableau, la boucle `for (const t of transfers)` lève une `TypeError` non gérée (`js/app.js`, ligne 11).
- **Champs `undefined` silencieux** : un objet `transfer` incomplet (`from`, `to`, `price` ou `availableSeats` absent) produit `undefined` affiché dans le `<li>` — pas de validation, pas de filtrage, pas de valeur par défaut (`js/app.js`, ligne 13).
- **`getElementById` non gardé** : si `<ul id="transfers-list">` est absent ou renommé dans `index.html`, `list` vaut `null` et `list.innerHTML = ""` lève une `TypeError`. Risque théorique dans l'état actuel (l'id correspond — `index.html` ligne 9), mais fragile à toute modification du HTML.

## Questions ouvertes
- **Forme réelle de la réponse de `GET /transfers`** : quels champs l'API renvoie-t-elle exactement ? Y a-t-il un identifiant, des horaires, une compagnie, un statut ? Les types de `price` (nombre ou chaîne ?) et `availableSeats` (0 = complet ?) ne sont pas visibles depuis ce dépôt.
- **Injection de `window.API_BASE_URL` en production** : le mécanisme existe (`js/app.js`, lignes 2–3) mais aucun fichier de configuration, de build ni de script d'injection n'est visible dans ce dépôt. Est-ce un `<script>` injecté côté serveur, une variable portée par le CDN, ou autre chose ?
- **Rafraîchissement de la liste** : `list.innerHTML = ""` suggère que `loadTransfers` peut être rappelée, mais aucun déclencheur de rafraîchissement (bouton, polling, WebSocket) n'existe dans le code. Est-ce un reliquat de développement ou l'amorce d'une fonctionnalité à venir ?
- **Scalabilité de l'affichage** : la liste est rendue sans pagination ni limite. `availableSeats` laisse supposer un inventaire potentiellement large ; l'affichage est-il volontairement exhaustif ou en attente d'un filtre ?
- **Compatibilité Node.js / tests hors navigateur** : le code comporte deux gardes (`typeof window` ligne 3, `typeof document` ligne 18) — ce code est-il utilisé ou testé hors navigateur ?

## Preuves
- `js/app.js` — ouvert en entier (20 lignes) : déclaration de `API_BASE_URL` (lignes 2–3), fonction `loadTransfers` (lignes 5–16), `fetch` (ligne 6), `response.json()` (ligne 7), `getElementById` (ligne 9), `innerHTML = ""` (ligne 10), boucle `for...of` (lignes 11–15), `item.textContent` (ligne 13), garde `if (typeof document !== "undefined")` (ligne 18), `addEventListener("DOMContentLoaded", loadTransfers)` (ligne 19)
- `index.html` — ouvert en entier (12 lignes) : `<h1>Transferts</h1>` (ligne 8), `<ul id="transfers-list">` (ligne 9), `<script src="js/app.js">` (ligne 10)
- `README.md` — ouvert en entier (8 lignes) : *« Consomme `shift-pilot-resa-api` (même projet, dépôt séparé) »*, stack *« HTML + JS natif, aucune dépendance, aucun build »*
