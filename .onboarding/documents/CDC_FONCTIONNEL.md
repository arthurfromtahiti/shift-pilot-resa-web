# CDC_FONCTIONNEL — shift-pilot-resa-web

> Cahier des charges fonctionnel — ce que le logiciel fait réellement pour le client, selon quelles règles, et vers quel objectif.

## Contexte métier

### Problème et raison d'être

Les voyageurs en Polynésie française ont besoin de connaître les **transferts inter-îles disponibles** (liaisons par bateau ou navire) afin de planifier leurs déplacements. Le prix en XPF et le nombre de places disponibles sont des critères de décision. Ce produit offre une **vitrine lisible et à jour** de cette offre de mobilité.

### Périmètre fonctionnel et écart déclaré

Le `README.md` annonce une « **interface de réservation** de transferts inter-îles ». Le code réalisé implémente désormais le **catalogue en consultation avec réservation et annulation** (SHIA-354). L'utilisateur peut consulter les transferts disponibles, réserver une place sur un transfert, et annuler sa réservation. Les réservations sont maintenues localement pendant la session utilisateur (pas de persistance au-delà du rechargement).

## Acteurs et capacités

### Utilisateur final

- **Peut** : accéder à la page web et voir instantanément la liste de tous les transferts inter-îles disponibles (origine, destination, prix en XPF, places restantes) ; réserver une place sur un transfert disponible (bouton « Réserver ») ; annuler sa réservation (bouton « Annuler »)
- **Ne peut pas** : chercher, filtrer, trier, voir les détails d'un transfert, réserver plusieurs places, persister ses réservations entre sessions
- **Interaction requise** : clics sur les boutons « Réserver » et « Annuler » ; rafraîchissement automatique de la liste après chaque action

### API distant — `shift-pilot-resa-api`

Trois endpoints distincts sont consommés :

1. **GET /transfers** — consultation du catalogue
   - **Fournit** : tableau JSON de transferts avec champs `id`, `from`, `to`, `price`, `seatsLeft`
   - **Champ critique** : `id` est requis comme identifiant unique pour les réservations (clé Map `reservations`)
   - **Protocole** : HTTP GET, réponse JSON

2. **POST /transfers/{transferId}/reserve** — réservation d'une place
   - **Paramètre** : `transferId` (depuis le champ `id` du transfert)
   - **Body** : `{ seats: 1 }`
   - **Réponse** : JSON contenant `reservationId`
   - **Protocole** : HTTP POST, réponse JSON

3. **DELETE /transfers/{transferId}/reservations/{reservationId}** — annulation d'une réservation
   - **Paramètres** : `transferId` et `reservationId` (du champ `id` du transfert et de la réponse POST)
   - **Protocole** : HTTP DELETE, aucun body

- **Authentification** : aucune observable dans ce front — l'API est consommée en lecture anonyme ou avec un token injecté par la page hôte
- **Contrat implicite** : les 5 champs affichés/utilisés (`id`, `from`, `to`, `price`, `seatsLeft`) sont directement accédés sans validation — tout changement de nom ou de type côté API produirait un `undefined` côté front

### Environnement d'exécution

- **Navigateur web** : JavaScript ES6 natif, pas de polyfills
- **Serveur** : page HTML statique, configuration injectée via une variable globale `window.API_BASE_URL`

## Parcours fonctionnels

### Flux principal — Affichage du catalogue de transferts

**Type** : `user_journey` (lecture / affichage)  
**Criticité** : **HAUTE** — c'est la fonction principale du produit ; sans elle, la page est vide et inutile  
**Confiance** : high (code exhaustivement visible)

#### Objectif
Permettre à l'utilisateur de voir, dès l'ouverture de la page, la liste complète des transferts disponibles avec leurs prix et disponibilités, et les boutons d'action (Réserver/Annuler) appropriés.

#### Déclencheur
Chargement de la page `index.html` dans un navigateur web, ou appel à `loadTransfers()` après une action (réservation ou annulation).

#### Étapes

1. **Chargement du DOM**  
   Le navigateur charge et analyse `index.html` — le titre `<h1>Transferts</h1>`, le conteneur `<ul id="transfers-list">` et `<p id="transfers-error">` (vides) sont rendus. Le script `js/app.js` est chargé (`<script type="module" src="js/app.js">`).

2. **Résolution de l'URL de l'API**  
   Au chargement de `js/app.js`, la variable `API_BASE_URL` est résolue :
   ```javascript
   (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"
   ```
   - Si `window.API_BASE_URL` a été injecté par la page hôte, c'est cette valeur qui est utilisée
   - Sinon, fallback vers `http://localhost:3100` (local en développement)

3. **Initialisation du registre de réservations**
   ```javascript
   export const reservations = new Map();
   export const pendingTransfers = new Set();
   ```
   - `Map` `reservations` : stocke les réservations actives (clé: `transferId`, valeur: `reservationId`)
   - `Set` `pendingTransfers` : verrouille chaque transfert pendant une opération réseau (protection anti double-clic, SHIA-383)

4. **Événement `DOMContentLoaded`**  
   Une fois que le DOM est entièrement parsé, l'événement `DOMContentLoaded` est émis. La fonction `loadTransfers()` est déclenchée.

5. **Appel réseau vers l'API**  
   ```javascript
   const response = await fetch(`${API_BASE_URL}/transfers`);
   if (!response.ok) throw new Error(...);
   const transfers = await response.json();
   ```
   - Requête GET vers `${API_BASE_URL}/transfers`
   - Aucun header d'authentification
   - Pas de paramètre de query
   - La réponse est vérifiée (`response.ok`) avant désérialisation

6. **Réinitialisation du conteneur**  
   La `<ul id="transfers-list">` et `<p id="transfers-error">` sont vidées.

7. **Rendu de chaque transfert avec boutons d'action**  
   Pour chaque transfert `t` du tableau :
   - Créer un `<li>` avec le texte : `${t.from} → ${t.to} — ${t.price} XPF (${t.seatsLeft} places)`
   - Si `reservations.has(t.id)` (utilisateur a réservé ce transfert) :
     - Ajouter un bouton « Annuler » qui appelle `cancelReservation(t.id, reservationId)`
   - Sinon si `t.seatsLeft > 0` (places disponibles) :
     - Ajouter un bouton « Réserver » qui appelle `reserve(t.id)`
   - Insérer le `<li>` (avec ou sans bouton) dans la `<ul>`

#### États finaux (cas nominal)

- **Succès** : La liste des transferts s'affiche avec tous les détails. Les boutons « Réserver » sont visibles pour les transferts avec places, les boutons « Annuler » pour les transferts réservés par l'utilisateur.

#### Règles métier associées

1. **Affichage exhaustif et automatique**  
   - Aucun clic ni interaction n'est requis pour le chargement initial
   - Tous les transferts retournés par l'API sont affichés (pas de pagination, pas de limite)
   - Affichage automatique au chargement de la page et après chaque action

2. **Unité monétaire : XPF (Fixed)**  
   - Le symbole `XPF` est codé en dur dans le template de rendu (`js/app.js`, ligne 22)
   - Non configurable, non localisable
   - Assumption : tous les prix de l'API sont en XPF

3. **Cinq champs obligatoires pour l'affichage et la logique**  
   - `id` : identifiant unique du transfert (clé de la `Map` `reservations`) — **CRITIQUE depuis SHIA-354**
   - `from` : origine du transfert
   - `to` : destination du transfert
   - `price` : tarif du transfert
   - `seatsLeft` : nombre de places disponibles
   - **Chacun est accédé directement sans validation.** Un champ absent produit `undefined`.

4. **Sémantique des places disponibles et affichage des boutons**  
   - Le champ `seatsLeft` est affiché tel quel
   - Interprétation : `0` = complet (pas de bouton Réserver), `> 0` = places libres (bouton Réserver visible)
   - Bouton Réserver n'apparaît que si `seatsLeft > 0` et que l'utilisateur n'a pas réservé ce transfert

5. **Protection anti double-clic (SHIA-383)**
   - Le `Set` `pendingTransfers` verrouille chaque `transferId` pendant un appel réseau
   - Les clics supplémentaires sur un transfert en cours sont ignorés (`if (pendingTransfers.has(transferId)) return`)

### Flux secondaire — Réservation d'une place

**Type** : `user_action` (modification d'état)  
**Criticité** : **HAUTE** — fonctionnalité centrale (SHIA-354)  
**Confiance** : high (code exhaustivement visible)

#### Objectif
Permettre à l'utilisateur de réserver une place sur un transfert disponible en cliquant sur le bouton « Réserver ».

#### Déclencheur
L'utilisateur clique sur le bouton « Réserver » d'un transfert avec `seatsLeft > 0` et non réservé.

#### Étapes

1. **Vérification des pré-conditions**
   - Vérifier que `reservations.has(transferId)` est faux (utilisateur n'a pas déjà réservé ce transfert)
   - Vérifier que `pendingTransfers.has(transferId)` est faux (aucune opération en cours sur ce transfert)
   - Si l'une de ces conditions est violée, retourner sans action (protection anti double-clic)

2. **Verrouillage du transfert**
   - Ajouter `transferId` au `Set` `pendingTransfers` pour bloquer les clics supplémentaires

3. **Appel réseau**
   ```javascript
   const response = await fetch(`${API_BASE_URL}/transfers/${transferId}/reserve`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ seats: 1 }),
   });
   if (!response.ok) throw new Error(...);
   const data = await response.json();
   ```
   - POST vers `${API_BASE_URL}/transfers/${transferId}/reserve`
   - Body : `{ seats: 1 }`
   - Réponse attendue : JSON avec `reservationId`

4. **Mise à jour de l'état local**
   - Stocker la réservation : `reservations.set(transferId, data.reservationId)`

5. **Rafraîchissement de la liste**
   - Appeler `loadTransfers()` pour recharger la liste et afficher le bouton « Annuler »

6. **Déverrouillage du transfert**
   - Retirer `transferId` de `pendingTransfers` (dans un bloc `finally`)

#### États finaux (cas nominal)

- **Succès** : Le bouton « Réserver » est remplacé par un bouton « Annuler ». Les `seatsLeft` affichés diminuent de 1.

#### Cas de bord

- **Erreur réseau** : Un message d'erreur s'affiche dans `<p id="transfers-error">` (ajouté par SHIA-423). Le bouton Réserver reste visible et peut être recliqué après correction.
- **Réservation impossible (transfert complet)** : L'API retourne une erreur 4xx ou 5xx. Le message d'erreur s'affiche, le bouton reste visible.

#### Règles métier

1. **Une seule place par réservation** : chaque appel POST envoie `{ seats: 1 }` — pas de multi-place
2. **Une seule réservation par transfert et par session** : le registre `reservations` (Map) n'accepte qu'une valeur par `transferId`
3. **Bouton désactivé pendant l'opération** : `pendingTransfers` verrouille le transfert, clics ignorés (SHIA-383)
4. **État local** : la réservation n'est stockée que dans la `Map` en mémoire — perte au rechargement de page

---

### Flux secondaire — Annulation d'une réservation

**Type** : `user_action` (modification d'état)  
**Criticité** : **HAUTE** — fonctionnalité centrale (SHIA-354)  
**Confiance** : high (code exhaustivement visible)

#### Objectif
Permettre à l'utilisateur d'annuler sa réservation en cliquant sur le bouton « Annuler ».

#### Déclencheur
L'utilisateur clique sur le bouton « Annuler » d'un transfert qu'il a réservé.

#### Étapes

1. **Vérification des pré-conditions**
   - Vérifier que `pendingTransfers.has(transferId)` est faux (aucune opération en cours)
   - Si violée, retourner sans action (protection anti double-clic)

2. **Verrouillage du transfert**
   - Ajouter `transferId` au `Set` `pendingTransfers`

3. **Appel réseau**
   ```javascript
   const response = await fetch(
     `${API_BASE_URL}/transfers/${transferId}/reservations/${reservationId}`,
     { method: "DELETE" }
   );
   if (!response.ok) throw new Error(...);
   ```
   - DELETE vers `${API_BASE_URL}/transfers/${transferId}/reservations/{reservationId}`
   - Aucun body
   - Aucun header supplémentaire

4. **Mise à jour de l'état local**
   - Supprimer la réservation : `reservations.delete(transferId)`

5. **Rafraîchissement de la liste**
   - Appeler `loadTransfers()` pour recharger la liste et afficher le bouton « Réserver »

6. **Déverrouillage du transfert**
   - Retirer `transferId` de `pendingTransfers` (dans un bloc `finally`)

#### États finaux (cas nominal)

- **Succès** : Le bouton « Annuler » est remplacé par un bouton « Réserver ». Les `seatsLeft` affichés augmentent de 1.

#### Cas de bord

- **Erreur réseau** : Un message d'erreur s'affiche dans `<p id="transfers-error">` (ajouté par SHIA-423). Le bouton Annuler reste visible et peut être recliqué après correction.
- **Annulation impossible** : L'API retourne une erreur 4xx ou 5xx (ex. : réservation déjà annulée). Le message d'erreur s'affiche, le bouton peut rester ou disparaître selon l'erreur.

#### Règles métier

1. **Suppression complète de la réservation** : aucune place n'est conservée après annulation
2. **Bouton désactivé pendant l'opération** : `pendingTransfers` verrouille le transfert, clics ignorés (SHIA-383)
3. **État local** : la réservation est supprimée de la `Map` — aucune trace persiste après rechargement

---

### Cas de bord et défaillances — En l'état du code

#### Cas : API injoignable ou erreur réseau

**Comportement** : Exception non capturée — `fetch()` lève une `Promise` rejetée, aucun `try/catch`.  
**Résultat utilisateur** : Page affiche une `<ul>` vide, aucun message d'erreur. Indiscernable d'une liste vide.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Ajouter un `try/catch` et un message d'erreur visible à l'utilisateur.

#### Cas : API renvoie une réponse 4xx ou 5xx

**Comportement** : `response.ok` n'est pas vérifiée. `response.json()` peut réussir (si le corps est du JSON) ou rejeter (si le corps n'est pas du JSON). Aucune gestion.  
**Résultat utilisateur** : Page affiche une `<ul>` vide ou lève une exception non capturée selon la nature de la réponse.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Vérifier `if (!response.ok) throw new Error(...)` après le `fetch()`.

#### Cas : API renvoie un objet ou `null` au lieu d'un tableau

**Comportement** : La boucle `for (const t of transfers)` échoue sur un non-itérable → `TypeError` non capturée.  
**Résultat utilisateur** : Page affiche une `<ul>` vide avec erreur navigateur.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Valider `Array.isArray(transfers)` avant d'itérer.

#### Cas : Transfert avec champ(s) manquant(s)

**Comportement** : Accès direct sans vérification — `t.from` renvoie `undefined` si absent.  
**Résultat utilisateur** : `<li>` affiche `undefined → undefined — undefined XPF (undefined places)`.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Ajouter une validation ou un filtrage des transferts incomplets. Ou documenter le contrat attendu de l'API.

#### Cas : Liste vide (aucun transfert disponible ce jour)

**Comportement** : Boucle s'exécute 0 fois — `<ul>` reste vide.  
**Résultat utilisateur** : Indéterminable d'une erreur API.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Ajouter un message « Aucun transfert disponible » si `transfers.length === 0`.

## Données consommées

### Ressource `transfer` (tableau retourné par `GET /transfers`)

| Champ | Utilisé ? | Type (observé) | Type (attendu) | Obligatoire ? | Notes |
|-------|-----------|---|---|---|---|
| `id` | ✓ Oui | ? | Identifiant unique | **Oui** | Clé pour la Map `reservations` (SHIA-354), paramètre pour POST/DELETE. **CRITIQUE** |
| `from` | ✓ Oui | Chaîne | Chaîne (nom d'île) | Oui | Affichage : origine du transfert |
| `to` | ✓ Oui | Chaîne | Chaîne (nom d'île) | Oui | Affichage : destination du transfert |
| `price` | ✓ Oui | Nombre ou chaîne | Nombre (XPF) | Oui | Affichage : tarif du transfert |
| `seatsLeft` | ✓ Oui | Nombre | Nombre entier | Oui | Affichage : places restantes ; détermine si le bouton Réserver est visible |
| *Autres champs* | ✗ Non | ? | ? | ? | L'API peut renvoyer des identifiants, horaires, opérateurs, statut — ce front ne les utilise pas |

**Confiance**
- `VÉRIFIÉ_CODE` pour l'usage des 5 champs : lisibles dans `js/app.js` lignes 20, 22, 28
- `INCONNU` pour la forme complète et les types exacts : l'API peut renvoyer d'autres champs ou avoir des contraintes non observables depuis ce dépôt
- `CRITIQUE_DEPUIS_SHIA-354` : le champ `id` est obligatoire et doit être unique et stable

### Configuration de l'URL de l'API

| Variable | Valeur (développement) | Valeur (production) | Notes |
|----------|---|---|---|
| `window.API_BASE_URL` | Non injected → fallback `http://localhost:3100` | Injecté par la page hôte (mécanisme non versionné) | Configuration externe, pas définie dans ce dépôt |

## Règles métier résumées

1. **Affichage automatique et actuel** → la liste se charge au démarrage et se rafraîchit après chaque réservation/annulation
2. **Unité XPF codée en dur** → aucune flexibilité de devise
3. **Cinq champs lus tels quels** → aucun formatage du prix (décimales ?), aucune validation (SHIA-354 ajoute `id` critique)
4. **Tableau exhaustif** → pas de pagination, pas de limite
5. **Réservation et annulation implémentées** → le front gère une Map `reservations` en mémoire (SHIA-354)
6. **Protection anti double-clic** → le Set `pendingTransfers` verrouille chaque transfert pendant une opération (SHIA-383)
7. **État session-local** → les réservations sont perdues au rechargement de page (pas de persistance)

## Délimitation du périmètre

### Hors périmètre

- **Réservation de plusieurs places** : chaque réservation est limitée à 1 place ; pas de quantité configurable
- **Persistance des réservations** : pas de localStorage, sessionStorage ou IndexedDB — réservations perdues au rechargement
- **Synchronisation multi-utilisateur** : pas de détection de conflit en cas de réservation simultanée
- **Filtres, tris, recherche** : aucun mécanisme
- **Détail d'un transfert** : pas de page de détail
- **Authentification** : pas de login, consommation anonyme supposée
- **Localisation / multilingue** : interface en français, devise en XPF, non configurable
- **État de chargement** : pas de spinner ni message "Chargement..."
- **Accessibilité** : pas de considération WCAG documentée
- **Responsive / mobile** : pas de media queries, pas de test multi-device

### Inachevé ou indéterminable

- **Type exact et format de `id`** : le type réel du champ `id` (nombre, UUID, chaîne ?) n'est pas documenté ; utilisé comme clé Map, doit être unique et utilisable avec `===`
- **Type exact de `reservationId`** : retourné par POST `/reserve`, réutilisé dans DELETE ; son format et ses garanties d'unicité ne sont pas documentés
- **Rafraîchissement en temps réel** : la fonction `loadTransfers()` peut théoriquement être rappelée, mais aucun déclencheur (polling, WebSocket) n'existe dans le code
- **Injection de `window.API_BASE_URL` en production** : mécanisme externe, non documenté ni versionné
- **Synchronisation multi-utilisateur** : pas de détection de conflit en cas de réservation simultanée de la dernière place

## Preuves et confiance

Tous les constats fonctionnels sont issus de lectures exhaustives :

- `js/app.js` : 91 lignes, entièrement lues (incluant les workflows Réservation et Annulation SHIA-354, protection anti double-clic SHIA-383)
- `index.html` : 14 lignes, entièrement lues
- `README.md` : 8 lignes, entièrement lues
- Aucune autre source de code fonctionnel dans ce dépôt

**Confiance globale du CDC : high** — la portée réelle du produit est claire et documentée. Les incertitudes (format `id`, type `reservationId`, synchronisation multi-utilisateur) sont explicitement délimitées.
