# CDC_FONCTIONNEL — shift-pilot-resa-web

> Cahier des charges fonctionnel — ce que le logiciel fait réellement pour le client, selon quelles règles, et vers quel objectif.

## Contexte métier

### Problème et raison d'être

Les voyageurs en Polynésie française ont besoin de connaître les **transferts inter-îles disponibles** (liaisons par bateau ou navire) afin de planifier leurs déplacements. Le prix en XPF et le nombre de places disponibles sont des critères de décision. Ce produit offre une **vitrine lisible et à jour** de cette offre de mobilité.

### Périmètre fonctionnel et écart résolu

Le `README.md` annonce une « **interface de réservation** de transferts inter-îles ». Le code réalisé implémente désormais un **catalogue consultatif avec réservation et annulation** (livré SHIA-354). L'utilisateur final peut consulter la liste et réserver/annuler une place via des boutons intégrés, avec gestion automatique d'un registre local. La persistance des réservations au-delà d'une session et la réservation de plusieurs places restent hors périmètre.

## Acteurs et capacités

### Utilisateur final

- **Peut** : accéder à la page web et voir instantanément la liste de tous les transferts inter-îles disponibles (origine, destination, prix en XPF, places restantes) ; réserver une place via un clic sur le bouton « Réserver » ; annuler une réservation via un clic sur le bouton « Annuler » ; voir la liste se mettre à jour en temps réel après chaque action
- **Ne peut pas** : chercher, filtrer, trier, voir les détails d'un transfert, réserver plusieurs places en une seule action, persister ses réservations au-delà d'une session
- **Interaction requise** : 
  - Affichage automatique au chargement de la page (boutons basés sur l'état local)
  - Un clic « Réserver » déclenche un appel POST à l'API ; un clic « Annuler » déclenche un DELETE
  - Rafraîchissement automatique de la liste après chaque action

### API distant — `shift-pilot-resa-api`

**Endpoint 1 : Lecture du catalogue**
- **URL** : `GET /transfers`
- **Protocole** : HTTP GET, réponse JSON — tableau de transferts
- **Champs** : au minimum `id`, `from`, `to`, `price`, `seatsLeft` ; probablement d'autres champs non affichés
- **Contrat** : les 5 champs affichés/utilisés sont directement accédés sans validation — tout changement de nom ou de type côté API produirait un `undefined` côté front
- **Authentification** : aucun mécanisme d'authentification observable dans ce client

**Endpoint 2 : Réservation**
- **URL** : `POST /transfers/{id}/reserve`
- **Paramètre** : `{id}` est le transferId à réserver
- **Corps de requête** : JSON `{ seats: 1 }` (une seule place par action)
- **Réponse observée** : objet JSON contenant `reservationId` (utilisé par le frontend pour l'annulation)
- **Comportement côté frontend** : envoie POST, stocke `reservationId` en mémoire locale, rafraîchit la liste
- **Comportement côté serveur** (`INCONNU` depuis ce dépôt) : le `seatsLeft` diminue-t-il ? La réservation persiste-t-elle ? Voir documentation `shift-pilot-resa-api`

**Endpoint 3 : Annulation**
- **URL** : `DELETE /transfers/{id}/reservations/{reservationId}`
- **Paramètres** : `{id}` = transferId, `{reservationId}` = identifiant de la réservation à supprimer
- **Réponse acceptée** : tout statut 2xx ; corps non lu ; forme serveur inconnue
- **Comportement côté frontend** : envoie DELETE, supprime `reservationId` de la Map locale, rafraîchit la liste
- **Comportement côté serveur** (`INCONNU` depuis ce dépôt) : le `seatsLeft` augmente-t-il ? Voir documentation `shift-pilot-resa-api`

### Environnement d'exécution

- **Navigateur web** : JavaScript ES6 natif, pas de polyfills
- **Serveur** : page HTML statique, configuration injectée via une variable globale `window.API_BASE_URL`

## Parcours fonctionnels

### Flux principal — Affichage du catalogue de transferts

**Type** : `user_journey` (lecture / affichage)  
**Criticité** : **HAUTE** — c'est l'unique fonction du produit ; sans elle, la page est vide et inutile  
**Confiance** : high (code exhaustivement visible)

#### Objectif
Permettre à l'utilisateur de voir, dès l'ouverture de la page, la liste complète des transferts disponibles avec leurs prix et disponibilités.

#### Déclencheur
Chargement de la page `index.html` dans un navigateur web.

#### Étapes

1. **Chargement du DOM**  
   Le navigateur charge et analyse `index.html` — le titre `<h1>Transferts</h1>` et le conteneur `<ul id="transfers-list">` (vides) sont rendus. Le script `js/app.js` est chargé (`<script src="js/app.js">`).

2. **Résolution de l'URL de l'API**  
   Au chargement de `js/app.js`, la variable `API_BASE_URL` est résolue :
   ```javascript
   (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"
   ```
   - Si `window.API_BASE_URL` a été injecté par la page hôte, c'est cette valeur qui est utilisée
   - Sinon, fallback vers `http://localhost:3100` (local en développement)

3. **Événement `DOMContentLoaded`**  
   Une fois que le DOM est entièrement parsé (balises HTML analysées et éléments créés), l'événement `DOMContentLoaded` est émis. La fonction `loadTransfers()` est déclenchée.

4. **Appel réseau vers l'API**  
   ```javascript
   const response = await fetch(`${API_BASE_URL}/transfers`);
   const transfers = await response.json();
   ```
   - Requête GET vers `${API_BASE_URL}/transfers`
   - Aucun header d'authentification
   - Pas de paramètre de query
   - La réponse est désérialisée comme JSON

5. **Réinitialisation du conteneur**  
   ```javascript
   const list = document.getElementById("transfers-list");
   list.innerHTML = "";
   ```
   La `<ul id="transfers-list">` est vidée (reliquat de prudence : permet de rappeler `loadTransfers()` sans accumulation de doublons).

6. **Rendu de chaque transfert**  
   ```javascript
   for (const t of transfers) {
     const item = document.createElement("li");
     item.textContent = `${t.from} → ${t.to} — ${t.price} XPF (${t.seatsLeft} places)`;
     list.appendChild(item);
   }
   ```
   - Pour chaque objet `transfer` du tableau, un `<li>` est créé
   - Le contenu textuel est : `[origine] → [destination] — [prix] XPF ([places] places)`
   - L'élément est inséré dans la `<ul>`

#### États finaux (cas nominal)

- **Succès** : La liste des transferts s'affiche avec tous les détails (prix en XPF, places disponibles). L'utilisateur peut lire et comparer les transferts.

#### Règles métier associées

1. **Affichage exhaustif et automatique au chargement**  
   - Aucun clic utilisateur n'est requis pour charger la liste initiale
   - Tous les transferts retournés par l'API sont affichés (pas de pagination, pas de limite visible dans ce code)
   - Affichage automatique au chargement de la page

2. **Unité monétaire : XPF (Fixed)**  
   - Le symbole `XPF` est codé en dur dans le template de rendu (`js/app.js`, ligne 22)
   - Non configurable, non localisable
   - Assumption : tous les prix de l'API sont en XPF

3. **Cinq champs obligatoires pour le fonctionnement complet**  
   - `id` : identifiant unique du transfert (clé pour la Map de réservations)
   - `from` : origine du transfert
   - `to` : destination du transfert
   - `price` : tarif du transfert
   - `seatsLeft` : nombre de places disponibles
   - **Chacun est accédé directement sans validation.** Un champ absent produit `undefined` dans le rendu ou casse la réservation.

4. **Sémantique des places disponibles**  
   - Le champ `seatsLeft` (observé via `GET /transfers`) détermine l'affichage du bouton « Réserver »
   - `0` = complet, bouton masqué ; `> 0` = places libres, bouton visible
   - Affichage du bouton « Annuler » basé sur le registre local `reservations`
   - **INCONNU** : la mise à jour côté serveur après réservation (décrément de `seatsLeft`) et après annulation (réaugmentation de `seatsLeft`) ne sont pas observables depuis ce dépôt — dépendent du contrat API et de l'implémentation côté serveur. Le frontend rafraîchit la liste (GET /transfers) mais la modification côté serveur n'est pas vérifiable depuis ce workspace.

5. **Réservation avec 1 clic**  
   - Un clic sur « Réserver » déclenche immédiatement un appel POST à l'API
   - L'état local `pendingTransfers` (Set) verrouille le transferId pendant l'appel (anti double-clic SHIA-383)
   - Après succès, la réservation est enregistrée dans `reservations` (Map) avec le `reservationId` retourné par l'API et la liste se rafraîchit

6. **Annulation avec 1 clic**  
   - Un clic sur « Annuler » déclenche immédiatement un DELETE vers l'API
   - L'état local `pendingTransfers` verrouille le transferId pendant l'appel (anti double-clic SHIA-383)
   - Après succès, la réservation est supprimée de `reservations` et la liste se rafraîchit

7. **Registre local des réservations**  
   - `reservations: Map<transferId, reservationId>` — persiste pendant la session, perdue au rechargement
   - `pendingTransfers: Set<transferId>` — marque les transferts dont un appel réseau est en cours
   - Aucune persistance hors de la session du navigateur

### Flux secondaire — Réservation d'une place

**Type** : `user_journey` (action utilisateur)  
**Criticité** : **HAUTE** — c'est une fonctionnalité clé livrée par SHIA-354  
**Confiance** : high (code exhaustivement visible)

#### Objectif
Permettre à l'utilisateur de réserver une place sur un transfert disponible en un seul clic.

#### Déclencheur
Clic sur le bouton « Réserver » associé à un transfert dont `seatsLeft > 0` et qui n'a pas de réservation active dans le registre local.

#### Étapes

1. **Affichage du bouton Réserver**  
   Le fonction `loadTransfers()` affiche un bouton `<button>Réserver</button>` pour chaque transfert où `seatsLeft > 0` et `reservations.get(t.id)` est vide (`js/app.js`, lignes 56–60).

2. **Clic utilisateur**  
   L'utilisateur clique sur le bouton « Réserver ». Un écouteur d'événement (`addEventListener('click', ...)`) déclenche la fonction `reserve(transferId)`.

3. **Vérification anti double-clic**  
   La fonction `reserve()` vérifie que le transferId n'est pas déjà dans `pendingTransfers`. Si oui, elle retourne sans rien faire — protection contre les clics rapides (`js/app.js`, lignes 44–46).

4. **Marquage comme en attente**  
   Le transferId est ajouté à `pendingTransfers` — aucune nouvelle requête n'est lancée pour ce transfert jusqu'à la fin de celle-ci (`js/app.js`, ligne 47).

5. **Appel POST à l'API**  
   ```javascript
   const response = await fetch(`${API_BASE_URL}/transfers/${transferId}/reserve`, {
     method: "POST"
   });
   if (!response.ok) throw new Error(`Erreur serveur : ${response.status}`);
   const result = await response.json();
   ```
   - POST vers `/transfers/{transferId}/reserve`
   - Aucun corps de requête
   - La réponse JSON contient `reservationId` (l'identifiant unique de la réservation créée)

6. **Mise à jour de l'état local**  
   ```javascript
   reservations.set(transferId, result.reservationId);
   ```
   La réservation est enregistrée dans le registre local — elle persiste jusqu'au rechargement de page.

7. **Rafraîchissement de la liste**  
   La fonction `loadTransfers()` est rappelée pour actualiser l'affichage — le bouton « Réserver » devient « Annuler » pour ce transfert. Le champ `seatsLeft` dans le rafraîchissement reflète la nouvelle valeur retournée par `GET /transfers` (**INCONNU** depuis ce dépôt — le serveur décrémente-t-il réellement `seatsLeft` ? Voir documentation API).

8. **Nettoyage**  
   Le transferId est retiré de `pendingTransfers`, libérant le verrou (`js/app.js`, ligne 65).

#### États finaux (cas nominal)

- **Succès** : Le bouton bascule à « Annuler », l'état local `reservations` contient la réservation. **INCONNU** : le changement de `seatsLeft` dans le rafraîchissement dépend du comportement serveur — voir documentation `shift-pilot-resa-api` pour vérifier que le serveur décrémente bien `seatsLeft` après une réservation.

#### Cas de bord — réservation

**Cas : Double-clic rapide sur « Réserver »**  
**Comportement** : Le premier clic enregistre le transferId dans `pendingTransfers` — les clics suivants sortent de la fonction sans rien faire (`js/app.js`, ligne 46).  
**Résultat utilisateur** : Une seule requête POST est lancée, une seule réservation est créée.  
**Confiance** : `VÉRIFIÉ_CODE` (SHIA-383 — protection anti double-clic)  

**Cas : Serveur retourne une erreur lors de la réservation**  
**Comportement** : Le `throw` dans le bloc `try/catch` (ligne 65) capture l'erreur. Un message d'erreur remplace le contenu de la liste.  
**Résultat utilisateur** : Message « Impossible de charger... » affiché.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Améliorer le message d'erreur pour distinguer « Impossible de réserver » de « Impossible de charger ».

---

### Flux secondaire — Annulation d'une réservation

**Type** : `user_journey` (action utilisateur)  
**Criticité** : **HAUTE** — c'est une fonctionnalité clé livrée par SHIA-354  
**Confiance** : high (code exhaustivement visible)

#### Objectif
Permettre à l'utilisateur d'annuler une réservation en un seul clic.

#### Déclencheur
Clic sur le bouton « Annuler » associé à un transfert dont une réservation existe dans le registre local `reservations`.

#### Étapes

1. **Affichage du bouton Annuler**  
   La fonction `loadTransfers()` affiche un bouton `<button>Annuler</button>` pour chaque transfert où `reservations.get(t.id)` retourne un `reservationId` non-null (`js/app.js`, lignes 51–55).

2. **Clic utilisateur**  
   L'utilisateur clique sur le bouton « Annuler ». Un écouteur d'événement déclenche `cancelReservation(transferId, reservationId)`.

3. **Vérification anti double-clic**  
   La fonction `cancelReservation()` vérifie que le transferId n'est pas déjà dans `pendingTransfers`. Si oui, elle retourne sans rien faire (`js/app.js`, lignes 68–70).

4. **Marquage comme en attente**  
   Le transferId est ajouté à `pendingTransfers` — aucune nouvelle requête n'est lancée pour ce transfert jusqu'à la fin de celle-ci (`js/app.js`, ligne 71).

5. **Appel DELETE à l'API**  
   ```javascript
   const response = await fetch(`${API_BASE_URL}/transfers/${transferId}/reservations/${reservationId}`, {
     method: "DELETE"
   });
   if (!response.ok) throw new Error(`Erreur serveur : ${response.status}`);
   ```
   - DELETE vers `/transfers/{transferId}/reservations/{reservationId}`
   - Pas de corps de requête
   - Statut accepté : tout 2xx ; corps non lu

6. **Suppression de l'état local**  
   ```javascript
   reservations.delete(transferId);
   ```
   La réservation est supprimée du registre local.

7. **Rafraîchissement de la liste**  
   La fonction `loadTransfers()` est rappelée pour actualiser l'affichage — le bouton « Annuler » bascule à « Réserver » pour ce transfert. Le champ `seatsLeft` dans le rafraîchissement reflète la nouvelle valeur retournée par `GET /transfers` (**INCONNU** depuis ce dépôt — le serveur réaugmente-t-il réellement `seatsLeft` ? Voir documentation API).

8. **Nettoyage**  
   Le transferId est retiré de `pendingTransfers`, libérant le verrou (`js/app.js`, ligne 84).

#### États finaux (cas nominal)

- **Succès** : Le bouton bascule à « Réserver », l'état local `reservations` ne contient plus la réservation. **INCONNU** : le changement de `seatsLeft` dans le rafraîchissement dépend du comportement serveur — voir documentation `shift-pilot-resa-api` pour vérifier que le serveur réaugmente bien `seatsLeft` après une annulation.

#### Cas de bord — annulation

**Cas : Double-clic rapide sur « Annuler »**  
**Comportement** : Le premier clic enregistre le transferId dans `pendingTransfers` — les clics suivants sortent de la fonction sans rien faire (`js/app.js`, ligne 70).  
**Résultat utilisateur** : Une seule requête DELETE est lancée, une seule annulation est effectuée.  
**Confiance** : `VÉRIFIÉ_CODE` (SHIA-383 — protection anti double-clic)  

**Cas : Serveur retourne une erreur lors de l'annulation**  
**Comportement** : Le `throw` dans le bloc `try/catch` (ligne 84) capture l'erreur. Un message d'erreur remplace le contenu de la liste.  
**Résultat utilisateur** : Message « Impossible de charger... » affiché.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Améliorer le message d'erreur pour distinguer « Impossible d'annuler » de « Impossible de charger ».

---

### Cas de bord et défaillances — Chargement (flux principal)

#### Cas : API injoignable ou erreur réseau

**Comportement** : `fetch()` lève une `Promise` rejetée, capturée par le `try/catch` (`js/app.js`, lignes 12–14, 65–67).  
**Résultat utilisateur** : Le contenu de la liste est remplacé par un message d'erreur : « Impossible de charger les transferts : [détail] ».  
**Confiance** : `VÉRIFIÉ_CODE`  
**Note** : La gestion d'erreur a été améliorée depuis le pilote initial — message visible à l'utilisateur (SHIA-348).

#### Cas : API renvoie une réponse 4xx ou 5xx

**Comportement** : La vérification `if (!response.ok) throw new Error(...)` capture la réponse, qui est capturée par le `try/catch` global (`js/app.js`, lignes 13–14).  
**Résultat utilisateur** : Le contenu de la liste est remplacé par un message d'erreur : « Impossible de charger les transferts : Erreur serveur : [code HTTP] ».  
**Confiance** : `VÉRIFIÉ_CODE`  
**Note** : La gestion d'erreur a été améliorée depuis le pilote initial (SHIA-348).

#### Cas : API renvoie un objet ou `null` au lieu d'un tableau

**Comportement** : La boucle `for (const t of transfers)` échoue sur un non-itérable → `TypeError` capturée par le `try/catch`.  
**Résultat utilisateur** : Message d'erreur affiché : « Impossible de charger les transferts : [détail] ».  
**Confiance** : `VÉRIFIÉ_CODE`  
**Note** : Bien qu'une validation stricte de type manque, la gestion d'erreur empêche un crash silencieux.

#### Cas : Transfert avec champ(s) manquant(s)

**Comportement** : Accès direct sans validation — `t.id`, `t.from`, etc., renvoient `undefined` si absents. Le rendu continue mais le bouton de réservation peut ne pas fonctionner (clé de Map manquante).  
**Résultat utilisateur** : `<li>` affiche partiellement `undefined` pour les champs manquants ; les actions de réservation échouent silencieusement si `id` manque.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Valider ou filtrer les transferts incomplets, particulièrement le champ `id` qui est critique pour les réservations.

#### Cas : Liste vide (aucun transfert disponible ce jour)

**Comportement** : Boucle s'exécute 0 fois — `<ul>` reste vide.  
**Résultat utilisateur** : Indéterminable d'une erreur API sans message explicite.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Ajouter un message « Aucun transfert disponible » si `transfers.length === 0`.

## Données consommées

### Ressource `transfer` (tableau retourné par `GET /transfers`)

| Champ | Utilisé ? | Type (observé) | Type (attendu) | Obligatoire ? | Notes |
|-------|-----------|---|---|---|---|
| `id` | ✓ Oui | ? | ? (unique, stable) | **CRITIQUE** | Clé de la Map `reservations` — absente ou mutée → réservation casse (SHIA-354) |
| `from` | ✓ Oui | Chaîne | Chaîne (nom d'île) | Oui | Affichage : origine du transfert |
| `to` | ✓ Oui | Chaîne | Chaîne (nom d'île) | Oui | Affichage : destination du transfert |
| `price` | ✓ Oui | Nombre ou chaîne | Nombre (XPF) | Oui | Affichage : tarif du transfert |
| `seatsLeft` | ✓ Oui | Nombre | Nombre entier ≥ 0 | Oui | Affichage : places restantes ; détermine si le bouton Réserver est visible |
| *Autres champs* | ✗ Non | ? | ? | ? | L'API peut renvoyer des identifiants, horaires, opérateurs, statut — ce front ne les utilise pas |

**Confiance**
- `VÉRIFIÉ_CODE` pour l'usage des 5 champs clés : lisibles dans `js/app.js` lignes 6, 22–33, 42–59, 61–76 (workflows de réservation et annulation)
- `INCONNU` pour le type exact et le format de `id` : form réelle (numérique, UUID, etc.) non documentée, observable seulement via l'API runtime
- `INCONNU` pour les autres champs : l'API peut renvoyer des champs supplémentaires ou des contraintes non observables depuis ce dépôt

### Configuration de l'URL de l'API

| Variable | Valeur (développement) | Valeur (production) | Notes |
|----------|---|---|---|
| `window.API_BASE_URL` | Non injected → fallback `http://localhost:3100` | Injecté par la page hôte (mécanisme non versionné) | Configuration externe, pas définie dans ce dépôt |

## Règles métier résumées

1. **Affichage automatique du catalogue au chargement** → pas d'interaction requise pour voir la liste
2. **Réservation avec 1 clic** → un seul clic sur « Réserver » déclenche un appel POST à l'API
3. **Annulation avec 1 clic** → un seul clic sur « Annuler » déclenche un DELETE à l'API
4. **Protection anti double-clic** → `pendingTransfers` Set verrouille chaque transferId pendant un appel réseau (SHIA-383)
5. **Registre local des réservations** → `reservations` Map persiste pendant la session, perdu au rechargement
6. **Unité XPF codée en dur** → aucune flexibilité de devise
7. **Cinq champs affichés/utilisés tels quels** → `id`, `from`, `to`, `price`, `seatsLeft` sans validation ni formatage
8. **Tableau exhaustif** → pas de pagination, pas de limite
9. **Rafraîchissement automatique** → la liste se réaffiche après chaque action (réservation, annulation, chargement initial)

## Délimitation du périmètre

### Hors périmètre

- **Réservation de plusieurs places** : une seule place par action, une seule clé dans la Map `reservations`
- **Persistance des réservations** : aucune sauvegarde en base ou stockage local — oubliées au rechargement de page
- **Synchronisation multi-utilisateur** : pas de détection de conflits si deux utilisateurs réservent la même place
- **Filtres, tris, recherche** : aucun mécanisme
- **Détail d'un transfert** : pas de page de détail
- **Authentification** : aucun mécanisme observable dans ce client ; forme du service côté serveur inconnue
- **Localisation / multilingue** : interface en français, devise en XPF, non configurable
- **État de chargement** : pas de spinner ni message "Chargement..."
- **Accessibilité** : pas de considération WCAG documentée
- **Responsive / mobile** : pas de media queries, pas de test multi-device

### Inachevé ou indéterminable

- **Type et format du champ `id`** : forme réelle inconnue, observable seulement via l'API runtime (CRITIQUE depuis SHIA-354)
- **Type du champ `reservationId`** : retourné par `POST /transfers/{id}/reserve`, forme inconnue
- **Rafraîchissement en temps réel côté serveur** : les changements de `seatsLeft` côté API ne sont visibles que par re-interrogation (pas de polling ni WebSocket dans ce front)
- **Injection de `window.API_BASE_URL` en production** : mécanisme externe, non documenté ni versionné
- **Synchronisation multi-utilisateur** : impossible à tester sans session utilisateur identifiée — hypothèse : serveur gère les conflits

## Preuves et confiance

Tous les constats fonctionnels sont issus de lectures exhaustives :

- `js/app.js` : 90 lignes (SHIA-354 — workflows de réservation et annulation inclus, protection anti double-clic SHIA-383), entièrement lues
- `js/app.test.js` : 13 tests automatisés validant les workflows de réservation, annulation, et protection double-clic, entièrement lus
- `index.html` : 12 lignes, entièrement lues
- `README.md` : 8 lignes, entièrement lues
- Aucune autre source de code fonctionnel dans ce dépôt

**Confiance globale du CDC : high** — la portée réelle du produit (consultation + réservation + annulation) est claire et documentée. Les incertitudes (types d'`id` et `reservationId`, comportement du serveur après réservation, synchronisation multi-utilisateur, mécanisme d'injection) sont explicitement délimitées.
