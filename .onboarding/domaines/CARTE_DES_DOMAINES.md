# Carte des domaines — shift-pilot-resa-web

> **Confiance globale : medium.** Le matériau est **pauvre mais intégralement lu** : le dépôt ne contient que trois fichiers versionnés (`README.md`, `index.html`, `js/app.js`), tous ouverts en entier. La confiance est plafonnée non par une lecture partielle, mais par la petite taille du périmètre : c'est un **pilote de test** (`git log` : un seul commit `init: pilote de test SHIFT/Paperclip`), pas une application mature.
>
> **Écart assumé au gabarit (4–12 domaines).** Ce dépôt ne porte, avec preuve concrète, que **2 domaines**. La règle de la compétence prime sur le seuil numérique : *« Preuves pauvres → moins de domaines en confiance basse, jamais une carte inventée. »* Inventer un troisième domaine pour atteindre 4 serait une carte fausse. Ce qui manque est consigné en **Incertitudes**.

## Nature du projet

Interface web **cliente** de consultation de transferts inter-îles, sans build ni dépendance (`README.md` : *« HTML + JS natif, aucune dépendance, aucun build »*). Le dépôt ne contient **aucune logique métier propre ni persistance** : c'est un front mince qui interroge une API distante (`shift-pilot-resa-api`, dépôt séparé du même projet) et affiche le résultat. Le contexte est la Polynésie française : les prix sont libellés en **XPF** (`js/app.js`, ligne d'affichage) et les trajets sont des liaisons `from → to` avec un nombre de places (`availableSeats`).

Bien que le `README.md` parle d'une *« interface de réservation »*, **aucun code de réservation** n'existe dans ce workspace (recherche `grep -niE "reserv|booking|panier|cart|book|order|commande"` sur `js/`+`html` → aucun résultat). En l'état, ce dépôt ne fait que **consulter et afficher** ; la réservation, si elle existe, vit ailleurs (voir Incertitudes).

## Domaines

### Consultation des transferts (`consultation-transferts`)
- **Catégorie** : métier
- **Priorité** : cœur
- **Confiance** : medium
- **Description** : Récupère la liste des transferts inter-îles depuis l'API et l'affiche à l'utilisateur — origine, destination, prix (XPF) et places disponibles. C'est la seule fonction métier réellement implémentée dans ce workspace : sans elle, la page n'a pas de raison d'être.
- **Entités** : aucune entité **locale** (pas de modèle, pas de table dans ce dépôt). Ressource distante consommée : un `transfer` avec les champs `from`, `to`, `price`, `availableSeats` — inférés des propriétés lues dans `js/app.js` (`t.from`, `t.to`, `t.price`, `t.availableSeats`). `VÉRIFIÉ_CODE` pour l'usage de ces champs ; la forme réelle renvoyée par l'API est `INCONNU` (aucun appel exécuté, aucun schéma d'API dans ce dépôt).
- **Routes / points d'entrée** : page unique `index.html` (`<h1>Transferts</h1>`, `<ul id="transfers-list">`) ; fonction `loadTransfers()` déclenchée sur `DOMContentLoaded` (`js/app.js`) ; consomme `GET ${API_BASE_URL}/transfers`.
- **Indices de rattachement** : `transfers-list`, `loadTransfers`, `/transfers`, chemins `js/app.js` et `index.html`, champs `from`/`to`/`price`/`availableSeats`, unité `XPF`.
- **Types de workflows attendus** : chargement et rendu d'une liste de transferts au chargement de page (workflow « afficher les transferts disponibles »). Pas de filtre, de tri, de pagination ni de détail dans le code actuel.
- **Preuves** : `js/app.js` (`loadTransfers`, boucle `for (const t of transfers)`, construction du `<li>`), `index.html` (`<ul id="transfers-list">`, `<script src="js/app.js">`).
- **Dépend de la base** : non — front statique, aucun accès base, aucun décodage de structure arborescente à l'exécution (la boucle de `app.js` parcourt un tableau plat, pas une structure imbriquée récursive → aucun des trois signaux du §6 de la compétence).

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

- **Domaine « Réservation » : revendiqué par le README, absent du code.** `README.md` annonce une *« interface de réservation »* et l'API expose `availableSeats`, mais aucun code de réservation n'existe dans ce workspace (recherche explicite sur `reserv|booking|panier|cart|book|order|commande` → 0 résultat). Hypothèse (`HYPOTHÈSE`, à confirmer par le board / la cartographie de `shift-pilot-resa-api`) : la logique de réservation vit dans le dépôt API, ce front n'en étant pour l'instant que la vue « catalogue ». **Ne pas créer de domaine Réservation ici** tant qu'aucune preuve n'existe dans ce dépôt.
- **Forme réelle de la ressource `transfer` non observée.** Les champs `from`/`to`/`price`/`availableSeats` sont ceux que le code *lit* (`VÉRIFIÉ_CODE`), pas nécessairement tout ce que l'API renvoie (identifiant, horaires, compagnie… ?). La forme exacte relève de la cartographie de `shift-pilot-resa-api` ou d'un accès API en lecture — non disponible ici.
- **Robustesse non traitée dans ce dépôt.** Aucune gestion d'erreur si l'API est injoignable ou renvoie autre chose qu'un tableau JSON (`response.json()` puis `for...of` sans garde) ; aucune authentification. À noter pour l'audit, pas un domaine.
- **Projet à deux dépôts.** Ce workspace (`shift-pilot-resa-web`) est explicitement lié à `shift-pilot-resa-api` (`README.md`, ticket ancêtre CLA-253 *« deux dépôts liés »*). Une **synthèse transverse `ECOSYSTEME.md`** sera pertinente une fois les deux dépôts cartographiés ; hors de mon périmètre (scopé à ce seul workspace).
- **Détection de contenu piloté par la base : négative et non confirmable par schéma.** Aucun signal (schéma / entité étendue / code exécutable) dans ce dépôt statique ; le signal schéma n'a de toute façon pas pu être testé (aucun accès base fourni à cette étape). Verdict retenu : **non** pour les deux domaines.
