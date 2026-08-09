# CAHIER_RECETTE — shift-pilot-resa-web

Plan de test — parcours à valider pour accepter le produit.

## Contexte

Ce cahier de recette couvre les **trois fonctionnalités** de ce workspace :

1. **Affichage du catalogue de transferts inter-îles** au chargement de la page (flux principal)
2. **Réservation d'une place** (flux secondaire, SHIA-354)
3. **Annulation d'une réservation** (flux secondaire, SHIA-354)

Tous les tests sont dérivés des workflows documentés dans `WORKFLOW_AFFICHAGE_TRANSFERTS.md`, `WORKFLOW_RESERVER_TRANSFERT.md`, et `WORKFLOW_ANNULER_RESERVATION.md`.

**Confiance du cahier** : high — le code est exhaustif, le périmètre est clair.

**Périmètre non testé** (logique métier absente de ce dépôt) :
- Réservation de plusieurs places en une seule action (une seule place par réservation)
- Persistance des réservations au-delà d'une session (oubliées au rechargement de page)
- Filtres, tris, recherche (pas implémentés)
- Authentification (pas implémentée)
- Synchronisation multi-utilisateur (pas d'alerte de conflits)

## Environnement de test

### Prérequis

1. **Accès à l'API** : `shift-pilot-resa-api` doit être en cours d'exécution et accessible
   - URL par défaut en développement : `http://localhost:3100`
   - URL configurable en production via injection de `window.API_BASE_URL`

2. **Navigateur web** : tout navigateur moderne supportant ES6 (Chrome, Firefox, Safari, Edge)

3. **Serveur HTTP** : les fichiers de ce dépôt doivent être servis via HTTP (pas de `file://` local — CORS)

### Configurations à tester

| Env | Où servir | API URL | Notes |
|-----|----------|---------|-------|
| **Développement** | Serveur local HTTP | `http://localhost:3100` | Fallback automatique sans injection |
| **Staging** | Serveur staging | À injecter via `window.API_BASE_URL` | Mécanisme d'injection à confirmer |
| **Production** | Serveur production | À injecter via `window.API_BASE_URL` | Mécanisme d'injection à confirmer |

## Test nominal — Cas heureux

### TC-01 : Affichage du catalogue au chargement

**Objectif** : Vérifier que la liste des transferts s'affiche correctement au chargement de la page.

**Contexte** : API est en cours d'exécution, accessible, et renvoie un tableau non-vide de transferts.

**Étapes**

1. Ouvrir la page `index.html` dans un navigateur (ou l'URL servie)
2. Attendre le rendu du DOM (< 1 sec. en local)
3. Vérifier que la liste est peuplée

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | Le titre `<h1>Transferts</h1>` est visible | Présent sur la page |
| 2 | La `<ul id="transfers-list">` contient au moins une `<li>` | Une `<li>` par transfert |
| 3 | Chaque `<li>` affiche le format attendu | `[origine] → [destination] — [prix] XPF ([places] places)` |
| 4 | Les valeurs affichées correspondent aux données de l'API | Pas de corruption de données |
| 5 | L'affichage ne doit pas bloquer le navigateur | [HYPOTHÈSE] Observation sans outillage de mesure pour un catalogue de taille réduite (pilote) — critère de performance numérique non sourcé |

**Exemple de `<li>` attendue**
```
Papeete → Moorea — 3500 XPF (12 places)
```

**Acceptation** : Les 5 assertions passent.

---

### TC-02 : Contenu et formatage des transferts

**Objectif** : Vérifier que chaque transfert affiche correctement les 4 champs.

**Contexte** : API renvoie des transferts avec `from`, `to`, `price`, `seatsLeft`.

**Étapes**

1. Charger la page
2. Inspecter le premier transfert rendu
3. Vérifier chaque champ

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | `from` est affiché (avant la flèche →) | Visible, pas vide |
| 2 | `to` est affiché (après la flèche →) | Visible, pas vide |
| 3 | `price` est affiché suivi de ` XPF` | Format : `[nombre] XPF` |
| 4 | `seatsLeft` est affiché suivi de ` places` | Format : `[nombre] places` |
| 5 | Tous les transferts retournés par l'API sont affichés | Aucune omission, aucun doublon |

**Exemple de données API → rendu attendu**
```javascript
// API retourne
{ from: "Papeete", to: "Moorea", price: 3500, seatsLeft: 12 }

// Front affiche
<li>Papeete → Moorea — 3500 XPF (12 places)</li>
```

**Acceptation** : Les 5 assertions passent pour au moins 3 transferts.

---

## Tests de robustesse

### TC-03 : Résilience à l'erreur réseau

**Objectif** : Vérifier le comportement si l'API est injoignable.

**Contexte** : API n'est pas accessible (arrêtée, réseau inaccessible, CORS bloqué, etc.).

**Étapes**

1. Arrêter `shift-pilot-resa-api` ou bloquer sa connexion
2. Charger la page `index.html`
3. Attendre 5–10 secondes
4. Observer l'état de la page

**Comportement amélioré** (SHIA-348) :
- Page affiche un message d'erreur visible : « Impossible de charger les transferts : [détail de l'erreur] »
- Le contenu de la liste est remplacé par ce message
- Une erreur est également visible dans la console du navigateur (DevTools)

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Une erreur réseau n'écrase pas la page (pas de crash) | **PASS** — pas de crash |
| 2 | Un message explicite est affiché à l'utilisateur | **PASS** — message d'erreur visible (SHIA-348) |
| 3 | La console JavaScript contient un indice d'erreur | **PASS** — erreur capturée et loggable |

**Note** : La gestion d'erreur a été améliorée depuis le pilote initial. L'utilisateur reçoit maintenant un feedback explicite.

**Acceptation** : Les 3 assertions passent.

---

### TC-04 : Gestion d'une liste vide

**Objectif** : Vérifier le comportement si l'API renvoie un tableau vide.

**Contexte** : API renvoie `[]` (aucun transfert disponible ce jour).

**Étapes**

1. Configurer l'API pour retourner `[]`
2. Charger la page
3. Observer l'état

**Comportement actuel** :
- La `<ul>` reste vide
- Aucun message visible — utilisateur ne sait pas si c'est une absence légitime ou une erreur API

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Pas de crash, pas d'erreur JavaScript | **PASS** |
| 2 | Un message « Aucun transfert disponible » serait utile pour distinguer absence vs erreur | **FAIL** — non implémenté, mais recommandé pour UX |
| 3 | Erreur réseau/HTTP affiche un message d'erreur visible | **PASS** — message « Impossible de charger les transferts : [détail] » affichée (SHIA-348) |

**Acceptation** : Pas de crash (assertion 1 passe). Si API retourne `[]`, pas de message (limitation de UX). Si API échoue (erreur réseau/HTTP), message d'erreur affiché correctement (SHIA-348).

---

### TC-05 : Résilience à un champ manquant

**Objectif** : Vérifier le comportement si un transfert manque l'un des 4 champs.

**Contexte** : API renvoie un transfert avec un champ absent ou `null`.

**Étapes**

1. Configurer l'API pour retourner :
   ```javascript
   { from: "Papeete", to: "Moorea", price: 3500 }
   // seatsLeft est absent
   ```
2. Charger la page
3. Observer le rendu du transfert

**Comportement actuel** :
- La `<li>` affiche : `Papeete → Moorea — 3500 XPF (undefined places)`
- Pas d'erreur JavaScript

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Pas de crash | **PASS** |
| 2 | Pas de valeur `undefined` affichée | **FAIL** — `undefined` est visible |
| 3 | Le transfert est filtré ou marqué comme incomplet | **FAIL** — non implémenté |

**Acceptation** : Pas de crash, mais affichage dégradé (attendu en pilote).

**Recommandation** : Ajouter une validation ou documenter le contrat API.

---

## Test d'intégration

### TC-06 : Cycle complet en environnement de staging

**Objectif** : Tester le déploiement complet en environnement de staging (proche production).

**Contexte** : Page servie depuis un serveur de staging, API configurée pour l'environnement.

**Étapes**

1. Vérifier que `window.API_BASE_URL` est correctement injectée
2. Charger la page
3. Vérifier que les transferts s'affichent
4. Inspecter la requête réseau dans DevTools (Network tab)

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | La variable `window.API_BASE_URL` contient l'URL attendue (non `localhost:3100`) | Visible dans la console : `console.log(window.API_BASE_URL)` |
| 2 | L'appel `fetch` est adressé à la bonne URL | Visible dans Network tab : `GET /transfers` vers le bon domaine |
| 3 | La réponse est 200 OK | Statut HTTP 200 |
| 4 | Les transferts s'affichent | Liste complète et formatée |

**Acceptation** : Les 4 assertions passent. **IMPORTANT** : ce test valide le déploiement en staging avant montée en production. C'est une recette manuelle (infrastructure externe, non testée par suite unitaire).

---

## Cas d'erreur API détaillés

### TC-07 : Réponse HTTP 500

**Objectif** : Vérifier le comportement si l'API renvoie une erreur serveur.

**Contexte** : API renvoie `HTTP 500 Internal Server Error` avec un corps JSON ou texte.

**Étapes**

1. Configurer un serveur mock pour retourner `500`
2. Charger la page
3. Observer

**Comportement amélioré** (SHIA-348) :
- `response.ok` est vérifiée (ligne 13–14 : `if (!response.ok) throw new Error(...)`)
- L'erreur est capturée et un message est affiché : « Impossible de charger les transferts : Erreur serveur : 500 »
- Page ne reste pas silencieuse

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Pas de crash | **PASS** |
| 2 | Message d'erreur visible | **PASS** — message d'erreur explicite (SHIA-348) |

**Note** : La gestion d'erreur a été améliorée depuis le pilote initial. L'utilisateur reçoit maintenant un feedback explicite.

**Acceptation** : Les 2 assertions passent.

---

### TC-08 : Réponse avec format inattendu

**Objectif** : Vérifier si l'API retourne un objet ou `null` au lieu d'un tableau.

**Contexte** : API renvoie `{ error: "..." }` ou `null` au lieu d'un tableau.

**Étapes**

1. Configurer l'API pour retourner un objet ou `null`
2. Charger la page
3. Observer

**Comportement actuel** :
- La boucle `for (const t of transfers)` échoue
- `TypeError` non capturée

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Pas de crash visible (erreur dans la console) | **FAIL** — crash en console |
| 2 | Message d'erreur visible pour l'utilisateur | **FAIL** |

**Note** : Bien qu'une validation stricte de type manque, la gestion d'erreur générale empêche un crash silencieux.

---

## Tests de réservation et annulation (SHIA-354)

**Tests automatisés vs. recette manuelle** :

- **Tests automatisés** : 13 tests unitaires dans `js/app.test.js` couvrent la logique métier en isolation (affichage, réservation, annulation, protection double-clic, gestion d'erreur). Exécutables via `npm test`.
- **Recette manuelle** : tests navigateur réel + API réelle + environnements multi-domaine (staging/production) — non couverts par les tests unitaires.

Cette section documente les **tests de recette manuelle** en complément (navigateur réel, API réelle, multi-utilisateur) qui ne peuvent pas être validés par tests unitaires.

### TC-10 : Réservation d'une place (test manuel)

**Catégorie** : Recette manuelle — test navigateur réel avec API réelle

**Objectif** : Vérifier qu'un utilisateur peut réserver une place en un clic dans un environnement réel.

**Contexte** : 
- Page chargée avec un catalogue visible (API réelle en cours d'exécution)
- Au moins un transfert a `seatsLeft > 0`

**Étapes**

1. Charger la page dans un navigateur (Chrome, Firefox, Safari, Edge)
2. Vérifier qu'un bouton « Réserver » s'affiche pour un transfert avec places disponibles
3. Cliquer sur le bouton « Réserver »
4. Attendre que la requête API se termine (< 2 sec.)
5. Observer l'état de la liste

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | Le bouton « Réserver » est visible pour un transfert avec `seatsLeft > 0` | Bouton présent dans le `<li>` |
| 2 | Un clic sur « Réserver » déclenche une requête POST à l'API | Observable dans DevTools Network tab |
| 3 | La liste se rafraîchit après succès de la réservation | Nouvelle requête GET `/transfers` lancée automatiquement |
| 4 | Le bouton « Réserver » bascule à « Annuler » pour ce transfert | Bouton remplacé après rafraîchissement |
| 5 | Le `seatsLeft` du transfert diminue d'une unité dans le rafraîchissement | **DÉPEND DU COMPORTEMENT SERVEUR (INCONNU)** — le serveur décrémente-t-il réellement `seatsLeft` ? Consulter documentation `shift-pilot-resa-api` |
| 6 | Un double-clic n'enregistre qu'une seule réservation | Une seule requête POST lancée (SHIA-383) — **VÉRIFIÉ par tests automatisés dans `js/app.test.js`** |

**Exemple de scénario**
```
Avant : Papeete → Moorea — 3500 XPF (12 places) [Réserver]
Après clic : (rafraîchissement attendu)
Après :     Papeete → Moorea — 3500 XPF (11 places) [Annuler]
            (si serveur décrémente seatsLeft ; sinon, valeur inchangée)
```

**Acceptation** : Au minimum, les assertions 1–4 et 6 passent. L'assertion 5 dépend du contrat API (INCONNU depuis ce dépôt).

**Automatisé ?** : Les cas TC-10 (réservation) sont partiellement couverts par tests unitaires (`js/app.test.js`) :
- ✓ `reserve envoie POST /transfers/:id/reserve et stocke le reservationId`
- ✓ `reserve affiche une erreur si l'API répond en non-2xx`
- ✓ `reserve ignore un second appel si une opération est déjà en cours pour ce transfert (protection SHIA-383)`
- ✓ `reserve ignore un appel si le transfert est déjà réservé dans reservations`

**Recette manuelle requise** : validations impossible en tests unitaires :
- Comportement réel du serveur après réservation (change-t-il `seatsLeft` ?)
- Synchronisation multi-utilisateur (deux onglets ouverts, clics simultanés)
- Injection réelle de `window.API_BASE_URL` en staging/production
- Performance en environnement réel

---

### TC-11 : Annulation d'une réservation (test manuel)

**Catégorie** : Recette manuelle — test navigateur réel avec API réelle

**Objectif** : Vérifier qu'un utilisateur peut annuler une réservation en un clic dans un environnement réel.

**Contexte** : 
- Page chargée avec un transfert réservé (bouton « Annuler » visible)
- La réservation existe dans le registre local (via TC-10 ou autre réservation active)

**Étapes**

1. Charger la page ou complèter TC-10 (avoir une réservation active)
2. Vérifier qu'un bouton « Annuler » s'affiche pour un transfert réservé
3. Cliquer sur le bouton « Annuler »
4. Attendre que la requête API se termine (< 2 sec.)
5. Observer l'état de la liste

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | Le bouton « Annuler » est visible pour un transfert avec réservation | Bouton présent dans le `<li>` (état enregistré localement) |
| 2 | Un clic sur « Annuler » déclenche une requête DELETE à l'API | Observable dans DevTools Network tab : `DELETE /transfers/{id}/reservations/{reservationId}` |
| 3 | La liste se rafraîchit après succès de l'annulation | Nouvelle requête GET `/transfers` lancée automatiquement |
| 4 | Le bouton « Annuler » bascule à « Réserver » pour ce transfert | Bouton remplacé après rafraîchissement |
| 5 | Le `seatsLeft` du transfert augmente d'une unité dans le rafraîchissement | **DÉPEND DU COMPORTEMENT SERVEUR (INCONNU)** — le serveur réaugmente-t-il réellement `seatsLeft` ? Consulter documentation `shift-pilot-resa-api` |
| 6 | Un double-clic n'enregistre qu'une seule annulation | Une seule requête DELETE lancée (SHIA-383) — **VÉRIFIÉ par tests automatisés dans `js/app.test.js`** |

**Exemple de scénario**
```
Avant : Papeete → Moorea — 3500 XPF (11 places) [Annuler]
Après clic : (rafraîchissement attendu)
Après :     Papeete → Moorea — 3500 XPF (12 places) [Réserver]
            (si serveur réaugmente seatsLeft ; sinon, valeur inchangée)
```

**Acceptation** : Au minimum, les assertions 1–4 et 6 passent. L'assertion 5 dépend du contrat API (INCONNU depuis ce dépôt).

**Automatisé ?** : Les cas TC-11 (annulation) sont partiellement couverts par tests unitaires (`js/app.test.js`) :
- ✓ `cancelReservation envoie DELETE et supprime la réservation`
- ✓ `cancelReservation affiche une erreur si l'API répond 404 ou non-2xx`
- ✓ `cancelReservation ignore un second appel si une opération est déjà en cours pour ce transfert (protection SHIA-383)`

**Recette manuelle requise** : même que TC-10 (voir ci-dessus)

---

### TC-12 : Absence du bouton Réserver si complet (test manuel)

**Catégorie** : Recette manuelle — test navigateur réel avec API réelle

**Objectif** : Vérifier que le bouton « Réserver » n'apparaît pas pour un transfert complet dans un environnement réel.

**Contexte** : 
- API renvoie un transfert avec `seatsLeft === 0`

**Étapes**

1. Charger la page (ou configurer l'API pour retourner un transfert complet)
2. Vérifier le rendu du transfert avec places = 0
3. Observer si un bouton d'action existe

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | Aucun bouton n'apparaît pour un transfert avec `seatsLeft === 0` | Pas de bouton « Réserver » ni « Annuler » |
| 2 | Le transfert reste visible dans la liste | Format : `[from] → [to] — [price] XPF (0 places)` |
| 3 | Le texte ne donne pas d'indication d'erreur | C'est un état normal du catalogue |

**Exemple**
```
Papeete → Moorea — 3500 XPF (0 places)
[pas de bouton]
```

**Acceptation** : Les 3 assertions passent.

**Automatisé ?** : Couvert par test unitaire (`js/app.test.js`) :
- ✓ `n'affiche pas le bouton Réserver si seatsLeft = 0`

---

## Tests de performance (optionnels)

### TC-09 : Performance sur un grand catalogue

**Objectif** : Vérifier que le rendu reste fluide avec un grand nombre de transferts.

**Contexte** : API renvoie 1000+ transferts.

**Étapes**

1. Configurer l'API pour retourner 1000 transferts
2. Charger la page
3. Mesurer le temps de rendu

**Critères**
- Temps de rendu : < 1 seconde (objectif)
- Pas de freeze de l'interface
- Pas de crash navigateur

**Note** : Pas critique pour un pilote (catalogue petite taille attendue). À revisiter si le catalogue grandit.

---

## Checklist d'acceptation

| Test | Catégorie | Type | Statut |
|------|-----------|------|--------|
| TC-01 (Affichage) | Nominal | Recette manuelle | À exécuter (navigateur réel, API réelle) |
| TC-02 (Formatage) | Nominal | Recette manuelle | À exécuter (navigateur réel, API réelle) |
| TC-03 (Erreur réseau) | Robustesse | Code + recette | **Code PASS** (SHIA-348) ; recette manuelle recommandée |
| TC-04 (Liste vide) | Robustesse | Recette manuelle | À exécuter (pas de crash attendu ; message non implémenté) |
| TC-05 (Champ manquant) | Robustesse | Recette manuelle | À exécuter (pas de crash attendu ; validation non implémentée) |
| TC-06 (Staging) | Intégration | Recette manuelle | **Critique** — à exécuter en staging avant production (injection `window.API_BASE_URL`) |
| TC-07 (HTTP 500) | Robustesse | Code + recette | **Code PASS** (SHIA-348) ; recette manuelle recommandée |
| TC-08 (Format inattendu) | Robustesse | Recette manuelle | À exécuter (gestion d'erreur capture les TypeError) |
| TC-09 (Perf large) | Performance | Recette manuelle | **Optionnel** (non critique pour pilote) |
| TC-10 (Réservation) | Réservation | Automatisé + Recette | **Automatisé PASS** (13 tests `js/app.test.js` couvrent POST, stockage, double-clic, erreurs) ; **recette manuelle requise** (navigateur réel, API réelle, comportement `seatsLeft`) |
| TC-11 (Annulation) | Réservation | Automatisé + Recette | **Automatisé PASS** (13 tests `js/app.test.js` couvrent DELETE, suppression, double-clic) ; **recette manuelle requise** (navigateur réel, API réelle, comportement `seatsLeft`) |
| TC-12 (Transfert complet) | Réservation | Automatisé | **Automatisé PASS** (13 tests `js/app.test.js` — absence bouton si seatsLeft = 0) |

## Recommandations pour améliorer la testabilité

1. **Améliorer les messages pour liste vide** : si API retourne `[]` (absence légitime de transferts), afficher un message « Aucun transfert disponible » pour distinguer du silence causé par une erreur API (message d'erreur est déjà affichée par SHIA-348)
2. **Documenter le contrat API** : quels champs sont obligatoires (surtout `id`) ? Quels types exacts de `id` et `reservationId` ? Consulter `shift-pilot-resa-api` pour le détail des contrats
3. **Valider les types réels de `id` et `reservationId`** : clarifier le format depuis l'API (CRITIQUE pour SHIA-354)
4. **Tests automatisés en place** : 13 tests unitaires couvrent les workflows clés (`npm test`). Tests de recette manuelle (navigateur réel, API réelle, multi-navigateur) restent nécessaires
5. **Valider les données** : `Array.isArray(transfers)`, vérifier les champs obligatoires, notamment `id`
6. **Documenter le mécanisme de double-clic** : le verrou `pendingTransfers` est documenté en code (SHIA-383) et couvert par tests automatisés

## Régressions à surveiller

Avant toute modification du code, tester :

1. **Aucune modification d'`index.html`** : vérifier que l'id `transfers-list` et le titre restent inchangés
2. **Aucune modification de l'URL API** : vérifier que les appels ciblent toujours :
   - `${API_BASE_URL}/transfers` (GET)
   - `${API_BASE_URL}/transfers/{id}/reserve` (POST, SHIA-354)
   - `${API_BASE_URL}/transfers/{id}/reservations/{reservationId}` (DELETE, SHIA-354)
3. **Aucune modification de la structure des `<li>`** : vérifier que le format reste `[from] → [to] — [price] XPF ([seatsLeft] places)`
4. **Aucune modification des boutons d'action** : vérifier que les boutons « Réserver » / « Annuler » sont présents et fonctionnels (SHIA-354)
5. **Protection anti double-clic intacte** : vérifier que `pendingTransfers` Set bloque les actions pendant un appel réseau (SHIA-383)
6. **Aucune modification de la police d'injection de `window.API_BASE_URL`** : documenter tout changement

## Preuves et traçabilité

Les tests TC-01 à TC-09 sont dérivés du workflow `WORKFLOW_AFFICHAGE_TRANSFERTS.md`.
Les tests TC-10 à TC-12 (réservation, annulation, complet) couvrent les workflows nouveaux (SHIA-354) :
- `WORKFLOW_RESERVER_TRANSFERT.md`
- `WORKFLOW_ANNULER_RESERVATION.md`

Tous les tests s'appuient sur les audits :
- FUNCTIONAL_AUDIT.md
- SECURITY_ROBUSTNESS_AUDIT.md
- CODE_HOTSPOTS_AUDIT.md
- DATA_MODEL_AUDIT.md
