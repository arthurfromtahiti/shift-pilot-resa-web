# Relecture — CARTE_DES_DOMAINES.md

## Verdict global

**Bon** — La carte corrigée est exploitable. Les deux domaines sont réels, distincts et prouvés ; la granularité réduite est explicitement justifiée ; aucun oubli fonctionnel ou domaine technique plaqué n'a été trouvé.

## Contrôles et preuves

### 1. Domaines réels et preuves

- `consultation-transferts` est prouvé par `index.html:8-10`, puis `js/app.js:10-42` (chargement/rendu), `:44-65` (réservation) et `:67-86` (annulation). Les états `reservations` et `pendingTransfers` sont déclarés en `js/app.js:6-8`.
- `integration-api` est prouvé par `js/app.js:2-3` (`API_BASE_URL`), `:13` (GET), `:49-53` (POST) et `:72-75` (DELETE), avec désérialisation et contrôle `response.ok` aux lignes citées par la carte.
- `js/app.test.js` contient 13 tests couvrant affichage, erreurs HTTP/réseau, réservation, annulation et anti-double-clic ; `npm test` passe avec 13/13.

Les fixtures de test confirment les hypothèses du front, pas le contrat de l'API vivante ; la carte conserve correctement cette limite dans ses Incertitudes.

### 2. Indices de rattachement

Les indices annoncés (`transfers-list`, `loadTransfers`, `reserve`, `cancelReservation`, `pendingTransfers`, `API_BASE_URL`, `fetch`, routes `/transfers`) matchent les fichiers et ne sur-capturent pas le dépôt, qui ne contient que `README.md`, `index.html`, `js/app.js`, `js/app.test.js` côté code utile.

### 3. Granularité, cœur et omissions

Deux domaines sont justifiés malgré le repère 4–12 : le dépôt est un petit front pilote et inventer des domaines pour atteindre le seuil serait infondé. Le métier est correctement en cœur ; l'intégration API est correctement séparée en support technique. La suite de tests n'est pas transformée en domaine.

Les recherches dans le dépôt ne révèlent aucun domaine auth, persistance, routage, job, ORM ou migration. Aucun pan fonctionnel non couvert n'a été trouvé.

### 4. Dépend de la base et confiance

`Dépend de la base : non` est honnête pour les deux domaines : aucun accès base/ORM/migration et simple parcours d'un tableau JSON côté front. La confiance globale `medium` et les confiances de domaines `high` sont accompagnées de réserves explicites sur le contrat serveur, l'authentification et la réconciliation après rechargement.

### 5. Traçabilité de la réconciliation

Le défaut précédemment bloquant est corrigé : `CARTE_DES_DOMAINES.md`, `CARTOGRAPHIE_CODE.md`, `.onboarding/INDEX.md` et les artefacts aval utilisent maintenant le même identifiant canonique `consultation-transferts`. La carte n'affirme plus de renommage incohérent.

## Corrections demandées

Aucune.
