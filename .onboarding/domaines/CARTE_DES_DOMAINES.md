# Carte des domaines — shift-pilot-resa-web

> **Confiance globale : medium.** Le matériau est **pauvre mais intégralement lu** : le dépôt ne contient que trois fichiers versionnés (`README.md`, `index.html`, `js/app.js`), tous ouverts en entier. La confiance est plafonnée non par une lecture partielle, mais par la petite taille du périmètre : c'est un **pilote de test** (`git log` : un seul commit `init: pilote de test SHIFT/Paperclip`), pas une application mature.
>
> **Écart assumé au gabarit (4–12 domaines).** Ce dépôt ne porte, avec preuve concrète, que **2 domaines**. La règle de la compétence prime sur le seuil numérique : *« Preuves pauvres → moins de domaines en confiance basse, jamais une carte inventée. »* Inventer un troisième domaine pour atteindre 4 serait une carte fausse. Ce qui manque est consigné en **Incertitudes**.

## Nature du projet

Interface web **cliente** de consultation et réservation de transferts inter-îles, sans build ni dépendance (`README.md` : *« HTML + JS natif, aucune dépendance, aucun build »*). Le dépôt contient de la **logique métier** (réservation et annulation de transferts) et un **état client** (Map `reservations` stockant les réservations de l'utilisateur) : c'est un front qui interroge une API distante (`shift-pilot-resa-api`, dépôt séparé du même projet) et gère les interactions de l'utilisateur. Le contexte est la Polynésie française : les prix sont libellés en **XPF** (`js/app.js`, ligne 20) et les trajets sont des liaisons `from → to` avec un nombre de places (`seatsLeft`).

Le `README.md` parle d'une *« interface de réservation »*, et cette fonctionnalité **est implémentée** dans le code : les fonctions `reserve()` et `cancelReservation()` sont exportées depuis `js/app.js` (lignes 44–65 et 67–86 respectivement). L'utilisateur peut réserver une place (clic sur bouton « Réserver ») ou annuler une réservation existante (clic sur bouton « Annuler »). L'état des réservations est stocké dans une `Map` client (`js/app.js`, ligne 6) qui persiste pendant la session.

### Consultation et réservation de transferts (`transferts-reservation`)
- **Catégorie** : métier
- **Priorité** : cœur
- **Confiance** : high
- **Description** : Récupère la liste des transferts inter-îles depuis l'API, les affiche à l'utilisateur avec origine, destination, prix (XPF) et places disponibles, et offre deux actions — réserver une place (si places dispo) ou annuler une réservation existante. L'UI affiche le bouton « Réserver » ou « Annuler » selon l'état de réservation de l'utilisateur, stocké dans une `Map` client.
- **Entités** : aucune entité **locale** (pas de modèle, pas de table persistent dans ce dépôt). Ressource distante consommée : un `transfer` avec les champs `id`, `from`, `to`, `price`, `seatsLeft` — inférés des propriétés lues dans `js/app.js`. `VÉRIFIÉ_CODE` pour l'usage de ces champs (lignes 20, 22) ; la forme réelle renvoyée par l'API est `INCONNU` pour les champs non affichés (horaires, compagnie, etc.).
- **Routes / points d'entrée** : page unique `index.html` (`<h1>Transferts</h1>`, `<ul id="transfers-list">`) ; fonction `loadTransfers()` déclenchée sur `DOMContentLoaded` (`js/app.js` ligne 78) et après chaque réservation/annulation ; fonctions `reserve(transferId)` et `cancelReservation(transferId, reservationId)` déclenchées par clics sur boutons ; consomme `GET /transfers`, `POST /transfers/{id}/reserve`, `DELETE /transfers/{id}/reservations/{id}`.
- **Indices de rattachement** : `transfers-list`, `loadTransfers`, `reserve`, `cancelReservation`, `reservations` Map, `/transfers`, `/reserve`, `/reservations`, chemins `js/app.js` et `index.html`, champs `id`/`from`/`to`/`price`/`seatsLeft`, unité `XPF`.
- **Types de workflows attendus** : chargement et rendu d'une liste de transferts au chargement (« afficher les transferts disponibles »), clic sur « Réserver » → appel API → stockage de `reservationId` en client → rafraîchissement (« réserver une place »), clic sur « Annuler » → appel API de suppression → suppression de l'état client → rafraîchissement (« annuler une réservation »). Pas de filtre, tri, pagination, ou détail dans le code.
- **Preuves** : `js/app.js` (export `reservations` ligne 6, `pendingTransfers` ligne 8, `loadTransfers` lignes 10–42, `reserve` lignes 44–65, `cancelReservation` lignes 67–86, boucle rendant les boutons lignes 20–38), `index.html` (`<ul id="transfers-list">`, `<script type="module" src="js/app.js">`).
- **Dépend de la base** : non — front statique, aucun accès base, aucun décodage de structure arborescente (la boucle parcourt un tableau plat).

### Intégration à l'API de réservation (`integration-api`)
- **Catégorie** : intégration
- **Priorité** : support
- **Confiance** : high
- **Description** : Couche technique qui relie le front à `shift-pilot-resa-api` : résolution de l'URL de base et appel HTTP. Tout le dépôt est un client mince au-dessus de cette API ; ce domaine isole le point de couplage entre les deux dépôts du projet.
- **Entités** : sans objet (couche technique, pas d'entité).
- **Routes / points d'entrée** : configuration `API_BASE_URL` (`js/app.js` : `window.API_BASE_URL || "http://localhost:3100"`) ; appel `fetch(\`${API_BASE_URL}/transfers\`)`.
- **Indices de rattachement** : `API_BASE_URL`, `window.API_BASE_URL`, `fetch(`, `http://localhost:3100`, mention `shift-pilot-resa-api` dans `README.md` et le commentaire de tête de `js/app.js`.
- **Types de workflows attendus** : configuration de l'endpoint selon l'environnement (fallback local `:3100`, surcharge par `window.API_BASE_URL`), appel réseau et désérialisation JSON. Aucune gestion d'erreur réseau, d'authentification ni de retry dans le code actuel (voir Incertitudes).
- **Preuves** : `js/app.js` (déclaration `const API_BASE_URL`, `fetch(...)`, `response.json()`), `README.md` (*« Consomme `shift-pilot-resa-api` (même projet, dépôt séparé) »*).
- **Dépend de la base** : non.

## Incertitudes

- **Forme réelle de la ressource `transfer` non observée.** Les champs `id`/`from`/`to`/`price`/`seatsLeft` sont ceux que le code *lit* (`VÉRIFIÉ_CODE`), pas nécessairement tout ce que l'API renvoie (horaires, compagnie, numéro de vol… ?). La forme exacte relève de la cartographie de `shift-pilot-resa-api` ou d'un appel en lecture à l'API — non disponible ici. Le champ `id` est supposé exister, être unique et stable ; son absence ou mutation casse la logique de réservation.
- **Format et durée de vie de `reservationId`.** La réponse POST `/transfers/{id}/reserve` renvoie un objet contenant `reservationId` (parsé ligne 53), utilisé pour annuler (ligne 71). Son type, sa format (UUID, chaîne, nombre ?), et sa durée de vie (session ? permanent ?) sont `INCONNU`. Est-il lié à l'utilisateur (authentification) ou à la session client ?
- **Authentification et session utilisateur.** Aucune notion de session ou d'authentification visible dans le code — consommation anonyme de l'API. Comment l'API établit-elle qu'une réservation appartient à « cet » utilisateur ? Mécanisme `INCONNU` : IP, cookie, bearer token absent du code, ou logique côté API qui associe réservations à IP ou à session HTTP ?
- **Réconciliation après rechargement.** `reservations` (Map client) est vide au rechargement de page. Si l'API maintient les réservations côté serveur, l'UI ne les affichera pas au rechargement, jusqu'à un clic qui retrigger `loadTransfers()`. Doit-on interroger un endpoint de « mes réservations » au chargement pour réconcilier ?
- **Projet à deux dépôts.** Ce workspace (`shift-pilot-resa-web`) est explicitement lié à `shift-pilot-resa-api`. Une **synthèse transverse dans `ECOSYSTEME.md`** sera pertinente une fois les deux dépôts cartographiés ; hors de ce périmètre.
- **Détection de contenu piloté par la base : négative et non confirmable par schéma.** Aucun accès base, aucun ORM, aucun code de migration. Verdict : **non** — pas de base de données visible dans ce dépôt.
