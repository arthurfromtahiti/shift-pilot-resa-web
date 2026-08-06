# WORKFLOW_AFFICHAGE_TRANSFERTS — Affichage des transferts inter-îles avec réservation et annulation

## Classification
- **Type** : `user_journey`
- **Sous-type** : catalogue avec actions de réservation
- **Visibilité** : `external_user`
- **Acteur principal** : utilisateur final (navigateur)
- **Acteurs** : navigateur (utilisateur), API distante `shift-pilot-resa-api`
- **Criticité** : Haute — fonctionnalité centrale de ce workspace
- **Confiance** : high
- **Justification** : Les 3 fichiers versionnés du dépôt (`index.html`, `js/app.js`, `README.md`) ont été ouverts en entier. Le flux est entièrement contenu dans `js/app.js` (80 lignes) et `index.html` (12 lignes) — aucune partie du code n'est inaccessible, aucun branchement non lu. La confiance `high` reflète l'exhaustivité de la lecture sur un périmètre très petit.

## Objectif
Permettre à un utilisateur d'accéder, dès l'ouverture de la page, à la liste des transferts inter-îles disponibles — avec l'origine, la destination, le prix en XPF et le nombre de places restantes. Pour chaque transfert, afficher un bouton « Réserver » si des places sont disponibles et si l'utilisateur n'a pas déjà une réservation, ou un bouton « Annuler » si l'utilisateur a une réservation en cours. Toute action de réservation ou d'annulation déclenche un rafraîchissement automatique de la liste.

## Acteurs
- **Utilisateur final** : ouvre la page dans un navigateur ; aucune saisie ni clic requis
- **API distante `shift-pilot-resa-api`** : fournit les données de transferts via `GET /transfers`

## Points d'entrée
- Chargement de `index.html` dans le navigateur (`<script src="js/app.js">`, `index.html` ligne 10)
- Événement `DOMContentLoaded` → déclenche `loadTransfers()` (`js/app.js`, ligne 19), conditionnel à la garde `if (typeof document !== "undefined")` (ligne 18)

## Étapes principales
1. **Résolution de l'URL de base** : au chargement du script, `API_BASE_URL` est résolu : `(typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` (`js/app.js`, lignes 2–3) — la garde `typeof window` assure la compatibilité hors navigateur avant d'accéder à la propriété. Aucune validation de l'URL n'est effectuée.
2. **Attente du DOM prêt** : sous la garde `if (typeof document !== "undefined")` (`js/app.js`, ligne 75), `document.addEventListener("DOMContentLoaded", loadTransfers)` (ligne 76) — `loadTransfers` ne s'exécute qu'une fois le DOM entièrement parsé par le navigateur.
3. **Appel HTTP GET vers l'API** : `fetch(\`${API_BASE_URL}/transfers\`)` (`js/app.js`, ligne 11) — requête GET vers `/transfers`, sans en-tête d'authentification ni paramètre.
4. **Gestion des erreurs** : vérification de `response.ok` (`js/app.js`, ligne 12–13) et bloc `try/catch` (`js/app.js`, lignes 10–37) qui captent les erreurs réseau et mettent à jour le DOM avec un message d'erreur.
5. **Désérialisation JSON** : `await response.json()` (`js/app.js`, ligne 14) — la réponse est traitée comme du JSON.
6. **Vidage du conteneur** : `list.innerHTML = ""` (`js/app.js`, ligne 16) — la liste `<ul>` est réinitialisée avant le rendu, évitant les doublons si la fonction est rappelée.
7. **Rendu de chaque transfert avec boutons d'action** : boucle `for (const t of transfers)` (`js/app.js`, lignes 17–33) — pour chaque objet `t`, création d'un `<li>` avec le texte `` `${t.from} → ${t.to} — ${t.price} XPF (${t.seatsLeft} places)` `` (`js/app.js`, ligne 19). Puis :
   - Vérifier si l'utilisateur a déjà une réservation pour ce transfert via `reservations.get(t.id)` (`js/app.js`, ligne 21)
   - Si oui : ajouter un bouton « Annuler » qui appelle `cancelReservation(t.id, reservationId)` (`js/app.js`, lignes 22–27)
   - Sinon, si des places restent (`t.seatsLeft > 0`) : ajouter un bouton « Réserver » qui appelle `reserve(t.id)` (`js/app.js`, lignes 28–32)
   - Ajouter le `<li>` à `<ul id="transfers-list">` (`js/app.js`, ligne 34)

## Règles métier
- **Affichage automatique** : `loadTransfers` est liée à `DOMContentLoaded` (`js/app.js`, ligne 76) — l'appel initial est automatique.
- **Rafraîchissement après action** : après chaque réservation ou annulation, `loadTransfers()` est appelée pour redessiner la liste (`js/app.js`, lignes 53 et 72).
- **L'unité monétaire est XPF** : codée en dur dans le template de `item.textContent` (`js/app.js`, ligne 19) — non configurable, non localisable.
- **Cinq champs requis par l'affichage** : `id`, `from`, `to`, `price`, `seatsLeft` — tous lus directement sur l'objet `t` sans validation ni valeur par défaut. Un champ absent produit `undefined` affiché tel quel (pour les champs de texte) ou erreur (pour `id` dans `reservations.get(t.id)`).
- **État persistant client** : `reservations` est une `Map` (`js/app.js`, ligne 6) qui stocke les réservations actives de l'utilisateur (clé : `transferId`, valeur : `reservationId`) — utilisée pour afficher le bouton « Annuler » au lieu de « Réserver ».
- **Réinitialisation avant rendu** : `list.innerHTML = ""` (`js/app.js`, ligne 16) garantit qu'un second appel à `loadTransfers` n'accumule pas les éléments.
- **Gestion des erreurs uniforme** : tout appel réseau (GET, POST, DELETE) est entouré d'un `try/catch` (`js/app.js`) qui affiche un message d'erreur dans le conteneur `list`.

## Données
- **`transfers`** (tableau, ressource distante) : champs **consommés** : `id` (identifiant du transfert), `from` (origine), `to` (destination), `price` (prix), `seatsLeft` (places restantes) — `VÉRIFIÉ_CODE` pour l'usage de ces champs dans `js/app.js` (lignes 19–22). La forme complète renvoyée par l'API est `INCONNU` : aucun schéma d'API dans ce dépôt.
- **`reservations`** (Map client) : stocke les réservations de l'utilisateur — clé : `transferId` (chaîne ou nombre), valeur : `reservationId` (chaîne ou nombre renvoyée par l'API) (`js/app.js`, lignes 6, 52, 71). Utilisée pour afficher le bon bouton (« Annuler » si réservé, « Réserver » sinon).
- **`API_BASE_URL`** (chaîne) : URL de base résolue au chargement du script — `(typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` (`js/app.js`, lignes 2–3). Mécanisme d'injection en environnement non-local non visible dans ce dépôt.
- **`transfers-list`** (élément DOM) : conteneur `<ul id="transfers-list">` (`index.html`, ligne 9) — cible de rendu unique, et zone d'affichage des messages d'erreur.

## Intégrations
- **`shift-pilot-resa-api`** (API distante) :
  - `GET /transfers` (`js/app.js`, ligne 11) → tableau de transferts avec champs `id`, `from`, `to`, `price`, `seatsLeft`
  - `POST /transfers/{transferId}/reserve` (`js/app.js`, lignes 45–49) → réserve une place, body : `{ seats: 1 }`, réponse : `{ reservationId }` 
  - `DELETE /transfers/{transferId}/reservations/{reservationId}` (`js/app.js`, lignes 65–67) → annule une réservation existante, aucun body
  - Découverte via `README.md` (*« Consomme `shift-pilot-resa-api` (même projet, dépôt séparé) »*) et le commentaire de tête de `js/app.js` (ligne 1).

## Risques
- **Champs manquants ou mal typés** : un objet `transfer` incomplet (`id`, `from`, `to`, `price` ou `seatsLeft` absent) produit `undefined` affiché dans le `<li>` ou une erreur lors de l'accès à `reservations.get(t.id)` — pas de validation, pas de filtrage, pas de valeur par défaut (`js/app.js`, ligne 19–22). Le champ `id` est critique (utilisé comme clé du Map) ; son absence casse la gestion des réservations.
- **`getElementById` non gardé** : si `<ul id="transfers-list">` est absent ou renommé dans `index.html`, `list` vaut `null` et `list.innerHTML = ""` lève une `TypeError`. Risque théorique dans l'état actuel (l'id correspond — `index.html` ligne 9), mais fragile à toute modification du HTML.
- **État persistant non sécurisé** : `reservations` (Map client) est oubliée au rechargement de la page. Un utilisateur qui ferme l'onglet perd l'état de ses réservations, mais peut les retrouver via un nouveau `GET /transfers` si l'API les enregistre côté serveur. Inversion logique : il n'y a pas de session utilisateur ou d'authentification visible dans ce code — toute réservation est « anonyme » et liée uniquement à la session client.
- **Affichage des erreurs trop invasif** : tout message d'erreur (`fetch` rejeté, réponse non-ok, `JSON.parse` échoué) remplace tout le contenu du conteneur `list` avec un message texte. Si un transfert parmi 100 échoue à traiter, l'affichage complet s'efface.

## Questions ouvertes
- **Forme réelle de la réponse de `GET /transfers`** : quels champs l'API renvoie-t-elle exactement au-delà de `id`, `from`, `to`, `price`, `seatsLeft` ? Y a-t-il des horaires, une compagnie, un statut ? Les types de `price` (nombre ou chaîne ?) ne sont pas visibles depuis ce dépôt. Le champ `id` utilisé pour l'indexation des réservations doit être unique et stable.
- **Authentification et session utilisateur** : aucun token, aucun header d'authentification, aucune notion de session visible. Comment l'API établit-elle qu'une réservation appartient à « cet » utilisateur plutôt qu'à un autre ? Existe-t-il un authentification HTTP côté client (Basic Auth, Bearer, Cookie) ou côté API (IP, session serveur) ?
- **Injection de `window.API_BASE_URL` en production** : le mécanisme existe (`js/app.js`, lignes 2–3) mais aucun fichier de configuration, de build ni de script d'injection n'est visible dans ce dépôt. Est-ce un `<script>` injecté côté serveur, une variable portée par le CDN, ou autre chose ?
- **Scalabilité de l'affichage** : la liste est rendue sans pagination ni limite. `seatsLeft` laisse supposer un inventaire potentiellement large ; l'affichage est-il volontairement exhaustif ou en attente d'un filtre/pagination ?
- **Compatibilité Node.js / tests hors navigateur** : le code comporte deux gardes (`typeof window` ligne 3, `typeof document` ligne 75) — ce code est-il utilisé ou testé hors navigateur ?
- **Persistance des réservations après rechargement** : `reservations` (Map) est vide au rechargement de page. Si l'API maintient des réservations côté serveur (scénario probable), l'UI ne les affiche pas au rechargement. Doit-on réconcilier `reservations` avec l'état API après chaque `loadTransfers` ?

## Preuves
- `js/app.js` — ouvert en entier (80 lignes) : 
  - déclaration de `API_BASE_URL` (lignes 2–3)
  - export de `reservations` Map (ligne 6)
  - fonction `loadTransfers` (lignes 8–39) avec `try/catch`, vérification `response.ok`, affichage des boutons d'action
  - fonction `reserve` (lignes 42–57) avec `POST /transfers/{id}/reserve`
  - fonction `cancelReservation` (lignes 60–73) avec `DELETE /transfers/{id}/reservations/{id}`
  - `fetch`, `response.json()`, `getElementById`, `innerHTML = ""`, boucles, `item.textContent`
  - garde `if (typeof document !== "undefined")` (ligne 77), `addEventListener("DOMContentLoaded", loadTransfers)` (ligne 78)
- `index.html` — ouvert en entier (12 lignes) : `<h1>Transferts</h1>` (ligne 8), `<ul id="transfers-list">` (ligne 9), `<script src="js/app.js" type="module">` (ligne 10)
- `README.md` — ouvert en entier : stack *« HTML + JS natif, aucune dépendance, aucun build »*, mention de `shift-pilot-resa-api`
