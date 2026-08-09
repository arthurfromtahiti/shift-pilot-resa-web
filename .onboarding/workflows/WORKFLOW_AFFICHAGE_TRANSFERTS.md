# WORKFLOW_AFFICHAGE_TRANSFERTS — Chargement et affichage de la liste des transferts disponibles

> **Réconciliation (SHIA-570).** Workflow confronté au code courant (`main` @ `acf9f61`). Confirmé et mis à jour : (a) portée réduite — reserve et cancelReservation sont désormais dans leurs propres fichiers (`WORKFLOW_RESERVER_TRANSFERT.md`, `WORKFLOW_ANNULER_RESERVATION.md`) ; (b) références de ligne recalées après SHIA-383 (ajout de `pendingTransfers` Set, lignes 7–8, a décalé tout le reste de +2). Aucun comportement de `loadTransfers()` n'a changé avec SHIA-383 ; la confirmation reste `VÉRIFIÉ_CODE`.

## Classification
- **Type** : `user_journey`
- **Sous-type** : chargement automatique d'une liste avec rendu conditionnel de boutons d'action
- **Visibilité** : `external_user`
- **Acteur principal** : utilisateur final (navigateur)
- **Acteurs** : navigateur (utilisateur), API distante `shift-pilot-resa-api`
- **Criticité** : Haute — fonctionnalité centrale de ce workspace ; aucun autre contenu affiché sans cette étape
- **Confiance** : high
- **Justification** : Les 4 fichiers versionnés du dépôt (`index.html`, `js/app.js`, `js/app.test.js`, `README.md`) ont été ouverts en entier. `loadTransfers()` est entièrement contenue dans `js/app.js` (lignes 10–42), sans branchement hors lecture. La confiance `high` reflète l'exhaustivité de la lecture sur un périmètre de 33 lignes.

## Objectif
Permettre à un utilisateur d'accéder, dès l'ouverture de la page, à la liste des transferts inter-îles disponibles — avec l'origine, la destination, le prix en XPF et le nombre de places restantes. Pour chaque transfert, afficher un bouton « Réserver » si des places sont disponibles et si aucune réservation n'est connue côté client pour ce transfert, ou un bouton « Annuler » si une réservation est connue côté client pour ce transfert. Ce workflow est également déclenché automatiquement après chaque réservation ou annulation réussie.

## Acteurs
- **Utilisateur final** : ouvre la page dans un navigateur ; aucune saisie ni clic requis pour déclencher ce workflow
- **API distante `shift-pilot-resa-api`** : récepteur du `fetch(\`${API_BASE_URL}/transfers\`)` (`js/app.js`, ligne 13) — le contrat de réponse (type et forme) est `INCONNU` depuis ce dépôt ; seul le chemin `/transfers` est visible dans le code

## Points d'entrée
- Chargement de `index.html` dans le navigateur (`<script type="module" src="js/app.js">`, `index.html` ligne 10)
- Événement `DOMContentLoaded` → déclenche `loadTransfers()` (`js/app.js`, ligne 89), conditionnel à la garde `if (typeof document !== "undefined")` (ligne 88)
- Appel explicite depuis `reserve()` après réservation réussie (`js/app.js`, ligne 59)
- Appel explicite depuis `cancelReservation()` après annulation réussie (`js/app.js`, ligne 80)

## Étapes principales
1. **Résolution de l'URL de base** : au chargement du module, `API_BASE_URL` est résolu une fois : `(typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` (`js/app.js`, lignes 2–3). La garde `typeof window` assure la compatibilité hors navigateur (environnement Node.js pour les tests). Aucune validation de l'URL n'est effectuée.
2. **Attente du DOM prêt** : sous la garde `if (typeof document !== "undefined")` (`js/app.js`, ligne 88), `document.addEventListener("DOMContentLoaded", loadTransfers)` (ligne 89) — `loadTransfers` ne s'exécute qu'une fois le DOM entièrement parsé.
3. **Appel HTTP GET vers l'API** : `fetch(\`${API_BASE_URL}/transfers\`)` (`js/app.js`, ligne 13) — requête GET sans en-tête d'authentification explicitement ajouté ni paramètre de filtre. Le code JS n'ajoute aucun header `Authorization` ou `Cookie` ; si le navigateur joint automatiquement des cookies de session, cela n'est pas visible depuis ce dépôt.
4. **Vérification du statut HTTP** : `if (!response.ok) { throw new Error(\`Erreur serveur : ${response.status}\`) }` (`js/app.js`, lignes 14–16) — tout statut non-2xx lève une erreur qui atterrit dans le catch.
5. **Désérialisation JSON** : `const transfers = await response.json()` (`js/app.js`, ligne 17) — la réponse est traitée comme du JSON sans validation de schéma.
6. **Vidage du conteneur** : `list.innerHTML = ""` (`js/app.js`, ligne 19) — la liste `<ul id="transfers-list">` est réinitialisée avant le rendu, évitant les doublons lors des rappels successifs.
7. **Rendu de chaque transfert avec boutons d'action** : boucle `for (const t of transfers)` (`js/app.js`, lignes 20–38) — pour chaque objet `t` :
   - Création d'un `<li>` avec le texte `` `${t.from} → ${t.to} — ${t.price} XPF (${t.seatsLeft} places)` `` (ligne 22)
   - `const reservationId = reservations.get(t.id)` (ligne 24) — consultation de la Map client
   - Si `reservationId` existe : bouton « Annuler » → appelle `cancelReservation(t.id, reservationId)` au clic (lignes 25–29)
   - Sinon si `t.seatsLeft > 0` : bouton « Réserver » → appelle `reserve(t.id)` au clic (lignes 30–34)
   - Ajout du `<li>` à `<ul id="transfers-list">` (ligne 37)
8. **Gestion des erreurs** : bloc `catch (err)` (`js/app.js`, lignes 39–41) — tout echec réseau ou JSON remplace le contenu du conteneur par `"Impossible de charger les transferts : ${err.message}"`.

## Règles métier
- **Affichage automatique au chargement** : `loadTransfers` est liée à `DOMContentLoaded` (`js/app.js`, ligne 89) — le chargement initial est déclenché sans interaction utilisateur.
- **Rafraîchissement après action** : `loadTransfers()` est rappelée par `reserve()` après réservation réussie (ligne 59) et par `cancelReservation()` après annulation réussie (ligne 80) — la liste reflète l'état à chaque action.
- **Le bouton affiché dépend de l'état client** : `const reservationId = reservations.get(t.id)` — si `reservationId` est truthy (valeur stockée par `reserve()` pour ce transfert), on affiche « Annuler » ; si `reservationId` est falsy et `t.seatsLeft > 0`, on affiche « Réserver » ; sinon, aucun bouton (`js/app.js`, lignes 24–35). Une valeur falsy stockée dans la Map (ex. `undefined`, `0`, `""`) serait traitée comme une absence de réservation.
- **L'unité monétaire est XPF** : codée en dur dans le template `` `${t.price} XPF` `` (`js/app.js`, ligne 22) — non configurable, non localisable.
- **Cinq champs requis** : `id`, `from`, `to`, `price`, `seatsLeft` — tous lus directement sur `t` sans validation ni valeur par défaut. Un champ `from`, `to` ou `price` absent produit la chaîne `"undefined"` dans le texte du `<li>` (visible mais incorrect). Un `seatsLeft` absent rend le test `t.seatsLeft > 0` faux : aucun bouton « Réserver » n'est affiché. Un `id` absent conduit à `reservations.get(undefined)` → `undefined` et à l'absence de tout bouton d'action. Dans les trois cas, aucune exception n'est levée.
- **Réinitialisation avant rendu** : `list.innerHTML = ""` (ligne 19) garantit qu'un second appel n'accumule pas les éléments.

## Données
- **`transfers`** (valeur JSON distante, itérée via `for...of` — type exact non attesté dans ce dépôt) : champs **consommés** : `id` (clé de la Map `reservations`), `from`, `to`, `price`, `seatsLeft` — `VÉRIFIÉ_CODE` (`js/app.js`, lignes 22, 24). La valeur est issue de `response.json()` (ligne 17) et traversée par `for (const t of transfers)` (ligne 20) ; le code prouve une itérabilité, pas nécessairement un tableau. La forme complète renvoyée par l'API est `INCONNU` : aucun schéma dans ce dépôt.
- **`reservations`** (Map client, module-scoped) : stocke les réservations **connues côté client** pour la session courante — clé : `transferId`, valeur : `reservationId` retourné par l'API lors de la réservation (`js/app.js`, ligne 6). La Map est vide à chaque rechargement de page : elle ne reflète pas l'état serveur, seulement ce que la session courante a réservé. Consultée en lecture seule dans ce workflow ; mutée par `reserve()` et `cancelReservation()`.
- **`API_BASE_URL`** (chaîne, module-scoped) : URL de base résolue au chargement du module (`js/app.js`, lignes 2–3). Le mécanisme d'injection en environnement de production est `INCONNU` (voir Questions ouvertes).
- **`transfers-list`** (élément DOM) : conteneur `<ul id="transfers-list">` (`index.html`, ligne 9) — cible de rendu et zone d'affichage des messages d'erreur.

## Intégrations
- **`shift-pilot-resa-api`** (API distante) :
  - `GET /transfers` (`js/app.js`, ligne 13) — chemin confirmé dans le code ; la réponse est traitée comme un tableau d'objets (`response.json()`, ligne 17) et les champs **consommés** sont : `id`, `from`, `to`, `price`, `seatsLeft`. La forme complète de la réponse (autres champs, types, schéma) est `INCONNUE` depuis ce dépôt.
  - Existence de l'API distante : confirmée via `README.md` (*« Consomme `shift-pilot-resa-api` (même projet, dépôt séparé) »*) et le commentaire de tête de `js/app.js` (ligne 1)

## Risques
- **Champs manquants ou mal typés** : un objet `transfer` incomplet (`id`, `from`, `to`, `price` ou `seatsLeft` absent) produit `undefined` dans le texte du `<li>` sans lever d'exception (`js/app.js`, lignes 22–24). Le champ `id` est critique : si `t.id` est absent, `reservations.get(undefined)` retourne `undefined` — le test `if (reservationId)` est faux et aucun bouton d'action n'est rendu pour ce transfert, sans message d'erreur visible.
- **`getElementById` non gardé** : si `<ul id="transfers-list">` est absent ou renommé dans `index.html`, `list` vaut `null` et `list.innerHTML = ""` (ligne 19) lève une `TypeError`. L'id est correct actuellement (`index.html` ligne 9), mais fragile à toute modification du HTML.
- **Affichage des erreurs invasif** : le bloc `catch` remplace **tout** le contenu du conteneur par le message d'erreur (ligne 40) — en cas d'erreur réseau après chargement initial, la liste complète disparaît.
- **État client non réconcilié au rechargement** : `reservations` (Map) est vide à chaque rechargement de page. Si l'API mémorise les réservations côté serveur, les boutons d'annulation n'apparaîtront pas après rechargement, jusqu'à un nouveau `loadTransfers()`. Cette incohérence est assumée (voir Questions ouvertes).

## Questions ouvertes
- **Forme réelle de la réponse `GET /transfers`** : quels champs l'API renvoie-t-elle au-delà de `id`, `from`, `to`, `price`, `seatsLeft` ? Y a-t-il des horaires, une compagnie, un statut ? Les types exacts (nombre vs chaîne pour `price`, `id`) ne sont pas visibles depuis ce dépôt.
- **Injection de `window.API_BASE_URL` en production** : le mécanisme existe (`js/app.js`, lignes 2–3) mais aucun fichier de configuration, de build ni de script d'injection n'est visible. Est-ce un `<script>` injecté côté serveur, une variable portée par le CDN, ou autre chose ?
- **Persistance des réservations après rechargement** : la Map client est réinitialisée à chaque rechargement. Si l'API mémorise les réservations, doit-on les réconcilier en interrogeant un endpoint « mes réservations » au chargement ? Aucun tel endpoint dans le code actuel.
- **Scalabilité de l'affichage** : la liste est rendue sans pagination ni limite de résultats. L'affichage est-il volontairement exhaustif ou une limite est-elle à prévoir ?

## Preuves
- `js/app.js` — ouvert en entier (90 lignes) :
  - `API_BASE_URL` (lignes 2–3)
  - `export const reservations = new Map()` (ligne 6)
  - `export async function loadTransfers()` (lignes 10–42) : `fetch`, `response.ok`, `response.json()`, `list.innerHTML = ""`, boucle, `reservations.get()`, création des boutons, `list.appendChild()`
  - garde `if (typeof document !== "undefined")` (ligne 88), `addEventListener("DOMContentLoaded", loadTransfers)` (ligne 89)
- `index.html` — ouvert en entier (12 lignes) : `<h1>Transferts</h1>` (ligne 8), `<ul id="transfers-list">` (ligne 9), `<script type="module" src="js/app.js">` (ligne 10)
- `js/app.test.js` — ouvert en entier (310 lignes) : tests d'affichage (lignes 45–65), test erreur non-2xx (lignes 67–78), test réseau injoignable (lignes 80–94), tests boutons Réserver/Annuler (lignes 98–148)
- `README.md` — ouvert en entier : stack *« HTML + JS natif, aucune dépendance, aucun build »*, mention de `shift-pilot-resa-api`
