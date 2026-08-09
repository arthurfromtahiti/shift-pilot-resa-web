# ECOSYSTEME — Shift Pilot Resa (API + Web)

> **Confiance** : medium

---

## Workspaces couverts

- **shift-pilot-resa-api** — Service HTTP backend, Node.js natif sans framework. Expose des endpoints (`/transfers`, POST `/transfers/:id/reserve`, DELETE `/transfers/:id/reservations/:reservationId`). Comportement interne, validation, persistance, structure de données, codes d'erreur : **non observable depuis ce dépôt**.
- **shift-pilot-resa-web** — Interface web statique HTML/JS, aucune dépendance. Affiche le catalogue de transferts en interrogeant l'API ; implémente la **réservation et l'annulation d'une place par clic** (SHIA-354) via boutons intégrés à la liste de transferts.

---

## Dépendances entre workspaces

### Web → API (consommation)

**Endpoint 1 : GET /transfers (consultation catalogue)**
- **Consumé par** : `shift-pilot-resa-web/js/app.js`, fonction `loadTransfers()` (lignes 10–42)
- **Contrat observable côté client** :
  - Requête : GET sur `${API_BASE_URL}/transfers` (résolu depuis `window.API_BASE_URL`, fallback `http://localhost:3100`, lignes 2–3)
  - Réponse acceptée : statut 2xx avec tableau JSON deserializable
  - Champs lus par le frontend : `id`, `from`, `to`, `price`, `seatsLeft` (lignes 22–24, 30)
  - Champs optionnels ou non vérifiés : API peut exposer d'autres champs que le frontend ignore
  - Cardinalité du tableau : **non contrainte dans ce dépôt** (frontend itère sur toute valeur itérable)
- **Usage** : rendu DOM pour chaque transfert (`<li>Papeete → Moorea — 3500 XPF (X places)</li>`)

**Endpoint 2 : POST /transfers/:id/reserve (réservation)**
- **Consumé par** : `shift-pilot-resa-web/js/app.js`, fonction `reserve()` (SHIA-354)
- **Contrat observable côté client** :
  - Requête : POST sur `${API_BASE_URL}/transfers/{id}/reserve` avec body JSON `{ seats: 1 }` (lignes 49–52)
  - Réponse acceptée : statut 2xx ; le client extrait le champ `reservationId` de la réponse JSON (ligne 57, utilisé pour l'annulation ligne 58)
  - Structure de la réponse POST (présence/contenu du champ `reservationId`, autres champs), codes d'erreur HTTP, validation côté API de `seats`, décrément de `seatsLeft`, persistance : **non observable depuis ce dépôt**
- **Implémentation frontend** : `shift-pilot-resa-web/js/app.js:44–65` — bouton « Réserver » déclenche appel POST ; protection anti double-clic (SHIA-383, vérification ligne 45) ; rafraîchissement automatique de la liste après succès (ligne 59)
- **État de maturité** : Frontend implémenté et testé (13 tests automatisés, `js/app.test.js`, SHIA-354). Comportement API non observable depuis ce dépôt.

**Endpoint 3 : DELETE /transfers/:id/reservations/:reservationId (annulation)**
- **Consumé par** : `shift-pilot-resa-web/js/app.js`, fonction `cancelReservation()` (SHIA-354)
- **Contrat observable côté client** :
  - Requête : DELETE sur `${API_BASE_URL}/transfers/{id}/reservations/{reservationId}`
  - Réponse acceptée : tout statut HTTP 2xx (le client n'examine pas le corps de réponse, lignes 76–77)
  - Structure de la réponse, codes d'erreur HTTP, validation côté API du `reservationId`, réaugmentation de `seatsLeft`, persistance : **non observable depuis ce dépôt**
- **Implémentation frontend** : `shift-pilot-resa-web/js/app.js:67–86` — bouton « Annuler » déclenche appel DELETE ; protection anti double-clic (SHIA-383) ; rafraîchissement automatique de la liste après succès
- **État de maturité** : Frontend implémenté et testé (13 tests automatisés, SHIA-354). Comportement API (validation, persistance, codes d'erreur) non observable depuis ce dépôt.

---

## Flux transverses (articulation métier)

### Flux 1 : Affichage du catalogue (parcours voyageur)

**Séquence** :
1. Voyageur ouvre la page web (`index.html`)
2. Frontend (`js/app.js`) émet GET /transfers
3. API retourne réponse HTTP 2xx avec JSON ; structure et cardinalité du tableau : **non observables depuis ce dépôt** — le frontend itère sur toute valeur itérable reçue
4. Frontend rendu catalogue dans la `<ul id="transfers-list">`
5. Voyageur voit liste de transferts, prix, places libres

**Points clés** :
- Découplage complet : API ne connaît pas le frontend, frontend ignore les détails internes de l'API
- Contrat API-client exprimé implicitement dans le code (`js/app.js:13` accède aux champs attendus `id`, `from`, `to`, `price`, `seatsLeft`)
- Dépendance réseau critique : si API injoignable → message d'erreur affiché à l'utilisateur (SHIA-348)

**Données partagées — Contrat observé côté client** :

Le frontend lit et affiche cinq champs du transfert (`js/app.js`, lignes 22–34) :
```
Transfer {
  id: valeur utilisée comme clé Map et identifiant d'URL (type non observable)
  from: chaîne affichée (ex. "Papeete")
  to: chaîne affichée (ex. "Moorea")
  price: valeur affichée avec unité XPF (type non observable)
  seatsLeft: nombre utilisé pour condition `seatsLeft > 0` (affichage du bouton Réserver)
}
```

Les plages de valeurs (`id: 1..3`, `price: 1800 | 3500 | 21000`, `seatsLeft: 0..28`) sont **exemples de test observés dans les fixtures** (`js/app.test.js`), non des garanties de l'API en production. Le comportement en production (valeurs réelles, bornes, types exacts) dépend de l'implémentation côté API.

### Flux 2 : Réservation de places (parcours voyageur — SHIA-354)

**Séquence réelle** :
1. Voyageur clique sur bouton « Réserver » pour un transfert avec places disponibles
2. Frontend (`js/app.js:reserve()`) vérifie que le transferId n'est pas déjà en cours de traitement (Set `pendingTransfers`)
3. Frontend émet POST /transfers/{id}/reserve avec body `{ seats: 1 }`
4. API valide et traite la réservation ; **les détails de validation côté API ne sont pas observables depuis ce dépôt**
5. Frontend stocke le `reservationId` retourné dans une Map locale (`reservations`)
6. Frontend rafraîchit automatiquement la liste
7. Voyageur voit le bouton « Réserver » remplacé par « Annuler » pour ce transfert

**Invariant côté frontend** :
- Une seule place réservable par transfert et par session (clé `transferId` dans Map `reservations`)
- Protections : verrou `pendingTransfers` empêche les double-clics ; état local conserve les réservations jusqu'au rechargement de page

**État côté serveur** :
- Comportement après réservation (**INCONNU depuis ce dépôt**) : modification du champ `seatsLeft` au refresh, persistance au redémarrage du serveur, structure des données côté API. Le frontend rafraîchit la liste (GET /transfers) et affiche le champ `seatsLeft` retourné dans la réponse HTTP, mais la mise à jour côté API ne peut pas être observée sans consulter le dépôt ou le comportement en runtime de l'API.

---

## Risques et divergences (blocages et questions)

### Risque 1 : Divergence de noms de champs (RÉSOLU — SHIAAAAAAAAAAAAAAAAAAAAAAAA-311, PR #4, commit b6910ec)

**Le problème (antérieur)** :
- Frontend attendait un champ `availableSeats` pour affichage dans le template
- Code observé : ancien code frontend `js/app.js:13` référençait `t.availableSeats`
- Résultat observé : frontend affichait `undefined places` au lieu du nombre réel

**Correction appliquée (commit b6910ec)** :
- Frontend (`js/app.js:13`) : template mis à jour pour utiliser **`${t.seatsLeft} places`**
- Frontend harmonisé : le code référence maintenant le champ `seatsLeft` reçu de l'API
- Test de régression : test couvrant ce champ ajouté dans la suite automatisée

**Impact de la correction** :
- Catalogue désormais affichable correctement — affichage du nombre de places présentes dans la réponse API
- Dépendance de contrat clarifiée : le frontend consomme le champ `seatsLeft` retourné par GET /transfers

### Risque 2 : Configuration CORS (CRITIQUE POUR DÉPLOIEMENT MULTI-DOMAINE)

**Le problème** :
- Si API et frontend déployés sur domaines/ports différents, le navigateur applique la CORS policy
- Frontend sur domaine/port différent (ex. localhost:3000 vs localhost:3100 en dev) peut rencontrer des blocages CORS côté client
- Comportement en dev actuel : non observé ; ne peut pas être déterminé depuis ce dépôt seul

**Preuve disponible** :
- Frontend (`js/app.js:13`) : émet `fetch(\`${API_BASE_URL}/transfers\`)`
- Si API_BASE_URL pointe vers une origine différente, le navigateur imposera la vérification CORS
- Configuration API (présence/absence de headers CORS, politique de cross-origin) : **non observable depuis ce dépôt**

**Impact potentiel en production** :
- Si API et frontend déployés sur origines différentes → comportement dépend des headers HTTP exposés par l'API
- Frontend affiche un message d'erreur : « Impossible de charger les transferts : ... » (capture d'erreur, ligne 40)

**Recommandation** :
- Avant déploiement multi-domaine, tester l'intégration avec frontend et API sur domaines/ports différents
- Valider que les appels fetch réussissent et affichent les données correctement
- Si appels bloqués, consulter la documentation ou le comportement en runtime de l'API pour déterminer si CORS doit être activé

### Risque 3 : Validation de `seats` côté API (DÉPENDANCE EXTERNE)

**Ce que le frontend fait** :
- Frontend envoie toujours `{ seats: 1 }` — une seule place par action (SHIA-354)
- Aucune possibilité côté frontend de demander plusieurs places ou un nombre négatif

**Ce que l'API doit faire** (**INCONNU** depuis ce dépôt) :
- Valider `seats` pour rejeter les valeurs négatives ou zéro
- Vérifier que `seats >= 1` et `seats <= seatsLeft`
- Rejeter avec code HTTP 400 si validation échoue

**Recommandation** :
- Consulter la documentation `shift-pilot-resa-api` ou effectuer des tests de validation pour confirmer que :
  - `POST /transfers/1/reserve body={"seats":-1}` retourne une erreur 400 (pas un décrément inversé)
  - `POST /transfers/1/reserve body={"seats":0}` retourne une erreur 400
  - `POST /transfers/1/reserve body={"seats":100}` (demande > places) retourne une erreur 400

### Risque 4 : Interface de réservation sans formulaire multi-places (par conception) — FONCTIONNALITÉ CONFIRMÉE

**État actuel — CONFIRMÉ OPÉRATIONNEL** :
- Endpoint POST /transfers/:id/reserve implémenté et consommé par le frontend
- Endpoint DELETE /transfers/:id/reservations/:reservationId implémenté et consommé par le frontend
- Fonction `reserve()` implémentée côté frontend (`js/app.js`, lignes 44–65)
- Fonction `cancelReservation()` implémentée côté frontend (`js/app.js`, lignes 67–86)
- Boutons « Réserver » et « Annuler » affichés dynamiquement dans la liste de transferts (par conception : action directe par clic, sans formulaire séparé)
- **LE FRONTEND CONSOMME ACTIVEMENT LES ENDPOINTS POST ET DELETE via boutons intégrés**

**Preuves d'implémentation et de test** :
- Code frontend : `js/app.js:44–65` (réservation) et `js/app.js:67–86` (annulation) contiennent les fonctions `reserve()` et `cancelReservation()` avec POST/DELETE, gestion d'erreur, stockage/suppression de `reservationId`, et rafraîchissement automatique
- Code frontend : `js/app.js:51–61` crée dynamiquement les boutons « Réserver » et « Annuler » dans le rendu DOM
- Couverture de tests : `js/app.test.js` contient 13 tests automatisés couvrant réservation, annulation, double-clic (SHIA-383) et transitions d'état
- Workflows amont : `WORKFLOW_RESERVER_TRANSFERT.md` et `WORKFLOW_ANNULER_RESERVATION.md` décrivent l'implémentation end-to-end et les invariants clients
- Audit fonctionnel : `FUNCTIONAL_AUDIT.md` §Fonctionnalités, points 2–3 confirment que réservation et annulation sont implémentées

**Comportement observé en code** :
- Voyageur clique sur « Réserver » pour un transfert avec `seatsLeft > 0` → POST `/transfers/{id}/reserve` avec `{ seats: 1 }` immédiat, stockage du `reservationId` retourné dans Map locale `reservations`, bouton basculé à « Annuler », rafraîchissement automatique de la liste via `loadTransfers()`
- Voyageur clique sur « Annuler » pour un transfert réservé → DELETE `/transfers/{id}/reservations/{reservationId}` immédiat, suppression de `reservationId` de `reservations`, bouton basculé à « Réserver », rafraîchissement automatique
- Une seule place par transfert et par session (limitation intentionnelle pour le pilote)
- Protection anti double-clic : Set `pendingTransfers` verrouille chaque `transferId` pendant un appel réseau, rejette clics supplémentaires (SHIA-383)

**Statut** :
- Fonctionnel et testé (SHIA-354 livré)
- Design : boutons intégrés à la liste, pas de formulaire séparé (UX rapide)

### Risque 5 : Configuration d'URL API non versionnée (DÉPLOIEMENT)

**Le problème** :
- Frontend utilise `window.API_BASE_URL` injecté par la page hôte (fallback `http://localhost:3100`)
- Mécanisme d'injection en production **INCONNU** — non versionné dans ce dépôt
- Dépendance tacite : serveur qui sert `index.html` doit injecter une variable JavaScript avant le chargement du script

**Preuve** :
- Frontend (`js/app.js:2–3`) : `const API_BASE_URL = (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"`
- Aucun build step, aucun env var, aucun fichier `.env` versionnés
- Infrastructure : comment est injectée `window.API_BASE_URL` en production ? Réponse : inconnue de ce dépôt

**Impact** :
- Développeur en local : URL OK (fallback localhost:3100)
- Déploiement test/prod : si injection oubliée → frontend appelle localhost:3100 au lieu du serveur réel
- Debugging difficile : erreur silencieuse (liste vide, aucun message réseau)

**Note** :
- Mécanisme observable en code mais mécanisme d'injection externe non documenté — consulter documentation du workspace API ou de l'infrastructure

---

## Questions ouvertes (décisions attendues)

1. ~~**Harmonisation du champ dispo** (BLOCAGE FONCTIONNEL)~~ **RÉSOLU**
   - ~~Utiliser `availableSeats` ou `seatsLeft` comme nom canonical ?~~
   - ~~Impact : changer soit l'API, soit le frontend~~
   - **Décision prise (SHIAAAAAAAAAAAAAAAAAAAAAAAA-311)** : utiliser `seatsLeft` (nom de l'API, cohérent avec la sémantique métier)

2. **Authentification pour les réservations** (ARCHITECTURE)
   - **Aucun mécanisme d'authentification n'est observable dans ce client** : pas d'en-têtes `Authorization` ajoutés dans le code frontend, pas de token géré côté client, pas de session visible en code (`js/app.js`)
   - Acceptable pour pilote et dans l'état actuel du projet
   - Présence ou absence de validation d'authentification côté API : **non observable depuis ce dépôt**
   - Futur : si authentification requise, architecture à définir (token JWT, session cookie, autre)

3. **Déploiement multi-domaine** (INFRASTRUCTURE)
   - Comment sont déployés API et frontend en production : même origine ou séparés ?
   - **Action requise** : vérifier que l'API expose les headers CORS (Risque 2 ci-dessus)
   - Qui contrôle et valide les headers CORS en production ?

4. **Persistance des réservations** (FUTUR)
   - Comportement à redémarrage API : **non observable depuis ce dépôt** — voir documentation `shift-pilot-resa-api`
   - Acceptable pour pilote dans l'état actuel
   - Quand migrer vers une base de données persistante ? Avant montée en charge ou après ?

5. **Validation des données côté API** (INTÉGRATION)
   - L'API valide-t-elle correctement `seats` (rejette négatif/zéro) ?
   - L'API vérifie-t-elle que `seats <= seatsLeft` avant de confirmer la réservation ?
   - Voir Risque 3 ci-dessus et documentation `shift-pilot-resa-api`

---

## Schéma d'intégration (local & production)

### Développement local

```
voyageur → navigateur:3000
           ↓ fetch GET /transfers
           API:3100
           ↓ réponse JSON
           ↑ affiche liste
```

**Configuration** : Frontend fallback `http://localhost:3100`

### Production (hypothèse)

```
voyageur → reverse proxy / serveur web (port 443 HTTPS)
           ├─ GET /index.html → sert HTML + injecte window.API_BASE_URL = "https://api.example.com"
           └─ Frontend fetch → API HTTPS (cross-origin)
           
           ↓ GET /transfers
           
           API backend (port 443 HTTPS, domaine séparé ou même)
```

**Configuration requise** : CORS headers si API sur domaine/port différent

---

## Validations de contrat (checklist d'intégration)

Avant de déclarer le flux end-to-end fonctionnel :

- [x] **API GET /transfers retourne champ `seatsLeft` (harmonisé nom)** — RÉSOLU commit b6910ec
- [ ] **API GET /transfers inclut header `Access-Control-Allow-Origin`**
- [ ] **API POST /transfers/:id/reserve valide `seats >= 1` et rejette 400 si invalide**
- [x] **Frontend récupère et affiche les 4 champs sans `undefined`** — RÉSOLU commit b6910ec
- [ ] **Test d'intégration** : appel GET depuis navigateur sur port différent, validate réponse, affichage OK
- [ ] **Formulaire réservation implémenté** ou issue de suivi créée avec priorité documentée
- [ ] **Documentation déploiement** : mécanique d'injection `window.API_BASE_URL` versionnée ou CI/CD décrite

